'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { loadCommands } = require('../loadCommands');
const E = require('../lib/emojis');

const CATEGORIES = [
  { name: `${E.ARROW} Capital Board`, cmds: ['link', 'unlink', 'portefeuille', 'watchlist', 'dividendes'] },
  { name: `${E.ARROW} Modération`, cmds: ['role', 'kick', 'ban', 'unban', 'mute', 'warn', 'warnings', 'clearwarns', 'clear', 'lock', 'unlock'] },
  { name: `${E.ARROW} Utilitaires`, cmds: ['help', 'info', 'poll', 'status', 'embed'] },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Liste les commandes disponibles, par thème.'),

  async execute(interaction) {
    const commands = loadCommands();
    const line = (name) => `\`/${name}\` — ${commands.get(name).data.description}`;

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle('Commandes disponibles')
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

    const categorized = new Set();
    for (const cat of CATEGORIES) {
      const present = cat.cmds.filter((n) => commands.has(n));
      present.forEach((n) => categorized.add(n));
      if (present.length) embed.addFields({ name: cat.name, value: present.map(line).join('\n') });
    }

    // Commandes chargées mais non rangées dans une catégorie.
    const others = [...commands.keys()].filter((n) => !categorized.has(n)).sort();
    if (others.length) embed.addFields({ name: '📦 Autres', value: others.map(line).join('\n') });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
