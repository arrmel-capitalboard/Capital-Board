'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const E = require('../lib/emojis');

const FONDATEUR_ROLE = '1512905140108001391';
const TICKETS_GIF = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/tickets.gif';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-ticket')
    .setDescription("Envoie l'embed d'ouverture de ticket dans ce salon.")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande réservée au rôle fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`${E.ARROW}  Support Capital Board`)
      .setDescription(
        "Besoin d'aide ? Ouvrez un ticket et notre équipe vous répondra rapidement.\n\n> Un seul ticket par membre.",
      )
      .setImage(TICKETS_GIF)
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_ticket')
        .setLabel('Ouvrir un ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫'),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: "Embed ticket envoyé." });
  },
};
