'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const firebase = require('../firebase');
const links = require('../lib/links');
const { fetchPrice } = require('../lib/prices');
const leaderboard = require('../lib/leaderboard');
const config = require('../config');
const E = require('../lib/emojis');

const fmt = (n, cur = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('portefeuille')
    .setDescription('Affiche votre portefeuille Capital Board.'),

  async execute(interaction) {
    if (!firebase.isConfigured()) {
      await interaction.reply({ content: 'Indisponible (Firestore non configuré).', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const uid = await links.getUid(interaction.user.id);
    if (!uid) {
      await interaction.editReply('Votre compte n’est pas lié. Générez un code sur le site puis utilisez `/link <code>`.');
      return;
    }

    const items = await links.getPortfolio(uid);
    if (items.length === 0) {
      await interaction.editReply('Votre portefeuille est vide.');
      return;
    }

    // Cours en parallèle (max ~25 lignes pour tenir dans un embed).
    const lines = items.slice(0, 25);
    const quotes = await Promise.all(lines.map((it) => fetchPrice(it.ticker)));

    let totalValue = 0;
    let totalCost = 0;
    const cur = lines[0].currency || 'EUR';

    const fields = lines.map((it, i) => {
      const q = quotes[i];
      const qty = Number(it.qty) || 0;
      const buy = Number(it.buyPrice) || 0;
      totalCost += qty * buy;

      if (!q) {
        return { name: `${it.name} (${it.ticker})`, value: `${qty} × — · cours indisponible` };
      }
      const value = qty * q.price;
      totalValue += value;
      const plPct = buy ? ((q.price - buy) / buy) * 100 : 0;
      const sign = plPct >= 0 ? `${E.CHECK} +` : `${E.CROSS} `;
      return {
        name: `${it.name} (${it.ticker})`,
        value: `${qty} × ${fmt(q.price, q.currency)} = **${fmt(value, q.currency)}** · ${sign}${plPct.toFixed(2)} %`,
      };
    });

    const totalPl = totalValue - totalCost;
    const totalPlPct = totalCost ? (totalPl / totalCost) * 100 : 0;
    const totalSign = totalPl >= 0 ? `${E.CHECK} +` : `${E.CROSS} `;

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle('Votre portefeuille')
      .addFields(fields)
      .addFields({
        name: 'Total',
        value: `Valeur : **${fmt(totalValue, cur)}** · Investi : ${fmt(totalCost, cur)} · P/L : ${totalSign}${fmt(totalPl, cur)} (${totalPlPct.toFixed(2)} %)`,
      })
      // Identifiant anonyme du classement : sans lui, impossible de se
      // reconnaître dans le salon leaderboard.
      .addFields({
        name: 'Classement communauté',
        value: `Vous y figurez sous **${leaderboard.alias(uid)}**.`,
      })
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();

    if (items.length > 25) {
      embed.setDescription(`Affichage des 25 premières lignes sur ${items.length}.`);
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
