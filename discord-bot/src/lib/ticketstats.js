'use strict';

// Compte les salons de tickets (catégorie Discord dédiée) et publie le total
// dans Firestore config/discordStats.openTickets, lu par le panel admin de la
// webapp. Rafraîchi périodiquement + à chaque création/suppression de salon.

const { ChannelType } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const quota = require('./quota');

const TICKET_CATEGORY = '1520204780751028385';
// Salon où l'on demande aux utilisateurs d'ouvrir leur ticket. Le site en
// affichait le nom en dur, donc à côté de la plaque dès qu'il était renommé.
const TICKET_CHANNEL = '1512909867709497374';

let _timer = null;

function countOpenTickets(client) {
  let n = 0;
  for (const guild of client.guilds.cache.values()) {
    guild.channels.cache.forEach((ch) => {
      if (ch.parentId === TICKET_CATEGORY && ch.type === ChannelType.GuildText) n++;
    });
  }
  return n;
}

// Nom courant du salon de tickets. Le bot est le seul à pouvoir le lire :
// l'API Discord demande un jeton, que la webapp n'a pas et ne doit pas avoir.
function ticketChannelName(client) {
  for (const guild of client.guilds.cache.values()) {
    const ch = guild.channels.cache.get(TICKET_CHANNEL);
    if (ch && ch.name) return ch.name;
  }
  return null;
}

async function push(client) {
  if (!isConfigured()) return;
  // Un compteur de tickets n'est pas essentiel : quota épuisé, il se tait.
  if (quota.estEpuise()) return;
  try {
    const openTickets = countOpenTickets(client);
    const name = ticketChannelName(client);
    const payload = { openTickets, ticketChannelId: TICKET_CHANNEL, updatedAt: Date.now() };
    // Un salon absent du cache ne doit pas écraser le nom déjà publié.
    if (name) payload.ticketChannelName = name;
    await getDb().collection('config').doc('discordStats').set(payload, { merge: true });
  } catch (e) {
    if (quota.signaler(client, e, 'ticketstats')) return;
    console.error('[ticketstats] push:', e.message);
  }
}

function start(client) {
  push(client);
  if (_timer) clearInterval(_timer);
  // Cinq minutes plutôt qu'une : 288 écritures par jour au lieu de 1 440, pour
  // un compteur qui ne bouge qu'à l'ouverture ou la fermeture d'un ticket.
  _timer = setInterval(() => push(client), 5 * 60_000);
}

module.exports = { start, push, countOpenTickets, ticketChannelName, TICKET_CATEGORY, TICKET_CHANNEL };
