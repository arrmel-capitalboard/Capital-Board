'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const E = require('../lib/emojis');

const FONDATEUR_ROLE = '1512905140108001391';
const QSN_CHANNEL   = '1512915746982990005';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-qui-sommes-nous')
    .setDescription("Envoie l'embed de présentation de l'équipe Capital Board.")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande réservée au rôle fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`${E.ARROW}  Qui sommes-nous ?`)
      .setDescription(
        "**Capital Board** est une plateforme patrimoniale française construite par Armel Plantier, passionné d'investissement et de cybersécurité.\n\n" +
        "Aucun outil existant ne réunissait ce dont nous avions besoin : **suivi de PEA** précis, analyse **IA**, **sans publicité**, **sans agrégation bancaire** et **sans abonnement**, totalement **gratuit**. Alors on l'a construit.",
      )
      .addFields(
        {
          name: "Notre mission",
          value: "Rendre la gestion de patrimoine accessible à tous les particuliers français, sans jargon inutile ni frais cachés. C'est la communauté qui façonne l'évolution du projet — vos retours, idées et contributions déterminent directement les prochaines fonctionnalités.",
        },
        {
          name: "Ce que vous pouvez faire",
          value:
            "• Suivre votre portefeuille en temps réel\n" +
            "• Analyser vos performances et dividendes\n" +
            "• Recevoir des alertes prix sur mobile\n" +
            "• Obtenir un récap IA quotidien de votre portefeuille",
        },
        {
          name: "Notre engagement",
          value: "Code 100% open source et auditable. Données hébergées en Europe (RGPD). Aucune publicité, aucune revente de données. Vous êtes l'utilisateur, pas le produit.",
        },
      )
      .setFooter({ text: 'Capital Board — https://capitalboard.fr' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Découvrir Capital Board")
        .setStyle(ButtonStyle.Link)
        .setURL("https://capitalboard.fr")
        .setEmoji("🌐"),
    );

    const target = await interaction.client.channels.fetch(QSN_CHANNEL);
    await target.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `Embed envoyé dans <#${QSN_CHANNEL}>.` });
  },
};