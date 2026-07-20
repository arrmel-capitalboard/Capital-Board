'use strict';

// /nouveaute — ajoute manuellement une nouveauté à la file de validation
// (pour ce qui n'est pas capté par un commit feat). Elle suit ensuite le même
// circuit : message de validation (où l'on peut joindre une image via le
// bouton 🖼️), puis publication le lundi si validée. Réservée au fondateur.

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const firebase = require('../firebase');
const newsqueue = require('../lib/newsqueue');

const FONDATEUR_ROLE = '1512905140108001391';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nouveaute')
    .setDescription('Ajoute une nouveauté à la file de validation.')
    .addStringOption((o) => o.setName('texte').setDescription('La nouveauté, telle qu\'elle sera affichée aux membres').setRequired(true))
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande reservee au role fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!firebase.isConfigured()) {
      await interaction.reply({ content: 'Indisponible (Firestore non configuré).', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await newsqueue.addPending(interaction.options.getString('texte'), { source: 'manuel' });
    await interaction.editReply('Nouveauté ajoutée. Un message de validation va apparaître — utilisez 🖼️ pour joindre une image.');
  },
};
