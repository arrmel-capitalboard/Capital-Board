'use strict';

// Stockage des avertissements (persisté, survit aux redémarrages).
// Fichier JSON local — migrable vers Firestore plus tard si besoin.

const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'data', 'warns.json');

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

/** Ajoute un avertissement. Retourne l'historique à jour du membre. */
function add(guildId, userId, { moderator, reason }) {
  const all = load();
  all.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    guildId,
    userId,
    moderator,
    reason,
    at: Date.now(),
  });
  persist(all);
  return list(guildId, userId);
}

/** Historique d'un membre, du plus ancien au plus récent. */
function list(guildId, userId) {
  return load()
    .filter((w) => w.guildId === guildId && w.userId === userId)
    .sort((a, b) => a.at - b.at);
}

/** Supprime tous les avertissements d'un membre. Retourne le nombre supprimé. */
function clear(guildId, userId) {
  const all = load();
  const kept = all.filter((w) => !(w.guildId === guildId && w.userId === userId));
  persist(kept);
  return all.length - kept.length;
}

module.exports = { add, list, clear };
