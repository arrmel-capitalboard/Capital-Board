'use strict';

const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { parseDuration, formatDuration } = require('../lib/duration');
const tempbans = require('../lib/tempbans');
const { dmUser, logSanction } = require('../lib/sanctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannit un membre. Sans durée = définitif.')
    .addUserOption((o) => o.setName('personne').setDescription('La personne à bannir.').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison du bannissement.'))
    .addStringOption((o) => o.setName('duree').setDescription('Durée (ex : 30m, 2h, 7d). Vide = définitif.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const user = interaction.options.getUser('personne');
    const member = interaction.options.getMember('personne');
    const reason = interaction.options.getString('raison') ?? 'Aucune raison fournie';
    const ms = parseDuration(interaction.options.getString('duree'));

    if (Number.isNaN(ms)) {
      await interaction.reply({ content: 'Durée invalide. Exemples : `30m`, `2h`, `7d`.', flags: MessageFlags.Ephemeral });
      return;
    }
    // member est null si la personne n'est pas/plus sur le serveur (ban par ID reste possible).
    if (member && !member.bannable) {
      await interaction.reply({
        content: 'Impossible de bannir ce membre (hiérarchie ou permissions du bot).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const durationText = ms ? formatDuration(ms) : null;

    // MP avant le ban (après, l'utilisateur quitte le serveur et n'est plus joignable).
    const dmSent = member ? await dmUser(user, { action: 'ban', guildName: interaction.guild.name, reason, durationText }) : false;

    await interaction.guild.bans.create(user.id, { reason });
    if (ms) tempbans.add({ guildId: interaction.guild.id, userId: user.id, expiresAt: Date.now() + ms });

    await logSanction(interaction.guild, {
      action: 'ban',
      targetUser: user,
      moderator: interaction.user,
      reason,
      durationText,
      dmSent,
    });

    if (ms) {
      await interaction.reply(`**${user.tag}** a été banni pour ${formatDuration(ms)}. Raison : ${reason}`);
    } else {
      await interaction.reply(`**${user.tag}** a été banni définitivement. Raison : ${reason}`);
    }
  },
};
