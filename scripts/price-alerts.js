// ─────────────────────────────────────────────────────────────
// price-alerts.js — Vérification alertes prix + notification push
// Lancé par GitHub Actions toutes les heures (jours ouvrés)
// ─────────────────────────────────────────────────────────────

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { getAuth }             from 'firebase-admin/auth';
import { getMessaging }        from 'firebase-admin/messaging';
import fetch                   from 'node-fetch';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

initializeApp({ credential: cert(serviceAccount) });
const db        = getFirestore();
const fbAuth    = getAuth();
const messaging = getMessaging();

const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

async function getAllUsers() {
  const result = await fbAuth.listUsers();
  return result.users.map(u => ({ uid: u.uid, email: u.email, name: u.displayName || u.email.split('@')[0] }));
}

async function getUserAlerts(uid) {
  const snap = await db.doc(`users/${uid}/data/alerts`).get();
  return snap.exists ? (snap.data().items || []) : [];
}

async function saveUserAlerts(uid, alerts) {
  await db.doc(`users/${uid}/data/alerts`).set({ items: alerts });
}

async function getUserSettings(uid) {
  const snap = await db.doc(`users/${uid}/data/settings`).get();
  return snap.exists ? snap.data() : {};
}

async function logNotifHistory(uid, type, title, body) {
  const snap = await db.doc(`users/${uid}/data/notifHistory`).get();
  const history = snap.exists ? (snap.data().items || []) : [];
  history.unshift({ id: Date.now(), type, title, body, timestamp: new Date().toISOString(), read: false });
  if (history.length > 50) history.splice(50);
  await db.doc(`users/${uid}/data/notifHistory`).set({ items: history });
}

// ─── ENVOYER PUSH FCM ────────────────────────────────────────
async function sendFcmPush(uid, title, body) {
  try {
    const roleSnap = await db.doc(`roles/${uid}`).get();
    const token = roleSnap.exists ? roleSnap.data().fcmToken : null;
    if (!token) { console.log(`  — Pas de token FCM pour ${uid}, push ignoré`); return; }
    await messaging.send({ token, notification: { title, body }, data: { type: 'price_alert' } });
    console.log(`  Push FCM envoyé à ${uid}`);
  } catch(e) {
    console.warn(`   Push FCM échoué pour ${uid}:`, e.message);
  }
}

async function fetchPrice(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  try {
    const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return { price: meta.regularMarketPrice, name: meta.shortName || meta.longName || ticker };
  } catch(e) {
    console.warn(`Prix indisponible pour ${ticker}:`, e.message);
    return null;
  }
}

async function main() {
  console.log(`\nVérification alertes prix — ${new Date().toISOString()}\n`);

  const users = await getAllUsers();
  console.log(`${users.length} utilisateur(s)`);

  for (const user of users) {
    console.log(`\n${user.name} (${user.email}) — uid: ${user.uid}`);
    const alerts = await getUserAlerts(user.uid);
    console.log(`  ${alerts.length} alerte(s) totale(s) en Firestore`);
    alerts.forEach((a, i) => console.log(`     [${i}] ${a.ticker} ${a.direction === 'above' ? '>=' : '<='} ${a.targetPrice}€ | active=${a.active} | triggeredAt=${a.triggeredAt || 'null'}`));

    const active = alerts.filter(a => a.active && !a.triggeredAt);
    if (!active.length) { console.log(`  — Aucune alerte active, skip`); continue; }

    console.log(`  ${active.length} alerte(s) active(s)`);

    const settings = await getUserSettings(user.uid);
    console.log(`   notifSettings.priceAlerts = ${settings.notifSettings?.priceAlerts}`);
    if (settings.notifSettings?.priceAlerts === false) {
      console.log(`  Alertes prix désactivées`);
      continue;
    }

    // Fetch prix uniques
    const tickers = [...new Set(active.map(a => a.ticker))];
    console.log(`  Fetch prix pour: ${tickers.join(', ')}`);
    const prices = {};
    await Promise.all(tickers.map(async t => {
      const data = await fetchPrice(t);
      if (data) { prices[t] = data; console.log(`  ${t} = ${data.price}€`); }
      else console.log(`   ${t} — prix indisponible`);
    }));

    const triggered = [];
    active.forEach(alert => {
      const data = prices[alert.ticker];
      if (!data) return;
      const hit = alert.direction === 'above'
        ? data.price >= alert.targetPrice
        : data.price <= alert.targetPrice;
      if (hit) {
        alert.triggeredAt  = new Date().toISOString();
        alert.active       = false;
        alert.currentPrice = data.price;
        alert.name         = data.name || alert.name;
        triggered.push(alert);
        console.log(`  ALERTE: ${alert.ticker} ${alert.direction === 'above' ? '>=' : '<='} ${alert.targetPrice}€ (cours: ${data.price}€)`);
      }
    });

    if (!triggered.length) {
      console.log(`  — Aucun seuil atteint`);
      continue;
    }

    // Sauvegarder alertes mises à jour
    await saveUserAlerts(user.uid, alerts);

    // Log historique in-app + push pour chaque alerte déclenchée
    for (const a of triggered) {
      const dir   = a.direction === 'above' ? '≥' : '≤';
      const title = 'Alerte prix déclenchée';
      const body  = `${a.name} (${a.ticker}) ${dir} ${a.targetPrice}€ — cours : ${fmt(a.currentPrice)}`;
      await logNotifHistory(user.uid, 'price_alert', title, body);
      await sendFcmPush(user.uid, title, body);
    }
  }

  console.log('\nVérification alertes terminée\n');
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
