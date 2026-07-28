'use strict';

// Publie un embed permanent du registre (src/lib/embeds.js) dans son salon.
//
// Usage :
//   npm run embed -- --list              liste les embeds disponibles
//   npm run embed -- reglement           publie un embed
//   npm run embed -- reglement ticket    publie plusieurs embeds
//   npm run embed -- --dry reglement     construit l'embed sans rien envoyer
//
// Un nouveau message est envoyé à chaque fois : supprimer l'ancien à la main.

const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const { EMBEDS } = require('./lib/embeds');

const KEYS = Object.keys(EMBEDS);

function printList() {
  console.log('Embeds disponibles :');
  for (const key of KEYS) {
    console.log(`  ${key.padEnd(18)} → ${EMBEDS[key].description}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const targets = args.filter((a) => !a.startsWith('-'));

  if (args.includes('--list') || args.includes('-l') || !targets.length) {
    printList();
    if (!targets.length && !args.includes('--list') && !args.includes('-l')) {
      console.error('\nAucun embed indiqué. Exemple : npm run embed -- reglement');
      process.exitCode = 1;
    }
    return;
  }

  const unknown = targets.filter((t) => !EMBEDS[t]);
  if (unknown.length) {
    console.error(`Embed inconnu : ${unknown.join(', ')}\n`);
    printList();
    process.exitCode = 1;
    return;
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(config.token);
  await new Promise((resolve) => client.once('clientReady', resolve));

  try {
    // Le guild sert à résoudre les noms de rôles au moment du build.
    const guild = config.guildId ? await client.guilds.fetch(config.guildId) : null;
    if (guild) await guild.roles.fetch();

    for (const key of targets) {
      const entry = EMBEDS[key];
      const payload = entry.build(guild);

      if (dry) {
        console.log(`[dry] ${key} → salon ${entry.channelId} (rien envoyé)`);
        console.log(JSON.stringify(payload, null, 2));
        continue;
      }

      const channel = await client.channels.fetch(entry.channelId);
      const message = await channel.send(payload);
      console.log(`[embed] ${key} → #${channel.name} (message ${message.id})`);
    }
  } finally {
    await client.destroy();
  }
}

main().catch((err) => {
  console.error('[embed] Échec :', err);
  process.exit(1);
});
