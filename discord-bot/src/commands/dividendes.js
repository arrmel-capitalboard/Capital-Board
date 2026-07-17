'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const firebase = require('../firebase');
const links = require('../lib/links');
const config = require('../config');
const E = require('../lib/emojis');

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dividendes')
    .setDescription('Récapitulatif des dividendes perçus cette année.')
    .addIntegerOption((o) => o.setName('annee').setDescription('Année (défaut : année en cours).').setMinValue(2000).setMaxValue(2100)),

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

    const year = interaction.options.getInteger('annee') ?? new Date().getFullYear();
    const tx = await links.getUserItems(uid, 'transactions');
    const divs = tx.filter((t) => t.type === 'dividend' && String(t.date).slice(0, 4) === String(year));

    if (divs.length === 0) {
      await interaction.editReply(`Aucun dividende enregistré pour ${year}.`);
      return;
    }

    // Montant d'un dividende = qty × price (price = montant par action).
    const byTicker = new Map();
    let total = 0;
    for (const d of divs) {
      const amount = (Number(d.qty) || 0) * (Number(d.price) || 0);
      total += amount;
      const key = `${d.name || d.ticker} (${d.ticker})`;
      byTicker.set(key, (byTicker.get(key) || 0) + amount);
    }

    const fields = [...byTicker.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([name, amount]) => ({ name, value: fmt(amount), inline: true }));

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`${E.CHECK} Dividendes perçus — ${year}`)
      .setDescription(`Total : **${fmt(total)}** sur ${divs.length} versement(s).`)
      .addFields(fields)
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
