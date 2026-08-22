// ─────────────────────────────────────────────────────────────
// restore-firestore.mjs — Restauration d'un export produit par
// backup-firestore.mjs, depuis R2 (ou un fichier local) vers Firestore.
//
// DESTRUCTIF : écrase les documents existants portant les mêmes chemins.
// Par sécurité, DRY-RUN par défaut — il faut passer --confirm pour écrire.
//
// Usage :
//   node restore-firestore.mjs firestore/2026-08-20.json          (dry-run, source R2)
//   node restore-firestore.mjs ./backup.json                      (dry-run, fichier local)
//   node restore-firestore.mjs firestore/2026-08-20.json --confirm (écrit réellement)
//   node restore-firestore.mjs firestore/2026-08-20.json --confirm --only=roles,config
//
// Env requis : FIREBASE_SERVICE_ACCOUNT (+ R2_* si la source est une clé R2).
// ─────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, GeoPoint } from 'firebase-admin/firestore';
import { AwsClient } from 'aws4fetch';

const args = process.argv.slice(2);
const source = args.find((a) => !a.startsWith('--'));
const confirm = args.includes('--confirm');
const onlyArg = args.find((a) => a.startsWith('--only='));
const onlyCollections = onlyArg ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean) : null;

if (!source) {
  console.error('Usage: node restore-firestore.mjs <cléR2|fichier.json> [--confirm] [--only=col1,col2]');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Reconstruit un fichier d'export en objets Firestore : inverse de toPlain()
// dans backup-firestore.mjs (Timestamp / GeoPoint / DocumentReference).
function revive(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(revive);
  if (typeof value.__timestamp === 'string') return Timestamp.fromDate(new Date(value.__timestamp));
  if (value.__geopoint) return new GeoPoint(value.__geopoint.lat, value.__geopoint.lng);
  if (typeof value.__ref === 'string') return db.doc(value.__ref);
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = revive(v);
  return out;
}

async function loadSource() {
  // Fichier local si le chemin existe/ressemble à un fichier ; sinon clé R2.
  if (source.endsWith('.json') && (source.startsWith('.') || source.startsWith('/') || source.includes(':\\'))) {
    return JSON.parse(readFileSync(source, 'utf8'));
  }
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })) {
    if (!v) throw new Error(`secret R2 manquant (${k}) — ou passez un chemin de fichier local`);
  }
  const client = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${source}`;
  const res = await client.fetch(url);
  if (!res.ok) throw new Error(`R2 download ${res.status}: ${await res.text()}`);
  return JSON.parse(await res.text());
}

let docCount = 0;

// Restaure récursivement une collection (out[docId] = { data, subcollections? }).
async function restoreCollection(collPath, coll) {
  for (const [docId, entry] of Object.entries(coll)) {
    const docPath = `${collPath}/${docId}`;
    if (entry && entry.data && typeof entry.data === 'object') {
      docCount++;
      if (confirm) await db.doc(docPath).set(revive(entry.data));
    }
    if (entry && entry.subcollections) {
      for (const [subId, subColl] of Object.entries(entry.subcollections)) {
        await restoreCollection(`${docPath}/${subId}`, subColl);
      }
    }
  }
}

(async () => {
  console.log(`restore: source « ${source} »${confirm ? '' : ' — DRY-RUN (aucune écriture, --confirm pour écrire)'}`);
  const dump = await loadSource();
  const roots = Object.keys(dump).filter((c) => !onlyCollections || onlyCollections.includes(c));
  if (onlyCollections) console.log(`restore: collections filtrées → ${roots.join(', ') || '(aucune)'}`);

  for (const collId of roots) {
    const before = docCount;
    await restoreCollection(collId, dump[collId]);
    console.log(`restore: ${collId} — ${docCount - before} document(s)${confirm ? ' écrits' : ' (simulé)'}`);
  }
  console.log(`restore: ${confirm ? 'terminé' : 'DRY-RUN terminé'} — ${docCount} document(s) au total.`);
  if (!confirm) console.log('restore: relancez avec --confirm pour appliquer réellement.');
})().catch((e) => {
  console.error('restore: échec — ' + e.message);
  process.exit(1);
});
