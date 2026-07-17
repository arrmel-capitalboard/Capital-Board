'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const firebase = require('../firebase');
const links = require('../lib/links');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Lie votre compte Capital Board à Discord.'),

  async execute(interaction) {
    if (!firebase.isConfigured()) {
      await interaction.reply({ content: 'Liaison indisponible (Firestore non configuré).', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const token = await links.createLinkRequest(interaction.user.id, interaction.user.tag);
    const linkUrl = `${config.siteUrl}/app.html?dl=${token}`;

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle('Lier votre compte Capital Board')
      .setDescription(
        `1. Ouvrez ce lien **en étant connecté** sur Capital Board :\n${linkUrl}\n\n` +
          '2. La liaison se fait automatiquement.\n' +
          '3. Utilisez ensuite `/portefeuille`.\n\n' +
          '_Lien valable 15 minutes._',
      )
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

    await interaction.editReply({ embeds: [embed] });
  },
};
