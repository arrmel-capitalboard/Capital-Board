'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const E = require('../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Verrouille le salon (empêche les membres d’écrire).')
    .addStringOption((o) => o.setName('raison').setDescription('Raison du verrouillage.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction) {
    const reason = interaction.options.getString('raison') ?? 'Aucune raison fournie';
    const everyone = interaction.guild.roles.everyone;

    await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: false }, { reason });
    await interaction.reply(`${E.LOCK} Salon verrouillé. Raison : ${reason}`);
  },
};
