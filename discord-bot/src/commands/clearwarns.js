'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const warns = require('../lib/warns');
const { sendDM, sendLog } = require('../lib/sanctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Efface tous les avertissements d’un membre.')
    .addUserOption((o) => o.setName('personne').setDescription('Le membre concerné.').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const user = interaction.options.getUser('personne');
    const removed = warns.clear(interaction.guild.id, user.id);

    if (removed === 0) {
      await interaction.reply({ content: `**${user.tag}** n’a aucun avertissement.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const dmEmbed = new EmbedBuilder()
      .setColor(0x16a34a)
      .setTitle(`Avertissements réinitialisés — ${interaction.guild.name}`)
      .setDescription('Vos avertissements ont été effacés.')
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();
    const dmSent = await sendDM(user, dmEmbed);

    const logEmbed = new EmbedBuilder()
      .setColor(0x16a34a)
      .setTitle('Sanction : CLEARWARNS')
      .addFields(
        { name: 'Membre', value: `${user.tag} (${user.id})` },
        { name: 'Modérateur', value: `${interaction.user.tag}`, inline: true },
        { name: 'Avertissements effacés', value: String(removed), inline: true },
        { name: 'MP envoyé', value: dmSent ? 'Oui' : 'Non', inline: true },
      )
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();
    await sendLog(interaction.guild, logEmbed);

    await interaction.reply(`${removed} avertissement(s) effacé(s) pour **${user.tag}**.`);
  },
};
