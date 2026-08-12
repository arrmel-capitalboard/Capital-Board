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

// ── Rédaction du texte public ──────────────────────────────────────────────
// Un sujet de commit est écrit pour un développeur : il nomme des fonctions et
// des fichiers, pas des écrans. Traduit mot à mot, « tapping a holding row »
// devenait « Appuyer sur une ligne d'attente » — trois mots faux sur cinq pour
// le lecteur du salon. Le modèle réécrit donc l'entrée à partir du sujet, du
// corps du commit ET des fichiers touchés, avec pour consigne de nommer
// l'endroit de l'app concerné.

const MISTRAL_KEY = process.env.MISTRAL_API_KEY;

// Les endroits que le lecteur connaît, tels qu'ils sont écrits dans l'app.
const ENDROITS = [
  'Patrimoine', 'Mon PEA', 'Activité', 'Dividendes', 'Avantages', 'Watchlist',
  'Benchmark', 'Projections', 'Calendrier des résultats', 'Récap du jour',
  'Crypto', 'CTO', 'Assurance-vie', 'PER', 'Livrets', 'Immobilier', 'Or',
  'Dépenses', 'Fiscalité', 'Actualités', 'Idées', 'Favoris', 'Support',
  'Communauté', 'Notifications', 'Paramètres', 'Connexion',
];

// Indices tirés du chemin des fichiers : le modèle ne voit pas le dépôt, et
// c'est souvent le chemin qui dit de quel écran on parle.
function indicesFichiers(files) {
  const out = new Set();
  for (const f of files) {
    if (/^discord-bot\//.test(f))            out.add('bot Discord / serveur communautaire');
    else if (/^capital-board-worker\//.test(f)) out.add('backend (worker Cloudflare)');
    else if (/^scripts\//.test(f))           out.add('automatisations (rapports, alertes)');
    else if (/^pages\/app\.html$/.test(f))   out.add("application (page principale)");
    else if (/^pages\//.test(f))             out.add(`page ${f.replace(/^pages\//, '').replace(/\.html$/, '')}`);
    else if (/^css\//.test(f))               out.add('apparence / mise en page');
    else if (/^js\//.test(f))                out.add('application');
    else if (/^guides\//.test(f))            out.add('guides');
    else if (/^communaute\//.test(f))        out.add('espace communauté');
  }
  return [...out];
}

async function callMistral(prompt) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + MISTRAL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 200,
    }),
    signal: AbortSignal.timeout(30000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  return (json?.choices?.[0]?.message?.content || '').trim();
}

/** Nettoie la sortie du modèle : guillemets, puces, préfixes, retours ligne. */
function nettoie(s) {
  let t = String(s || '').split('\n').map(x => x.trim()).filter(Boolean)[0] || '';
  t = t.replace(/^[-–—•*]\s*/, '').replace(/^["“«»']+|["“«»']+$/g, '').trim();
  t = t.replace(/^(nouveauté|texte|réponse)\s*:\s*/i, '').trim();
  return t;
}

/** Une phrase publique à partir d'un commit. Null si le modèle n'aide pas. */
async function redigeNouveaute({ subject, body, files }) {
  if (!MISTRAL_KEY) return null;
  const indices = indicesFichiers(files);
  const prompt = [
    "Tu rédiges la note de version d'une application française de gestion de patrimoine, Capital Board.",
    "À partir du commit ci-dessous, écris UNE phrase destinée aux utilisateurs, qui ne lisent pas de code.",
    '',
    'Règles :',
    "- Dire OÙ dans l'application (l'écran ou la section concernée) et CE QUI change concrètement.",
    `- Écrans existants : ${ENDROITS.join(', ')}.`,
    "- Français courant, vouvoiement, pas de jargon technique (pas de « commit », « CSS », « fonction », « refactor »).",
    "- Pas de nom de fichier, pas de nom de variable, pas d'anglais non traduit.",
    '- 60 à 140 caractères, une seule phrase, sans point final, sans guillemets, sans emoji.',
    "- Si le commit ne change rien de visible pour l'utilisateur, réponds exactement : AUCUNE",
    '',
    `Sujet : ${subject}`,
    body ? `Détail : ${body.slice(0, 700)}` : '',
    files.length ? `Fichiers modifiés : ${files.slice(0, 12).join(', ')}` : '',
    indices.length ? `Zones concernées : ${indices.join(' ; ')}` : '',
    '',
    'Réponds uniquement par la phrase.',
  ].filter(Boolean).join('\n');

  try {
    const out = nettoie(await callMistral(prompt));
    if (!out || /^aucune$/i.test(out)) return null;
    if (out.length > 200) return null;
    return out.charAt(0).toUpperCase() + out.slice(1);
  } catch (e) {
    console.warn(`[queue] rédaction échouée (« ${subject} ») : ${e.message}`);
    return null;
  }
}

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const commits = event.commits || [];

const features = [];
for (const c of commits) {
  const msg = c.message || '';
  const subject = msg.split('\n')[0];
  const raw = featureText(subject);
  if (!raw) continue;
  const body  = msg.split('\n').slice(1).join('\n').trim();
  const files = [...(c.added || []), ...(c.modified || []), ...(c.removed || [])];
  // Rédaction par le modèle, traduction mot à mot en secours : une nouveauté
  // mal formulée se corrige d'un clic dans Discord, une nouveauté absente de
  // la file ne se voit pas.
  const text = await redigeNouveaute({ subject: raw, body, files }) || await translateToFr(raw);
  features.push({ text, sha: c.id, subject });
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
    // Sujet technique conservé : il s'affiche dans le salon de validation pour
    // juger la reformulation, et n'est jamais envoyé aux membres.
    subject: f.subject,
    source: 'commit',
    sha: f.sha,
    status: 'pending',
    createdAt: Date.now(),
    sentAt: null,
    messageId: null,
  });
  console.log(`[queue] + ${f.text}`);
}
