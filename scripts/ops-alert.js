// Écrit une alerte dans `opsAlerts` ; le bot Discord l'écoute et la poste
// (voir discord-bot/src/lib/ops-alerts.js). Passer par Firestore plutôt que par
// un webhook évite de stocker un secret Discord de plus dans GitHub : la clé de
// service, elle, est déjà là pour les autres scripts.
//
// Usage :
//   node ops-alert.js --type "scan de sécurité" --salon 123 --fichier rapport.md
//   node ops-alert.js --type ping --texte "coucou"

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
const fichier = opt('fichier');

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
});

console.log(`opsAlerts/${id} écrit (salon ${salon || 'par défaut'}).`);
