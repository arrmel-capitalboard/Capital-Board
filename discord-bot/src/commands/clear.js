'use strict';

const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime en masse des messages du salon.')
    .addIntegerOption((o) =>
      o.setName('nombre').setDescription('Nombre de messages (1 à 100).').setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .addUserOption((o) => o.setName('personne').setDescription('Ne supprimer que les messages de ce membre.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    const count = interaction.options.getInteger('nombre');
    const user = interaction.options.getUser('personne');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Récupère un lot, filtre si besoin par auteur, puis garde les N voulus.
    const fetched = await interaction.channel.messages.fetch({ limit: user ? 100 : count });
    let toDelete = user ? fetched.filter((m) => m.author.id === user.id) : fetched;
    toDelete = [...toDelete.values()].slice(0, count);

    // bulkDelete ignore les messages de plus de 14 jours (limite Discord).
    const deleted = await interaction.channel.bulkDelete(toDelete, true);

    const suffix = user ? ` de **${user.tag}**` : '';
    await interaction.editReply(
      `${deleted.size} message(s) supprimé(s)${suffix}.` +
        (deleted.size < toDelete.length ? '\n*(Les messages de plus de 14 jours ne peuvent pas être supprimés en masse.)*' : ''),
    );
  },
};
