'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const tickets = require('../lib/tickets');

const FONDATEUR_ROLE = '1512905140108001391';

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
    // Seuls le demandeur et le fondateur ferment. Les permissions du salon
    // limitent déjà l'accès, mais un membre ajouté via /add-user pouvait fermer
    // le ticket de quelqu'un d'autre.
    const owner = tickets.getOwnerId(interaction.channelId);
    const isOwner = owner && owner === interaction.user.id;
    const isStaff = interaction.member?.roles?.cache?.has(FONDATEUR_ROLE);
    if (!isOwner && !isStaff) {
      await interaction.reply({ content: "Seul l'auteur du ticket peut le fermer.", flags: MessageFlags.Ephemeral });
      return;
    }
    await tickets.closeTicket(interaction);
  },
};
