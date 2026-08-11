// ─────────────────────────────────────────────────────────────
// bump-version.mjs — synchronise les marqueurs de version
//
// Capital Board compare APP_VERSION (js/app.js) à data/version.json à
// intervalle régulier : au moindre écart, un gate bloquant demande de
// recharger. Si la version chargée par le navigateur reste inférieure, le
// rechargement n'y change rien et le gate tourne en boucle.
//
// Trois marqueurs doivent donc bouger ensemble, plus les cache-busters, sans
// quoi le navigateur recharge l'ancien fichier :
//   1. APP_VERSION dans js/app.js
//   2. data/version.json
//   3. ?v=... des balises css et js dans pages/app.html
//
// Usage :  node scripts/bump-version.mjs [version]
// Sans argument, la version du jour est suffixée par la première lettre libre.
// ─────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const APP_JS   = ROOT + 'js/app.js';
const APP_HTML = ROOT + 'pages/app.html';
const VERSION  = ROOT + 'data/version.json';

const read  = f => readFileSync(f, 'utf8');
const write = (f, s) => writeFileSync(f, s, 'utf8');

const APP_VERSION_RE = /const APP_VERSION = '([^']+)'/;

const js = read(APP_JS);
const current = (js.match(APP_VERSION_RE) || [])[1];
if (!current) {
  console.error('APP_VERSION introuvable dans js/app.js');
  process.exit(1);
}

// Version demandée, ou incrément : 20260812b → 20260812c.
//
// La version ne doit JAMAIS reculer : le gate compare la valeur servie à celle
// embarquée, et `config/app.minVersion` trie les versions lexicographiquement.
// Repartir de la date du jour ferait régresser une version datée de demain —
// cas réel, la date UTC pouvant être en retard sur celle utilisée à la main.
const bumpLetter = v => {
  const day = v.slice(0, 8), last = v.slice(8);
  if (last === 'z' || !/^[a-y]$/.test(last)) {
    const d = new Date(day.slice(0, 4) + '-' + day.slice(4, 6) + '-' + day.slice(6, 8) + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10).replace(/-/g, '') + 'a';
  }
  return day + String.fromCharCode(last.charCodeAt(0) + 1);
};

let next = process.argv[2];
if (!next) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  next = current.slice(0, 8) >= today ? bumpLetter(current) : today + 'a';
}
if (next <= current) {
  console.error(`Refus : ${next} n'est pas postérieure à ${current}.`);
  process.exit(1);
}

write(APP_JS, js.replace(APP_VERSION_RE, `const APP_VERSION = '${next}'`));
write(VERSION, JSON.stringify({ v: next }));

// Les cache-busters portent l'ancienne version ; on ne remplace que ceux-là,
// pour ne pas toucher à un numéro qui ressemblerait à une version ailleurs.
const html = read(APP_HTML).replaceAll(`?v=${current}`, `?v=${next}`);
write(APP_HTML, html);

// Contrôle : les trois marqueurs doivent afficher la même valeur.
const check = {
  'js/app.js':         (read(APP_JS).match(APP_VERSION_RE) || [])[1],
  'data/version.json': JSON.parse(read(VERSION)).v,
  'pages/app.html':    [...read(APP_HTML).matchAll(/\?v=([0-9a-z]+)/g)].map(m => m[1]),
};
const htmlOk = check['pages/app.html'].length > 0
  && check['pages/app.html'].every(v => v === next);

if (check['js/app.js'] !== next || check['data/version.json'] !== next || !htmlOk) {
  console.error('Marqueurs désynchronisés :', check);
  process.exit(1);
}

console.log(`${current} → ${next}  (app.js, version.json, ${check['pages/app.html'].length} cache-buster(s))`);
