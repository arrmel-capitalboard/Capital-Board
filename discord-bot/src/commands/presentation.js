'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const E = require('../lib/emojis');

const FONDATEUR_ROLE = '1512905140108001391';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('presentation')
    .setDescription("Envoie l'embed de presentation Capital Board dans ce salon.")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande reservee au role fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`${E.ARROW}  Capital Board`)
      .setDescription(
        "**Capital Board** est votre tableau de bord patrimonial tout-en-un.\n\n" +
        "Suivez vos investissements, analysez vos performances et prenez de meilleures decisions financieres — le tout sur une seule plateforme.\n\n" +
        `${E.ARROW}  **Rejoignez-nous sur https://capitalboard.fr**`,
      )
      .addFields(
        { name: "Suivi de portefeuille", value: "Actions, ETF, crypto, immobilier.", inline: true },
        { name: "Analyses en temps reel", value: "Cours, dividendes, performances.", inline: true },
        { name: "Entierement gratuit", value: "Acces libre pendant le lancement.", inline: true },
      )
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Acceder a Capital Board")
        .setStyle(ButtonStyle.Link)
        .setURL("https://capitalboard.fr")
        .setEmoji("🌐"),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: "Embed de presentation envoye." });
  },
};
