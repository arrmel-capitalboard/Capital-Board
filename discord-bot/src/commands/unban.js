'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const tempbans = require('../lib/tempbans');
const { sendDM, sendLog } = require('../lib/sanctions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Lève le bannissement d’un utilisateur (par ID).')
    .addStringOption((o) => o.setName('user_id').setDescription('ID de l’utilisateur à débannir.').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison du débannissement.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const userId = interaction.options.getString('user_id').trim();
    const reason = interaction.options.getString('raison') ?? 'Aucune raison fournie';

    if (!/^\d{17,20}$/.test(userId)) {
      await interaction.reply({ content: 'ID invalide.', flags: MessageFlags.Ephemeral });
      return;
    }

    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) {
      await interaction.reply({ content: 'Cet utilisateur n’est pas banni.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.guild.bans.remove(userId, reason);
    tempbans.remove(interaction.guild.id, userId);

    const user = ban.user;
    const dmEmbed = new EmbedBuilder()
      .setColor(0x16a34a)
      .setTitle(`Débannissement — ${interaction.guild.name}`)
      .setDescription('Votre bannissement a été levé. Vous pouvez de nouveau rejoindre le serveur.')
      .addFields({ name: 'Raison', value: reason })
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();
    const dmSent = await sendDM(user, dmEmbed);

    const logEmbed = new EmbedBuilder()
      .setColor(0x16a34a)
      .setTitle('Sanction : UNBAN')
      .addFields(
        { name: 'Membre', value: `${user.tag} (${user.id})` },
        { name: 'Modérateur', value: `${interaction.user.tag}`, inline: true },
        { name: 'MP envoyé', value: dmSent ? 'Oui' : 'Non', inline: true },
        { name: 'Raison', value: reason },
      )
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();
    await sendLog(interaction.guild, logEmbed);

    await interaction.reply(`**${user.tag}** a été débanni. Raison : ${reason}`);
  },
};
