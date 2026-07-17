'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const monitor = require('../lib/statusmonitor');

const FONDATEUR_ROLE = '1512905140108001391';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription("Affiche l'état du site, mis à jour automatiquement.")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande réservée au rôle fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.reply({ embeds: [await monitor.buildEmbed()] });
    const msg = await interaction.fetchReply();
    monitor.register({ guildId: interaction.guildId, channelId: msg.channelId, messageId: msg.id });
  },
};
