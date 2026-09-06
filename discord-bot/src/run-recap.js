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
//   npm run recap -- app          seulement les suggestions venues de l'application
//   npm run recap -- discord      seulement celles venues de Discord
//
// Sans cible, les deux sont traitées. Rejouer le script est sans danger : une
// suggestion déjà annoncée porte `notifieLe` et n'est plus reprise.

const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const { isConfigured } = require('./firebase');
const suggestions = require('./lib/suggestions');
const appsuggestions = require('./lib/appsuggestions');

const CIBLES = {
  app:     { nom: 'application', run: (c, o) => appsuggestions.recapHebdo(c, o) },
  discord: { nom: 'Discord',     run: (c, o) => suggestions.recapHebdo(c, o) },
};

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry') || args.includes('-n');
  const demandees = args.filter((a) => !a.startsWith('-'));

  const inconnues = demandees.filter((t) => !CIBLES[t]);
  if (inconnues.length) {
    console.error(`Cible inconnue : ${inconnues.join(', ')}. Attendu : app, discord.`);
    process.exitCode = 1;
    return;
  }
  const cibles = demandees.length ? demandees : Object.keys(CIBLES);

  if (!isConfigured()) {
    console.error('FIREBASE_SERVICE_ACCOUNT manquant : rien à récapituler sans Firestore.');
    process.exitCode = 1;
    return;
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(config.token);
  await new Promise((resolve) => client.once('clientReady', resolve));

  try {
    for (const cle of cibles) {
      const cible = CIBLES[cle];
      console.log(`\n── Suggestions venues de l'${cible.nom} ${dry ? '(simulation)' : ''}`.trimEnd());
      try {
        await cible.run(client, { dry });
      } catch (e) {
        // Une cible en échec ne doit pas emporter l'autre : chacune a sa
        // collection et ses auteurs.
        console.error(`[recap] ${cle} :`, e.message);
        process.exitCode = 1;
      }
    }
  } finally {
    await client.destroy();
  }

  if (dry) console.log('\nSimulation terminée : aucun message envoyé, aucune suggestion marquée.');
}

main().catch((err) => {
  console.error('[recap] Échec :', err);
  process.exit(1);
});
