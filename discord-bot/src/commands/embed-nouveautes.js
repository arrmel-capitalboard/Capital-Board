'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const E = require('../lib/emojis');

const FONDATEUR_ROLE      = '1512905140108001391';
const NOUVEAUTES_CHANNEL  = '1512909014990586047';
const REACT_EMOJI         = '1520171580292989139';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-nouveautes')
    .setDescription("Publie une mise à jour Capital Board dans le salon nouveautés.")
    .addStringOption((o) => o.setName('version').setDescription("Version ou date (ex: v1.2, Juin 2026)").setRequired(true))
    .addStringOption((o) => o.setName('titre').setDescription("Titre de la mise à jour").setRequired(true))
    .addStringOption((o) => o.setName('contenu').setDescription("Détail des nouveautés (supporte \\n pour sauts de ligne)").setRequired(true))
    .addAttachmentOption((o) => o.setName('image').setDescription("Image ou GIF illustrant la nouveauté").setRequired(false))
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande réservée au rôle fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const version    = interaction.options.getString('version');
    const titre      = interaction.options.getString('titre');
    const contenu    = interaction.options.getString('contenu').replace(/\\n/g, '\n');
    const attachment = interaction.options.getAttachment('image');

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`${E.ARROW}  ${titre}`)
      .setDescription(contenu)
      .setFooter({ text: `${version} · CapitalBoard - https://capitalboard.fr` })
      .setTimestamp();

    if (attachment) embed.setImage(attachment.url);

    const target = await interaction.client.channels.fetch(NOUVEAUTES_CHANNEL);
    const msg = await target.send({ content: `${E.ARROW}  **Mise à jour ${version}**`, embeds: [embed] });

    try { await msg.react(REACT_EMOJI); } catch {}

    await interaction.editReply({ content: `Nouveauté publiée dans <#${NOUVEAUTES_CHANNEL}>.` });
  },
};