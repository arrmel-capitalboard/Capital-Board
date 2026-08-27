'use strict';

// Envoi manuel d'une action de test sécurité (voir lib/security-test.js).
//
// Usage :
//   npm run security-test            tire une liste d'actions et l'envoie
//   npm run security-test -- --dry   construit l'embed sans rien envoyer
//   npm run security-test -- --list  liste les actions du fichier

const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const securitytest = require('./lib/securitytest');

async function main() {
  const args = process.argv.slice(2);
  const { actions, reminder } = securitytest.loadConfig();

  if (!actions.length) {
    console.error('[security-test] Aucune action chargée — vérifier security-test-actions.json.');
    process.exitCode = 1;
    return;
  }

  if (args.includes('--list') || args.includes('-l')) {
    console.log(`${actions.length} action(s) :`);
    const recentes = new Set(securitytest.lireHistorique().slice(-securitytest.fenetre(actions.length)).map((e) => e.action));
    actions.forEach((a, i) => console.log(`  ${String(i + 1).padStart(2)}. ${recentes.has(a) ? '·' : ' '} ${a}`));
    console.log(`
(· = proposée récemment, écartée du prochain tirage)`);
    return;
  }

  if (args.includes('--dry')) {
    const picked = securitytest.pickActions(actions, securitytest.lireHistorique());
    console.log(`[dry] salon ${securitytest.CHANNEL_ID} (rien envoyé)`);
    console.log(JSON.stringify(securitytest.buildEmbed(picked, reminder).toJSON(), null, 2));
    return;
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(config.token);
  await new Promise((resolve) => client.once('clientReady', resolve));

  try {
    const sent = await securitytest.sendAction(client);
    if (sent) {
      console.log(`[security-test] ${sent.length} action(s) envoyée(s) dans le salon ${securitytest.CHANNEL_ID}.`);
    } else {
      process.exitCode = 1;
    }
  } finally {
    await client.destroy();
  }
}

main().catch((err) => {
  console.error('[security-test] Échec :', err);
  process.exit(1);
});
