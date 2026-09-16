// Suite de tests des pastilles achat / vente posées sur la courbe d'une ligne
// du portefeuille : à quel point de la série une opération s'accroche, et ce
// que l'infobulle en dit.
//
// Comme les autres suites, le code testé est extrait de `js/app.js` — écrit
// pour le navigateur et inutilisable tel quel sous Node — puis compilé seul :
// le test porte sur le code réellement livré, pas sur une copie.
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
const bloc = tranche('pastilles achat / vente',
  'const PF_MARQ_TOL =', '\nasync function loadWlChart(');

// Le journal de l'application, que les fonctions extraites viennent lire.
let _journal = [];
global.currentUser = 'test';
global.getTransactions = () => _journal;
// Tri chronologique du socle : la date, puis l'achat avant la vente.
global._txChrono = (a, b) => {
  const d = String(a.date || '').localeCompare(String(b.date || ''));
  if (d !== 0) return d;
  const rang = x => (x.type === 'buy' ? 0 : 1);
  if (rang(a) !== rang(b)) return rang(a) - rang(b);
  return (a.id || 0) - (b.id || 0);
};

const mod = new module.constructor();
mod._compile(bloc + '\nmodule.exports = { _pfMarqueursTx, _pfMarqLibelles, _pfJourLocal };\n',
  'app-marqueurs.js');
const A = mod.exports;

const t = [];
const chk = (l, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  t.push((ok ? 'ok  ' : 'FAIL') + '  ' + l +
    (ok ? '' : '\n        obtenu  ' + JSON.stringify(a) + '\n        attendu ' + JSON.stringify(b)));
};

// Horodatage Yahoo (secondes) d'une date locale.
const ts = s => Math.floor(new Date(s).getTime() / 1000);
// Prépare le journal puis range les opérations sur la série.
const marq = (journal, ticker, stamps, pts, interval) => {
  _journal = journal;
  return A._pfMarqueursTx(ticker, stamps, pts, interval);
};

// ── Pas journalier : 1M, 6M, AAJ, 1A ────────────────────────────────────────
{
  const stamps = ['2026-09-10', '2026-09-11', '2026-09-14', '2026-09-15', '2026-09-16']
    .map(d => ts(d + 'T09:00:00'));
  const pts = [100, 101, 102, 103, 104];
  const j = [
    { type: 'buy',  ticker: 'CW8.PA', date: '2026-09-11', qty: 5, price: 86.31 },
    { type: 'sell', ticker: 'CW8.PA', date: '2026-09-15', qty: 2, price: 103.5 },
    { type: 'buy',  ticker: 'AI.PA',  date: '2026-09-14', qty: 1, price: 170 },
  ];
  // La casse du ticker ne doit pas entrer en ligne de compte : le journal et le
  // portefeuille ne l'écrivent pas toujours pareil.
  const m = marq(j, 'cw8.pa', stamps, pts, '1d');
  chk('journalier : achat sur son point', m.achats, [null, 101, null, null, null]);
  chk('journalier : vente sur son point', m.ventes, [null, null, null, 103, null]);
  chk('journalier : opération d’une autre ligne écartée',
      Object.keys(m.parIdx.buy).length, 1);

  // Une ligne jamais arbitrée ne doit pas traîner deux séries vides.
  const vide = marq([], 'CW8.PA', stamps, pts, '1d');
  chk('aucune opération : pas de pastille', [vide.achats, vide.ventes], [null, null]);
}

// ── Jours sans cotation ─────────────────────────────────────────────────────
{
  const stamps = ['2026-09-11', '2026-09-14'].map(d => ts(d + 'T09:00:00')); // ven, lun
  const m = marq([{ type: 'buy', ticker: 'X', date: '2026-09-12', qty: 1, price: 1 }],
    'X', stamps, [100, 102], '1d');
  // Un ordre daté du samedi appartient à la dernière séance ouverte, pas à la
  // suivante : c'est la bougie du vendredi qui le porte.
  chk('samedi rattaché à la séance du vendredi', m.achats, [100, null]);
}

// ── Hors période ────────────────────────────────────────────────────────────
{
  const stamps = ['2026-09-14', '2026-09-15'].map(d => ts(d + 'T09:00:00'));
  const avant = marq([{ type: 'buy', ticker: 'X', date: '2024-01-15', qty: 1, price: 1 }],
    'X', stamps, [100, 101], '1d');
  chk('opération antérieure à la période : ignorée', [avant.achats, avant.ventes], [null, null]);

  // Série arrêtée loin derrière : rien à quoi raccrocher la pastille.
  const apres = marq([{ type: 'buy', ticker: 'X', date: '2026-10-30', qty: 1, price: 1 }],
    'X', stamps, [100, 101], '1d');
  chk('opération très postérieure au dernier point : ignorée',
      [apres.achats, apres.ventes], [null, null]);
}

// ── Intraday : 1J et 5J ─────────────────────────────────────────────────────
{
  const stamps = ['09:00', '11:45', '13:30', '17:25'].map(h => ts('2026-09-16T' + h + ':00'));
  const j = [
    { type: 'buy', ticker: 'X', date: '2026-09-16', qty: 5, price: 102 },
    { type: 'buy', ticker: 'X', date: '2026-09-15', qty: 3, price: 99 },
  ];
  // Le journal ne retient pas l'heure : la pastille se pose au milieu de la
  // séance, jamais sur le dernier cours — qui ferait croire à un ordre passé à
  // la clôture. Et la veille n'a pas sa place sur une courbe du jour.
  const m = marq(j, 'X', stamps, [101, 102, 103, 104], '5m');
  chk('intraday : au point le plus proche de midi, veille exclue',
      m.achats, [null, 102, null, null]);
}

// ── Pas mensuel : ALL ───────────────────────────────────────────────────────
{
  const stamps = ['2026-07-01', '2026-08-01', '2026-09-01'].map(d => ts(d + 'T12:00:00'));
  const j = [
    { type: 'buy', ticker: 'X', date: '2026-08-05', qty: 2, price: 94 },
    { type: 'buy', ticker: 'X', date: '2026-08-20', qty: 1, price: 96 },
    { type: 'buy', ticker: 'X', date: '2026-08-12', qty: 3, price: 95 },
  ];
  // Un point couvre le mois qui le suit. Le 20 août tombe plus près du point de
  // septembre sur l'axe, mais l'opération appartient bien au mois d'août.
  const m = marq(j, 'X', stamps, [90, 95, 100], '1mo');
  chk('mensuel : les trois achats sur la bougie d’août', m.achats, [null, 95, null]);
  chk('mensuel : les trois opérations retenues', m.parIdx.buy[1].length, 3);

  const lib = A._pfMarqLibelles(m.parIdx, 'buy', 1);
  chk('agrégat : une ligne par opération, dates rappelées, ordre chronologique',
      lib, [' Achat 2 × 94,00 €  05/08', ' Achat 3 × 95,00 €  12/08', ' Achat 1 × 96,00 €  20/08']);
}

// ── Libellés de l'infobulle ─────────────────────────────────────────────────
{
  const un = { buy: { 3: [{ type: 'buy', qty: 5, price: 86.31, date: '2026-09-11' }] } };
  // Seule sur son point, l'opération n'a pas besoin qu'on lui rappelle sa date :
  // le libellé de l'axe la donne déjà.
  chk('opération seule : ni date ni redite', A._pfMarqLibelles(un, 'buy', 3),
      [' Achat 5 × 86,31 €']);
  chk('pastille absente : aucun libellé', A._pfMarqLibelles(un, 'sell', 3), []);
  // Les milliers sont séparés par une espace fine insécable (U+202F), invisible
  // dans un fichier de test. \s la couvre : on compare à espaces normalisées.
  const espaces = a => a.map(s => s.replace(/\s+/g, ' '));
  chk('quantité fractionnée', espaces(A._pfMarqLibelles(
      { buy: { 0: [{ qty: 0.4321, price: 1234.5, date: '2026-09-01' }] } }, 'buy', 0)),
      [' Achat 0,4321 × 1 234,50 €']);

  // Au-delà de quatre, l'infobulle déborderait : on résume.
  const sept = Array.from({ length: 7 }, (_, k) =>
    ({ type: 'buy', qty: 1, price: 10 + k, date: '2026-09-0' + (k + 1) }));
  const lib = A._pfMarqLibelles({ buy: { 0: sept } }, 'buy', 0);
  chk('plafond : quatre lignes puis un résumé',
      [lib.length, lib[4]], [5, ' +3 autres']);
}

// ── Sortie ──────────────────────────────────────────────────────────────────
console.log(t.join('\n'));
const ko = t.filter(l => l.startsWith('FAIL')).length;
console.log('\n' + (t.length - ko) + '/' + t.length + ' tests passés.');
process.exit(ko ? 1 : 0);
