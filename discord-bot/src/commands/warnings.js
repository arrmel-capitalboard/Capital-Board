'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const warns = require('../lib/warns');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Affiche l’historique des avertissements d’un membre.')
    .addUserOption((o) => o.setName('personne').setDescription('Le membre concerné.').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const user = interaction.options.getUser('personne');
    const history = warns.list(interaction.guild.id, user.id);

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`Avertissements — ${user.tag}`)
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

    if (history.length === 0) {
      embed.setDescription('Aucun avertissement.');
    } else {
      embed.setDescription(`${history.length} avertissement(s).`);
      // Limité aux 25 derniers (limite de champs d'un embed).
      for (const w of history.slice(-25)) {
        const date = `<t:${Math.floor(w.at / 1000)}:f>`;
        embed.addFields({ name: `${date} · par ${w.moderator}`, value: w.reason });
      }
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
