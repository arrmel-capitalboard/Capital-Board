// Écrit une alerte dans `opsAlerts` ; le bot Discord l'écoute et la poste
// (voir discord-bot/src/lib/ops-alerts.js). Passer par Firestore plutôt que par
// un webhook évite de stocker un secret Discord de plus dans GitHub : la clé de
// service, elle, est déjà là pour les autres scripts.
//
// Usage :
//   node ops-alert.js --type "scan de sécurité" --salon 123 --fichier rapport.md
//   node ops-alert.js --type ping --texte "coucou"
//
// `--titre` et `--couleur` (hexadécimal, ex. 0x22d98a) remplacent l'habillage
// « alerte » par défaut : un scan qui ne trouve rien ne doit pas arriver en
// orange avec un panneau attention.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync }        from 'fs';

const args = process.argv.slice(2);
const opt = (nom) => {
  const i = args.indexOf('--' + nom);
  return i === -1 || i === args.length - 1 ? null : args[i + 1];
};

const type    = opt('type') || 'alerte';
const salon   = opt('salon');
const titre   = opt('titre');
// Un rôle mentionné ne notifie que depuis le contenu du message, jamais depuis
// l'embed : le bot le sort donc de la description (voir ops-alerts.js).
const mention = opt('mention');
const fichier = opt('fichier');

const couleurBrute = opt('couleur');
const couleur = couleurBrute ? Number(couleurBrute) : null;
if (couleurBrute && !Number.isInteger(couleur)) {
  console.error(`--couleur invalide : ${couleurBrute} (attendu 0xRRGGBB)`);
  process.exit(1);
}

const texte = fichier ? readFileSync(fichier, 'utf8') : (opt('texte') || '');
if (!texte.trim()) {
  console.error('Rien à envoyer : ni --texte ni --fichier exploitable.');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
await db.doc(`opsAlerts/${id}`).set({
  type,
  // La description d'un embed Discord plafonne à 4096 caractères ; on coupe
  // avant pour que le bot n'ait pas à tronquer en aveugle.
  texte: texte.slice(0, 3900),
  createdAt: Date.now(),
  ...(salon ? { salon } : {}),
  ...(titre ? { titre } : {}),
  ...(mention ? { mention } : {}),
  ...(couleur !== null ? { couleur } : {}),
});

console.log(`opsAlerts/${id} écrit (salon ${salon || 'par défaut'}).`);
