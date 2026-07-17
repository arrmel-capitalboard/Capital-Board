'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const tickets = require('../lib/tickets');

const MOD_ROLE = '1512905140108001391';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-user')
    .setDescription('Ajoute un membre au ticket en cours.')
    .addUserOption((o) => o.setName('membre').setDescription('Membre a ajouter').setRequired(true))
    .setDMPermission(false),

  async execute(interaction) {
    if (!tickets.isTicketChannel(interaction.channelId)) {
      await interaction.reply({ content: "Cette commande est utilisable uniquement dans un ticket.", flags: MessageFlags.Ephemeral });
      return;
    }

    const isMod = interaction.member.roles.cache.has(MOD_ROLE);
    const isOwner = tickets.getOwnerId(interaction.channelId) === interaction.user.id;
    if (!isMod && !isOwner) {
      await interaction.reply({ content: "Seul le proprietaire du ticket ou un moderateur peut ajouter des membres.", flags: MessageFlags.Ephemeral });
      return;
    }

    const target = interaction.options.getMember('membre');
    if (!target) {
      await interaction.reply({ content: "Membre introuvable.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.channel.permissionOverwrites.edit(target.id, {
      [PermissionFlagsBits.ViewChannel]: true,
      [PermissionFlagsBits.SendMessages]: true,
      [PermissionFlagsBits.ReadMessageHistory]: true,
    });

    await interaction.reply({ content: `<@${target.id}> a ete ajoute au ticket.` });
  },
};
