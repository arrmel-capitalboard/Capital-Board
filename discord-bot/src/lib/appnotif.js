'use strict';

// Notification dans l'application, et nulle part ailleurs.
//
// `users/{uid}/data/notifHistory` = { items: [ { id, type, title, body,
// timestamp, read } ] }, la même structure que celle écrite par les scripts
// (récap quotidien, alertes de prix, résultats d'entreprises). L'app la lit
// dans son onglet Notifications.
//
// Ce module n'envoie ni push ni e-mail, volontairement : une réponse à une
// suggestion mérite d'être vue, pas de faire vibrer un téléphone. Elle attend
// dans l'onglet que la personne y passe.
//
// Cinquante entrées au maximum, comme les scripts : le document est relu en
// entier à chaque lecture de la page, il n'a pas à grossir indéfiniment.

const { getDb, isConfigured } = require('../firebase');

const MAX_ITEMS = 50;

/**
 * Ajoute une notification à l'historique d'un compte. Ne lève jamais :
 * l'appelant vient de faire quelque chose de plus important (enregistrer une
 * décision), et l'échec d'une notification ne doit pas le remettre en cause.
 *
 * @returns {Promise<boolean>} true si elle a été écrite.
 */
async function ajouter(uid, { type = 'info', title, body }) {
  if (!isConfigured() || !uid || !title) return false;
  const ref = getDb().doc(`users/${uid}/data/notifHistory`);
  try {
    const snap = await ref.get();
    const items = snap.exists ? (snap.data().items || []) : [];
    items.unshift({
      id: Date.now(),
      type,
      title: String(title).slice(0, 120),
      body: String(body || '').slice(0, 600),
      timestamp: new Date().toISOString(),
      read: false,
    });
    if (items.length > MAX_ITEMS) items.splice(MAX_ITEMS);
    await ref.set({ items }, { merge: true });
    return true;
  } catch (e) {
    console.error(`[appnotif] écriture pour ${uid} :`, e.message);
    return false;
  }
}

module.exports = { ajouter };
