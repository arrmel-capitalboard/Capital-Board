'use strict';

// Compte les salons de tickets (catégorie Discord dédiée) et publie le total
// dans Firestore config/discordStats.openTickets, lu par le panel admin de la
// webapp. Rafraîchi périodiquement + à chaque création/suppression de salon.

const { ChannelType } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');

const TICKET_CATEGORY = '1520204780751028385';

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

async function push(client) {
  if (!isConfigured()) return;
  try {
    const openTickets = countOpenTickets(client);
    await getDb().collection('config').doc('discordStats').set(
      { openTickets, updatedAt: Date.now() },
      { merge: true },
    );
  } catch (e) {
    console.error('[ticketstats] push:', e.message);
  }
}

function start(client) {
  push(client);
  if (_timer) clearInterval(_timer);
  _timer = setInterval(() => push(client), 60000);
}

module.exports = { start, push, countOpenTickets, TICKET_CATEGORY };
