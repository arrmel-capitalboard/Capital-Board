'use strict';

// /nouveaute — publie une nouveauté produit dans le salon nouveautés.
// Réservée au rôle fondateur, comme /announce. Chaque feature saisie
// devient une puce ; seule la première est obligatoire.

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const E = require('../lib/emojis');

const FONDATEUR_ROLE      = '1512905140108001391';
const NOUVEAUTES_CHANNEL  = '1512909014990586047';
const DEFAULT_IMAGE       = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/annonce.gif';
const REACT_EMOJI         = '1520171580292989139';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nouveaute')
    .setDescription('Publie une nouveauté Capital Board dans le salon nouveautés.')
    .addStringOption((o) => o.setName('titre').setDescription('Titre de la nouveauté').setRequired(true))
    .addStringOption((o) => o.setName('feature1').setDescription('Nouveauté 1').setRequired(true))
    .addStringOption((o) => o.setName('feature2').setDescription('Nouveauté 2').setRequired(false))
    .addStringOption((o) => o.setName('feature3').setDescription('Nouveauté 3').setRequired(false))
    .addStringOption((o) => o.setName('feature4').setDescription('Nouveauté 4').setRequired(false))
    .addStringOption((o) => o.setName('feature5').setDescription('Nouveauté 5').setRequired(false))
    .addAttachmentOption((o) => o.setName('image').setDescription('Image personnalisee (defaut : annonce.gif)').setRequired(false))
    .addStringOption((o) =>
      o.setName('ping')
        .setDescription('Mention a envoyer avec la nouveaute')
        .setRequired(false)
        .addChoices(
          { name: '@here',     value: '@here' },
          { name: '@everyone', value: '@everyone' },
        ),
    )
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande reservee au role fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const titre = interaction.options.getString('titre');
    const features = ['feature1', 'feature2', 'feature3', 'feature4', 'feature5']
      .map((n) => interaction.options.getString(n))
      .filter(Boolean);

    const attachment = interaction.options.getAttachment('image');
    const ping       = interaction.options.getString('ping');
    const imageUrl   = attachment ? attachment.url : DEFAULT_IMAGE;

    const embed = new EmbedBuilder()
      .setColor(0xfde047)
      .setTitle(`${E.ARROW}  ${titre}`)
      .setDescription(features.map((f) => `${E.CHECK}  ${f}`).join('\n'))
      .setImage(imageUrl)
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();

    const target = await interaction.client.channels.fetch(NOUVEAUTES_CHANNEL);
    const msg = await target.send({
      content: ping || undefined,
      embeds: [embed],
      allowedMentions: { parse: ['everyone'] },
    });

    try { await msg.react(REACT_EMOJI); } catch {}

    await interaction.editReply({ content: `Nouveauté publiée dans <#${NOUVEAUTES_CHANNEL}>.` });
  },
};
