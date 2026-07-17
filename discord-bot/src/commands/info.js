'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Affiche les informations sur Capital Board.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle('Capital Board')
      .setURL(config.siteUrl)
      .setDescription('Votre tableau de bord patrimonial : suivez vos investissements, vos dividendes et vos performances en un coup d’œil.')
      .addFields(
        { name: 'Site', value: config.siteUrl, inline: true },
        { name: 'Support', value: 'Posez vos questions sur ce serveur.', inline: true },
      )
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
