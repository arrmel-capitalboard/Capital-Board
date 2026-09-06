'use strict';

require('dotenv').config();

const {
  DISCORD_TOKEN, CLIENT_ID, GUILD_ID, OPS_ALERTS_CHANNEL_ID,
  GITHUB_DISPATCH_TOKEN, GITHUB_REPO, GITHUB_SECURITY_REPO, DEPOT_SECURITE,
} = process.env;

if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN manquant (voir .env.example)');
if (!CLIENT_ID) throw new Error('CLIENT_ID manquant (voir .env.example)');

module.exports = {
  token: DISCORD_TOKEN,
  clientId: CLIENT_ID,
  guildId: GUILD_ID || null,
  // Salon des alertes ops (quotas API, etc. — voir lib/ops-alerts.js). Pas de
  // valeur par défaut : sans ID connu, mieux vaut désactiver l'écoute que
  // poster dans le mauvais salon.
  opsAlertsChannel: OPS_ALERTS_CHANNEL_ID || null,
  // Déclenchement du workflow d'application des correctifs de sécurité
  // (voir lib/scan-patches.js). Le jeton vit sur la VM, jamais dans le dépôt :
  // il peut lancer des workflows et pousser sur main. Absent, les boutons
  // « Appliquer » répondent une erreur au lieu d'agir en silence.
  githubToken: GITHUB_DISPATCH_TOKEN || null,
  githubRepo: GITHUB_REPO || 'arrmel-capitalboard/Capital-Board',
  // La chaîne d'analyse vit dans un dépôt privé : elle décrit comment
  // contourner les défenses de l'app, ce qui n'a rien à faire dans un dépôt
  // public. Les workflows d'analyse s'y déclenchent donc, pas ici — et le
  // jeton ci-dessus doit porter l'accès aux deux dépôts.
  githubSecurityRepo: GITHUB_SECURITY_REPO || 'arrmel-capitalboard/capitalboard-securite',
  // Clone local de ce dépôt privé sur la VM, voisin de celui-ci. C'est de là
  // que part le parcours d'audit automatisé.
  depotSecurite: DEPOT_SECURITE || null,
  // Couleur de marque Capital Board (utilisée dans les embeds).
  brandColor: 0x2563eb,
  siteUrl: 'https://capitalboard.fr',
};
