'use strict';

require('dotenv').config();

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID, ROLE_COMPTE_LIE } = process.env;

if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN manquant (voir .env.example)');
if (!CLIENT_ID) throw new Error('CLIENT_ID manquant (voir .env.example)');

module.exports = {
  token: DISCORD_TOKEN,
  clientId: CLIENT_ID,
  guildId: GUILD_ID || null,
  // Rôle attribué automatiquement aux comptes Capital Board liés (voir lib/rolesync.js).
  // Vide = attribution automatique désactivée.
  roleCompteLie: ROLE_COMPTE_LIE || null,
  // Couleur de marque Capital Board (utilisée dans les embeds).
  brandColor: 0x2563eb,
  siteUrl: 'https://capitalboard.fr',
};
