// Range et relit le digest hebdomadaire du scan de sécurité, dans Firestore.
//
// Pourquoi pas un fichier commité : le dépôt est public et le digest décrit ce
// qui mérite un regard sécurité, donc les endroits fragiles. Pourquoi pas un
// artefact GitHub : sur un dépôt public, les artefacts d'un run sont
// téléchargeables par n'importe qui. Firestore est déjà là et fermé.
//
// Usage :
//   node scan-digest.js --set --fichier digest.md
//   node scan-digest.js --get --sortie digest.md

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const a = (nom) => args.includes('--' + nom);
const opt = (nom) => {
  const i = args.indexOf('--' + nom);
  return i === -1 || i === args.length - 1 ? null : args[i + 1];
};

const COL = 'scanDigests';

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

if (a('set')) {
  const fichier = opt('fichier');
  const texte = fichier ? readFileSync(fichier, 'utf8') : '';
  if (!texte.trim()) {
    console.error('Digest vide : rien à ranger.');
    process.exit(1);
  }
  const id = new Date().toISOString().slice(0, 10);
  await db.doc(`${COL}/${id}`).set({ texte, createdAt: Date.now() });
  console.log(`${COL}/${id} écrit (${texte.length} caractères).`);

} else if (a('get')) {
  const sortie = opt('sortie') || 'digest.md';
  const snap = await db.collection(COL).orderBy('createdAt', 'desc').limit(1).get();
  if (snap.empty) {
    console.error('Aucun digest en base.');
    process.exit(2);
  }
  const doc = snap.docs[0];
  writeFileSync(sortie, doc.data().texte, 'utf8');
  console.log(`${COL}/${doc.id} relu vers ${sortie}.`);

} else {
  console.error('Préciser --set ou --get.');
  process.exit(1);
}
