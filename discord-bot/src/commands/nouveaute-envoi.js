'use strict';

// /nouveaute-envoi — force la publication immédiate du récap des nouveautés
// validées, sans attendre le lundi 18h. Réservée au rôle fondateur.

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const firebase = require('../firebase');
const newsweekly = require('../lib/newsweekly');

const FONDATEUR_ROLE = '1512905140108001391';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nouveaute-envoi')
    .setDescription('Publie maintenant le récap des nouveautés validées (sans attendre lundi).')
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
    const n = await newsweekly.sendNow(interaction.client);
    await interaction.editReply(
      n > 0
        ? `${n} nouveauté(s) publiée(s) dans le salon communautaire.`
        : 'Aucune nouveauté validée en attente — rien à publier.',
    );
  },
};
