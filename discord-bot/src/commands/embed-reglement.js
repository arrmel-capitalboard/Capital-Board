'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const E = require('../lib/emojis');

const FONDATEUR_ROLE    = '1512905140108001391';
const ROLE_MEMBRE       = '1512906443085582539';
const ROLE_VISITEUR     = '1512906509078495232';
const REGLEMENT_CHANNEL = '1512908986482032832';
const REGLEMENT_GIF     = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/reglement.gif';

const REGLEMENT = [
  { name: '1. Respect', value: "Soyez respectueux envers tous les membres. Aucune insulte, discrimination ou harcèlement ne sera toléré." },
  { name: '2. Pas de spam', value: "Évitez les messages répétitifs, les majuscules abusives et les floods de messages." },
  { name: '3. Pas de publicité', value: "Aucune publicité non autorisée, lien externe ou invitation Discord sans accord de la modération." },
  { name: '4. Sujets adaptés', value: "Restez dans les thèmes du serveur (finance, investissement, patrimoine). Utilisez les bons salons." },
  { name: '5. Pas de conseils financiers', value: "Les informations partagées sont à titre éducatif uniquement. Ce n'est pas du conseil en investissement." },
  { name: '6. Confidentialité', value: "Ne partagez pas d'informations personnelles (vos données ou celles d'autrui)." },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-reglement')
    .setDescription("Envoie l'embed du règlement avec bouton d'acceptation.")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande réservée au rôle fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setColor(0x00e09e)
      .setTitle(`${E.ARROW}  Règlement du serveur`)
      .setDescription("En acceptant le règlement, vous obtenez accès au serveur Capital Board.")
      .addFields(REGLEMENT)
      .setImage(REGLEMENT_GIF)
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('accept_rules')
        .setLabel('Accepter le règlement')
        .setStyle(ButtonStyle.Success)
        .setEmoji('1520171580292989139'),
    );

    const target = await interaction.client.channels.fetch(REGLEMENT_CHANNEL);
    await target.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `Embed règlement envoyé dans <#${REGLEMENT_CHANNEL}>.` });
  },

  ROLE_MEMBRE,
  ROLE_VISITEUR,
};