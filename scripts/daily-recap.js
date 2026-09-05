// ─────────────────────────────────────────────────────────────
// daily-recap.js — Récap quotidien Capital Board
// Lancé par GitHub Actions chaque jour ouvré à 20h (Paris)
//
// Ne fait plus d'email : envoie une notification push courte et
// stocke le récap complet dans Firestore pour l'espace "Récap" du
// dashboard.
// ─────────────────────────────────────────────────────────────

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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
// Les réglages ont déménagé dans `data/annexes` (un document au lieu de six,
// pour tenir le quota de lectures). L'ancien document reste en place pour les
// comptes pas encore migrés : on lit le nouveau d'abord, le vieux ensuite.
// Sans ça le script lisait une préférence figée au jour de la migration.
async function getUserSettings(uid) {
  const annexes = await db.doc(`users/${uid}/data/annexes`).get();
  if (annexes.exists && annexes.data().settings) return annexes.data().settings;
  const snap = await db.doc(`users/${uid}/data/settings`).get();
  return snap.exists ? snap.data() : {};
}

// La préférence de récap : pushRecap, avec repli sur l'ancien emailRecap.
function recapEnabled(settings) {
  if (settings.pushRecap !== undefined)  return settings.pushRecap !== false;
  if (settings.emailRecap !== undefined) return settings.emailRecap !== false;
  return true;
}

// ─── RÉCUPÉRER LES LIGNES FIRESTORE ──────────────────────────
async function getUserItems(uid, nom) {
  const snap = await db.doc(`users/${uid}/data/${nom}`).get();
  return snap.exists ? (snap.data().items || []) : [];
}

// Positions crypto reconstituées depuis le journal d'opérations : la
// collection `crypto` stocke des achats et des ventes, pas un état. Même
// calcul que `_cryPositions()` côté application — prix de revient moyen
// pondéré, ligne close quand la quantité retombe à zéro. Les deux doivent
// donner le même chiffre : si l'un change, changer l'autre.
function cryptoPositions(ops) {
  const par = new Map();
  [...ops]
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .forEach(o => {
      if (!o.sym) return;
      const qte  = Number(o.qte)  || 0;
      const prix = Number(o.prix) || 0;
      if (qte <= 0) return;
      const pos = par.get(o.sym) || { sym: o.sym, qte: 0, pru: 0 };
      if (o.sens === 'vente') {
        pos.qte = Math.max(0, pos.qte - qte);
        if (pos.qte === 0) pos.pru = 0;
      } else {
        const cout = pos.qte * pos.pru + qte * prix;
        pos.qte += qte;
        pos.pru  = pos.qte ? cout / pos.qte : 0;
      }
      par.set(o.sym, pos);
    });
  return [...par.values()].filter(p => p.qte > 1e-12);
}

// Toutes les lignes suivies d'un membre, chacune sachant d'où elle vient. Le
// récap parle du patrimoine, pas d'un compte : une hausse du Nasdaq logée au
// compte-titres compte autant qu'une valeur du PEA.
const ENV_LABELS = { pea: 'PEA', cto: 'Compte-titres', crypto: 'Crypto' };

async function getUserLignes(uid) {
  const [pea, cto, cryptoOps] = await Promise.all([
    getUserItems(uid, 'portfolio'),
    getUserItems(uid, 'portfolioCto'),
    getUserItems(uid, 'crypto'),
  ]);
  const titres = [
    ...pea.map(r => ({ ...r, env: 'pea' })),
    ...cto.map(r => ({ ...r, env: 'cto' })),
  ].filter(r => r && r.ticker && r.qty > 0);
  // Une crypto se cote sur Yahoo comme un titre, au suffixe près : BTC-EUR.
  // Le symbole nu reste le ticker affiché, plus lisible dans le tableau.
  const cryptos = cryptoPositions(cryptoOps).map(p => ({
    ticker: p.sym, name: p.sym, qty: p.qte, buyPrice: p.pru, env: 'crypto',
  }));
  return [...titres, ...cryptos];
}

// Symbole à interroger chez Yahoo. Seule la crypto s'en écarte.
const symboleYahoo = (l) => (l.env === 'crypto' ? l.ticker + '-EUR' : l.ticker);

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

// ─── SUIVI DE QUOTA (Tavily / Mistral) ────────────────────────
// Compteurs du run en cours. Le cache Firestore (getOrFetchTavily) déduplique
// déjà les appels par ticker et par jour ; un dépassement de seuil ici
// signale donc soit une régression du cache, soit une hausse réelle et
// inhabituelle du nombre de tickers suivis — dans les deux cas, quelque chose
// qu'un humain doit regarder avant que le quota (ou la facture) ne saute.
// Seuils choisis à vue de nez : à ajuster une fois un historique de run réel
// disponible (voir apiUsage/{date} dans Firestore).
const TAVILY_ALERT_THRESHOLD  = 200;
const MISTRAL_ALERT_THRESHOLD = 100;
let _tavilyCalls = 0;
let _mistralCalls = 0;

// ─── PLAFOND MENSUEL TAVILY ──────────────────────────────────
// Le seuil du dessus prévient après coup : il écrit une alerte une fois le run
// terminé, quand les appels sont déjà partis. Celui-ci arrête les appels.
//
// La consommation suit le nombre de tickers DISTINCTS détenus par l'ensemble
// des utilisateurs — un appel par ticker et par jour, mutualisé par le cache.
// Elle grandit donc avec les inscriptions, sans que personne n'ait rien changé :
// vingt tickers distincts font 440 appels par mois, quatre-vingts en font 1760.
// Le plan gratuit s'arrête à 1000.
//
// Passé le plafond, `searchWeb` rend une liste vide plutôt qu'une erreur : le
// récap se rédige alors sur les seules variations de cours (le modèle sait
// écrire « aucun résultat web »). Un récap sans actualité vaut mieux qu'un
// récap absent, et mieux qu'une facture surprise.
const TAVILY_BUDGET_MOIS = Number(process.env.TAVILY_BUDGET_MOIS || 900);
const moisIso = todayIso.slice(0, 7);            // AAAA-MM
let _tavilyMois = 0;                             // appels déjà faits ce mois-ci
let _plafondAtteintSignale = false;

async function chargerConsommationDuMois() {
  try {
    const snap = await db.doc(`apiUsage/mois-${moisIso}`).get();
    _tavilyMois = Number(snap.exists ? snap.data().tavilyCalls : 0) || 0;
  } catch (e) {
    // Compteur illisible : on ne bloque pas le récap pour autant, le seuil du
    // run en cours reste là pour prévenir.
    console.warn('Compteur mensuel Tavily illisible :', e.message);
    _tavilyMois = 0;
  }
  console.log(`Tavily : ${_tavilyMois} appel(s) ce mois-ci, plafond ${TAVILY_BUDGET_MOIS}`);
}

async function alerteOps(texte) {
  try {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.doc(`opsAlerts/${id}`).set({ type: 'api-quota', texte, createdAt: Date.now() });
  } catch (e) { console.warn('opsAlerts write error:', e.message); }
}

/** Reste-t-il du budget ? Prévient une fois, au moment où il s'épuise. */
async function budgetTavilyDisponible() {
  if (_tavilyMois + _tavilyCalls < TAVILY_BUDGET_MOIS) return true;
  if (!_plafondAtteintSignale) {
    _plafondAtteintSignale = true;
    await alerteOps(
      `Récap quotidien — plafond Tavily atteint : ${_tavilyMois + _tavilyCalls} appels ce mois-ci `
      + `(plafond ${TAVILY_BUDGET_MOIS}). Les récaps continuent, sans actualité web, `
      + `jusqu'au 1er du mois prochain.`,
    );
  }
  return false;
}

async function checkApiQuotaAndAlert() {
  try {
    await db.doc(`apiUsage/${todayIso}`).set({
      tavilyCalls: _tavilyCalls, mistralCalls: _mistralCalls, at: new Date().toISOString(),
    }, { merge: true });
  } catch (e) { console.warn('apiUsage write error:', e.message); }

  // Compteur mensuel : c'est lui qui commande le plafond, il doit refléter
  // le run même si l'écriture du compteur du jour a échoué.
  try {
    await db.doc(`apiUsage/mois-${moisIso}`).set(
      { tavilyCalls: FieldValue.increment(_tavilyCalls), at: new Date().toISOString() },
      { merge: true },
    );
  } catch (e) { console.warn('apiUsage mensuel write error:', e.message); }

  // Prévenir AVANT de buter dessus : à 80 % du plafond, il reste quelques
  // jours pour prendre un plan payant ou réduire la voilure.
  const totalMois = _tavilyMois + _tavilyCalls;
  if (!_plafondAtteintSignale && totalMois >= TAVILY_BUDGET_MOIS * 0.8) {
    await alerteOps(
      `Récap quotidien — Tavily à ${totalMois} appels ce mois-ci, plafond ${TAVILY_BUDGET_MOIS}. `
      + `Au rythme actuel, l'actualité web s'arrêtera avant la fin du mois.`,
    );
  }

  const overages = [];
  if (_tavilyCalls  > TAVILY_ALERT_THRESHOLD)  overages.push(`Tavily : ${_tavilyCalls} appels (seuil ${TAVILY_ALERT_THRESHOLD})`);
  if (_mistralCalls > MISTRAL_ALERT_THRESHOLD) overages.push(`Mistral : ${_mistralCalls} appels (seuil ${MISTRAL_ALERT_THRESHOLD})`);
  if (!overages.length) return;

  try {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.doc(`opsAlerts/${id}`).set({
      type: 'api-quota',
      texte: `Récap quotidien — consommation API anormale :\n${overages.join('\n')}`,
      createdAt: Date.now(),
    });
  } catch (e) { console.warn('opsAlerts write error:', e.message); }
}

// ─── RECHERCHE WEB (Tavily) ──────────────────────────────────
// Renvoie des résultats web récents (titres + extraits) pour une requête.
async function searchWeb(query) {
  if (!(await budgetTavilyDisponible())) return [];
  _tavilyCalls++;
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
async function getOrFetchTavily(ticker, name, type = 'daily', { cacheSeul = false } = {}) {
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
  /* Ligne calme : on prend ce qu'un autre portefeuille a déjà payé aujourd'hui,
     mais on ne tire pas de crédit pour elle. */
  if (cacheSeul) return [];

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
  _mistralCalls++;
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

// ─── GARDE-FOU : LIGNES INVENTÉES ────────────────────────────
// Malgré des consignes explicites, le modèle ajoute parfois des lignes absentes
// du portefeuille — des ETF plausibles pour un PEA (« Euro Inflation », « USD
// Treasury Bond »), accompagnés d'une analyse crédible et fausse. Le prompt ne
// suffit pas : chaque section est donc confrontée aux lignes réelles, et ce qui
// ne correspond à rien est jeté.
function _normLabel(s) {
  return String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Une section est reconnue si elle cite le ticker, ou si le nom réel s'y
// retrouve presque en entier. Compter deux mots communs ne suffit pas : les
// noms d'ETF partagent tous « amundi », « ucits » ou « etf », si bien qu'un
// « Amundi ETF Euro Inflation » inventé passait pour un « Amundi PEA
// Nasdaq-100 » détenu.
const _GENERIC_WORDS = new Set([
  'etf', 'ucits', 'acc', 'dist', 'eur', 'usd', 'dr', 'the', 'and',
  'index', 'fund', 'daily', 'swap', 'inc', 'sa', 'se', 'plc', 'nv',
]);

function _matchesKnownLine(sectionTitle, lines) {
  const t = _normLabel(sectionTitle);
  if (!t) return false;
  return lines.some(l => {
    const tick = _normLabel(String(l.ticker || '').split('.')[0]);
    if (tick && tick.length >= 2 && t.includes(tick)) return true;
    const words = _normLabel(l.name).split(' ').filter(w => w.length > 1);
    const strong = words.filter(w => !_GENERIC_WORDS.has(w));
    if (!strong.length) return false;
    const hits = strong.filter(w => t.includes(w)).length;
    // Le modèle est censé recopier le nom : on exige qu'il en reste l'essentiel.
    return hits / strong.length >= 0.7;
  });
}

// Garde l'intro, les sections d'une ligne détenue et les rubriques transverses.
function stripUnknownLines(text, lines, keepTitles) {
  const keep = (keepTitles || []).map(_normLabel);
  const out = [];
  let dropped = 0;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { out.push(line); continue; }
    const idx = line.indexOf(':');
    // Pas de « Titre: » → suite d'une section, conservée telle quelle.
    if (idx === -1 || idx > 120) { out.push(line); continue; }
    const title = line.slice(0, idx);
    const nt = _normLabel(title);
    if (keep.some(k => nt.startsWith(k))) { out.push(line); continue; }
    if (_matchesKnownLine(title, lines)) { out.push(line); continue; }
    dropped++;
    console.warn('  Section hors portefeuille ecartee : ' + title.slice(0, 60));
  }
  if (dropped) console.warn('  ' + dropped + ' section(s) inventee(s) supprimee(s)');
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── QUELLES LIGNES MÉRITENT UNE RECHERCHE ───────────────────
// Un crédit par ligne et par jour, c'était payer pour apprendre qu'une ligne à
// +0,1 % n'a pas d'actualité. Trois filtres, dans cet ordre :
//
//   1. une ligne qui a bougé d'au moins SEUIL_MOUVEMENT % ;
//   2. sinon, les TOP_MOUVEMENTS plus gros mouvements du jour, même petits,
//      pour qu'un jour calme ne donne pas un récap sans une seule actualité ;
//   3. le tout plafonné à MAX_RECHERCHES lignes par portefeuille.
//
// Les lignes écartées ne sont pas muettes : leur cache du jour est relu sans
// tirer de crédit, et il est souvent rempli — un ticker courant a déjà été
// cherché pour un autre portefeuille.
const SEUIL_MOUVEMENT = Number(process.env.TAVILY_SEUIL_MOUVEMENT || 1.5);
const TOP_MOUVEMENTS  = Number(process.env.TAVILY_TOP_MOUVEMENTS  || 3);
const MAX_RECHERCHES  = Number(process.env.TAVILY_MAX_PAR_RUN     || 8);

function lignesACherher(lines) {
  const parAmplitude = [...lines].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const retenus = new Set(
    parAmplitude.filter(l => Math.abs(l.changePct) >= SEUIL_MOUVEMENT).map(l => l.ticker),
  );
  for (const l of parAmplitude.slice(0, TOP_MOUVEMENTS)) retenus.add(l.ticker);

  // Plafond : on garde les plus gros mouvements, ce sont ceux qui ont une
  // actualité à expliquer.
  return new Set(
    parAmplitude.filter(l => retenus.has(l.ticker)).slice(0, MAX_RECHERCHES).map(l => l.ticker),
  );
}

// ─── RAPPORT QUOTIDIEN ───────────────────────────────────────
// 1) Tavily cherche l'actualité réelle de chaque ligne.
// 2) Mistral rédige le rapport en s'appuyant UNIQUEMENT sur ces résultats.
async function generateReport(lines, totalPct) {
  // 1. Recherche web par ligne (cache Tavily partagé entre users)
  const aChercher = lignesACherher(lines);
  console.log(`    Recherche web : ${aChercher.size}/${lines.length} ligne(s)`);

  const searchPairs = await Promise.all(lines.map(async l => {
    const results = await getOrFetchTavily(l.ticker, l.name, 'daily', {
      cacheSeul: !aChercher.has(l.ticker),
    });
    return [l.ticker, results];
  }));
  const webByTicker = Object.fromEntries(searchPairs);

  // 2. Contexte pour le modèle
  const ctx = lines.map(l => {
    const r = webByTicker[l.ticker] || [];
    return `### ${l.name} (${l.ticker}) — ${ENV_LABELS[l.env] || 'PEA'} — variation du jour : ${fmtp(l.changePct)}\n`
      + (r.length
        ? r.map(x => `- ${x.title} : ${x.content}`).join('\n')
        : aChercher.has(l.ticker)
          ? '- (aucun résultat web)'
          : '- (variation faible : pas de recherche, commente le seul mouvement)');
  }).join('\n\n');

  const prompt = `Tu es analyste financier. Rédige le rapport quotidien de ce patrimoine, daté du ${today}.
Les lignes viennent de trois enveloppes : PEA, compte-titres et crypto. Le compte-titres
n'a pas les contraintes du PEA (places hors Europe possibles) et ses plus-values sont
imposées à 31,4 %. Une crypto se traite en continu, week-end compris.

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
- N'ajoute AUCUNE ligne absente de la liste : le rapport compte exactement ${lines.length} section(s) de ligne, ni plus ni moins.
- Explication : si les résultats web expliquent réellement le mouvement (résultats financiers, annonce, actualité sectorielle, macro, indice suivi), donne-la. Sinon écris exactement : "Rien de notable, mouvement lié à la tendance de marché."
- Ne mélange pas : soit une vraie explication, soit la phrase "Rien de notable" — jamais les deux.
- Appuie-toi UNIQUEMENT sur les résultats web fournis. N'invente JAMAIS un événement, un chiffre ou une annonce absent de ces résultats.
- Français, factuel, concis. Aucun conseil d'achat ou de vente. Pas d'URL. Une seule ligne de texte par section.`;

  try {
    const text = await callMistral(prompt);
    if (!text) return 'Analyse IA indisponible aujourd\'hui.';
    return stripUnknownLines(text, lines, ['synthese']) || 'Analyse IA indisponible aujourd\'hui.';
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

// ─── ACTUALITÉ DE LA SEMAINE, SANS RECHERCHE NEUVE ───────────
// Le rapport hebdo tirait une requête par ligne, en plus de celle du jour :
// le vendredi coûtait le double. Or la semaine a déjà été cherchée, jour après
// jour, et ces résultats dorment dans le cache. On les relit et on les
// fusionne — deux articles du mardi et un du jeudi valent mieux qu'une
// requête neuve, et ne coûtent rien.
async function actualiteDeLaSemaine(ticker) {
  const vus = new Set();
  const fusion = [];
  for (let i = 0; i < 7; i++) {
    const jour = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    try {
      const snap = await db.doc(`tavilyCache/${jour}/tickers/${ticker}`).get();
      if (!snap.exists) continue;
      for (const r of (snap.data().daily || [])) {
        const cle = (r.title || '').toLowerCase();
        if (!cle || vus.has(cle)) continue;
        vus.add(cle);
        fusion.push(r);
      }
    } catch (e) {
      console.warn(`Cache semaine illisible (${ticker}, ${jour}):`, e.message);
    }
    if (fusion.length >= 8) break;
  }
  return fusion.slice(0, 8);
}

// Rapport hebdo : 6 sections, ancré sur ce que la semaine a déjà appris.
async function generateWeeklyReport(weekLines, weekPct, dividends) {
  /* Une requête hebdo n'est tirée que pour les lignes dont la semaine n'a rien
     retenu, et seulement pour les plus gros mouvements : c'est là qu'une
     absence d'actualité se remarque. */
  const aChercher = lignesACherher(weekLines.map(l => ({ ...l, changePct: l.weekPct })));

  const searchPairs = await Promise.all(weekLines.map(async l => {
    const cache = await actualiteDeLaSemaine(l.ticker);
    if (cache.length >= 3 || !aChercher.has(l.ticker)) return [l.ticker, cache];
    const neuf = await getOrFetchTavily(l.ticker, l.name, 'weekly');
    return [l.ticker, neuf.length ? neuf : cache];
  }));
  const webByTicker = Object.fromEntries(searchPairs);
  console.log(`    Hebdo : ${searchPairs.filter(([, r]) => r.length).length}/${weekLines.length} ligne(s) documentée(s)`);

  const ctx = weekLines.map(l => {
    const r = webByTicker[l.ticker] || [];
    return `### ${l.name} (${l.ticker}) — variation de la semaine : ${fmtp(l.weekPct)}\n`
      + (r.length ? r.map(x => `- ${x.title} : ${x.content}`).join('\n') : '- (aucun résultat web)');
  }).join('\n\n');

  const divInfo = dividends.length
    ? dividends.map(d => `- ${d.name} : ${d.amount ? d.amount + ' € ' : ''}vers le ${d.date}${d.estimated ? ' (date estimée)' : ''}`).join('\n')
    : '(aucun dividende à venir — lignes capitalisantes ou sans versement prévu)';

  const prompt = `Tu es analyste financier. Rédige le RAPPORT HEBDOMADAIRE de ce patrimoine, semaine se terminant le ${today}.
Les lignes viennent de trois enveloppes : PEA, compte-titres et crypto.

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
    if (!text) return 'Analyse IA indisponible cette semaine.';
    return stripUnknownLines(text, lines, ['synthese marche', 'synthese', 'points d attention'])
      || 'Analyse IA indisponible cette semaine.';
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
    // DATA-ONLY, jamais de champ `notification` : sur le web, un payload
    // `notification` est affiché d'office par le navigateur ET réaffiché par
    // onBackgroundMessage dans le service worker — d'où la notification en
    // double tous les soirs. En data-only, seul le service worker affiche.
    await messaging.send({
      token,
      data: { title: String(title || ''), body: String(body || ''), type },
      webpush: { headers: { Urgency: 'high' } },
    });
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
  await chargerConsommationDuMois();

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

    // 3. Récupérer les lignes des trois enveloppes suivies
    const portfolio = await getUserLignes(user.uid);
    if (!portfolio.length) {
      console.log(`   Aucune ligne suivie, ignoré`);
      continue;
    }
    console.log(`  ${portfolio.length} ligne(s) détectée(s)`
      + ` (${['pea','cto','crypto'].map(e => e + ':' + portfolio.filter(r => r.env === e).length).join(' ')})`);

    // 4. Récupérer les prix en parallèle
    const priceResults = await Promise.all(
      portfolio.map(async row => {
        const data = await fetchPrice(symboleYahoo(row));
        return { row, data };
      })
    );

    // 5. Construire les lignes enrichies
    const lines = priceResults
      .filter(({ data }) => data !== null)
      .map(({ row, data }) => ({
        ticker:    row.ticker,
        // Yahoo nomme une crypto « Bitcoin EUR » : le nom du catalogue est
        // plus juste dans un tableau où tout est déjà en euros.
        name:      (row.env === 'crypto' ? row.name : (data.name || row.name)) || row.ticker,
        env:       row.env,
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
        portfolio.map(async row => ({ row, w: await fetchWeek(symboleYahoo(row)) }))
      );
      const weekLines = weekResults
        .filter(({ w }) => w && w.weekStart > 0)
        .map(({ row, w }) => ({
          ticker:    row.ticker,
          name:      (row.env === 'crypto' ? row.name : (w.name || row.name)) || row.ticker,
          env:       row.env,
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
        // Une crypto ne verse pas de dividende : on ne l'interroge pas.
        const divs        = await upcomingDividends(portfolio.filter(r => r.env !== 'crypto'));

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

  await checkApiQuotaAndAlert();
  console.log(`\nRécap quotidien terminé (Tavily: ${_tavilyCalls} appels, Mistral: ${_mistralCalls} appels)\n`);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
