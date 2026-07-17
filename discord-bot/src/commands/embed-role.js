'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const E = require('../lib/emojis');

const FONDATEUR_ROLE  = '1512905140108001391';
const ROLE_CHANNEL    = '1520211949806420133';
const ROLE_IDS = ['1512906574127956078', '1512906632743354378'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-role')
    .setDescription("Envoie l'embed de selection de roles dans le salon dedie.")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande reservee au role fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const roles = await Promise.all(
      ROLE_IDS.map((id) => interaction.guild.roles.fetch(id)),
    );

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`${E.ARROW}  Choisissez vos roles`)
      .setDescription("Cliquez sur un bouton pour obtenir ou retirer un role.")
      .addFields(roles.map((r) => ({ name: r.name, value: `<@&${r.id}>`, inline: true })))
      .setImage('https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/role.gif')
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

    const row = new ActionRowBuilder().addComponents(
      roles.map((r) =>
        new ButtonBuilder()
          .setCustomId(`role_${r.id}`)
          .setLabel(r.name)
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    const target = await interaction.client.channels.fetch(ROLE_CHANNEL);
    await target.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: "Embed role envoye." });
  },
};