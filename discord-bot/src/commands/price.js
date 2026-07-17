'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { fetchPrice } = require('../lib/prices');
const config = require('../config');
const E = require('../lib/emojis');

const TICKERS = [
  { name: 'Apple (AAPL)', value: 'AAPL' },
  { name: 'Microsoft (MSFT)', value: 'MSFT' },
  { name: 'NVIDIA (NVDA)', value: 'NVDA' },
  { name: 'Amazon (AMZN)', value: 'AMZN' },
  { name: 'Alphabet (GOOGL)', value: 'GOOGL' },
  { name: 'Meta (META)', value: 'META' },
  { name: 'Tesla (TSLA)', value: 'TSLA' },
  { name: 'Berkshire Hathaway (BRK-B)', value: 'BRK-B' },
  { name: 'JPMorgan (JPM)', value: 'JPM' },
  { name: 'Visa (V)', value: 'V' },
  { name: 'LVMH (MC.PA)', value: 'MC.PA' },
  { name: 'TotalEnergies (TTE.PA)', value: 'TTE.PA' },
  { name: 'Sanofi (SAN.PA)', value: 'SAN.PA' },
  { name: 'BNP Paribas (BNP.PA)', value: 'BNP.PA' },
  { name: 'Airbus (AIR.PA)', value: 'AIR.PA' },
  { name: 'Bitcoin (BTC-USD)', value: 'BTC-USD' },
  { name: 'Ethereum (ETH-USD)', value: 'ETH-USD' },
  { name: "S&P 500 (^GSPC)", value: '^GSPC' },
  { name: 'NASDAQ (^IXIC)', value: '^IXIC' },
  { name: 'CAC 40 (^FCHI)', value: '^FCHI' },
];

const fmt = (n, cur) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('price')
    .setDescription('Affiche le cours en temps reel.')
    .addStringOption((o) =>
      o.setName('ticker').setDescription('Symbole boursier (ex: AAPL, BTC-USD)').setRequired(true).setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const input = interaction.options.getFocused().toUpperCase();
    const filtered = TICKERS.filter(
      (t) => t.value.includes(input) || t.name.toUpperCase().includes(input),
    ).slice(0, 10);
    await interaction.respond(filtered.length ? filtered : [{ name: input, value: input }]);
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const ticker = interaction.options.getString('ticker').toUpperCase();
    const q = await fetchPrice(ticker);

    if (!q) {
      await interaction.editReply("Ticker introuvable ou cours indisponible.");
      return;
    }

    const sign = q.changePct >= 0 ? `${E.CHECK} +` : `${E.CROSS} `;
    const embed = new EmbedBuilder()
      .setColor(q.changePct >= 0 ? 0x16a34a : 0xdc2626)
      .setTitle(`${q.name} (${ticker})`)
      .addFields(
        { name: 'Cours', value: `**${fmt(q.price, q.currency)}**`, inline: true },
        { name: 'Variation du jour', value: `${sign}${q.changePct.toFixed(2)} %`, inline: true },
        { name: 'Cloture precedente', value: fmt(q.prev, q.currency), inline: true },
      )
      .setFooter({ text: 'Yahoo Finance - CapitalBoard' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
