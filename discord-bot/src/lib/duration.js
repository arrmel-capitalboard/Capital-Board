'use strict';

// Parse une durée type "30s", "10m", "2h", "7d", "1w".
// Retour : nombre de ms, null si absent, NaN si format invalide.
const UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

function parseDuration(input) {
  if (input == null || input === '') return null;
  const m = String(input).trim().toLowerCase().match(/^(\d+)\s*(s|m|h|d|w)$/);
  if (!m) return NaN;
  return Number(m[1]) * UNITS[m[2]];
}

// Formate une durée (ms) en français lisible : "7 jours", "2 heures".
function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  const units = [
    ['semaine', 604_800],
    ['jour', 86_400],
    ['heure', 3_600],
    ['minute', 60],
    ['seconde', 1],
  ];
  for (const [name, secs] of units) {
    if (s >= secs) {
      const n = Math.floor(s / secs);
      return `${n} ${name}${n > 1 ? 's' : ''}`;
    }
  }
  return '0 seconde';
}

module.exports = { parseDuration, formatDuration };
