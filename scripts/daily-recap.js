// ─────────────────────────────────────────────────────────────
// daily-recap.js — Récap quotidien Capital Board
// Lancé par GitHub Actions chaque jour ouvré à 20h (Paris)
//
// Ne fait plus d'email : envoie une notification push courte et
// stocke le récap complet dans Firestore pour l'espace "Récap" du
// dashboard.
// ─────────────────────────────────────────────────────────────

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { getAuth }             from 'firebase-admin/auth';
import { getMessaging }        from 'firebase-admin/messaging';
import { readFileSync }        from 'fs';
import fetch                   from 'node-fetch';

// ─── CONFIG ──────────────────────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const MISTRAL_KEY    = process.env.MISTRAL_API_KEY;
const TAVILY_KEY     = process.env.TAVILY_API_KEY;

initializeApp({ credential: cert(serviceAccount) });
const db        = getFirestore();
const fbAuth    = getAuth();
const messaging = getMessaging();

// ─── HELPERS ─────────────────────────────────────────────────
const fmt  = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
const fmtp = n => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
const todayIso = new Date().toISOString().slice(0, 10);
const today    = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const forceWeekly = (process.env.FORCE_WEEKLY || '').toLowerCase() === 'true';
const isFriday    = new Date().getDay() === 5 || forceWeekly;

// ─── RÉCUPÉRER LES UTILISATEURS FIREBASE ─────────────────────
async function getAllUsers() {
  const result = await fbAuth.listUsers();
  return result.users.map(u => ({
    uid:   u.uid,
    email: u.email,
    name:  u.displayName || u.email.split('@')[0],
  }));
}

// ─── RÉCUPÉRER LES SETTINGS FIRESTORE ───────────────────────
async function getUserSettings(uid) {
  const snap = await db.doc(`users/${uid}/data/settings`).get();
  return snap.exists ? snap.data() : {};
}

// La préférence de récap : pushRecap, avec repli sur l'ancien emailRecap.
function recapEnabled(settings) {
  if (settings.pushRecap !== undefined)  return settings.pushRecap !== false;
  if (settings.emailRecap !== undefined) return settings.emailRecap !== false;
  return true;
}

// ─── RÉCUPÉRER LE PORTFOLIO FIRESTORE ────────────────────────
async function getUserPortfolio(uid) {
  const snap = await db.doc(`users/${uid}/data/portfolio`).get();
  return snap.exists ? (snap.data().items || []) : [];
}

// ─── PRIX YAHOO FINANCE ──────────────────────────────────────
async function fetchPrice(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  try {
    const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const prev  = meta.chartPreviousClose || meta.previousClose || price;
    const changePct = meta.regularMarketChangePercent !== undefined
      ? meta.regularMarketChangePercent
      : prev ? ((price - prev) / prev) * 100 : 0;
    return { price, prev, changePct, name: meta.shortName || meta.longName || ticker };
  } catch(e) {
    console.warn(`Prix non disponible pour ${ticker}:`, e.message);
    return null;
  }
}

// ─── RECHERCHE WEB (Tavily) ──────────────────────────────────
// Renvoie des résultats web récents (titres + extraits) pour une requête.
async function searchWeb(query) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query,
        topic: 'news',
        days: 4,
        max_results: 5,
        search_depth: 'basic',
      }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Tavily ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
    return (json.results || []).map(r => ({
      title:   (r.title || '').trim(),
      content: (r.content || '').trim().slice(0, 400),
    }));
  } catch(e) {
    console.warn(`Tavily error (${query}):`, e.message);
    return [];
  }
}

// ─── CACHE TAVILY PAR TICKER ─────────────────────────────────
// Firestore : tavilyCache/{date}/tickers/{ticker}
// Champs : daily (résultats query quotidienne), weekly (query hebdo), cachedAt.
// Partagé entre tous les users → 1 appel Tavily par ticker unique par jour.
async function getOrFetchTavily(ticker, name, type = 'daily') {
  const field = type === 'weekly' ? 'weekly' : 'daily';
  const query = type === 'weekly'
    ? `${name} bourse actualité semaine`
    : `${name} action bourse actualité cours`;
  const cacheRef = db.doc(`tavilyCache/${todayIso}/tickers/${ticker}`);
  try {
    const snap = await cacheRef.get();
    if (snap.exists) {
      const cached = snap.data()[field];
      if (cached && cached.length > 0) {
        console.log(`    Cache Tavily [${type}] HIT : ${ticker}`);
        return cached;
      }
    }
  } catch(e) {
    console.warn(`Cache Tavily read error (${ticker}):`, e.message);
  }
  const results = await searchWeb(query);
  try {
    await cacheRef.set({ [field]: results, cachedAt: new Date().toISOString() }, { merge: true });
  } catch(e) {
    console.warn(`Cache Tavily write error (${ticker}):`, e.message);
  }
  return results;
}

// ─── MISTRAL — RÉDACTION DU RAPPORT ──────────────────────────
async function callMistral(prompt) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + MISTRAL_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1400,
    }),
    signal: AbortSignal.timeout(60000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return (json?.choices?.[0]?.message?.content || '').trim();
}

// ─── RAPPORT QUOTIDIEN ───────────────────────────────────────
// 1) Tavily cherche l'actualité réelle de chaque ligne.
// 2) Mistral rédige le rapport en s'appuyant UNIQUEMENT sur ces résultats.
async function generateReport(lines, totalPct) {
  // 1. Recherche web par ligne (cache Tavily partagé entre users)
  const searchPairs = await Promise.all(lines.map(async l => {
    const results = await getOrFetchTavily(l.ticker, l.name, 'daily');
    return [l.ticker, results];
  }));
  const webByTicker = Object.fromEntries(searchPairs);

  // 2. Contexte pour le modèle
  const ctx = lines.map(l => {
    const r = webByTicker[l.ticker] || [];
    return `### ${l.name} (${l.ticker}) — variation du jour : ${fmtp(l.changePct)}\n`
      + (r.length
        ? r.map(x => `- ${x.title} : ${x.content}`).join('\n')
        : '- (aucun résultat web)');
  }).join('\n\n');

  const prompt = `Tu es analyste financier. Rédige le rapport quotidien de ce portefeuille PEA, daté du ${today}.

Performance globale du jour : ${fmtp(totalPct)}

Pour chaque ligne, voici sa variation du jour et des résultats de recherche web récents :

${ctx}

FORMAT DE RÉPONSE OBLIGATOIRE — texte brut uniquement, AUCUN symbole markdown (pas de **, pas de #, pas de ---).
Une section par ligne, format exact :

Synthèse: <une phrase sur la tendance globale du jour>
<Nom de la ligne> (<variation%>): <explication en 1 à 2 phrases>
<Nom de la ligne suivante> (<variation%>): <explication>
...

Règles de contenu :
- Reprends EXACTEMENT le nom et la variation de chaque ligne fournie ci-dessus, dans le même ordre.
- Explication : si les résultats web expliquent réellement le mouvement (résultats financiers, annonce, actualité sectorielle, macro, indice suivi), donne-la. Sinon écris exactement : "Rien de notable, mouvement lié à la tendance de marché."
- Ne mélange pas : soit une vraie explication, soit la phrase "Rien de notable" — jamais les deux.
- Appuie-toi UNIQUEMENT sur les résultats web fournis. N'invente JAMAIS un événement, un chiffre ou une annonce absent de ces résultats.
- Français, factuel, concis. Aucun conseil d'achat ou de vente. Pas d'URL. Une seule ligne de texte par section.`;

  try {
    const text = await callMistral(prompt);
    return text || 'Analyse IA indisponible aujourd\'hui.';
  } catch(e) {
    console.warn('Mistral error:', e.message);
    return 'Analyse IA indisponible aujourd\'hui.';
  }
}

// ─── RAPPORT HEBDOMADAIRE (vendredi) ─────────────────────────
// Prix sur 5 jours pour calculer la variation hebdomadaire.
async function fetchWeek(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  try {
    const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    const r    = json?.chart?.result?.[0];
    const meta = r?.meta;
    const closes = (r?.indicators?.quote?.[0]?.close || []).filter(v => v != null);
    if (!meta || closes.length < 2) return null;
    return {
      name:      meta.shortName || meta.longName || ticker,
      price:     meta.regularMarketPrice || closes[closes.length - 1],
      weekStart: closes[0],
    };
  } catch(e) {
    console.warn(`Données semaine indisponibles pour ${ticker}:`, e.message);
    return null;
  }
}

// Estime le prochain dividende d'un ticker depuis l'historique Yahoo.
// (Yahoo ne fournit plus de date future fiable : on extrapole la
// fréquence des versements passés.)
async function fetchDividendEstimate(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=3y&interval=1wk&events=div`;
  try {
    const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    const divs = json?.chart?.result?.[0]?.events?.dividends;
    if (!divs) return null;
    const arr = Object.values(divs)
      .map(d => ({ date: d.date * 1000, amount: d.amount }))
      .sort((a, b) => a.date - b.date);
    if (arr.length < 2) return null;
    const gaps = [];
    for (let i = 1; i < arr.length; i++) gaps.push(arr[i].date - arr[i - 1].date);
    gaps.sort((a, b) => a - b);
    const medGap = gaps[Math.floor(gaps.length / 2)];
    const last   = arr[arr.length - 1];
    const nextMs = last.date + medGap;
    if (nextMs < Date.now()) return null; // estimation déjà dépassée
    return {
      date:      new Date(nextMs).toISOString().slice(0, 10),
      amount:    +last.amount.toFixed(2),
      estimated: true,
    };
  } catch(e) {
    return null;
  }
}

// Dividendes à venir (≤ 100 jours) pour chaque ligne du portefeuille.
// Source confirmée : data/dividendes.json (CAC40). Sinon estimation Yahoo.
async function upcomingDividends(portfolio) {
  let fileData = {};
  try {
    fileData = JSON.parse(readFileSync(new URL('../data/dividendes.json', import.meta.url), 'utf-8')).dividends || {};
  } catch(e) { /* fichier absent : on passe à l'estimation */ }

  const horizon = new Date(Date.now() + 100 * 86400000).toISOString().slice(0, 10);
  const out = [];
  for (const row of portfolio) {
    const t  = row.ticker;
    const fe = fileData[t];
    if (fe && fe.next && fe.next.date >= todayIso && fe.next.date <= horizon) {
      out.push({ name: fe.name || row.name || t, ticker: t, date: fe.next.date, amount: fe.next.amount_estimated, estimated: false });
      continue;
    }
    const est = await fetchDividendEstimate(t);
    if (est && est.date <= horizon) {
      out.push({ name: row.name || t, ticker: t, date: est.date, amount: est.amount, estimated: true });
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

// Rapport hebdo : 6 sections, ancré sur la recherche web Tavily.
async function generateWeeklyReport(weekLines, weekPct, dividends) {
  const searchPairs = await Promise.all(weekLines.map(async l => {
    const results = await getOrFetchTavily(l.ticker, l.name, 'weekly');
    return [l.ticker, results];
  }));
  const webByTicker = Object.fromEntries(searchPairs);

  const ctx = weekLines.map(l => {
    const r = webByTicker[l.ticker] || [];
    return `### ${l.name} (${l.ticker}) — variation de la semaine : ${fmtp(l.weekPct)}\n`
      + (r.length ? r.map(x => `- ${x.title} : ${x.content}`).join('\n') : '- (aucun résultat web)');
  }).join('\n\n');

  const divInfo = dividends.length
    ? dividends.map(d => `- ${d.name} : ${d.amount ? d.amount + ' € ' : ''}vers le ${d.date}${d.estimated ? ' (date estimée)' : ''}`).join('\n')
    : '(aucun dividende à venir — lignes capitalisantes ou sans versement prévu)';

  const prompt = `Tu es analyste financier. Rédige le RAPPORT HEBDOMADAIRE de ce portefeuille PEA, semaine se terminant le ${today}.

Performance du portefeuille sur la semaine : ${fmtp(weekPct)}

Lignes (variation hebdomadaire) et résultats de recherche web récents :

${ctx}

Dividendes connus à venir :
${divInfo}

FORMAT DE RÉPONSE OBLIGATOIRE — texte brut, AUCUN markdown (pas de **, #, ---).
Une section par ligne, format exact "Titre: corps" :

Synthèse marché: <2 à 3 phrases sur le contexte de marché de la semaine (indices, macro, taux)>
<Nom de la ligne 1> (<variation hebdo%>): <analyse approfondie de la semaine, 2 à 3 phrases>
<Nom de la ligne 2> (<variation hebdo%>): <analyse>
...
Points d'attention: <2 à 3 phrases sur ce qu'il faut surveiller la semaine prochaine (résultats, événements macro)>

Règles :
- Reprends EXACTEMENT le nom et la variation hebdo de chaque ligne, dans le même ordre.
- Analyse de ligne : appuie-toi sur les résultats web. Si rien de concret, explique le mouvement par le contexte sectoriel/macro de la semaine.
- N'invente JAMAIS un événement ou un chiffre absent des résultats web.
- Français, factuel, posé, plus développé qu'un récap quotidien. Aucun conseil d'achat/vente. Pas d'URL.`;

  try {
    const text = await callMistral(prompt);
    return text || 'Analyse IA indisponible cette semaine.';
  } catch(e) {
    console.warn('Mistral error (hebdo):', e.message);
    return 'Analyse IA indisponible cette semaine.';
  }
}

async function saveWeeklyRecap(uid, recap) {
  await db.doc(`users/${uid}/data/weeklyRecap`).set(recap);
  console.log(`  Rapport hebdo stocké pour ${uid}`);
}

// ─── ENVOYER PUSH FCM ────────────────────────────────────────
async function sendFcmPush(uid, title, body, type = 'daily_recap') {
  try {
    const roleSnap = await db.doc(`roles/${uid}`).get();
    const token = roleSnap.exists ? roleSnap.data().fcmToken : null;
    if (!token) { console.log(`  — Pas de token FCM pour ${uid}, push ignoré`); return; }
    await messaging.send({ token, notification: { title, body }, data: { type } });
    console.log(`  Push FCM envoyé à ${uid}`);
  } catch(e) {
    console.warn(`   Push FCM échoué pour ${uid}:`, e.message);
  }
}

// ─── STOCKER LE RÉCAP COMPLET DANS FIRESTORE ─────────────────
async function saveRecap(uid, recap) {
  await db.doc(`users/${uid}/data/recap`).set(recap);
  console.log(`  Récap stocké pour ${uid}`);
}

// ─── LOG HISTORIQUE NOTIFS IN-APP ────────────────────────────
async function logNotifHistory(uid, type, title, body) {
  const snap = await db.doc(`users/${uid}/data/notifHistory`).get();
  const history = snap.exists ? (snap.data().items || []) : [];
  history.unshift({ id: Date.now(), type, title, body, timestamp: new Date().toISOString(), read: false });
  if (history.length > 50) history.splice(50);
  await db.doc(`users/${uid}/data/notifHistory`).set({ items: history });
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  const targetUid = (process.env.TARGET_UID || '').trim();
  console.log(`\nDémarrage récap quotidien — ${today}`);
  if (targetUid) console.log(`Cible : ${targetUid}\n`);
  else console.log(`Envoi à tous les utilisateurs\n`);

  // 1. Récupérer tous les utilisateurs
  let users = await getAllUsers();
  if (targetUid) users = users.filter(u => u.uid === targetUid);
  console.log(`${users.length} utilisateur(s) traité(s)`);

  for (const user of users) {
    console.log(`\nTraitement de ${user.name} (${user.email})...`);

    // 2. Vérifier la préférence de l'utilisateur
    const settings = await getUserSettings(user.uid);
    if (!recapEnabled(settings)) {
      console.log(`  Récap désactivé pour ${user.name}, ignoré`);
      continue;
    }

    // 3. Récupérer le portfolio
    const portfolio = await getUserPortfolio(user.uid);
    if (!portfolio.length) {
      console.log(`   Portfolio vide, ignoré`);
      continue;
    }
    console.log(`  ${portfolio.length} ligne(s) détectée(s)`);

    // 4. Récupérer les prix en parallèle
    const priceResults = await Promise.all(
      portfolio.map(async row => {
        const data = await fetchPrice(row.ticker);
        return { row, data };
      })
    );

    // 5. Construire les lignes enrichies
    const lines = priceResults
      .filter(({ data }) => data !== null)
      .map(({ row, data }) => ({
        ticker:    row.ticker,
        name:      data.name || row.name || row.ticker,
        qty:       row.qty,
        buyPrice:  row.buyPrice || 0,
        price:     data.price,
        prev:      data.prev,
        changePct: data.changePct,
        value:     row.qty * data.price,
        pnl:       row.qty * (data.price - (row.buyPrice || data.price)),
      }));

    if (!lines.length) {
      console.log(`   Aucun prix disponible, ignoré`);
      continue;
    }

    // 6. Calculer les totaux
    const totalValue     = lines.reduce((s, l) => s + l.value, 0);
    const totalInvested  = lines.reduce((s, l) => s + l.qty * l.buyPrice, 0);
    const totalPnl       = totalValue - totalInvested;
    const totalPnlPct    = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const totalDayChange = lines.reduce((s, l) => s + l.qty * (l.price - l.prev), 0);
    const prevValue      = lines.reduce((s, l) => s + l.qty * l.prev, 0);
    const totalDayPct    = prevValue > 0 ? (totalDayChange / prevValue) * 100 : 0;

    console.log(`  Valeur: ${fmt(totalValue)} | Jour: ${fmtp(totalDayPct)}`);

    // 7. Génération du rapport IA
    console.log(`  Génération du rapport Mistral...`);
    const aiComment = await generateReport(lines, totalDayPct);

    // 8. Construire le récap complet (affiché dans le dashboard)
    const sorted = [...lines].sort((a, b) => b.changePct - a.changePct);
    const recap = {
      date:           todayIso,
      dateLabel:      today,
      generatedAt:    new Date().toISOString(),
      totalValue,
      totalInvested,
      totalPnl,
      totalPnlPct,
      totalDayChange,
      totalDayPct,
      lines,
      best:  sorted.length     ? { name: sorted[0].name, changePct: sorted[0].changePct } : null,
      worst: sorted.length > 1 ? { name: sorted[sorted.length-1].name, changePct: sorted[sorted.length-1].changePct } : null,
      aiComment,
    };

    // 9. Stocker le récap + envoyer push courte + logguer l'historique
    await saveRecap(user.uid, recap);

    // Lun-Jeu : push daily. Vendredi : skip (la push weekly arrive juste après)
    const up      = totalDayPct >= 0;
    const emoji   = up ? '' : '';
    const title   = `Récap du jour : ${emoji} ${fmtp(totalDayPct)}`;
    const body    = 'Touchez pour voir le détail.';
    if (!isFriday) {
      await sendFcmPush(user.uid, title, body, 'daily_recap');
    }
    await logNotifHistory(user.uid, 'daily_recap', title, body);

    // 10. Vendredi : rapport hebdomadaire en plus
    if (isFriday) {
      console.log(`  Vendredi — génération du rapport hebdomadaire...`);
      const weekResults = await Promise.all(
        portfolio.map(async row => ({ row, w: await fetchWeek(row.ticker) }))
      );
      const weekLines = weekResults
        .filter(({ w }) => w && w.weekStart > 0)
        .map(({ row, w }) => ({
          ticker:    row.ticker,
          name:      w.name || row.name || row.ticker,
          qty:       row.qty,
          price:     w.price,
          weekStart: w.weekStart,
          weekPct:   (w.price - w.weekStart) / w.weekStart * 100,
          value:     row.qty * w.price,
        }));

      if (weekLines.length) {
        const wTotalValue = weekLines.reduce((s, l) => s + l.value, 0);
        const wPrevValue  = weekLines.reduce((s, l) => s + l.qty * l.weekStart, 0);
        const wWeekChange = wTotalValue - wPrevValue;
        const wWeekPct    = wPrevValue > 0 ? (wWeekChange / wPrevValue) * 100 : 0;
        const wSorted     = [...weekLines].sort((a, b) => b.weekPct - a.weekPct);
        const divs        = await upcomingDividends(portfolio);

        console.log(`  Génération du rapport hebdo Mistral...`);
        const aiReport = await generateWeeklyReport(weekLines, wWeekPct, divs);

        const weekly = {
          date:        todayIso,
          weekLabel:   `Semaine terminée le ${today}`,
          generatedAt: new Date().toISOString(),
          totalValue:  wTotalValue,
          weekChange:  wWeekChange,
          weekPct:     wWeekPct,
          lines:       weekLines,
          best:  wSorted.length     ? { name: wSorted[0].name, weekPct: wSorted[0].weekPct } : null,
          worst: wSorted.length > 1 ? { name: wSorted[wSorted.length-1].name, weekPct: wSorted[wSorted.length-1].weekPct } : null,
          dividends:   divs,
          aiReport,
        };
        await saveWeeklyRecap(user.uid, weekly);

        const wUp    = wWeekPct >= 0;
        const wTitle = `Rapport hebdo : ${wUp ? '' : ''} ${fmtp(wWeekPct)}`;
        const wBody  = 'Votre semaine en détail. Touchez pour voir.';
        await sendFcmPush(user.uid, wTitle, wBody, 'weekly_recap');
        await logNotifHistory(user.uid, 'weekly_recap', wTitle, wBody);
      } else {
        console.log(`   Pas de données hebdo, rapport ignoré`);
      }
    }
  }

  console.log('\nRécap quotidien terminé\n');
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
