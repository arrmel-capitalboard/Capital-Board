'use strict';

// Liaison compte Discord ↔ compte Capital Board (Firebase UID), via Firestore.
//   discordLinkCodes/{code}  = { uid, expiresAt }   (écrit par le site)
//   discordLinks/{discordId} = { uid, linkedAt }    (écrit par le bot)

const crypto = require('node:crypto');
const { getDb } = require('../firebase');

/** UID Firebase lié à un compte Discord, ou null. */
async function getUid(discordId) {
  const snap = await getDb().doc(`discordLinks/${discordId}`).get();
  return snap.exists ? snap.data().uid : null;
}

/**
 * Sens inverse : compte Discord lié à un UID Firebase, ou null. Sert au récap
 * hebdo des suggestions, où l'on part de l'auteur (côté app) pour lui écrire en
 * MP. Le lien étant unique par compte, on prend le premier trouvé.
 */
async function getDiscordId(uid) {
  const snap = await getDb().collection('discordLinks').where('uid', '==', uid).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

/**
 * Crée une demande de liaison (le bot connaît le discordId). Le site,
 * une fois ouvert avec ce token par un utilisateur connecté, appelle le
 * Worker qui vérifie l'idToken et écrit le lien. Retourne le token.
 */
async function createLinkRequest(discordId, discordTag) {
  const token = crypto.randomBytes(20).toString('hex'); // 40 hex
  await getDb().doc(`discordLinkRequests/${token}`).set({
    discordId,
    discordTag,
    createdAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
  });
  return token;
}

/** Supprime le lien d'un compte Discord. */
async function unlink(discordId) {
  await getDb().doc(`discordLinks/${discordId}`).delete();
}

/** Items d'une collection de données utilisateur (portfolio, watchlist, transactions…). */
async function getUserItems(uid, col) {
  const snap = await getDb().doc(`users/${uid}/data/${col}`).get();
  return snap.exists ? snap.data().items || [] : [];
}

/** Lignes du portefeuille d'un utilisateur. */
function getPortfolio(uid) {
  return getUserItems(uid, 'portfolio');
}

module.exports = { getUid, createLinkRequest, unlink, getPortfolio, getUserItems };
