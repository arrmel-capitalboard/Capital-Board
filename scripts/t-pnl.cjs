// Suite de tests du socle de calcul de js/app.js : prix de revient frais
// compris, P&L réalisé rejoué depuis le journal, solde espèces, positions
// soldées, et les identifiants d'écriture dont dépend toute suppression.
//
// `js/app.js` est écrit pour le navigateur et touche au DOM dès le chargement :
// on ne peut pas l'exiger tel quel. On en extrait les tranches de fonctions
// pures et on les compile seules — le test porte donc sur le code réellement
// livré, pas sur une copie.
const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

// Deux tranches de code pur, repérées par leurs bornes. Si quelqu'un déplace
// ces fonctions, le test le dit au lieu de tester du vide.
function tranche(nom, ouvre, ferme) {
  const a = src.indexOf(ouvre), b = src.indexOf(ferme);
  if (a < 0 || b < 0 || b < a) {
    console.error('Bloc « ' + nom +' » introuvable dans js/app.js — bornes déplacées ?');
    process.exit(1);
  }
  return src.slice(a, b);
}
const socle  = tranche('socle de calcul', 'function _txFees(tx) {', '\nfunction logTransaction(user, tx) {');
const soldes = tranche('positions soldées', 'function _closedPositions() {', '\nfunction renderClosedPositions()');

// Les fonctions extraites lisent et écrivent l'état de l'application : ces
// globales leur en tiennent lieu.
let _portefeuille = [];
let _journal = [];
let _versements = [];
global.currentUser = 'test';
global.getPortfolio = () => _portefeuille;
global.getTransactions = () => _journal;
global.getVersements = () => _versements;
global.saveTransactions = (u, d) => { _journal = d; };
global.saveVersements = (u, d) => { _versements = d; };

const mod = new module.constructor();
mod._compile(socle + '\n' + soldes + '\nmodule.exports = { _coutAchat, _pruAchats, _txChrono, computeRealizedPnl, realizedPnlOf, computeCashBalance, computePerfDepuisDebut, _closedPositions, _nouvelId, _assurerIds };\n', 'app-socle.js');
const A = mod.exports;

// Prépare l'état de l'application puis rend les positions soldées.
const soldees = (portefeuille, journal) => {
  _portefeuille = portefeuille; _journal = journal;
  return A._closedPositions();
};

const t = [];
const chk = (l, a, b) => {
  const ok = (typeof a === 'number' && typeof b === 'number')
    ? Math.abs(a - b) < 0.005
    : JSON.stringify(a) === JSON.stringify(b);
  t.push((ok ? 'ok  ' : 'FAIL') + '  ' + l +
    (ok ? '' : '\n        obtenu  ' + JSON.stringify(a) + '\n        attendu ' + JSON.stringify(b)));
};

// Total du P&L réalisé d'un journal, comme le fait la carte « Gains clôturés ».
const totalPnl = (txs) => {
  let s = 0;
  A.computeRealizedPnl(txs).forEach(v => { s += v; });
  return Math.round(s * 100) / 100;
};

// ── Bug 3 : les frais d'achat entrent dans le prix de revient ───────────────
chk('coût = montant + frais',        A._coutAchat(10, 20, 5), 205);
chk('coût sans frais',               A._coutAchat(10, 20, 0), 200);
chk('coût, frais indéfinis',         A._coutAchat(10, 20, undefined), 200);
chk('PRU d’un achat, frais compris', A._pruAchats([{ qty: 10, price: 20, fees: 5 }]), 20.5);
chk('PRU sans frais = prix',         A._pruAchats([{ qty: 10, price: 20 }]), 20);
chk('PRU de deux lots',              A._pruAchats([{ qty: 10, price: 20, fees: 5 },
                                                   { qty: 10, price: 30, fees: 5 }]), 25.5);
chk('PRU d’un lot vide → null',      A._pruAchats([]), null);
chk('PRU, frais négatifs ignorés',   A._pruAchats([{ qty: 10, price: 20, fees: -5 }]), 20);

// L'écart relevé face au courtier : titres et quantités identiques, seul le
// coût d'acquisition divergeait — de tout le montant des frais.
{
  const achat   = { qty: 1, price: 3286.31, fees: 16.36 };
  const investi = A._pruAchats([achat]) * achat.qty;
  chk('investi frais compris',  investi, 3302.67);
  chk('latent aligné sur le courtier', 3323.77 - investi, 21.10);
}

// ── Bug 1 : le P&L réalisé se rejoue, il ne se fige pas ────────────────────
chk('vente simple, frais des deux côtés', totalPnl([
  { id: 1, type: 'buy',  ticker: 'AI.PA', qty: 10, price: 20, fees: 5, date: '2026-01-01' },
  { id: 2, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, fees: 5, date: '2026-02-01' },
]), 40);   // (25 − 20,5) × 10 − 5

chk('vente sans frais', totalPnl([
  { id: 1, type: 'buy',  ticker: 'AI.PA', qty: 10, price: 20, date: '2026-01-01' },
  { id: 2, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, date: '2026-02-01' },
]), 50);

// Le cœur du signalement : l'achat supprimé, la vente ne doit plus rien porter.
chk('vente orpheline → 0 (fantôme)', totalPnl([
  { id: 2, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, fees: 5, date: '2026-02-01' },
]), 0);

chk('supprimer l’achat efface le gain', (() => {
  const journal = [
    { id: 1, type: 'buy',  ticker: 'AI.PA', qty: 10, price: 20, date: '2026-01-01' },
    { id: 2, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, date: '2026-02-01' },
  ];
  const avant = totalPnl(journal);
  const apres = totalPnl(journal.filter(x => x.id !== 1));
  return [avant, apres];
})(), [50, 0]);

chk('vente partielle : PRU inchangé sur le reliquat', totalPnl([
  { id: 1, type: 'buy',  ticker: 'AI.PA', qty: 10, price: 20, date: '2026-01-01' },
  { id: 2, type: 'sell', ticker: 'AI.PA', qty: 4,  price: 30, date: '2026-02-01' },
  { id: 3, type: 'sell', ticker: 'AI.PA', qty: 6,  price: 10, date: '2026-03-01' },
]), -20);   // +40 puis −60

// Un achat postérieur ne doit pas reculer dans le temps pour diluer la base
// d'une vente déjà passée : c'est tout l'objet du tri chronologique.
chk('chronologie respectée', totalPnl([
  { id: 3, type: 'buy',  ticker: 'AI.PA', qty: 10, price: 30, date: '2026-03-01' },
  { id: 1, type: 'buy',  ticker: 'AI.PA', qty: 10, price: 10, date: '2026-01-01' },
  { id: 2, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, date: '2026-02-01' },
]), 150);

chk('même jour : l’ordre d’enregistrement tranche', totalPnl([
  { id: 2, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, date: '2026-01-01' },
  { id: 1, type: 'buy',  ticker: 'AI.PA', qty: 10, price: 10, date: '2026-01-01' },
]), 150);

chk('vente à découvert bornée aux titres détenus', totalPnl([
  { id: 1, type: 'buy',  ticker: 'AI.PA', qty: 5,  price: 10, date: '2026-01-01' },
  { id: 2, type: 'sell', ticker: 'AI.PA', qty: 10, price: 20, date: '2026-02-01' },
]), 50);   // 5 titres couverts seulement

chk('deux tickers ne se mélangent pas', totalPnl([
  { id: 1, type: 'buy',  ticker: 'AI.PA', qty: 10, price: 20, date: '2026-01-01' },
  { id: 2, type: 'buy',  ticker: 'OR.PA', qty: 10, price: 50, date: '2026-01-01' },
  { id: 3, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, date: '2026-02-01' },
  { id: 4, type: 'sell', ticker: 'OR.PA', qty: 10, price: 40, date: '2026-02-01' },
]), -50);   // +50 et −100

chk('ticker insensible à la casse', totalPnl([
  { id: 1, type: 'buy',  ticker: 'ai.pa', qty: 10, price: 20, date: '2026-01-01' },
  { id: 2, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, date: '2026-02-01' },
]), 50);

// Deux transactions peuvent porter le même id (`Date.now()` sur un import en
// rafale) : l'indexation par objet doit les distinguer quand même.
chk('ids en doublon : chaque vente garde son P&L', (() => {
  const journal = [
    { id: 7, type: 'buy',  ticker: 'AI.PA', qty: 10, price: 20, date: '2026-01-01' },
    { id: 7, type: 'buy',  ticker: 'OR.PA', qty: 10, price: 50, date: '2026-01-01' },
    { id: 7, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, date: '2026-02-01' },
    { id: 7, type: 'sell', ticker: 'OR.PA', qty: 10, price: 40, date: '2026-02-01' },
  ];
  const carte = A.computeRealizedPnl(journal);
  return [carte.get(journal[2]), carte.get(journal[3])];
})(), [50, -100]);

chk('journal vide',       totalPnl([]), 0);
chk('journal indéfini',   totalPnl(undefined), 0);
chk('dividendes ignorés', totalPnl([
  { id: 1, type: 'dividend', ticker: 'AI.PA', qty: 1, price: 12, date: '2026-01-01' },
]), 0);

// realizedPnlOf : null pour tout ce qui n'est pas une vente.
{
  const journal = [
    { id: 1, type: 'buy',  ticker: 'AI.PA', qty: 10, price: 20, date: '2026-01-01' },
    { id: 2, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, date: '2026-02-01' },
  ];
  const carte = A.computeRealizedPnl(journal);
  chk('realizedPnlOf : achat → null',    A.realizedPnlOf(journal[0], carte), null);
  chk('realizedPnlOf : vente',           A.realizedPnlOf(journal[1], carte), 50);
  chk('realizedPnlOf : rien → null',     A.realizedPnlOf(null, carte), null);
  chk('realizedPnlOf : hors carte → null',
      A.realizedPnlOf({ id: 9, type: 'sell', ticker: 'X', qty: 1, price: 1 }, carte), null);
}

// ── Bug 2 : un seul solde espèces, jamais clampé ───────────────────────────
chk('solde : versement puis achat',
  A.computeCashBalance([{ type: 'buy', qty: 10, price: 20, fees: 5 }], [{ amount: 1000 }]), 795);

chk('solde : tous les flux',
  A.computeCashBalance([
    { type: 'buy',          qty: 10, price: 20, fees: 5 },
    { type: 'sell',         qty: 5,  price: 30, fees: 2 },
    { type: 'dividend',     qty: 1,  price: 12 },
    { type: 'distribution', qty: 1,  price: 3 },
  ], [{ amount: 1000 }]), 958);   // 1000 − 200 + 150 + 12 + 3 − 7

// Le clamp à 0 était la source de l'incohérence : positif ici, négatif là,
// pour la même donnée. Un solde négatif s'affiche désormais partout.
chk('solde négatif conservé',
  A.computeCashBalance([{ type: 'buy', qty: 10, price: 20 }], []), -200);

chk('solde : versements absents',
  A.computeCashBalance([{ type: 'buy', qty: 1, price: 10 }], undefined), -10);
chk('solde : journal absent',
  A.computeCashBalance(undefined, [{ amount: 500 }]), 500);
chk('solde : rien du tout', A.computeCashBalance(), 0);
chk('solde arrondi au centime',
  A.computeCashBalance([{ type: 'buy', qty: 3, price: 33.333333 }], [{ amount: 100 }]), 0);

// ── Positions soldées : la poignée rendue aux titres entièrement revendus ──
chk('titre revendu en entier → position soldée', soldees([], [
  { id: 1, type: 'buy',  ticker: 'CW8.PA', name: 'Amundi MSCI World', qty: 10, price: 20, date: '2026-01-01' },
  { id: 2, type: 'sell', ticker: 'CW8.PA', name: 'Amundi MSCI World', qty: 10, price: 25, date: '2026-02-01' },
]).map(p => [p.ticker, p.qty, p.date, p.pnl, p.nb]), [['CW8.PA', 10, '2026-02-01', 50, 2]]);

chk('titre encore détenu → absent', soldees(
  [{ ticker: 'CW8.PA', qty: 10, buyPrice: 20, currentPrice: 25 }],
  [{ id: 1, type: 'buy', ticker: 'CW8.PA', qty: 10, price: 20, date: '2026-01-01' }]
).length, 0);

chk('vendu en deux fois : quantités cumulées, dernière date', soldees([], [
  { id: 1, type: 'buy',  ticker: 'CW8.PA', qty: 10, price: 20, date: '2026-01-01' },
  { id: 2, type: 'sell', ticker: 'CW8.PA', qty: 4,  price: 30, date: '2026-02-01' },
  { id: 3, type: 'sell', ticker: 'CW8.PA', qty: 6,  price: 10, date: '2026-03-01' },
]).map(p => [p.qty, p.date, p.pnl]), [[10, '2026-03-01', -20]]);

// Le cas « souci à l'import » : des opérations sans ligne ni vente. Elles
// doivent rester atteignables, sinon plus rien ne permet de les effacer.
chk('reliquat d’import sans vente → listé quand même', soldees([], [
  { id: 1, type: 'buy', ticker: 'CW8.PA', qty: 10, price: 20, date: '2026-01-01' },
]).map(p => [p.ticker, p.qty, p.date, p.nb]), [['CW8.PA', 0, '', 1]]);

chk('dividende orphelin → listé', soldees([], [
  { id: 1, type: 'dividend', ticker: 'CW8.PA', qty: 1, price: 12, date: '2026-01-01' },
]).length, 1);

chk('détenu et soldé cohabitent', soldees(
  [{ ticker: 'OR.PA', qty: 5, buyPrice: 50, currentPrice: 60 }],
  [
    { id: 1, type: 'buy',  ticker: 'OR.PA',  qty: 5,  price: 50, date: '2026-01-01' },
    { id: 2, type: 'buy',  ticker: 'CW8.PA', qty: 10, price: 20, date: '2026-01-01' },
    { id: 3, type: 'sell', ticker: 'CW8.PA', qty: 10, price: 25, date: '2026-02-01' },
  ]
).map(p => p.ticker), ['CW8.PA']);

chk('plusieurs soldées : la plus récente en tête', soldees([], [
  { id: 1, type: 'buy',  ticker: 'AAA', qty: 1, price: 10, date: '2026-01-01' },
  { id: 2, type: 'sell', ticker: 'AAA', qty: 1, price: 11, date: '2026-02-01' },
  { id: 3, type: 'buy',  ticker: 'BBB', qty: 1, price: 10, date: '2026-01-01' },
  { id: 4, type: 'sell', ticker: 'BBB', qty: 1, price: 11, date: '2026-05-01' },
]).map(p => p.ticker), ['BBB', 'AAA']);

chk('casse du ticker ignorée', soldees(
  [{ ticker: 'cw8.pa', qty: 10, buyPrice: 20, currentPrice: 25 }],
  [{ id: 1, type: 'buy', ticker: 'CW8.PA', qty: 10, price: 20, date: '2026-01-01' }]
).length, 0);

chk('journal vide → aucune position soldée', soldees([], []).length, 0);

// ── Les identifiants : ni manquants, ni en double ──────────────────────────
//
// Un versement sans id faisait tout partir à la suppression (`filter` sur
// `id !== undefined`), et deux ids identiques emportaient la ligne voisine.

chk('mille ids d’affilée, tous distincts', (() => {
  const vus = new Set();
  for (let i = 0; i < 1000; i++) vus.add(A._nouvelId());
  return vus.size;
})(), 1000);

chk('les ids sont strictement croissants', (() => {
  const suite = [A._nouvelId(), A._nouvelId(), A._nouvelId()];
  return suite[0] < suite[1] && suite[1] < suite[2];
})(), true);

chk('_assurerIds numérote les versements orphelins', (() => {
  _versements = [{ amount: 100, date: '2026-01-01' }, { amount: 200, date: '2026-02-01' }];
  _journal = [];
  A._assurerIds();
  return _versements.every(v => v.id != null) && _versements[0].id !== _versements[1].id;
})(), true);

chk('_assurerIds respecte les ids déjà posés', (() => {
  _versements = [{ amount: 100, date: '2026-01-01', id: 42 }, { amount: 200, date: '2026-02-01' }];
  _journal = [];
  A._assurerIds();
  return [_versements[0].id, _versements[1].id !== 42 && _versements[1].id != null];
})(), [42, true]);

chk('_assurerIds numérote aussi les transactions', (() => {
  _versements = [];
  _journal = [{ type: 'buy', ticker: 'AI.PA', qty: 1, price: 10, date: '2026-01-01' }];
  A._assurerIds();
  return _journal[0].id != null;
})(), true);

// Le cas signalé : un versement supprimé depuis Activité les emportait tous.
// Avec des ids distincts, retirer celui qu'on vise n'atteint plus les autres.
chk('supprimer un versement n’emporte que lui', (() => {
  _versements = [{ amount: 100, date: '2026-01-01' }, { amount: 200, date: '2026-02-01' }];
  _journal = [];
  A._assurerIds();
  const cible = _versements[0].id;
  const i = _versements.findIndex(v => v.id === cible);
  _versements.splice(i, 1);
  return _versements.map(v => v.amount);
})(), [200]);

// ── La chronologie ne dépend plus des ids ──────────────────────────────────
chk('achat avant vente à date égale, malgré un id plus grand', totalPnl([
  { id: 1, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, date: '2026-01-01' },
  { id: 2, type: 'buy',  ticker: 'AI.PA', qty: 10, price: 10, date: '2026-01-01' },
]), 150);

chk('achat sans id, vente le même jour', totalPnl([
  { id: 9, type: 'sell', ticker: 'AI.PA', qty: 10, price: 25, date: '2026-01-01' },
  {        type: 'buy',  ticker: 'AI.PA', qty: 10, price: 10, date: '2026-01-01' },
]), 150);

chk('_txChrono : la date prime sur le type', (() => {
  const vente  = { type: 'sell', date: '2026-01-01', id: 1 };
  const achat  = { type: 'buy',  date: '2026-02-01', id: 2 };
  return A._txChrono(vente, achat) < 0;
})(), true);

// ── Performance depuis le début ─────────────────────────────────────────────
// Le bandeau annonçait la plus-value latente sous ce libellé et laissait le
// P&L réalisé de côté : les trois cartes du portefeuille ne s'additionnaient
// pas entre elles.
{
  const p = A.computePerfDepuisDebut(3617.59, 3323.77, 3302.66, [{ amount: 3600 }]);
  chk('gain = valorisation − versements',    p.gain, 17.59);
  chk('pourcentage sur le capital versé',    +p.pct.toFixed(2), 0.49);
  chk('la base est le capital versé',        p.base, 3600);
  chk('perf sur versements',                 p.surVersements, true);
}

chk('plusieurs versements cumulés',
  A.computePerfDepuisDebut(3617.59, 3323.77, 3302.66,
    [{ amount: 1000 }, { amount: 2000 }, { amount: 600 }]).gain, 17.59);

chk('versement sans montant ignoré',
  A.computePerfDepuisDebut(1100, 1100, 1000, [{ amount: 1000 }, { date: '2026-01-01' }]).gain, 100);

chk('perf négative',
  A.computePerfDepuisDebut(3500, 3300, 3400, [{ amount: 3600 }]).gain, -100);
chk('pourcentage négatif',
  +A.computePerfDepuisDebut(3500, 3300, 3400, [{ amount: 3600 }]).pct.toFixed(2), -2.78);

chk('gain arrondi au centime',
  A.computePerfDepuisDebut(3617.5947, 3323.7747, 3302.6521, [{ amount: 3600 }]).gain, 17.59);

// Sans versement au journal il n'y a pas de capital de référence : rapporter
// la valorisation à rien annoncerait tout le portefeuille comme un gain.
{
  const p = A.computePerfDepuisDebut(1100, 1100, 1000, []);
  chk('sans versement → retour à la latente', p.gain, 100);
  chk('sans versement → base = investi',      p.base, 1000);
  chk('sans versement → drapeau baissé',      p.surVersements, false);
}
chk('versements absents → latente',
  A.computePerfDepuisDebut(1100, 1100, 1000, undefined).gain, 100);
chk('versements à zéro → latente',
  A.computePerfDepuisDebut(1100, 1100, 1000, [{ amount: 0 }]).base, 1000);
chk('ni versement ni investi → 0 %',
  A.computePerfDepuisDebut(0, 0, 0, []).pct, 0);

// Le relevé de courtier qui a servi de référence, rejoué de bout en bout :
// dix achats, une vente qui solde une ligne, un achat le même jour, 3 600 €
// versés. Le courtier affiche 3 617,58 € au compteur — soit +17,58 € depuis le
// début, et non les +21,12 € de plus-value latente qu'affichait le bandeau.
{
  const j = [
    { id: 1,  type: 'buy',  ticker: 'WPEA.PA', qty: 100, price: 6.805,   fees: 3.40, date: '2026-06-17' },
    { id: 2,  type: 'buy',  ticker: 'PAEEM.PA', qty: 2,  price: 37.630,  fees: 0.38, date: '2026-06-18' },
    { id: 3,  type: 'buy',  ticker: 'ETZ.PA',  qty: 15,  price: 20.905,  fees: 1.57, date: '2026-06-30' },
    { id: 4,  type: 'buy',  ticker: 'WPEA.PA', qty: 100, price: 6.860,   fees: 3.43, date: '2026-07-02' },
    { id: 5,  type: 'buy',  ticker: 'ETZ.PA',  qty: 15,  price: 20.990,  fees: 1.57, date: '2026-07-02' },
    { id: 6,  type: 'buy',  ticker: 'PAEEM.PA', qty: 4,  price: 36.510,  fees: 0.73, date: '2026-07-06' },
    { id: 7,  type: 'buy',  ticker: 'PAEEM.PA', qty: 3,  price: 34.350,  fees: 0.52, date: '2026-07-20' },
    { id: 8,  type: 'buy',  ticker: 'WPEA.PA', qty: 100, price: 6.790,   fees: 3.40, date: '2026-07-30' },
    { id: 9,  type: 'buy',  ticker: 'PAEEM.PA', qty: 3,  price: 33.895,  fees: 0.51, date: '2026-07-30' },
    { id: 10, type: 'buy',  ticker: 'ETZ.PA',  qty: 10,  price: 21.405,  fees: 1.07, date: '2026-07-30' },
    { id: 11, type: 'sell', ticker: 'WPEA.PA', qty: 300, price: 6.874,   fees: 10,   date: '2026-08-03' },
    { id: 12, type: 'buy',  ticker: 'ESE.PA',  qty: 61,  price: 33.0786, fees: 10,   date: '2026-08-03' },
  ];
  const vers = [{ amount: 3600, date: '2026-06-16' }];
  const lots = (tk) => j.filter(t => t.ticker === tk && t.type === 'buy');
  const pf = [
    { ticker: 'ESE.PA',   qty: 61, buyPrice: A._pruAchats(lots('ESE.PA')),   currentPrice: 33.5127 },
    { ticker: 'ETZ.PA',   qty: 40, buyPrice: A._pruAchats(lots('ETZ.PA')),   currentPrice: 21.075  },
    { ticker: 'PAEEM.PA', qty: 12, buyPrice: A._pruAchats(lots('PAEEM.PA')), currentPrice: 36.3750 },
  ];
  const titres  = pf.reduce((s, r) => s + r.qty * r.currentPrice, 0);
  const investi = pf.reduce((s, r) => s + r.qty * r.buyPrice, 0);
  const cash    = A.computeCashBalance(j, vers);
  const valo    = titres + cash;
  const perf    = A.computePerfDepuisDebut(valo, titres, investi, vers);

  chk('relevé : PRU de la ligne ESE',      pf[0].buyPrice, 33.2425);
  chk('relevé : PRU de la ligne ETZ',      pf[1].buyPrice, 21.1671);
  chk('relevé : PRU de la ligne PAEEM',    pf[2].buyPrice, 35.6813);
  chk('relevé : évaluation des titres',    Math.round(titres * 100) / 100, 3323.77);
  chk('relevé : investi en titres',        Math.round(investi * 100) / 100, 3302.65);
  chk('relevé : solde espèces',            cash, 293.82);
  chk('relevé : valorisation totale',      Math.round(valo * 100) / 100, 3617.59);
  chk('relevé : plus-value latente',       Math.round((titres - investi) * 100) / 100, 21.12);
  chk('relevé : P&L réalisé de la vente',  totalPnl(j), -3.53);
  chk('relevé : perf depuis le début',     perf.gain, 17.59);
  chk('relevé : perf en pourcentage',      +perf.pct.toFixed(2), 0.49);
  // C'est tout l'objet du correctif : le total annoncé se retrouve dans la
  // somme des deux cartes du dessous, ce qui n'était pas le cas.
  chk('relevé : perf = latente + réalisé',
      perf.gain, Math.round(((titres - investi) + totalPnl(j)) * 100) / 100);
}

// ── Sortie ──────────────────────────────────────────────────────────────────
console.log(t.join('\n'));
const ko = t.filter(l => l.startsWith('FAIL')).length;
console.log('\n' + (t.length - ko) + '/' + t.length + ' tests passés.');
process.exit(ko ? 1 : 0);
