'use strict';

// Enregistre les slash commands auprès de Discord.
// Usage : npm run deploy
// - GUILD_ID défini  → déploiement instantané sur ce serveur (dev).
// - GUILD_ID vide    → déploiement global (propagation jusqu'à 1h).

const { REST, Routes } = require('discord.js');
const config = require('./config');
const { loadCommands } = require('./loadCommands');

async function main() {
  const commands = loadCommands();
  const body = [...commands.values()].map((c) => c.data.toJSON());

  const rest = new REST().setToken(config.token);

  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  console.log(`[deploy] Enregistrement de ${body.length} commande(s)${config.guildId ? ` sur le serveur ${config.guildId}` : ' (global)'}…`);
  const data = await rest.put(route, { body });
  console.log(`[deploy] ${data.length} commande(s) enregistrée(s).`);
}

main().catch((err) => {
  console.error('[deploy] Échec :', err);
  process.exit(1);
});
