// ─────────────────────────────────────────────────────────────
// announce-deploy.js — Détection d'annonce produit au déploiement
// Lancé sur le runner GitHub Actions.
//
// N'annonce PAS chaque déploiement : seulement les commits qui
// portent un trailer « Annonce: », pour ne pas noyer le salon sous
// les bumps de version et les messages techniques.
//
//   Annonce: Titre de la nouveauté
//   Annonce: Titre | Description affichée sous le titre
//
// Ce script ne poste rien lui-même : il écrit le résultat dans
// GITHUB_OUTPUT (publish/title/desc). C'est un step SSH suivant qui
// poste depuis la VM, avec le token du bot qui y réside déjà — le
// token ne transite jamais par GitHub.
// ─────────────────────────────────────────────────────────────

import { execSync } from 'child_process';
import { appendFileSync } from 'fs';
import { randomUUID } from 'crypto';

/** Écrit une sortie de step, en gérant les valeurs multi-lignes. */
function setOutput(name, value) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) return; // exécution hors CI : on ignore
  const delim = `__EOF_${randomUUID()}__`;
  appendFileSync(out, `${name}<<${delim}\n${value}\n${delim}\n`);
}

/** Trailer « Annonce: » du dernier commit, ou null. */
function parseAnnounce() {
  const message = execSync('git log -1 --pretty=%B', { encoding: 'utf8' });
  const line = message.split('\n').find((l) => /^Annonce\s*:/i.test(l.trim()));
  if (!line) return null;

  const raw = line.replace(/^\s*Annonce\s*:/i, '').trim();
  if (!raw) return null;

  const [titre, ...reste] = raw.split('|');
  return { titre: titre.trim(), description: reste.join('|').trim() };
}

const annonce = parseAnnounce();

if (!annonce) {
  console.log('[announce] pas de trailer « Annonce: » sur ce commit — rien à publier.');
  setOutput('publish', 'false');
  process.exit(0);
}

console.log(`[announce] annonce détectée : ${annonce.titre}`);
setOutput('publish', 'true');
setOutput('title', annonce.titre);
setOutput('desc', annonce.description);
