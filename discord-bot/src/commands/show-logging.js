'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const E = require('../lib/emojis');

const FONDATEUR_ROLE = '1512905140108001391';

const EVENTS = [
  {
    category: 'AutoMod',
    items: [
      { event: 'Lien posté (non whitelist)', action: 'Suppression + avertissement 5s + log mod-log', active: true },
    ],
  },
  {
    category: 'Modération',
    items: [
      { event: 'Warn',    action: 'Log mod-log + DM membre', active: true },
      { event: 'Kick',    action: 'Log mod-log + DM membre', active: true },
      { event: 'Ban',     action: 'Log mod-log + DM membre', active: true },
      { event: 'Unban',   action: 'Log mod-log + DM membre', active: true },
      { event: 'Mute',    action: 'Log mod-log + DM membre', active: true },
      { event: 'Clearwarns', action: 'Log mod-log + DM membre', active: true },
    ],
  },
  {
    category: 'Membres',
    items: [
      { event: 'Arrivée membre',  action: 'Log <#1520208505880187042> + DM bienvenue + rôle visiteur', active: true },
      { event: 'Départ membre',   action: 'Log <#1520208505880187042>', active: true },
    ],
  },
  {
    category: 'Tickets',
    items: [
      { event: 'Fermeture ticket', action: 'Transcript DM propriétaire + log <#1520205100839207003>', active: true },
    ],
  },
  {
    category: 'Système',
    items: [
      { event: 'Redémarrage bot (/restart)', action: 'Log <#1512909178694275163>', active: true },
    ],
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('show-logging')
    .setDescription('Affiche tous les événements loggés par le bot.')
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: 'Commande réservée au rôle fondateur.', flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle('Événements loggés — Capital Board Bot')
      .setDescription(`Salon mod-log principal : <#1512909178694275163>`)
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();

    for (const cat of EVENTS) {
      const value = cat.items
        .map((i) => `${i.active ? E.CHECK : '🔴'} **${i.event}** — ${i.action}`)
        .join('\n');
      embed.addFields({ name: cat.category, value });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
