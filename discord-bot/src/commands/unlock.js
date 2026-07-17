'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const E = require('../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Déverrouille le salon (réautorise l’écriture).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction) {
    const everyone = interaction.guild.roles.everyone;

    // null = on retire l'override → retour à la permission héritée par défaut.
    await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: null });
    await interaction.reply(`${E.CHECK} Salon déverrouillé.`);
  },
};
