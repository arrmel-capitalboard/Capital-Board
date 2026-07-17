'use strict';

const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { dmUser, logSanction } = require('../lib/sanctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulse un membre du serveur.')
    .addUserOption((o) => o.setName('personne').setDescription('Le membre à expulser.').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison de l’expulsion.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const target = interaction.options.getMember('personne');
    const reason = interaction.options.getString('raison') ?? 'Aucune raison fournie';

    if (!target) {
      await interaction.reply({ content: 'Membre introuvable sur le serveur.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (!target.kickable) {
      await interaction.reply({
        content: 'Impossible d’expulser ce membre (hiérarchie ou permissions du bot).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // MP avant l'expulsion (après, le membre quitte le serveur et n'est plus joignable).
    const dmSent = await dmUser(target.user, { action: 'kick', guildName: interaction.guild.name, reason, durationText: null });
    await target.kick(reason);
    await logSanction(interaction.guild, {
      action: 'kick',
      targetUser: target.user,
      moderator: interaction.user,
      reason,
      durationText: null,
      dmSent,
    });
    await interaction.reply(`**${target.user.tag}** a été expulsé. Raison : ${reason}`);
  },
};
