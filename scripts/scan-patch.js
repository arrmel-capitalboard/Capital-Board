// Correctifs de sécurité proposés par le scan, en attente de validation dans
// Discord (voir discord-bot/src/lib/scan-patches.js).
//
// Usage :
//   node scan-patch.js --set --resume rapport.md --patch fix.patch --base <sha> --run <url> [--salon <id>]
//   node scan-patch.js --get --id <id> --sortie fix.patch
//   node scan-patch.js --statut --id <id> --valeur applique --commit <sha>
//   node scan-patch.js --statut --id <id> --valeur erreur --erreur "message"

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const a = (nom) => args.includes('--' + nom);
const opt = (nom) => {
  const i = args.indexOf('--' + nom);
  return i === -1 || i === args.length - 1 ? null : args[i + 1];
};

const COL = 'scanPatches';

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

if (a('set')) {
  const patch = readFileSync(opt('patch'), 'utf8');
  const resume = readFileSync(opt('resume'), 'utf8');
  if (!patch.trim()) {
    console.error('Patch vide : rien à proposer.');
    process.exit(1);
  }

  // Les fichiers touchés, lus dans les en-têtes du diff : ils s'affichent dans
  // l'embed, alors que le patch complet part en pièce jointe.
  const fichiers = [...new Set(
    patch.split('\n')
      .filter((l) => l.startsWith('+++ b/'))
      .map((l) => l.slice(6).trim()),
  )];

  const ref = await db.collection(COL).add({
    resume: resume.slice(0, 3900),
    patch,
    fichiers,
    base: opt('base') || null,
    runUrl: opt('run') || null,
    statut: 'attente',
    createdAt: Date.now(),
    // Sans --salon, le bot poste dans le salon des scans de code. L'analyse de
    // trafic Burp a le sien : le correctif doit suivre son compte rendu.
    ...(opt('salon') ? { salon: opt('salon') } : {}),
  });
  console.log(`${COL}/${ref.id} écrit (${fichiers.length} fichiers, ${patch.length} caractères).`);

} else if (a('get')) {
  const snap = await db.doc(`${COL}/${opt('id')}`).get();
  if (!snap.exists) {
    console.error('Correctif introuvable.');
    process.exit(2);
  }
  const d = snap.data();
  writeFileSync(opt('sortie') || 'fix.patch', d.patch, 'utf8');
  // Le workflow d'application a besoin de la base pour vérifier qu'il applique
  // le patch sur le même code que celui sur lequel il a été calculé.
  console.log(JSON.stringify({ base: d.base || '', statut: d.statut, commitSha: d.commitSha || '' }));

} else if (a('statut')) {
  const maj = { statut: opt('valeur'), majLe: Date.now() };
  if (opt('commit')) maj.commitSha = opt('commit');
  if (opt('erreur')) maj.erreur = opt('erreur');
  await db.doc(`${COL}/${opt('id')}`).update(maj);
  console.log(`${COL}/${opt('id')} → ${maj.statut}.`);

} else {
  console.error('Préciser --set, --get ou --statut.');
  process.exit(1);
}
