// ─────────────────────────────────────────────────────────────
// queue-feature.mjs — Met en file de validation les nouveautés d'un push
// Lancé par GitHub Actions à chaque push sur main (voir nouveautes.yml).
//
// Ne retient que les commits « feat » (nouvelles fonctionnalités) ; les
// chore/fix/docs/refactor sont ignorés. Le sujet du commit, nettoyé de son
// préfixe conventionnel, devient une entrée « pending » dans newsQueue. Le
// bot postera ensuite un message de validation dans Discord.
//
// Aucun accès Discord ici : uniquement une écriture Firestore (Admin SDK).
// ─────────────────────────────────────────────────────────────

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// feat: xxx / feat(scope): xxx / feat!: xxx / feat(scope)!: xxx
const FEAT = /^feat(\([^)]*\))?!?:\s*(.+)$/i;

/** Texte affichable depuis un sujet de commit feat, ou null si non-feat. */
function featureText(subject) {
  const m = subject.match(FEAT);
  if (!m) return null;
  const t = m[2].trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Traduit EN→FR via l'endpoint gratuit Google translate (sans clé). En cas
 *  d'échec réseau/format, on conserve le texte anglais (dégradé, pas bloquant :
 *  le fondateur peut toujours le corriger via le bouton « Modifier le texte »). */
async function translateToFr(text) {
  try {
    const url = 'https://translate.googleapis.com/translate_a/single'
      + '?client=gtx&sl=en&tl=fr&dt=t&q=' + encodeURIComponent(text);
    const res = await fetch(url);
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    const out = (data[0] || []).map((seg) => seg[0]).join('').trim();
    return out || text;
  } catch (e) {
    console.warn(`[queue] traduction échouée (« ${text} »), texte EN conservé : ${e.message}`);
    return text;
  }
}

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const commits = event.commits || [];

const features = [];
for (const c of commits) {
  const subject = (c.message || '').split('\n')[0];
  const raw = featureText(subject);
  if (!raw) continue;
  const text = await translateToFr(raw);
  features.push({ text, sha: c.id });
}

if (!features.length) {
  console.log('[queue] aucun commit feat dans ce push — rien à mettre en file.');
  process.exit(0);
}

for (const f of features) {
  // Idempotence : un même commit ne doit pas créer deux entrées (ex. re-run).
  const dup = await db.collection('newsQueue').where('sha', '==', f.sha).limit(1).get();
  if (!dup.empty) {
    console.log(`[queue] déjà en file : ${f.text}`);
    continue;
  }
  await db.collection('newsQueue').add({
    text: f.text,
    source: 'commit',
    sha: f.sha,
    status: 'pending',
    createdAt: Date.now(),
    sentAt: null,
    messageId: null,
  });
  console.log(`[queue] + ${f.text}`);
}
