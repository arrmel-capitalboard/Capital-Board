'use strict';

// Retrait de la liaison de comptes — script à passer une fois.
//
// La liaison entre un compte Discord et un compte Capital Board a été retirée :
// le code est parti, mais deux traces restent, et elles ne s'effacent pas
// toutes seules.
//
//   1. le rôle « compte lié », encore porté par les membres qui l'avaient ;
//   2. les documents `discordLinks`, `discordLinkRequests` et
//      `discordLinkCodes`, c'est-à-dire l'association entre un identifiant
//      Discord et un compte de l'application. De la donnée personnelle dont
//      plus rien ne se sert.
//
// Usage :
//   node scripts/retirer-liaison.js --dry     compte ce qui serait retiré
//   node scripts/retirer-liaison.js           retire pour de bon
//
// Rejouable : ce qui a déjà disparu est simplement compté à zéro.

const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../src/config');
const { getDb, isConfigured } = require('../src/firebase');

// L'identifiant vivait dans src/config.js, retiré avec le reste. Il est écrit
// ici en clair : ce script est le dernier à en avoir besoin.
const ROLE_COMPTE_LIE = process.env.ROLE_COMPTE_LIE || '1528779341184635121';

const COLLECTIONS = ['discordLinks', 'discordLinkRequests', 'discordLinkCodes'];

/** Supprime une collection entière, par paquets de 400 (limite d'un batch : 500). */
async function viderCollection(nom, dry) {
  const col = getDb().collection(nom);
  let total = 0;

  for (;;) {
    const snap = await col.limit(400).get();
    if (snap.empty) break;
    total += snap.size;
    if (dry) break;   // en simulation on ne lit qu'un paquet, assez pour dire s'il y a matière
    const batch = getDb().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return total;
}

async function retirerRole(client, dry) {
  if (!config.guildId) {
    console.warn('GUILD_ID absent : le rôle ne peut pas être retiré.');
    return 0;
  }
  const guild = await client.guilds.fetch(config.guildId);
  const role = await guild.roles.fetch(ROLE_COMPTE_LIE).catch(() => null);
  if (!role) {
    console.log(`Rôle ${ROLE_COMPTE_LIE} introuvable — rien à retirer.`);
    return 0;
  }

  // fetch() force le chargement complet : le cache ne contient que les membres
  // vus récemment, et le rôle serait retiré à une poignée d'entre eux.
  await guild.members.fetch();
  const porteurs = [...role.members.values()];
  if (dry) return porteurs.length;

  let faits = 0;
  for (const membre of porteurs) {
    try {
      await membre.roles.remove(role, 'Liaison de comptes retirée');
      faits++;
    } catch (e) {
      console.error(`  ${membre.user.tag} : ${e.message}`);
    }
  }
  return faits;
}

async function main() {
  const dry = process.argv.includes('--dry') || process.argv.includes('-n');
  if (dry) console.log('— Simulation : rien ne sera modifié —');

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  await client.login(config.token);
  await new Promise((resolve) => client.once('clientReady', resolve));

  try {
    const n = await retirerRole(client, dry);
    console.log(`Rôle « compte lié » : ${n} membre(s)${dry ? ' le portent' : ' traité(s)'}.`);
  } catch (e) {
    console.error('Retrait du rôle :', e.message);
    process.exitCode = 1;
  } finally {
    await client.destroy();
  }

  if (!isConfigured()) {
    console.error('FIREBASE_SERVICE_ACCOUNT manquant : les liens restent en base.');
    process.exitCode = 1;
    return;
  }
  for (const nom of COLLECTIONS) {
    try {
      const n = await viderCollection(nom, dry);
      console.log(`${nom} : ${n} document(s)${dry ? ' à supprimer' : ' supprimé(s)'}.`);
    } catch (e) {
      console.error(`${nom} :`, e.message);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error('Échec :', err);
  process.exit(1);
});
