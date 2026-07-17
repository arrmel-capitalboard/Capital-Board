'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const firebase = require('../firebase');
const links = require('../lib/links');
const { fetchPrice } = require('../lib/prices');
const config = require('../config');
const E = require('../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('watchlist')
    .setDescription('Affiche votre liste de valeurs suivies (variation du jour).'),

  async execute(interaction) {
    if (!firebase.isConfigured()) {
      await interaction.reply({ content: 'Indisponible (Firestore non configuré).', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const uid = await links.getUid(interaction.user.id);
    if (!uid) {
      await interaction.editReply('Votre compte n’est pas lié. Utilisez `/link`.');
      return;
    }

    const items = await links.getUserItems(uid, 'watchlist');
    if (items.length === 0) {
      await interaction.editReply('Votre watchlist est vide.');
      return;
    }

    const lines = items.slice(0, 25);
    const quotes = await Promise.all(lines.map((it) => fetchPrice(it.ticker)));

    const fields = lines.map((it, i) => {
      const q = quotes[i];
      if (!q) return { name: `${it.name} (${it.ticker})`, value: 'cours indisponible' };
      const pct = q.changePct ?? 0;
      const sign = pct >= 0 ? `${E.CHECK} +` : `${E.CROSS} `;
      const price = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: q.currency }).format(q.price);
      return { name: `${it.name} (${it.ticker})`, value: `${price} · ${sign}${pct.toFixed(2)} % aujourd’hui` };
    });

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle('Votre watchlist')
      .addFields(fields)
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();

    if (items.length > 25) embed.setDescription(`Affichage des 25 premières sur ${items.length}.`);

    await interaction.editReply({ embeds: [embed] });
  },
};
