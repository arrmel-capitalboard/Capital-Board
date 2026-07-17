'use strict';

const { getDb } = require('../firebase');

const INTERVAL = 15 * 60 * 1000;

async function sweep() {
  const db = getDb();
  const snap = await db.collection('discordLinkRequests').where('expiresAt', '<', Date.now()).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`[linkcleaner] ${snap.size} requête(s) expirée(s) supprimée(s)`);
}

function start() {
  sweep().catch((err) => console.error('[linkcleaner] erreur sweep initial :', err.message));
  setInterval(() => sweep().catch((err) => console.error('[linkcleaner] erreur sweep :', err.message)), INTERVAL);
}

module.exports = { start };
