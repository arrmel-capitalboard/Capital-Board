// ═══════════════════════════════════════════════════════════════════════════
//  RÉCONCILIATION D'UN PEA — journal contre relevé du courtier
//
//  À quoi ça sert
//  Le coût de revient affiché ne se déduit pas du journal : il est lu sur les
//  lignes du portefeuille, où `buyPrice` est un état entretenu à la main —
//  ajout, édition, import, vente, attribution gratuite, suppression. Huit
//  chemins d'écriture, aucun rejeu : une ligne mal écrite un jour reste fausse
//  pour toujours, et rien dans l'application ne la contredit.
//
//  Ce script rejoue le journal avec le socle de calcul de js/app.js — le vrai,
//  extrait du fichier, pas une copie — et met le résultat face à l'état stocké
//  puis face aux chiffres du courtier. Il ne corrige rien : il désigne.
//
//  Usage
//    1. Ouvrir l'application, console du navigateur, taper : exportDebugData()
//       Un fichier debug_pea_<user>.json est téléchargé.
//    2. node scripts/reconcile-pea.cjs debug_pea_xxx.json \
//         --titres=2068.72 --latente=13.75 --cash=323.97
//
//  Les trois options sont les chiffres du relevé. Sans elles, le script se
//  contente de comparer le journal à l'état stocké.
// ═══════════════════════════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');

// ── Le socle de calcul de l'application, extrait de js/app.js ───────────────
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
function tranche(nom, ouvre, ferme) {
  const a = src.indexOf(ouvre), b = src.indexOf(ferme);
  if (a < 0 || b < 0 || b < a) {
    console.error('Bloc « ' + nom + ' » introuvable dans js/app.js — bornes déplacées ?');
    process.exit(1);
  }
  return src.slice(a, b);
}
const socle = tranche('socle de calcul', 'function _txFees(tx) {', '\nfunction logTransaction(user, tx) {');
const mod = new module.constructor();
mod._compile(socle + '\nmodule.exports = { _montantTx, _coutAchat, _txFees, _totalFees, _txChrono, computeCashBalance, computeRealizedPnl };\n', 'app-socle.js');
const A = mod.exports;

// ── Entrées ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const fichier = args.find(a => !a.startsWith('--'));
const opt = n => {
  const a = args.find(x => x.startsWith('--' + n + '='));
  return a ? parseFloat(a.split('=')[1].replace(',', '.')) : null;
};
if (!fichier) {
  console.error('Usage : node scripts/reconcile-pea.cjs <export.json> [--titres=] [--latente=] [--cash=]');
  console.error('L\'export s\'obtient en tapant  exportDebugData()  dans la console du navigateur.');
  process.exit(1);
}
const dump = JSON.parse(fs.readFileSync(fichier, 'utf8'));
const portefeuille = dump.portfolio || [];
const journal      = dump.transactions || [];
const versements   = dump.versements || [];

// De quel compte et de quel instant parle ce fichier. Les exports d'avant
// 20260916d ne le disent pas : on le signale plutôt que de supposer.
const ENVELOPPE = { pea: 'PEA', cto: 'Compte-titres' };
console.log('\n\x1b[1mSource\x1b[0m');
if (dump.compte) {
  console.log('  ' + (ENVELOPPE[dump.compte] || dump.compte)
    + (dump.exporte ? '  ·  exporté le ' + new Date(dump.exporte).toLocaleString('fr-FR') : '')
    + (dump.version ? '  ·  version ' + dump.version : ''));
  // Un export produit par l'administrateur porte les avoirs de quelqu'un
  // d'autre. Le rapport le dit, plutôt que de laisser croire qu'on relit ses
  // propres chiffres.
  if (dump.source && dump.source !== 'client') {
    console.log('  \x1b[33mExport administrateur\x1b[0m (' + dump.source + ')'
      + ' — données d\'un tiers, à supprimer après diagnostic.');
  }
} else {
  console.log('  \x1b[33mCet export ne dit pas de quel compte il vient\x1b[0m — il date d\'avant');
  console.log('  le correctif. exportDebugData() exporte le compte AFFICHÉ à l\'écran :');
  console.log('  vérifiez que vous étiez bien sur l\'onglet du compte à réconcilier.');
}

const refTitres  = opt('titres');
const refLatente = opt('latente');
const refCash    = opt('cash');

const eur = v => (v == null ? '—' : v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
// Sous le centime, l'écart est nul : l'afficher signé « -0,00 € » le ferait
// passer pour un défaut alors que la ligne tombe juste.
const signe = v => { const x = Math.abs(v) < 0.005 ? 0 : v; return (x >= 0 ? '+' : '') + eur(x); };
const titre = t => console.log('\n\x1b[1m' + t + '\x1b[0m\n' + '─'.repeat(t.length));

// ── Rejeu du journal, ticker par ticker ────────────────────────────────────
//
// Coût moyen pondéré, la méthode du PRU de l'application : un achat ajoute son
// coût frais compris, une vente retire au prix de revient, jamais au prix de
// cession. Les attributions gratuites entrent à coût nul et diluent le PRU,
// ce qui est exactement leur effet sur un relevé.
function rejouer(txs) {
  const pos = new Map();
  [...txs].sort(A._txChrono).forEach(t => {
    if (t.type !== 'buy' && t.type !== 'sell') return;
    const cle = String(t.ticker || '').toUpperCase();
    if (!pos.has(cle)) pos.set(cle, { qty: 0, cout: 0, achats: 0, ventes: 0 });
    const p = pos.get(cle);
    if (t.type === 'buy') {
      p.qty  += t.qty || 0;
      p.cout += A._coutAchat(t.qty, t.price, A._txFees(t));
      p.achats++;
      return;
    }
    const couvert = Math.min(t.qty || 0, p.qty);
    if (couvert <= 0) return;
    p.cout -= (p.cout / p.qty) * couvert;
    p.qty  -= couvert;
    p.ventes++;
  });
  return pos;
}

const rejoue = rejouer(journal);

// ── 1. Ligne par ligne : l'état stocké contre le journal ───────────────────
titre('1. Coût de revient — état stocké contre journal rejoué');

let investiStocke = 0, investiRejoue = 0;
const lignes = [];
portefeuille.forEach(r => {
  const cle  = String(r.ticker || '').toUpperCase();
  const p    = rejoue.get(cle);
  const cout = (r.qty || 0) * (r.buyPrice || 0);
  investiStocke += cout;
  const coutJ = p ? p.cout : 0;
  investiRejoue += coutJ;
  lignes.push({
    ticker: r.ticker, qty: r.qty, qtyJ: p ? p.qty : 0,
    cout, coutJ, ecart: cout - coutJ, orphelin: !p,
  });
});
// Un ticker présent au journal mais plus au portefeuille est une position
// soldée : normal, on ne l'additionne pas, mais on le signale s'il reste du
// coût dessus.
rejoue.forEach((p, cle) => {
  if (portefeuille.some(r => String(r.ticker || '').toUpperCase() === cle)) return;
  if (p.qty > 1e-6) lignes.push({ ticker: cle, qty: 0, qtyJ: p.qty, cout: 0, coutJ: p.cout, ecart: -p.cout, absent: true });
});

console.log('ticker'.padEnd(12) + 'qté'.padStart(9) + 'qté jrnl'.padStart(10)
  + 'coût stocké'.padStart(15) + 'coût journal'.padStart(15) + 'écart'.padStart(13));
lignes.forEach(l => {
  const marque = Math.abs(l.ecart) >= 0.01 ? '  ⟵' : '';
  console.log(String(l.ticker).padEnd(12)
    + String(l.qty).padStart(9) + String(+l.qtyJ.toFixed(4)).padStart(10)
    + eur(l.cout).padStart(15) + eur(l.coutJ).padStart(15)
    + signe(l.ecart).padStart(13) + marque
    + (l.orphelin ? '  aucun achat au journal' : '') + (l.absent ? '  absent du portefeuille' : ''));
});
console.log(''.padEnd(12) + ''.padStart(19) + eur(investiStocke).padStart(15)
  + eur(investiRejoue).padStart(15) + signe(investiStocke - investiRejoue).padStart(13) + '  TOTAL');

// ── 2. Le solde espèces, poste par poste ───────────────────────────────────
titre('2. Solde espèces — décomposition');

const somme = (f) => journal.filter(f).reduce((s, t) => s + A._montantTx(t.qty, t.price), 0);
const postes = [
  ['Versements',    versements.reduce((s, v) => s + (v.amount || 0), 0)],
  ['Achats',        -somme(t => t.type === 'buy')],
  ['Ventes',        somme(t => t.type === 'sell')],
  ['Dividendes',    somme(t => t.type === 'dividend')],
  ['Distributions', somme(t => t.type === 'distribution')],
  ['Frais',         -A._totalFees(journal)],
];
postes.forEach(([n, v]) => console.log('  ' + n.padEnd(16) + signe(v).padStart(14)));
const cashCalc = A.computeCashBalance(journal, versements);
console.log('  ' + 'SOLDE'.padEnd(16) + eur(cashCalc).padStart(14));

// Un type inconnu ne bouge ni le cash ni le coût : il disparaît du calcul sans
// bruit. C'est la panne la plus discrète du lot.
const CONNUS = new Set(['buy', 'sell', 'dividend', 'distribution']);
const inconnus = journal.filter(t => !CONNUS.has(t.type));
if (inconnus.length) {
  console.log('\n  ⚠ ' + inconnus.length + ' écriture(s) d\'un type que le calcul ignore :');
  inconnus.forEach(t => console.log('      ' + (t.date || '?') + '  type=' + JSON.stringify(t.type)
    + '  ' + (t.ticker || '') + '  ' + eur(A._montantTx(t.qty, t.price))));
}

// ── 3. Face au relevé ──────────────────────────────────────────────────────
if (refTitres != null || refCash != null) {
  titre('3. Face au relevé du courtier');
  const l = (n, app, ref) => {
    if (ref == null) return null;
    const e = app - ref;
    console.log('  ' + n.padEnd(22) + ('app ' + eur(app)).padStart(18)
      + ('relevé ' + eur(ref)).padStart(21) + ('écart ' + signe(e)).padStart(20));
    return e;
  };
  l('Coût de revient', investiStocke, refTitres != null && refLatente != null ? refTitres - refLatente : null);
  if (refTitres != null && refLatente != null) {
    l('+/- value latente', refTitres - investiStocke, refLatente);
  }
  const ecartCash = l('Solde espèces', cashCalc, refCash);

  // ── La partie qui désigne : quelle écriture pèse exactement l'écart ? ────
  const cibles = [];
  if (refTitres != null && refLatente != null) cibles.push(['coût de revient', investiStocke - (refTitres - refLatente)]);
  if (ecartCash != null) cibles.push(['solde espèces', ecartCash]);

  cibles.forEach(([nom, ecart]) => {
    if (Math.abs(ecart) < 0.01) { console.log('\n  ✓ ' + nom + ' : aucun écart.'); return; }
    console.log('\n  Écart de ' + eur(Math.abs(ecart)) + ' sur le ' + nom + ' — écritures qui pèsent ce montant :');
    const cible = Math.abs(ecart);
    let trouve = 0;
    // Une écriture seule.
    journal.forEach(t => {
      const m = A._montantTx(t.qty, t.price) + A._txFees(t);
      [['montant', A._montantTx(t.qty, t.price)], ['montant + frais', m], ['le double', A._montantTx(t.qty, t.price) * 2]]
        .forEach(([quoi, v]) => {
          if (Math.abs(v - cible) < 0.02) {
            console.log('      ' + (t.date || '?') + '  ' + String(t.type).padEnd(13)
              + String(t.ticker || '').padEnd(10) + eur(v) + '   (' + quoi + ')');
            trouve++;
          }
        });
    });
    // Un versement seul.
    versements.forEach(v => {
      if (Math.abs((v.amount || 0) - cible) < 0.02) {
        console.log('      ' + (v.date || '?') + '  versement    ' + eur(v.amount));
        trouve++;
      }
    });
    if (!trouve) console.log('      aucune écriture isolée de ce montant — l\'écart vient d\'un cumul.');
  });
}

// ── 4. Écritures suspectes ─────────────────────────────────────────────────
titre('4. Écritures suspectes');
let alertes = 0;
const dire = (m) => { console.log('  ⚠ ' + m); alertes++; };

// Doublons : même titre, même jour, même sens, même quantité, même prix. Le
// journal en fabrique dès qu'un import est relancé ou qu'un enregistrement
// part deux fois.
const vus = new Map();
journal.forEach(t => {
  const cle = [t.type, t.ticker, t.date, t.qty, t.price].join('|');
  if (!vus.has(cle)) vus.set(cle, []);
  vus.get(cle).push(t);
});
vus.forEach((list, cle) => {
  if (list.length < 2) return;
  const [type, ticker, date, qty, price] = cle.split('|');
  dire(list.length + '× la même écriture : ' + date + '  ' + type + '  ' + ticker
    + '  ' + qty + ' × ' + eur(+price) + '  → ' + eur(A._montantTx(+qty, +price) * (list.length - 1)) + ' en trop');
});

// Achat à prix nul non signalé comme attribution : du volume sans coût, mais
// qui devrait porter un coût.
journal.filter(t => t.type === 'buy' && !(t.price > 0) && !t.ost)
  .forEach(t => dire('achat à prix nul non marqué « attribution » : ' + (t.date || '?') + '  ' + (t.ticker || '') + '  ' + t.qty + ' titres'));

// Vente à découvert : le journal vend ce qu'il n'a pas, signe d'un achat
// manquant ou d'une quantité fausse.
{
  const pos = new Map();
  [...journal].sort(A._txChrono).forEach(t => {
    if (t.type !== 'buy' && t.type !== 'sell') return;
    const cle = String(t.ticker || '').toUpperCase();
    const q = pos.get(cle) || 0;
    if (t.type === 'buy') { pos.set(cle, q + (t.qty || 0)); return; }
    if ((t.qty || 0) > q + 1e-6) {
      dire('vente de ' + t.qty + ' ' + cle + ' le ' + (t.date || '?') + ' alors que le journal n\'en détient que ' + (+q.toFixed(4)));
    }
    pos.set(cle, Math.max(0, q - (t.qty || 0)));
  });
}

// Ligne du portefeuille sans aucun achat au journal : son PRU ne repose sur
// rien de rejouable.
lignes.filter(l => l.orphelin).forEach(l => dire('ligne « ' + l.ticker +' » sans aucun achat au journal — PRU invérifiable'));

// Quantité stockée qui ne suit pas le journal.
lignes.filter(l => !l.orphelin && !l.absent && Math.abs(l.qty - l.qtyJ) > 1e-4)
  .forEach(l => dire('quantité de « ' + l.ticker + ' » : ' + l.qty + ' au portefeuille, ' + (+l.qtyJ.toFixed(4)) + ' au journal'));

// Écritures sans date : elles échappent aux tris chronologiques et au rejeu.
const sansDate = journal.filter(t => !t.date);
if (sansDate.length) dire(sansDate.length + ' écriture(s) sans date — exclues de tout rejeu chronologique');

if (!alertes) console.log('  Rien à signaler.');

console.log('\n' + '═'.repeat(70));
console.log(journal.length + ' écritures, ' + versements.length + ' versements, '
  + portefeuille.length + ' lignes. ' + alertes + ' alerte(s).');
