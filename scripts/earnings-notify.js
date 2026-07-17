// ─────────────────────────────────────────────────────────────
// earnings-notify.js — Push le jour de la publication des résultats
// Lancé par GitHub Actions plusieurs fois/jour (jours ouvrés).
//
// Scalabilité : on NE balaye PAS tous les users. On lit les earnings
// du jour (snapshot Worker), puis pour chaque titre publié on lit son
// index inversé earningsSubscribers/{SYM}/users → push aux abonnés.
// Coût = O(earnings du jour × abonnés), pas O(nb users).
// ─────────────────────────────────────────────────────────────

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { getMessaging }        from 'firebase-admin/messaging';
import fetch                   from 'node-fetch';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const WORKER_URL = process.env.WORKER_URL || 'https://api.capitalboard.fr';

initializeApp({ credential: cert(serviceAccount) });
const db        = getFirestore();
const messaging = getMessaging();

const NOTIFIED_DOC = 'config/earningsNotified';

// Heure UTC approximative de publication selon le créneau Finnhub.
// bmo = before market open, amc = after market close, dmh = during market hours.
const RELEASE_HOUR_UTC = { bmo: 12, dmh: 15, amc: 21 };

function todayUtc() { return new Date().toISOString().slice(0, 10); }

function isReleased(item, now) {
  const hr = RELEASE_HOUR_UTC[item.hour] ?? 21;   // défaut : après clôture
  const releaseTs = Date.parse(item.date + 'T' + String(hr).padStart(2, '0') + ':00:00Z');
  return now >= releaseTs;
}

// Liste tous les symboles ayant au moins un abonné (docs parents de earningsSubscribers/{SYM}/users).
async function getAllSubscribedSymbols() {
  const refs = await db.collection('earningsSubscribers').listDocuments();
  return refs.map(r => r.id.toUpperCase());
}

// Earnings du jour pour les symboles abonnés (Worker fetch par-symbole, cache KV).
async function fetchTodayEarnings(syms) {
  if (!syms.length) return [];
  const day = todayUtc();
  const url = `${WORKER_URL}/earnings?symbols=${encodeURIComponent(syms.join(','))}&from=${day}&to=${day}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Worker /earnings ${res.status}`);
  const j = await res.json();
  return Array.isArray(j.items) ? j.items : [];
}

async function getSubscribers(sym) {
  const snap = await db.collection(`earningsSubscribers/${sym}/users`).get();
  return snap.docs.map(d => d.id);
}

async function loadNotified() {
  const snap = await db.doc(NOTIFIED_DOC).get();
  return snap.exists ? (snap.data().keys || {}) : {};
}

async function saveNotified(keys) {
  // Purge les clés de plus de 3 jours.
  const cutoff = Date.now() - 3 * 86400 * 1000;
  for (const k of Object.keys(keys)) if (keys[k] < cutoff) delete keys[k];
  await db.doc(NOTIFIED_DOC).set({ keys });
}

async function logNotifHistory(uid, title, body) {
  const ref = db.doc(`users/${uid}/data/notifHistory`);
  const snap = await ref.get();
  const history = snap.exists ? (snap.data().items || []) : [];
  history.unshift({ id: Date.now(), type: 'earnings', title, body, timestamp: new Date().toISOString(), read: false });
  if (history.length > 50) history.splice(50);
  await ref.set({ items: history });
}

async function sendFcmPush(uid, title, body) {
  try {
    const roleSnap = await db.doc(`roles/${uid}`).get();
    const token = roleSnap.exists ? roleSnap.data().fcmToken : null;
    if (!token) { console.log(`  — Pas de token FCM pour ${uid}`); return; }
    await messaging.send({ token, notification: { title, body }, data: { type: 'earnings' } });
    console.log(`  Push envoyé à ${uid}`);
  } catch(e) {
    console.warn(`  Push échoué pour ${uid}:`, e.message);
  }
}

async function main() {
  console.log(`\nNotifications résultats — ${new Date().toISOString()}\n`);
  const now = Date.now();

  const symbols = await getAllSubscribedSymbols();
  console.log(`${symbols.length} symbole(s) suivi(s) par au moins un user`);
  const items = await fetchTodayEarnings(symbols);
  console.log(`${items.length} résultat(s) prévu(s) aujourd'hui`);

  const released = items.filter(it => isReleased(it, now));
  console.log(`${released.length} déjà publié(s) (créneau passé)`);
  if (!released.length) { console.log('Rien à notifier.'); return; }

  const notified = await loadNotified();
  let pushCount = 0;

  for (const it of released) {
    const sym = (it.symbol || '').toUpperCase();
    const key = `${sym}_${it.date}`;
    if (notified[key]) continue;                       // déjà traité

    const subs = await getSubscribers(sym);
    if (subs.length) {
      const title = `Résultats ${sym}`;
      const body  = `${sym} vient de publier ses résultats. Consultez le détail dans Capital Board.`;
      console.log(`${sym} : ${subs.length} abonné(s)`);
      for (const uid of subs) {
        await sendFcmPush(uid, title, body);
        await logNotifHistory(uid, title, body);
        pushCount++;
      }
    }
    notified[key] = now;                               // marque traité (même si 0 abonné)
  }

  await saveNotified(notified);
  console.log(`\n${pushCount} push envoyé(s). Terminé.\n`);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
