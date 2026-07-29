// Vérifie que les liens publics (réseaux sociaux, Discord, PayPal, GitHub) sont
// identiques partout. Ils sont dupliqués par nécessité : le JSON-LD des pages
// statiques doit être dans le HTML, le menu de l'app charge avant tout fetch, et
// le bot Discord ne lit pas Firestore. `data/links.json` fait référence ; ce
// script échoue dès qu'un fichier s'en écarte, ce qui évite la dérive
// silencieuse (un compte renommé corrigé dans 3 fichiers sur 4).
//
//   node scripts/check-links.mjs
//
// Sortie non nulle = au moins une divergence. Lancé en CI avant déploiement.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ref = JSON.parse(readFileSync(join(ROOT, 'data/links.json'), 'utf8'));

// Fichiers censés porter ces liens, et plateformes attendues dans chacun.
const TARGETS = [
  { file: 'communaute/index.html',              keys: ['discord', 'instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'github'] },
  { file: 'pages/index.html',                   keys: ['discord', 'instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'github'] },
  { file: 'js/app.js',                          keys: ['discord', 'instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'paypal'] },
  { file: 'discord-bot/src/commands/liens.js',  keys: ['instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'github', 'paypal'] },
];

// Domaine (ou fragment distinctif) permettant de repérer une URL de la plateforme,
// afin de détecter une valeur *différente* de la référence et pas seulement une absence.
const PATTERNS = {
  discord:   /https:\/\/discord\.gg\/[A-Za-z0-9]+/g,
  instagram: /https:\/\/www\.instagram\.com\/[^\s"'`)<>,]+/g,
  tiktok:    /https:\/\/www\.tiktok\.com\/@[^\s"'`)<>,]+/g,
  youtube:   /https:\/\/www\.youtube\.com\/@[^\s"'`)<>,]+/g,
  facebook:  /https:\/\/www\.facebook\.com\/[^\s"'`)<>,]+/g,
  linkedin:  /https:\/\/www\.linkedin\.com\/[^\s"'`)<>,]+/g,
  github:    /https:\/\/github\.com\/arrmel-capitalboard\/[^\s"'`)<>,]+/g,
  paypal:    /https:\/\/www\.paypal\.com\/paypalme\/[^\s"'`)<>,]+/g,
};

const problems = [];

for (const { file, keys } of TARGETS) {
  const path = join(ROOT, file);
  if (!existsSync(path)) { problems.push(`${file} : fichier introuvable`); continue; }
  const src = readFileSync(path, 'utf8');

  for (const key of keys) {
    const expected = ref[key];
    const found = [...new Set((src.match(PATTERNS[key]) || []).map(u => u.replace(/[.,;]$/, '')))];
    if (!found.length) {
      problems.push(`${file} : aucun lien ${key} (attendu ${expected})`);
      continue;
    }
    // Un slash final ne change pas la destination : on compare sans.
    const norm = (u) => u.replace(/\/$/, '');
    const wrong = found.filter(u => norm(u) !== norm(expected));
    for (const u of wrong) problems.push(`${file} : ${key} = ${u} (attendu ${expected})`);
  }
}

if (problems.length) {
  console.error('Liens divergents de data/links.json :\n');
  for (const p of problems) console.error('  - ' + p);
  console.error(`\n${problems.length} divergence(s). Aligner les fichiers, ou corriger data/links.json.`);
  process.exit(1);
}

const total = TARGETS.reduce((n, t) => n + t.keys.length, 0);
console.log(`Liens conformes à data/links.json (${total} vérifications sur ${TARGETS.length} fichiers).`);
