// Écrit une alerte dans `opsAlerts` ; le bot Discord l'écoute et la poste
// (voir discord-bot/src/lib/ops-alerts.js). Passer par Firestore plutôt que par
// un webhook évite de stocker un secret Discord de plus dans GitHub : la clé de
// service, elle, est déjà là pour les autres scripts.
//
// Usage :
//   node ops-alert.js --type "scan de sécurité" --salon 123 --fichier rapport.md
//   node ops-alert.js --type ping --texte "coucou"
//   node ops-alert.js --get --id <id> --sortie rapport.md
//   node ops-alert.js --statut --id <id> --valeur produit --patch <scanPatchId>
//   node ops-alert.js --statut --id <id> --valeur echec --erreur "message"
//
// `--titre` et `--couleur` (hexadécimal, ex. 0x22d98a) remplacent l'habillage
// « alerte » par défaut : un scan qui ne trouve rien ne doit pas arriver en
// orange avec un panneau attention.
//
// `--corrigible` ajoute un bouton « Corriger » sous l'alerte : le fondateur
// peut demander depuis Discord qu'un correctif soit écrit pour les problèmes
// décrits. Réservé aux comptes rendus d'analyse — une alerte de quota n'a rien
// à corriger dans le code. Le bouton déclenche security-fix.yml, qui relit ce
// même document pour savoir quoi corriger : d'où les modes --get et --statut.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const a = (nom) => args.includes('--' + nom);
const opt = (nom) => {
  const i = args.indexOf('--' + nom);
  return i === -1 || i === args.length - 1 ? null : args[i + 1];
};

const COL = 'opsAlerts';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

if (a('get')) {
  // Relecture par security-fix.yml : le compte rendu est la description des
  // problèmes à corriger, il n'existe que dans ce document.
  const snap = await db.doc(`${COL}/${opt('id')}`).get();
  if (!snap.exists) {
    console.error('Alerte introuvable.');
    process.exit(2);
  }
  const d = snap.data();
  writeFileSync(opt('sortie') || 'alerte.md', d.texte || '', 'utf8');
  console.log(JSON.stringify({
    type: d.type || '',
    titre: d.titre || '',
    salon: d.salon || '',
    corrigible: d.corrigible === true,
    fixStatut: d.fixStatut || '',
  }));

} else if (a('statut')) {
  // Suivi de la demande de correctif. Le bot écoute ce document et réécrit son
  // message : l'état du travail se lit dans le salon, pas dans un log de run.
  const maj = { fixStatut: opt('valeur'), fixMajLe: Date.now() };
  if (opt('patch')) maj.fixPatchId = opt('patch');
  // Toujours écrit, y compris à null : sans cela, le message d'un échec
  // précédent resterait affiché sous une tentative qui a réussi.
  maj.fixErreur = opt('erreur') || null;
  await db.doc(`${COL}/${opt('id')}`).update(maj);
  console.log(`${COL}/${opt('id')} → ${maj.fixStatut}.`);

} else {
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

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.doc(`${COL}/${id}`).set({
    type,
    // La description d'un embed Discord plafonne à 4096 caractères ; on coupe
    // avant pour que le bot n'ait pas à tronquer en aveugle.
    texte: texte.slice(0, 3900),
    createdAt: Date.now(),
    ...(salon ? { salon } : {}),
    ...(titre ? { titre } : {}),
    ...(mention ? { mention } : {}),
    ...(couleur !== null ? { couleur } : {}),
    ...(a('corrigible') ? { corrigible: true } : {}),
  });

  console.log(`${COL}/${id} écrit (salon ${salon || 'par défaut'}${a('corrigible') ? ', corrigible' : ''}).`);
}
