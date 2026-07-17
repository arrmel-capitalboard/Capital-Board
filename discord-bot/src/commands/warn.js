'use strict';

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const warns = require('../lib/warns');
const { sendDM, sendLog } = require('../lib/sanctions');
const E = require('../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertit un membre (enregistré dans l’historique).')
    .addUserOption((o) => o.setName('personne').setDescription('Le membre à avertir.').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison de l’avertissement.').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const user = interaction.options.getUser('personne');
    const reason = interaction.options.getString('raison');

    if (user.bot) {
      await interaction.reply({ content: 'Impossible d’avertir un bot.', flags: 64 });
      return;
    }

    const history = warns.add(interaction.guild.id, user.id, { moderator: interaction.user.tag, reason });
    const count = history.length;

    const dmEmbed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`${E.WARN} Avertissement — ${interaction.guild.name}`)
      .setDescription('Vous avez reçu un avertissement.')
      .addFields(
        { name: 'Raison', value: reason },
        { name: 'Total d’avertissements', value: String(count) },
      )
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();
    const dmSent = await sendDM(user, dmEmbed);

    const logEmbed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`${E.WARN} Sanction : WARN`)
      .addFields(
        { name: 'Membre', value: `${user.tag} (${user.id})` },
        { name: 'Modérateur', value: `${interaction.user.tag}`, inline: true },
        { name: 'Total', value: String(count), inline: true },
        { name: 'MP envoyé', value: dmSent ? 'Oui' : 'Non', inline: true },
        { name: 'Raison', value: reason },
      )
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();
    await sendLog(interaction.guild, logEmbed);

    await interaction.reply(`**${user.tag}** a été averti (${count} au total). Raison : ${reason}`);
  },
};
