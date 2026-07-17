'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const tickets = require('../lib/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close-ticket')
    .setDescription('Ferme le ticket en cours.')
    .setDMPermission(false),

  async execute(interaction) {
    if (!tickets.isTicketChannel(interaction.channelId)) {
      await interaction.reply({ content: "Cette commande est utilisable uniquement dans un ticket.", flags: MessageFlags.Ephemeral });
      return;
    }
    await tickets.closeTicket(interaction);
  },
};
