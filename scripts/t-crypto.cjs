// Suite de tests des positions crypto. Extrait les fonctions pures de
// js/app.js et rejoue la deduction des positions a partir des operations.
//
// C'est la seule partie du module qui calcule quelque chose : le prix moyen
// pondere, l'effet d'une vente, et la lecture de l'ancienne forme (une
// position, pas une operation) qui doit continuer de marcher.
const src = require('fs').readFileSync('js/app.js', 'utf8');
const g = (re) => { const m = src.match(re); if (!m) throw new Error('introuvable ' + re); return m[0]; };
const bundle = [
  'let _localCache = {}; let currentUser = "u";',
  g(/function _cryNormOp\(o\) \{[\s\S]*?\n\}/),
  g(/function getCryptoOps\(user\) \{[\s\S]*?\n\}/),
  g(/function _cryPositions\(\) \{[\s\S]*?\n\}/),
  g(/function _cryDetenu\(sym\) \{[\s\S]*?\n\}/),
  g(/function _crySerie\(ops, series, depuis\) \{[\s\S]*?\n\}/),
  g(/function _cryInvestiNet\(ops\) \{[\s\S]*?\n\}/),
  'module.exports = { _cryPositions, _cryDetenu, _crySerie, _cryInvestiNet, _crySerie, _cryInvestiNet, set ops(v){ _localCache["u_crypto"] = v; }, get ops(){ return _localCache["u_crypto"]; } };',
].join('\n');
const mod = new module.constructor();
mod._compile(bundle, 'cry.js');
const X = mod.exports;

let ok = 0, ko = 0;
const chk = (nom, val, att) => {
  const bon = Math.abs(val - att) < 1e-6;
  console.log((bon ? 'ok   ' : 'FAIL ') + nom + ' -> ' + val.toFixed(4) + (bon ? '' : '  ATTENDU ' + att));
  bon ? ok++ : ko++;
};

// Deux achats : prix moyen pondéré
X.ops = [
  { id:'1', sym:'BTC', sens:'achat', qte:1, prix:50000, date:'2026-01-10' },
  { id:'2', sym:'BTC', sens:'achat', qte:1, prix:70000, date:'2026-02-10' },
];
chk('deux achats : quantite', X._cryPositions()[0].qte, 2);
chk('deux achats : prix moyen pondere', X._cryPositions()[0].pru, 60000);

// Une vente ne change pas le prix de revient
X.ops = X.ops.concat([{ id:'3', sym:'BTC', sens:'vente', qte:0.5, prix:90000, date:'2026-03-10' }]);
chk('apres vente : quantite', X._cryPositions()[0].qte, 1.5);
chk('apres vente : prix de revient inchange', X._cryPositions()[0].pru, 60000);

// Tout vendu : la position disparait
X.ops = X.ops.concat([{ id:'4', sym:'BTC', sens:'vente', qte:1.5, prix:90000, date:'2026-04-10' }]);
chk('tout vendu : plus de position', X._cryPositions().length, 0);
chk('tout vendu : plus rien de detenu', X._cryDetenu('BTC'), 0);

// L'ordre des dates prime sur l'ordre du tableau
X.ops = [
  { id:'b', sym:'ETH', sens:'vente', qte:1, prix:3000, date:'2026-05-01' },
  { id:'a', sym:'ETH', sens:'achat', qte:2, prix:2000, date:'2026-01-01' },
];
chk('desordre : la date fait foi', X._cryPositions()[0].qte, 1);
chk('desordre : prix de revient de l achat', X._cryPositions()[0].pru, 2000);

// Ancienne forme (position, pas operation)
X.ops = [{ id:'vieux', sym:'SOL', qte:10, pru:120 }];
chk('ancienne forme : quantite lue', X._cryPositions()[0].qte, 10);
chk('ancienne forme : prix de revient lu', X._cryPositions()[0].pru, 120);

// On ne descend jamais sous zero
X.ops = [
  { id:'x', sym:'ADA', sens:'achat', qte:5, prix:1, date:'2026-01-01' },
  { id:'y', sym:'ADA', sens:'vente', qte:99, prix:1, date:'2026-02-01' },
];
chk('vente excessive : bornee a zero', X._cryDetenu('ADA'), 0);

// ── La courbe de valorisation ──
//
// Elle n'est pas stockee : elle se reconstitue des operations et des cours
// passes. C'est ce qui la rend exacte meme pour les jours ou personne n'a
// ouvert l'application — et ce qui merite d'etre verrouille.
const cours = (deb, n, px) => {
  const o = {}; const d = new Date(deb);
  for (let i = 0; i < n; i++) { o[d.toISOString().slice(0, 10)] = px(i); d.setDate(d.getDate() + 1); }
  return o;
};

const jour = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

// Achat d'1 BTC a 100, le cours monte de 5 par jour.
const debut = jour(4);
const opsC = [{ id: '1', sym: 'BTC', sens: 'achat', qte: 1, prix: 100, date: debut }];
const serieC = { BTC: cours(debut, 6, (i) => 100 + i * 5) };
const pts = X._crySerie(opsC, serieC, debut);
chk('courbe : un point par jour depuis l achat', pts.length, 5);
chk('courbe : valeur au premier jour', pts[0].valeur, 100);
chk('courbe : valeur au dernier jour', pts[pts.length - 1].valeur, 100 + (pts.length - 1) * 5);
chk('courbe : investi net', X._cryInvestiNet(opsC), 100);

// Une vente retire de la quantite le jour meme, et de l'investi net.
const opsV = opsC.concat([{ id: '2', sym: 'BTC', sens: 'vente', qte: 0.5, prix: 115, date: jour(1) }]);
const ptsV = X._crySerie(opsV, serieC, debut);
chk('courbe : la vente divise la valeur', ptsV[ptsV.length - 1].valeur, (100 + (ptsV.length - 1) * 5) * 0.5);
chk('courbe : investi net apres vente', X._cryInvestiNet(opsV), 42.5);

// Un trou dans la serie de Yahoo reporte le dernier cours connu : sans cela
// la courbe plongerait a zero un jour sur deux.
const troue = { BTC: {} };
Object.entries(serieC.BTC).forEach(([j, v], i) => { if (i !== 2) troue.BTC[j] = v; });
chk('courbe : trou de cotation, dernier cours reporte', X._crySerie(opsC, troue, debut)[2].valeur, 105);

console.log('\n' + ok + '/' + (ok + ko) + (ko ? '  >>> ECHEC' : '  >>> tout passe'));
process.exit(ko ? 1 : 0);
