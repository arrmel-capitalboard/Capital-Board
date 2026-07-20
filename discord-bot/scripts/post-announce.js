'use strict';

// Poste une annonce dans le salon annonces via l'API Discord, avec le token
// du bot déjà présent sur la VM (jamais exposé à GitHub). Appelé par le
// workflow deploy.yml au-dessus d'une connexion SSH, après un déploiement du
// site portant un trailer « Annonce: » (voir scripts/announce-deploy.js).
//
//   ANNOUNCE_TITLE=... ANNOUNCE_DESC=... node discord-bot/scripts/post-announce.js
//
// Sort toujours en code 0 : une annonce ne doit jamais faire échouer un déploiement.

const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ANNOUNCE_CHANNEL = '1512909014990586047'; // salon « nouveautés » Capital Board
const ARROW = '<a:arrow:1520177073816211627>';
const IMAGE = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/annonce.gif';
const COLOR = 0xfde047; // même jaune que la commande /announce

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const title = (process.env.ANNOUNCE_TITLE || '').trim();
  const desc = (process.env.ANNOUNCE_DESC || '').trim();

  if (!token) {
    console.error('[post-announce] DISCORD_TOKEN manquant sur la VM — annonce ignorée.');
    return;
  }
  if (!title) {
    console.error('[post-announce] ANNOUNCE_TITLE vide — annonce ignorée.');
    return;
  }

  const embed = {
    title: `${ARROW}  ${title}`,
    color: COLOR,
    image: { url: IMAGE },
    footer: { text: 'CapitalBoard - https://capitalboard.fr' },
    timestamp: new Date().toISOString(),
  };
  if (desc) embed.description = desc;

  const res = await fetch(`https://discord.com/api/v10/channels/${ANNOUNCE_CHANNEL}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    console.error(`[post-announce] échec Discord ${res.status} : ${await res.text()}`);
    return;
  }
  console.log(`[post-announce] publiée : ${title}`);
}

main().catch((err) => console.error('[post-announce] erreur :', err.message));
