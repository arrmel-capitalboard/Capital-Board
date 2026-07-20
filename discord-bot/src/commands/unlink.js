'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const firebase = require('../firebase');
const links = require('../lib/links');
const rolesync = require('../lib/rolesync');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Délie votre compte Capital Board de Discord.'),

  async execute(interaction) {
    if (!firebase.isConfigured()) {
      await interaction.reply({ content: 'Liaison indisponible (Firestore non configuré).', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await links.unlink(interaction.user.id);
    await rolesync.revoke(interaction.client, interaction.user.id);
    await interaction.editReply('Compte délié. Les salons réservés aux comptes liés ne sont plus accessibles.');
  },
};
