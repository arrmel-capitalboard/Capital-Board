'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const restartmonitor = require('../lib/restartmonitor');
const E = require('../lib/emojis');

const FONDATEUR_ROLE = '1512905140108001391';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Redémarre le bot.')
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande réservée au rôle fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }

    const msg = await interaction.reply({ content: `${E.LOADING}  Redémarrage en cours...`, fetchReply: true });

    restartmonitor.save({
      channelId: interaction.channelId,
      messageId: msg.id,
      userId: interaction.user.id,
      guildId: interaction.guildId,
    });

    await new Promise((r) => setTimeout(r, 800));
    process.exit(0);
  },
};
