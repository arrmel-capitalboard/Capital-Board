// build-kb.mjs — génère la base de connaissance du chatbot.
//
// Extrait le texte lisible des fichiers PUBLICS du site (guides, landing,
// pages légales, communauté) et l'écrit dans capital-board-worker/src/kb.js
// sous forme d'une string exportée, bundlée avec le Worker au déploiement.
//
// Volontairement limité au contenu public-facing : PAS de TODO.md / RECAP.md
// ni de doc interne, pour éviter toute fuite de roadmap via le bot.
//
// Usage : node scripts/build-kb.mjs   (relancer après modif du contenu)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Fichiers inclus dans la KB. { path, label } — le label titre la section.
const SOURCES = [
  { path: 'data/app-help.md',                    label: 'Guide d\'utilisation de l\'application (comment faire)' },
  { path: 'pages/index.html',                    label: 'Présentation Capital Board (page d\'accueil)' },
  { path: 'guides/analyser-son-pea.html',        label: 'Guide : Analyser son PEA' },
  { path: 'guides/pea-vs-cto.html',              label: 'Guide : PEA vs CTO' },
  { path: 'guides/suivi-pea-gratuit.html',       label: 'Guide : Suivi PEA gratuit' },
  { path: 'guides/suivre-performance-pea.html',  label: 'Guide : Suivre la performance de son PEA' },
  { path: 'communaute/index.html',               label: 'Page Communauté' },
  { path: 'legal/cgu.html',                       label: 'Conditions générales d\'utilisation' },
  { path: 'legal/mentions-legales.html',          label: 'Mentions légales' },
  { path: 'legal/politique-confidentialite.html', label: 'Politique de confidentialité' },
];

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', hellip: '…',
  eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', agrave2: 'à',
  ccedil: 'ç', ugrave: 'ù', ocirc: 'ô', euro: '€', deg: '°', times: '×',
};

function decode(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z0-9]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

// HTML -> texte lisible. Retire script/style/head, transforme les blocs en
// sauts de ligne, dégage les balises, décode les entités, compacte le blanc.
function htmlToText(html) {
  let t = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|head|nav|footer|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  t = decode(t);
  return t
    .split('\n')
    .map((l) => l.replace(/[ \t\f\v]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

const parts = [];
for (const { path, label } of SOURCES) {
  let raw;
  try {
    raw = readFileSync(join(ROOT, path), 'utf8');
  } catch {
    console.warn(`⚠ introuvable, ignoré : ${path}`);
    continue;
  }
  const text = htmlToText(raw);
  parts.push(`### ${label}\n\n${text}`);
  console.log(`✓ ${path} → ${text.length} car.`);
}

const kb = parts.join('\n\n---\n\n');

const out = `// AUTO-GÉNÉRÉ par scripts/build-kb.mjs — NE PAS ÉDITER À LA MAIN.
// Régénérer après modif du contenu : node scripts/build-kb.mjs
export const KB = ${JSON.stringify(kb)};
`;

const dest = join(ROOT, 'capital-board-worker/src/kb.js');
writeFileSync(dest, out, 'utf8');
console.log(`\n✅ KB écrite : ${dest}`);
console.log(`   ${kb.length} caractères (~${Math.round(kb.length / 4)} tokens estimés)`);
