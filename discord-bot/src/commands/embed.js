'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Publie un embed personnalisé.')
    .addStringOption((o) =>
      o.setName('description').setDescription('Contenu de l’embed. \\n pour un retour à la ligne.').setRequired(true),
    )
    .addStringOption((o) => o.setName('titre').setDescription('Titre de l’embed.'))
    .addStringOption((o) => o.setName('couleur').setDescription('Couleur hex, ex : #2563eb.'))
    .addChannelOption((o) =>
      o
        .setName('salon')
        .setDescription('Salon de publication (défaut : salon actuel).')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    const description = interaction.options.getString('description').replace(/\\n/g, '\n');
    const title = interaction.options.getString('titre');
    const colorInput = interaction.options.getString('couleur');
    const channel = interaction.options.getChannel('salon') ?? interaction.channel;

    let color = config.brandColor;
    if (colorInput) {
      const hex = colorInput.replace('#', '');
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
        await interaction.reply({ content: 'Couleur invalide. Format attendu : `#2563eb`.', flags: MessageFlags.Ephemeral });
        return;
      }
      color = parseInt(hex, 16);
    }

    const embed = new EmbedBuilder().setColor(color).setDescription(description);
    if (title) embed.setTitle(title);
    embed.setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

    const me = interaction.guild.members.me;
    if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) {
      await interaction.reply({ content: `Le bot ne peut pas écrire dans ${channel}.`, flags: MessageFlags.Ephemeral });
      return;
    }

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `Embed publié dans ${channel}.`, flags: MessageFlags.Ephemeral });
  },
};
