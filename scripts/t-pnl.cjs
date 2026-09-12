// Suite de tests du socle de calcul de js/app.js : prix de revient frais
// compris, P&L réalisé rejoué depuis le journal, solde espèces.
//
// `js/app.js` est écrit pour le navigateur et touche au DOM dès le chargement :
// on ne peut pas l'exiger tel quel. On en extrait le bloc de fonctions pures,
// délimité par `_txFees` et `logTransaction`, et on le compile seul. Le test
// porte donc sur le code réellement livré, pas sur une copie.
const fs   = require('fs');
const path = require('path');

const src   = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const debut = src.indexOf('function _txFees(tx) {');
const fin   = src.indexOf('\nfunction logTransaction(user, tx) {');
if (debut < 0 || fin < 0 || fin < debut) {
  console.error('Bloc de calcul introuvable dans js/app.js — bornes déplacées ?');
  process.exit(1);
}

// `realizedPnlOf` sait retomber sur le journal courant quand on ne lui passe
// pas de carte : ces deux globales lui tiennent lieu d'application.
let currentUser = 'test';
let _journal = [];
const getTransactions = () => _journal;

const bloc = src.slice(debut, fin);
const mod  = new module.constructor();
mod._compile(bloc + '\nmodule.exports = { _coutAchat, _pruAchats, _txChrono, computeRealizedPnl, realizedPnlOf, computeCashBalance };\n', 'app-socle.js');
// Le bloc extrait lit `getTransactions`/`currentUser` : on les lui donne.
global.currentUser = currentUser;
global.getTransactions = getTransactions;
const A = mod.exports;

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

// ── Sortie ──────────────────────────────────────────────────────────────────
console.log(t.join('\n'));
const ko = t.filter(l => l.startsWith('FAIL')).length;
console.log('\n' + (t.length - ko) + '/' + t.length + ' tests passés.');
process.exit(ko ? 1 : 0);
