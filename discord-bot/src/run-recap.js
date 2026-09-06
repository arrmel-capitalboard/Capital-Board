'use strict';

// Récap des suggestions, à la main.
//
// Le cron du lundi est le seul chemin par lequel une décision est annoncée à
// son auteur. Un chemin qui ne tourne qu'une fois par semaine, et dont l'échec
// est silencieux, doit pouvoir être essayé avant et rejoué après — c'est tout
// ce que fait ce script.
//
// Usage :
//   npm run recap -- --dry        simulation : dit qui serait prévenu, n'envoie rien
//   npm run recap                 envoie pour de vrai, et marque les suggestions
//
// Ne concerne que les suggestions venues de Discord : celles écrites depuis
// l'application reçoivent leur réponse dans l'onglet Notifications au moment de
// la décision, et n'ont pas de message privé à attendre.
//
// Rejouer le script est sans danger : une suggestion déjà annoncée porte
// `notifieLe` et n'est plus reprise.

const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const { isConfigured } = require('./firebase');
const suggestions = require('./lib/suggestions');

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry') || args.includes('-n');

  if (!isConfigured()) {
    console.error('FIREBASE_SERVICE_ACCOUNT manquant : rien à récapituler sans Firestore.');
    process.exitCode = 1;
    return;
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(config.token);
  await new Promise((resolve) => client.once('clientReady', resolve));

  console.log(dry ? 'Récap des suggestions Discord (simulation)' : 'Récap des suggestions Discord');
  try {
    await suggestions.recapHebdo(client, { dry });
  } catch (e) {
    console.error('[recap]', e.message);
    process.exitCode = 1;
  } finally {
    await client.destroy();
  }

  if (dry) console.log('\nSimulation terminée : aucun message envoyé, aucune suggestion marquée.');
}

main().catch((err) => {
  console.error('[recap] Échec :', err);
  process.exit(1);
});
