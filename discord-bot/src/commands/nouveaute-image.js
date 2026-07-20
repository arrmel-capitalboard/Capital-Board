'use strict';

// /nouveaute-image — joint (ou remplace) l'image d'une nouveauté en attente,
// via une vraie pièce jointe. Réservée au rôle fondateur.

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const firebase = require('../firebase');
const newsqueue = require('../lib/newsqueue');

const FONDATEUR_ROLE = '1512905140108001391';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nouveaute-image')
    .setDescription('Joint une image à une nouveauté en attente (remplace l\'existante).')
    .addStringOption((o) => o.setName('nouveaute').setDescription('La nouveauté à illustrer').setRequired(true).setAutocomplete(true))
    .addAttachmentOption((o) => o.setName('image').setDescription('Image à joindre').setRequired(true))
    .setDMPermission(false),

  async autocomplete(interaction) {
    if (!firebase.isConfigured()) { await interaction.respond([]); return; }
    const focused = (interaction.options.getFocused() || '').toLowerCase();
    let items = await newsqueue.listOpen();
    if (focused) items = items.filter((i) => i.text.toLowerCase().includes(focused));
    await interaction.respond(
      items.slice(0, 25).map((i) => ({ name: i.text.slice(0, 100), value: i.id })),
    );
  },

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: "Commande reservee au role fondateur.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!firebase.isConfigured()) {
      await interaction.reply({ content: 'Indisponible (Firestore non configuré).', flags: MessageFlags.Ephemeral });
      return;
    }

    const image = interaction.options.getAttachment('image');
    if (!newsqueue.isImageAttachment(image)) {
      await interaction.reply({ content: 'Le fichier joint n\'est pas une image.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const id = interaction.options.getString('nouveaute');
    const res = await newsqueue.attachImage(interaction.client, id, image.url);
    await interaction.editReply(res.ok ? 'Image jointe à la nouveauté.' : res.reason);
  },
};
