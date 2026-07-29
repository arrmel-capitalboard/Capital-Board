'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const E = require('../lib/emojis');

const TIKTOK    = 'https://www.tiktok.com/@capital.board';
const INSTAGRAM = 'https://www.instagram.com/capitalboard';
const YOUTUBE   = 'https://www.youtube.com/@CapitalBoardApp';
const FACEBOOK  = 'https://www.facebook.com/profile.php?id=61592639900050';
const LINKEDIN  = 'https://www.linkedin.com/company/capitalboard/';
const PAYPAL    = 'https://www.paypal.com/paypalme/capitalboard';
const GITHUB    = 'https://github.com/arrmel-capitalboard/Capital-Board';
const LIENS_GIF = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/liens.gif';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('liens')
    .setDescription('Affiche tous les liens Capital Board.')
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`${E.ARROW}  Retrouvez Capital Board`)
      .addFields(
        { name: 'Site web',   value: '[capitalboard.fr](https://capitalboard.fr)', inline: true },
        { name: 'TikTok',    value: `[capital.board](${TIKTOK})`,       inline: true },
        { name: 'Instagram', value: `[capitalboard](${INSTAGRAM})`,     inline: true },
        { name: 'YouTube',   value: `[CapitalBoardApp](${YOUTUBE})`,    inline: true },
        { name: 'Facebook',  value: `[Capital Board](${FACEBOOK})`,     inline: true },
        { name: 'LinkedIn',  value: `[CapitalBoard](${LINKEDIN})`,      inline: true },
        { name: 'GitHub',    value: `[Capital-Board](${GITHUB})`,   inline: true },
        { name: 'Nous soutenir', value: `[PayPal](${PAYPAL})`,      inline: true },
      )
      .setImage(LIENS_GIF)
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Site web').setStyle(ButtonStyle.Link).setURL('https://capitalboard.fr'),
      new ButtonBuilder().setLabel('TikTok').setStyle(ButtonStyle.Link).setURL(TIKTOK),
      new ButtonBuilder().setLabel('Instagram').setStyle(ButtonStyle.Link).setURL(INSTAGRAM),
      new ButtonBuilder().setLabel('YouTube').setStyle(ButtonStyle.Link).setURL(YOUTUBE),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Facebook').setStyle(ButtonStyle.Link).setURL(FACEBOOK),
      new ButtonBuilder().setLabel('LinkedIn').setStyle(ButtonStyle.Link).setURL(LINKEDIN),
      new ButtonBuilder().setLabel('GitHub').setStyle(ButtonStyle.Link).setURL(GITHUB),
      new ButtonBuilder().setLabel('Nous soutenir (PayPal)').setStyle(ButtonStyle.Link).setURL(PAYPAL),
    );

    await interaction.editReply({ embeds: [embed], components: [row1, row2] });
  },
};