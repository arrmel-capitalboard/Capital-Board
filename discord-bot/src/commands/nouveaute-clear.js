'use strict';

// /nouveaute-clear — vide la file : supprime toutes les nouveautés non encore
// publiées et leurs messages de validation. Réservée au rôle fondateur.

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const firebase = require('../firebase');
const newsqueue = require('../lib/newsqueue');

const FONDATEUR_ROLE = '1512905140108001391';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nouveaute-clear')
    .setDescription('Vide la file des nouveautés non publiées (rien ne partira lundi).')
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
    const n = await newsqueue.clearOpen(interaction.client);
    await interaction.editReply(`${n} entrée(s) supprimée(s). La file est vide.`);
  },
};
