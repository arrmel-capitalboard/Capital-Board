'use strict';

// Surveillance du site : /status publie un message persistant, ré-actualisé
// automatiquement toutes les minutes (édition du message en place).

const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const E = require('./emojis');

const FILE = path.join(__dirname, '..', '..', 'data', 'status-monitors.json');

// Cibles surveillées (extensible : API, etc.).
const TARGETS = [{ name: 'Site', url: config.siteUrl }];

const GIF_ONLINE  = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/online.gif';
const GIF_OFFLINE = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/offline.gif';

async function check(url) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'CapitalBoard-Bot/1.0' },
    });
    return { ok: res.status < 400, status: res.status, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, status: err.name === 'TimeoutError' ? 'timeout' : 'erreur', ms: Date.now() - start };
  }
}

async function buildEmbed() {
  const results = await Promise.all(TARGETS.map(async (t) => ({ ...t, ...(await check(t.url)) })));
  const allUp = results.every((r) => r.ok);

  return new EmbedBuilder()
    .setColor(allUp ? 0x16a34a : 0xdc2626)
    .setTitle(allUp ? `${E.ONLINE}  CapitalBoard est online !` : `${E.OFFLINE}  CapitalBoard est offline !`)
    .setDescription(`${E.ARROW}  https://capitalboard.fr`)
    .setImage(allUp ? GIF_ONLINE : GIF_OFFLINE)
    .setFooter({ text: '↻ Mise à jour automatique toutes les minutes  ·  capitalboard.fr' })
    .setTimestamp();
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
}

function persist(list) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

/** Enregistre le message à rafraîchir (un seul par salon). */
function register(entry) {
  const list = load().filter((m) => m.channelId !== entry.channelId);
  list.push(entry);
  persist(list);
}

async function refreshAll(client) {
  const monitors = load();
  if (monitors.length === 0) return;

  const embed = await buildEmbed(); // un seul check par cycle, partagé.
  const kept = [];
  let changed = false;

  for (const m of monitors) {
    try {
      const channel = await client.channels.fetch(m.channelId);
      const msg = await channel.messages.fetch(m.messageId);
      await msg.edit({ embeds: [embed] });
      kept.push(m);
    } catch {
      changed = true; // message ou salon supprimé → on retire le monitor.
    }
  }
  if (changed) persist(kept);
}

function start(client) {
  const run = () => refreshAll(client).catch(() => {});
  run();
  setInterval(run, 60_000);
}

module.exports = { buildEmbed, register, start };
