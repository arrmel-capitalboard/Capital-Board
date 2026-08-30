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
  'module.exports = { _cryPositions, _cryDetenu, set ops(v){ _localCache["u_crypto"] = v; }, get ops(){ return _localCache["u_crypto"]; } };',
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

console.log('\n' + ok + '/' + (ok + ko) + (ko ? '  >>> ECHEC' : '  >>> tout passe'));
process.exit(ko ? 1 : 0);
