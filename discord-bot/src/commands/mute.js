'use strict';

const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { parseDuration, formatDuration } = require('../lib/duration');
const { dmUser, logSanction } = require('../lib/sanctions');

// Limite Discord pour le timeout natif : 28 jours.
const MAX_TIMEOUT = 28 * 86_400_000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Rend un membre muet (timeout). Sans durée = maximum (28 jours).')
    .addUserOption((o) => o.setName('personne').setDescription('Le membre à rendre muet.').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison du mute.'))
    .addStringOption((o) => o.setName('duree').setDescription('Durée (ex : 30m, 2h, 7d). Max 28j. Vide = 28j.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const target = interaction.options.getMember('personne');
    const reason = interaction.options.getString('raison') ?? 'Aucune raison fournie';
    let ms = parseDuration(interaction.options.getString('duree'));

    if (Number.isNaN(ms)) {
      await interaction.reply({ content: 'Durée invalide. Exemples : `30m`, `2h`, `7d`.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (!target) {
      await interaction.reply({ content: 'Membre introuvable sur le serveur.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (!target.moderatable) {
      await interaction.reply({
        content: 'Impossible de rendre muet ce membre (hiérarchie ou permissions du bot).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Pas de durée → maximum Discord. Le timeout natif ne peut pas être permanent.
    const capped = ms == null || ms > MAX_TIMEOUT;
    if (capped) ms = MAX_TIMEOUT;

    const durationText = formatDuration(ms) + (capped ? ' (max)' : '');
    const dmSent = await dmUser(target.user, { action: 'mute', guildName: interaction.guild.name, reason, durationText });

    await target.timeout(ms, reason);
    await logSanction(interaction.guild, {
      action: 'mute',
      targetUser: target.user,
      moderator: interaction.user,
      reason,
      durationText,
      dmSent,
    });

    const note = capped ? ' (maximum Discord — le timeout n’est pas permanent)' : '';
    await interaction.reply(`**${target.user.tag}** est muet pour ${formatDuration(ms)}${note}. Raison : ${reason}`);
  },
};
