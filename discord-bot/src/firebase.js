'use strict';

// Accès Firestore via Firebase Admin. Initialisation paresseuse : le bot
// démarre même sans clé (les commandes Firestore lèveront une erreur claire).
// La clé service account n'est JAMAIS commitée (repo public) — voir .gitignore.

const path = require('node:path');
const fs = require('node:fs');

let db = null;
let app = null;
let auth = null;

function getDb() {
  if (db) return db;

  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!keyPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT manquant : Firestore non configuré (voir .env.example).');
  }

  const resolved = path.resolve(keyPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Clé Firebase introuvable : ${resolved}`);
  }

  // require() lazy pour ne pas charger firebase-admin si Firestore n'est pas utilisé.
  // API modulaire : depuis firebase-admin v14, `admin.credential` et
  // `admin.firestore()` n'existent plus sur le namespace racine.
  const { initializeApp, cert } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const serviceAccount = require(resolved);

  app = initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore(app);
  return db;
}

/**
 * Firebase Auth (Admin). L'email et le nom d'un membre n'existent que la —
 * Firestore ne porte que son uid. C'est la seule facon de mettre un nom sur un
 * document, et elle ne coute aucune lecture Firestore.
 */
function getAuth() {
  if (auth) return auth;
  if (!app) getDb(); // initialise l'app, avec les memes controles de cle
  const { getAuth: _getAuth } = require('firebase-admin/auth');
  auth = _getAuth(app);
  return auth;
}

/** True si une clé Firebase est configurée (sans forcer l'init). */
function isConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

module.exports = { getDb, getAuth, isConfigured };
