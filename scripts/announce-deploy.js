// ─────────────────────────────────────────────────────────────
// announce-deploy.js — Annonce produit dans le salon Discord
// Lancé par GitHub Actions à la fin d'un déploiement réussi.
//
// N'annonce PAS chaque déploiement : seulement les commits qui
// portent un trailer « Annonce: », pour ne pas noyer le salon sous
// les bumps de version et les messages techniques.
//
//   Annonce: Titre de la nouveauté
//   Annonce: Titre | Description affichée sous le titre
//
// Sans trailer, le script sort en silence (code 0) — le workflow
// ne doit jamais échouer à cause d'une annonce.
// ─────────────────────────────────────────────────────────────

import { execSync } from 'child_process';

const WEBHOOK = process.env.DISCORD_ANNOUNCE_WEBHOOK;
const ARROW   = '<a:arrow:1520177073816211627>';
const IMAGE   = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/annonce.gif';
const COLOR   = 0xfde047; // même jaune que /announce côté bot

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
  process.exit(0);
}

if (!WEBHOOK) {
  console.error('[announce] DISCORD_ANNOUNCE_WEBHOOK manquant — annonce ignorée.');
  process.exit(0);
}

const embed = {
  title: `${ARROW}  ${annonce.titre}`,
  color: COLOR,
  image: { url: IMAGE },
  footer: { text: 'CapitalBoard - https://capitalboard.fr' },
  timestamp: new Date().toISOString(),
};
if (annonce.description) embed.description = annonce.description;

const res = await fetch(WEBHOOK, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ embeds: [embed] }),
});

if (!res.ok) {
  console.error(`[announce] échec Discord ${res.status} : ${await res.text()}`);
  process.exit(0); // le déploiement reste un succès
}

console.log(`[announce] publiée : ${annonce.titre}`);
