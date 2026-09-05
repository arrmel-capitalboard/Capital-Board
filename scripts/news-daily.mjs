// ─────────────────────────────────────────────────────────────
// news-daily.mjs — Le balayage du matin : les nouveautés de la veille
//
// Lancé par GitHub Actions tous les jours (voir nouveautes.yml), il relit les
// commits de la veille, en tire quelques phrases écrites pour les membres, et
// les dépose en file de validation. Le bot poste ensuite un message par
// proposition dans le salon de validation, avec ses boutons Valider / Rejeter /
// Modifier le texte. La publication communautaire reste celle du lundi 18h.
//
// Pourquoi ce script remplace queue-feature.mjs, qui tournait à chaque push :
//
//   1. Une entrée par commit donnait une file illisible — onze commits le
//      1er septembre, six messages à valider pour trois vraies nouveautés.
//      Ici, une journée entière est lue d'un coup, ce qui permet de REGROUPER :
//      « la ligne crypto reprend la mise en page » et « la courbe se déplie
//      sous une position » ne sont qu'une seule nouvelle pour le lecteur.
//
//   2. Le texte était réécrit à partir du seul sujet du commit, qui est écrit
//      pour un développeur. « Un anneau étiqueté, et des enveloppes qu'on peut
//      sortir du total » ne veut rien dire pour quelqu'un qui n'a pas le code
//      sous les yeux. Le modèle reçoit maintenant le sujet, le corps ET les
//      fichiers de tous les commits du groupe.
//
//   3. Rien de ce qui touche le panneau d'administration, la sécurité, le bot
//      ou les automatisations n'a à sortir d'ici. Le filtrage se fait sur les
//      chemins et les portées, avant même d'appeler le modèle : ce qui n'est
//      pas envoyé ne peut pas fuiter dans une reformulation.
//
// Les règles de rédaction sont dans nouveautes.md, à la racine du dépôt.
// Ce script en est l'application ; les deux doivent rester d'accord.
// ─────────────────────────────────────────────────────────────

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { execFileSync } from 'child_process';

const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
const MAX_NOUVEAUTES = 4;   // par jour : au-delà, ce n'est plus une nouvelle, c'est un journal

// ── Fenêtre de lecture ─────────────────────────────────────────────────────
// La veille, de minuit à minuit, heure de Paris. Le décalage est demandé au
// système plutôt que codé en dur : entre mars et octobre il change, et une
// heure d'écart déplace les commits de fin de soirée dans le mauvais jour.

function decalageParis(date) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'longOffset' });
  const part = fmt.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value || 'GMT+01:00';
  return part.replace('GMT', '').replace(':', '') || '+0100';   // « +0200 »
}

function jourParis(date) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(date);   // AAAA-MM-JJ
}

function fenetre(jour) {
  const debut = new Date(`${jour}T12:00:00Z`);
  const off = decalageParis(debut);
  const lendemain = new Date(new Date(`${jour}T00:00:00Z`).getTime() + 86400000);
  return {
    since: `${jour} 00:00:00 ${off}`,
    until: `${jourParis(lendemain)} 00:00:00 ${decalageParis(lendemain)}`,
  };
}

// ── Lecture des commits ────────────────────────────────────────────────────

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

function commitsDuJour(jour) {
  const { since, until } = fenetre(jour);
  const brut = git([
    'log', 'main', '--no-merges',
    `--since=${since}`, `--until=${until}`,
    '--format=%H%x1f%s%x1f%b%x1e',
  ]);

  return brut.split('\x1e').map((bloc) => bloc.trim()).filter(Boolean).map((bloc) => {
    const [sha, subject, body = ''] = bloc.split('\x1f');
    const files = git(['show', '--name-only', '--format=', sha])
      .split('\n').map((f) => f.trim()).filter(Boolean);
    return { sha, subject: subject.trim(), body: body.trim(), files };
  });
}

// ── Filtrage : ce qui ne sort jamais d'ici ─────────────────────────────────

// Un commit dont TOUS les fichiers vivent ici ne concerne pas le lecteur.
const CHEMINS_INTERNES = [
  /^discord-bot\//, /^scripts\//, /^\.github\//, /^firestore-tests\//,
  /^firestore\.rules$/, /^firestore\.indexes\.json$/, /^storage\.rules$/,
  /^mockups\//, /^README\.md$/, /^nouveautes\.md$/, /^\.gitignore$/,
  /^LICENSE$/, /^robots\.txt$/, /^sitemap\.xml$/, /^CNAME$/,
];

// Ces portées ne sortent pas non plus, quel que soit le fichier touché :
// le panneau d'administration et la sécurité ne regardent pas les membres.
const PORTEES_INTERNES = /^(s[ée]cu(rit[ée])?|admin|panel|rules|bot|ci|deps|infra|ops|test|scripts?)$/i;

// Seuls ces types racontent quelque chose de visible. `refactor`, `chore`,
// `docs` et `test` déplacent du code sans rien changer à l'écran.
const TYPES_RETENUS = /^(feat|fix|perf|style)(\(([^)]*)\))?!?:\s*(.+)$/i;

function analyser(commit) {
  const m = commit.subject.match(TYPES_RETENUS);
  if (!m) return null;

  const type = m[1].toLowerCase();
  const portees = (m[3] || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (portees.some((p) => PORTEES_INTERNES.test(p))) return null;

  const utiles = commit.files.filter((f) => !CHEMINS_INTERNES.some((re) => re.test(f)));
  if (!utiles.length) return null;

  return { ...commit, type, portees, files: utiles, titre: m[4].trim() };
}

// ── Rédaction ──────────────────────────────────────────────────────────────

// Les endroits que le lecteur connaît, tels qu'ils sont écrits dans l'app.
const ENDROITS = [
  'Patrimoine', 'Mon PEA', 'Activité', 'Dividendes', 'Avantages', 'Watchlist',
  'Benchmark', 'Projections', 'Calendrier des résultats', 'Récap du jour',
  'Crypto', 'CTO', 'Assurance-vie', 'PER', 'Livrets', 'Immobilier', 'Or',
  'Dépenses', 'Fiscalité', 'Actualités', 'Idées', 'Favoris', 'Support',
  'Communauté', 'Notifications', 'Paramètres', 'Connexion',
];

function prompt(commits, jour) {
  const liste = commits.map((c, i) => [
    `--- commit ${i + 1} (${c.sha.slice(0, 7)}) ---`,
    `Type : ${c.type}${c.portees.length ? ` (${c.portees.join(', ')})` : ''}`,
    `Sujet : ${c.titre}`,
    c.body ? `Détail : ${c.body.slice(0, 500)}` : '',
    `Fichiers : ${c.files.slice(0, 8).join(', ')}`,
  ].filter(Boolean).join('\n')).join('\n\n');

  return [
    "Tu rédiges les notes de version de Capital Board, une application française de gestion de patrimoine.",
    `Voici tous les changements du ${jour}. Écris ce que les utilisateurs doivent en retenir.`,
    '',
    'Règles :',
    "- REGROUPE : plusieurs commits sur le même écran donnent UNE seule phrase.",
    "- ÉCARTE tout ce qui n'est pas visible par un utilisateur : réorganisation de code, correction",
    "  d'un bug jamais sorti, panneau d'administration, sécurité, outils internes.",
    `- Dis OÙ (l'écran concerné) et CE QUI change pour la personne. Écrans : ${ENDROITS.join(', ')}.`,
    "- Français courant, vouvoiement, aucun jargon : ni « commit », ni « CSS », ni « refactor »,",
    "  ni nom de fichier, ni nom de variable.",
    "- Écris pour quelqu'un qui n'a jamais vu le code : « Un anneau étiqueté, et des enveloppes",
    "  qu'on peut sortir du total » ne veut rien dire ; « Sur Patrimoine, le graphique nomme chaque",
    "  enveloppe et vous pouvez en exclure du total » se comprend.",
    '- 60 à 140 caractères par phrase, une seule phrase, sans point final, sans guillemets, sans emoji.',
    `- ${MAX_NOUVEAUTES} phrases maximum. Mieux vaut deux vraies nouveautés que quatre remplissages.`,
    "- Si RIEN n'est visible pour un utilisateur, réponds exactement : []",
    '',
    'Réponds uniquement par un tableau JSON, sans texte autour, de la forme :',
    '[{"texte": "…", "commits": [1, 3]}]',
    'où « commits » liste les numéros de commits couverts par la phrase.',
    '',
    liste,
  ].join('\n');
}

async function callMistral(contenu) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + MISTRAL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: contenu }],
      temperature: 0.2,
      max_tokens: 700,
    }),
    signal: AbortSignal.timeout(60000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  return (json?.choices?.[0]?.message?.content || '').trim();
}

/** Le modèle encadre souvent son JSON de ```json … ```. */
function extraireJson(sortie) {
  const sansFences = sortie.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const debut = sansFences.indexOf('[');
  const fin = sansFences.lastIndexOf(']');
  if (debut === -1 || fin === -1) throw new Error('aucun tableau JSON dans la réponse');
  return JSON.parse(sansFences.slice(debut, fin + 1));
}

function nettoie(s) {
  return String(s || '')
    .split('\n')[0]
    .replace(/^[-–—•*]\s*/, '')
    .replace(/^["“«»']+|["“«»']+$/g, '')
    .replace(/^(nouveauté|texte)\s*:\s*/i, '')
    .replace(/\s*\.\s*$/, '')
    .trim();
}

async function redigerJournee(commits, jour) {
  const sortie = await callMistral(prompt(commits, jour));
  const brut = extraireJson(sortie);

  return brut.slice(0, MAX_NOUVEAUTES).map((entree) => {
    const texte = nettoie(entree?.texte);
    if (!texte || texte.length < 20 || texte.length > 220) return null;

    // Les numéros renvoyés par le modèle repartent de 1 et peuvent être faux :
    // on ne garde que ceux qui désignent un commit existant, et on rattache
    // tout le lot au premier si la liste est vide.
    const numeros = Array.isArray(entree?.commits) ? entree.commits : [];
    const shas = numeros
      .map((n) => commits[Number(n) - 1]?.sha)
      .filter(Boolean);

    return {
      texte: texte.charAt(0).toUpperCase() + texte.slice(1),
      shas: shas.length ? shas : [commits[0].sha],
    };
  }).filter(Boolean);
}

// ── Écriture en file ───────────────────────────────────────────────────────

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

/** Un même commit ne doit jamais produire deux entrées (relance, rattrapage). */
async function dejaEnFile(shas) {
  for (let i = 0; i < shas.length; i += 10) {
    const lot = shas.slice(i, i + 10);
    const snap = await db.collection('newsQueue').where('sha', 'in', lot).limit(1).get();
    if (!snap.empty) return true;
  }
  return false;
}

// ── Déroulé ────────────────────────────────────────────────────────────────

const jour = process.env.JOUR_CIBLE
  || jourParis(new Date(Date.now() - 86400000));

const bruts = commitsDuJour(jour);
const retenus = bruts.map(analyser).filter(Boolean);

console.log(`[news] ${jour} : ${bruts.length} commit(s), ${retenus.length} retenu(s) après filtrage`);
for (const c of retenus) console.log(`  · ${c.type} — ${c.titre}`);

if (!retenus.length) {
  console.log('[news] rien de visible pour un utilisateur ce jour-là.');
  process.exit(0);
}
if (!MISTRAL_KEY) {
  // Sans modèle, mieux vaut ne rien poster que de recopier des sujets de
  // commit : c'est précisément ce qu'on cherchait à ne plus faire.
  console.error('[news] MISTRAL_API_KEY absente — aucune rédaction possible, rien mis en file.');
  process.exit(1);
}

const propositions = await redigerJournee(retenus, jour);
if (!propositions.length) {
  console.log('[news] le modèle n\'a retenu aucune nouveauté publiable.');
  process.exit(0);
}

for (const p of propositions) {
  if (await dejaEnFile(p.shas)) {
    console.log(`[news] déjà en file, ignorée : ${p.texte}`);
    continue;
  }
  const couverts = retenus.filter((c) => p.shas.includes(c.sha));
  await db.collection('newsQueue').add({
    text: p.texte,
    // Sujets techniques conservés : ils s'affichent dans le salon de validation
    // pour juger la reformulation, et ne sont jamais envoyés aux membres.
    subject: couverts.map((c) => c.subject).join(' · ') || null,
    source: 'quotidien',
    jour,
    sha: p.shas[0],
    shas: p.shas,
    status: 'pending',
    createdAt: Date.now(),
    sentAt: null,
    messageId: null,
  });
  console.log(`[news] + ${p.texte}`);
}
