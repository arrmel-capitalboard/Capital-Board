// ─────────────────────────────────────────────────────────────
// backup-firestore.mjs — Export complet de Firestore vers R2
// Lancé par GitHub Actions, hebdomadaire.
//
// Aucune sauvegarde n'existait auparavant : une suppression accidentelle ou
// malveillante était définitive. L'export géré Firestore demande le plan
// Blaze ; ceci passe par la clé de service et le SDK Admin à la place.
//
// Le repo Capital-Board est PUBLIC — l'export ne doit JAMAIS atterrir dedans
// (ni en artifact GitHub Actions sur un repo public : n'importe quel compte
// GitHub peut les télécharger). Destination : bucket R2 privé, à part.
// ─────────────────────────────────────────────────────────────

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { AwsClient }           from 'aws4fetch';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;

for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })) {
  if (!v) { console.error(`backup: secret manquant (${k}), export sauté.`); process.exit(1); }
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Convertit les types Admin SDK (Timestamp, GeoPoint, DocumentReference) en
// quelque chose de sérialisable — JSON.stringify seul les rendrait en `{}`.
function toPlain(value) {
  if (value === null || value === undefined) return value;
  if (typeof value.toDate === 'function') return { __timestamp: value.toDate().toISOString() };
  if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
    return { __geopoint: { lat: value.latitude, lng: value.longitude } };
  }
  if (typeof value.path === 'string' && typeof value.id === 'string' && typeof value.parent === 'object') {
    return { __ref: value.path };
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

// Parcourt récursivement toutes les collections/sous-collections — pas de
// liste de noms à maintenir à la main, résistant à un schéma qui bouge.
async function dumpCollection(collRef) {
  const snap = await collRef.get();
  const out = {};
  for (const doc of snap.docs) {
    const entry = { data: toPlain(doc.data()) };
    const subcols = await doc.ref.listCollections();
    if (subcols.length) {
      entry.subcollections = {};
      for (const sub of subcols) entry.subcollections[sub.id] = await dumpCollection(sub);
    }
    out[doc.id] = entry;
  }
  return out;
}

async function dumpDatabase() {
  const roots = await db.listCollections();
  const out = {};
  for (const coll of roots) {
    console.log(`backup: export ${coll.id}…`);
    out[coll.id] = await dumpCollection(coll);
  }
  return out;
}

// Rétention : au-delà de ce nombre de jours, les exports sont supprimés de R2.
// Sans purge, un fichier par jour s'accumulait indéfiniment. 90 jours couvre
// large un besoin de restauration tout en bornant le stockage.
const RETENTION_DAYS = 90;

function r2Client() {
  return new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });
}

async function uploadToR2(client, json) {
  const date = new Date().toISOString().slice(0, 10);
  const key = `firestore/${date}.json`;
  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;

  const res = await client.fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: json,
  });
  if (!res.ok) throw new Error(`R2 upload ${res.status}: ${await res.text()}`);
  return key;
}

// Supprime les exports firestore/YYYY-MM-DD.json plus vieux que RETENTION_DAYS.
// La date est lue dans la clé (pas de LastModified à parser), et un échec de
// purge ne doit jamais faire échouer un backup déjà uploadé.
async function pruneOldBackups(client) {
  const base = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
  const listRes = await client.fetch(`${base}?list-type=2&prefix=firestore/`);
  if (!listRes.ok) { console.warn(`backup: liste R2 ${listRes.status}, purge sautée`); return; }
  const xml = await listRes.text();
  const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  let pruned = 0;
  for (const key of keys) {
    const m = key.match(/firestore\/(\d{4}-\d{2}-\d{2})\.json$/);
    if (!m) continue;
    if (new Date(m[1] + 'T00:00:00Z').getTime() >= cutoff) continue;
    const res = await client.fetch(`${base}/${key}`, { method: 'DELETE' });
    if (res.ok || res.status === 404) pruned++;
    else console.warn(`backup: suppression ${key} → ${res.status}`);
  }
  if (pruned) console.log(`backup: purge — ${pruned} export(s) de plus de ${RETENTION_DAYS} j supprimé(s)`);
}

(async () => {
  const dump = await dumpDatabase();
  const json = JSON.stringify(dump);
  console.log(`backup: ${(json.length / 1024 / 1024).toFixed(2)} Mo, upload vers R2…`);
  const client = r2Client();
  const key = await uploadToR2(client, json);
  console.log(`backup: ok, ${key}`);
  try { await pruneOldBackups(client); }
  catch (e) { console.warn('backup: purge échouée — ' + e.message); }
})().catch((e) => {
  console.error('backup: échec — ' + e.message);
  process.exit(1);
});
