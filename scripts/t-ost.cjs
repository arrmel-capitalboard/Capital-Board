// Suite de tests des attributions gratuites / opérations sur titre : combien
// d'actions entières, quelle fraction rompue, et à quel cours cette fraction se
// valorise.
//
// Le cas qui a motivé ces tests — L'Air Liquide, ratio 11:10, jour ex du
// 08/06/2026 — est rejoué sur les clôtures réellement servies par Yahoo, pas
// sur des nombres inventés : voir COURS_AI_JUIN_2026 plus bas.
//
// Comme les autres suites, le code testé est extrait de `js/app.js` — écrit
// pour le navigateur et inutilisable tel quel sous Node — puis compilé seul.
const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function tranche(nom, ouvre, ferme) {
  const a = src.indexOf(ouvre), b = src.indexOf(ferme);
  if (a < 0 || b < 0 || b < a) {
    console.error('Bloc « ' + nom + ' » introuvable dans js/app.js — bornes déplacées ?');
    process.exit(1);
  }
  return src.slice(a, b);
}
const bloc = tranche('rompus d’attribution',
  'function _ostRompu(', '\nlet _ostScanned');

const mod = new module.constructor();
mod._compile(bloc + '\nmodule.exports = { _ostRompu, _ostCoursAuJour };\n', 'app-ost.js');
const A = mod.exports;

const t = [];
const chk = (l, a, b) => {
  const ok = (typeof a === 'number' && typeof b === 'number')
    ? Math.abs(a - b) < 1e-9
    : JSON.stringify(a) === JSON.stringify(b);
  t.push((ok ? 'ok  ' : 'FAIL') + '  ' + l +
    (ok ? '' : '\n        obtenu  ' + JSON.stringify(a) + '\n        attendu ' + JSON.stringify(b)));
};

// Clôtures L'Air Liquide (AI.PA) autour du jour ex, telles que Yahoo les sert.
// Yahoo retraite l'historique antérieur à un split : le 05/06 y figure à 166,73
// alors que le titre s'échangeait ce jour-là autour de 183,40. Le 08/06 est en
// revanche le cours réellement traité après attribution — celui sur lequel le
// rompu se dénoue.
const COURS_AI_JUIN_2026 = [
  ['2026-06-01', 161.29090881347656],
  ['2026-06-02', 160.49090576171875],
  ['2026-06-03', 163.5454559326172],
  ['2026-06-04', 165.16363525390625],
  ['2026-06-05', 166.72726440429688],
  ['2026-06-08', 165.3800048828125],   // jour ex de l'attribution 11:10
  ['2026-06-09', 168.4199981689453],
  ['2026-06-10', 167.72000122070312],
];
// Horodatage à l'ouverture de la séance parisienne, comme Yahoo les rend.
const stamps = COURS_AI_JUIN_2026.map(([d]) => Math.floor(new Date(d + 'T07:00:00Z').getTime() / 1000));
const closes = COURS_AI_JUIN_2026.map(([, c]) => c);

// ── Le cas Air Liquide, de bout en bout ─────────────────────────────────────
{
  // Cinq actions détenues, une gratuite pour dix : 5,5 actions, donc aucune
  // action entière et un rompu d'une demie.
  const r = A._ostRompu(5, 11, 10);
  chk('AI 11:10 sur 5 actions : aucune action entière', r.whole, 0);
  chk('AI 11:10 sur 5 actions : rompu d’une demie',     r.fraction, 0.5);

  const cours = A._ostCoursAuJour(stamps, closes, '2026-06-08');
  chk('cours retenu = clôture du jour ex, pas une autre séance', +cours.toFixed(2), 165.38);

  const cash = Math.round(r.fraction * cours * 100) / 100;
  chk('cash du rompu au 08/06/2026', cash, 82.69);

  // Le défaut corrigé : la valorisation partait du cours live du portefeuille.
  // Le 16/09/2026, AI.PA cotait 166,42 — d'où les 83,21 € affichés, qui
  // dérivaient un peu plus chaque jour sans que la date de l'opération change.
  const ancien = Math.round(0.5 * 166.42 * 100) / 100;
  chk('l’ancien calcul, au cours live, donnait bien 83,21 €', ancien, 83.21);
  chk('le correctif change donc le montant', cash !== ancien, true);
}

// ── Le cours ne doit jamais venir d'après l'opération ────────────────────────
{
  // Le piège : prendre la dernière clôture connue de la série plutôt que celle
  // du jour ex. La série va jusqu'au 10/06, le cours retenu doit rester
  // celui du 08/06.
  chk('une séance postérieure ne déborde pas sur le jour ex',
      +A._ostCoursAuJour(stamps, closes, '2026-06-08').toFixed(2), 165.38);
  chk('opération du 09/06 : clôture du 09/06',
      +A._ostCoursAuJour(stamps, closes, '2026-06-09').toFixed(2), 168.42);
}

// ── Jours sans cotation ─────────────────────────────────────────────────────
{
  // Le 06 et le 07 juin 2026 tombent un week-end : on retient la dernière
  // clôture connue, celle du vendredi, plutôt que rien.
  chk('samedi : dernière clôture connue', +A._ostCoursAuJour(stamps, closes, '2026-06-06').toFixed(2), 166.73);
  // Trou de série : la veille manque, on remonte plus loin.
  const troues = closes.slice(); troues[5] = null;
  chk('séance non cotée : on remonte à la précédente',
      +A._ostCoursAuJour(stamps, troues, '2026-06-08').toFixed(2), 166.73);
  // Opération antérieure à toute la série : rien à proposer, l'appelant se
  // rabattra sur le cours live.
  chk('opération avant le début de la série', A._ostCoursAuJour(stamps, closes, '2020-01-01'), null);
  chk('série vide', A._ostCoursAuJour([], [], '2026-06-08'), null);
  chk('entrées absentes', A._ostCoursAuJour(null, null, '2026-06-08'), null);
}

// ── Fractions et flottants ──────────────────────────────────────────────────
{
  // Le défaut corrigé : `qty * (num/den)` faisait transiter le ratio par un
  // flottant inexact. Sur 25 actions en 11:10, la fraction sortait à
  // 0,5000000000000036 — affichée, et comptée dans le cash.
  chk('25 actions en 11:10 : rompu exactement d’une demie', A._ostRompu(25, 11, 10).fraction, 0.5);
  chk('25 actions en 11:10 : deux actions entières',        A._ostRompu(25, 11, 10).whole, 2);
  chk('7 actions en 11:10 : rompu de 0,7',                  A._ostRompu(7, 11, 10).fraction, 0.7);
  chk('3 actions en 11:10 : rompu de 0,3',                  A._ostRompu(3, 11, 10).fraction, 0.3);

  // Ratio qui tombe juste : que des actions entières, aucun rompu.
  chk('20 actions en 11:10 : deux entières, pas de rompu',
      A._ostRompu(20, 11, 10), { whole: 2, fraction: 0 });
  chk('un doublement pur ne laisse pas de rompu',
      A._ostRompu(7, 2, 1), { whole: 7, fraction: 0 });

  // Ratio à trois décimales périodiques : la fraction doit rester propre.
  chk('10 actions en 4:3 : trois entières, rompu d’un tiers',
      A._ostRompu(10, 4, 3).whole, 3);
  chk('10 actions en 4:3 : fraction arrondie au cent-millionième',
      A._ostRompu(10, 4, 3).fraction, 0.33333333);

  // Entrées absurdes : pas de rompu plutôt qu'un NaN qui contaminerait le cash.
  chk('quantité nulle',  A._ostRompu(0, 11, 10),  { whole: 0, fraction: 0 });
  chk('ratio manquant',  A._ostRompu(5, 0, 0),    { whole: 0, fraction: 0 });
  chk('quantité absente', A._ostRompu(undefined, 11, 10), { whole: 0, fraction: 0 });
}

// ── Sortie ──────────────────────────────────────────────────────────────────
console.log(t.join('\n'));
const ko = t.filter(l => l.startsWith('FAIL')).length;
console.log('\n' + (t.length - ko) + '/' + t.length + ' tests passés.');
process.exit(ko ? 1 : 0);
