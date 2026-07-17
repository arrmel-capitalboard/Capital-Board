'use strict';

// Persistance des bannissements temporaires : survit aux redémarrages du bot.
// Un balayage périodique lève les bans expirés. (Le mute utilise le timeout
// natif de Discord, qui expire seul — pas besoin de persistance ici.)

const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'temp-bans.json');

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

/** Programme la levée d'un ban. entry = { guildId, userId, expiresAt }. */
function add(entry) {
  const list = load().filter((e) => !(e.guildId === entry.guildId && e.userId === entry.userId));
  list.push(entry);
  persist(list);
}

/** Retire une entrée (ex : déban manuel). */
function remove(guildId, userId) {
  persist(load().filter((e) => !(e.guildId === guildId && e.userId === userId)));
}

async function sweep(client) {
  const now = Date.now();
  const list = load();
  const remaining = [];
  for (const e of list) {
    if (e.expiresAt <= now) {
      try {
        const guild = await client.guilds.fetch(e.guildId);
        await guild.bans.remove(e.userId, 'Fin du bannissement temporaire');
      } catch (err) {
        console.error('[tempban] déban échoué', e.userId, err.message);
      }
    } else {
      remaining.push(e);
    }
  }
  if (remaining.length !== list.length) persist(remaining);
}

/** Lance le balayage au démarrage puis toutes les minutes. */
function start(client) {
  sweep(client).catch(() => {});
  setInterval(() => sweep(client).catch(() => {}), 60_000);
}

module.exports = { add, remove, start };
