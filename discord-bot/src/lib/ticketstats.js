'use strict';

// Compte les salons de tickets (catégorie Discord dédiée) et publie le total
// dans Firestore config/discordStats.openTickets, lu par le panel admin de la
// webapp. Rafraîchi périodiquement + à chaque création/suppression de salon.

const { ChannelType } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const quota = require('./quota');

// Cadence du contrôle, pas des écritures : `push` compare avant d'écrire, et ne
// touche Firestore que si le nombre de tickets ouverts ou le nom du salon a
// change. Quelques ecritures par jour, contre 288 quand chaque cycle ecrivait.
//
// Le controle reste frequent parce qu'il est gratuit : il ne fait que lire le
// cache Discord deja en memoire.
const CADENCE_MS = 5 * 60_000;

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

// Dernière valeur publiée. C'est elle qui décide s'il faut écrire : un compteur
// qui ne bouge pas n'a rien à dire, et le réécrire coûte autant qu'une vraie
// nouvelle.
let publie = null;

async function push(client) {
  if (!isConfigured()) return;
  // Un compteur de tickets n'est pas essentiel : quota épuisé, il se tait.
  if (quota.estEpuise()) return;
  try {
    const openTickets = countOpenTickets(client);
    const name = ticketChannelName(client);

    // Rien de neuf : on n'écrit pas. Un ticket s'ouvre ou se ferme quelques
    // fois par jour, et le salon se renomme encore moins souvent ; écrire
    // toutes les cinq minutes faisait 288 écritures quotidiennes pour publier
    // 286 fois la même chose. `updatedAt` ne compte pas comme un changement,
    // sinon il n'y aurait jamais rien d'identique.
    if (publie && publie.openTickets === openTickets && publie.name === (name || publie.name)) return;

    const payload = { openTickets, ticketChannelId: TICKET_CHANNEL, updatedAt: Date.now() };
    // Un salon absent du cache ne doit pas écraser le nom déjà publié.
    if (name) payload.ticketChannelName = name;
    await getDb().collection('config').doc('discordStats').set(payload, { merge: true });
    publie = { openTickets, name: name || (publie && publie.name) || null };
  } catch (e) {
    if (quota.signaler(client, e, 'ticketstats')) return;
    console.error('[ticketstats] push:', e.message);
  }
}

function start(client) {
  // Quelques écritures par jour, pas une par cycle : le contrôle tourne toutes
  // les cinq minutes mais n'écrit que si le compte a bougé.
  quota.declarer('compteur de tickets', 10);
  push(client);
  if (_timer) clearInterval(_timer);
  _timer = setInterval(() => push(client), CADENCE_MS);
}

module.exports = { start, push, countOpenTickets, ticketChannelName, TICKET_CATEGORY, TICKET_CHANNEL };
