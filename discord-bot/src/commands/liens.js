'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const E = require('../lib/emojis');

const TIKTOK    = 'https://www.tiktok.com/@capitalboard';
const INSTAGRAM = 'https://www.instagram.com/capitalboard';
const YOUTUBE   = 'https://www.youtube.com/@capitalboard';
const LIENS_GIF = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/liens.gif';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('liens')
    .setDescription('Affiche tous les liens Capital Board.')
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`${E.ARROW}  Retrouvez Capital Board`)
      .addFields(
        { name: 'Site web',   value: '[capitalboard.fr](https://capitalboard.fr)', inline: true },
        { name: 'TikTok',    value: `[capitalboard](${TIKTOK})`,    inline: true },
        { name: 'Instagram', value: `[capitalboard](${INSTAGRAM})`, inline: true },
        { name: 'YouTube',   value: `[capitalboard](${YOUTUBE})`,   inline: true },
      )
      .setImage(LIENS_GIF)
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Site web').setStyle(ButtonStyle.Link).setURL('https://capitalboard.fr'),
      new ButtonBuilder().setLabel('TikTok').setStyle(ButtonStyle.Link).setURL(TIKTOK),
      new ButtonBuilder().setLabel('Instagram').setStyle(ButtonStyle.Link).setURL(INSTAGRAM),
      new ButtonBuilder().setLabel('YouTube').setStyle(ButtonStyle.Link).setURL(YOUTUBE),
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};