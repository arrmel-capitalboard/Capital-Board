'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const E = require('../lib/emojis');

const FONDATEUR_ROLE   = '1512905140108001391';
const ANNOUNCE_CHANNEL = '1512908999878639616';
const DEFAULT_IMAGE    = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/annonce.gif';
const REACT_EMOJI      = '1520171580292989139';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Envoie une annonce dans le salon annonces.')
    .addStringOption((o) => o.setName('titre').setDescription("Titre de l'annonce").setRequired(true))
    .addStringOption((o) => o.setName('description').setDescription("Contenu de l'annonce").setRequired(true))
    .addAttachmentOption((o) => o.setName('image').setDescription('Image personnalisee (defaut : annonce.gif)').setRequired(false))
    .addStringOption((o) =>
      o.setName('ping')
        .setDescription('Mention a envoyer avec l\'annonce')
        .setRequired(false)
        .addChoices(
          { name: '@here',     value: '@here' },
          { name: '@everyone', value: '@everyone' },
        ),
    )
    .addMentionableOption((o) => o.setName('mention').setDescription('Role ou membre specifique a mentionner').setRequired(false))
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande reservee au role fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const titre       = interaction.options.getString('titre');
    const description = interaction.options.getString('description');
    const attachment  = interaction.options.getAttachment('image');
    const ping        = interaction.options.getString('ping');
    const mentionable = interaction.options.getMentionable('mention');
    const imageUrl    = attachment ? attachment.url : DEFAULT_IMAGE;

    const target = await interaction.client.channels.fetch(ANNOUNCE_CHANNEL);

    const embed = new EmbedBuilder()
      .setColor(0xfde047)
      .setTitle(`${E.ARROW}  ${titre}`)
      .setDescription(description)
      .setImage(imageUrl)
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();

    let content = '';
    if (ping) content = ping;
    else if (mentionable) content = mentionable.toString();

    const msg = await target.send({
      content: content || undefined,
      embeds: [embed],
      allowedMentions: { parse: ['everyone', 'roles', 'users'] },
    });

    try { await msg.react(REACT_EMOJI); } catch {}

    await interaction.editReply({ content: `Annonce envoyee dans <#${ANNOUNCE_CHANNEL}>.` });
  },
};