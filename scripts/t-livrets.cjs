// Suite de tests des livrets. Extrait les fonctions pures de js/app.js et les
// rejoue avec une date figée au 12 août 2026 (14 quinzaines révolues sur 24).
const src = require('fs').readFileSync('js/app.js', 'utf8');
const g = (re) => { const m = src.match(re); if (!m) throw new Error('introuvable ' + re); return m[0]; };

const bundle = [
  g(/const LIV_BAREME = \{[\s\S]*?\n\};/),
  g(/const LIV_PFU = [^\n]*\n/),
  'let _livBareme = null, _livCfg = null;',
  g(/function _livB\(\) \{[\s\S]*?\n\}/),
  g(/function _livType_\(t\)[^\n]*\n/),
  g(/function _livSolde\(l\) \{[\s\S]*?\n\}/),
  g(/function _livTaux\(l\) \{[\s\S]*?\n\}/),
  g(/function _livInterets\(l\) \{[\s\S]*?\n\}/),
  g(/function _livQuinzaines\(d\) \{[\s\S]*?\n\}/),
  g(/function _livQIndex\(d\)[^\n]*\n/),
  g(/function _livDebutQuinzaine\(dateIso, annee, retrait\) \{[\s\S]*?\n\}/),
  g(/function _livTauxHist\(l\) \{[\s\S]*?\n\}/),
  g(/function _livTauxA\(l, q, annee\) \{[\s\S]*?\n\}/),
  g(/function _livInteretsQ\(l, jusqu, courant\) \{[\s\S]*?\n\}/),
  g(/function _livReleve\(l\) \{[\s\S]*?\n\}/),
  g(/function _livAcquis\(l\) \{[\s\S]*?\n\}/),
  g(/function _livQuinzainesDe\(iso\) \{[\s\S]*?\n\}/),
  g(/function _livProjeteApres\(l, apres\) \{[\s\S]*?\n\}/),
  g(/function _livProjete\(l\) \{[\s\S]*?\n\}/),
  g(/function _livReste\(l\) \{[\s\S]*?\n\}/),
  g(/function _livPlafond\(l\)[^\n]*\n/),
  'module.exports = { _livSolde, _livTaux, _livTauxA, _livInterets, _livInteretsQ,' +
  ' _livAcquis, _livProjete, _livDebutQuinzaine, _livQuinzaines, _livReste, _livPlafond };',
].join('\n');

const mod = new module.constructor();
mod._compile(bundle, 'livrets.js');

const Vraie = Date;
global.Date = class extends Vraie {
  constructor(...a) { return a.length ? new Vraie(...a) : new Vraie('2026-08-12T12:00:00'); }
  static now() { return new Vraie('2026-08-12T12:00:00').getTime(); }
};
const X = mod.exports;

const t = [];
const chk = (l, a, b) => {
  const ok = (typeof a === 'number' && typeof b === 'number') ? Math.abs(a - b) < 0.005 : Object.is(a, b);
  t.push((ok ? 'ok  ' : 'FAIL') + '  ' + l + ' -> ' + (typeof a === 'number' ? a.toFixed(2) : a) + (ok ? '' : '  ATTENDU ' + b));
};
const r = 0.0375, D = (s) => new Vraie(s + 'T12:00:00');

// ── Quinzaines ──────────────────────────────────────────────────────────────
chk('1er janv : 0 quinzaine', X._livQuinzaines(D('2026-01-01')), 0);
chk('15 janv : 0',            X._livQuinzaines(D('2026-01-15')), 0);
chk('16 janv : 1',            X._livQuinzaines(D('2026-01-16')), 1);
chk('12 aout : 14',           X._livQuinzaines(D('2026-08-12')), 14);
chk('31 dec : 23',            X._livQuinzaines(D('2026-12-31')), 23);

// Versement et retrait n'ont pas la même règle : le premier attend la
// quinzaine suivante, le second perd la quinzaine en cours.
chk('versement 20 juin -> 12', X._livDebutQuinzaine('2026-06-20', 2026, false), 12);
chk('retrait  20 juin -> 11',  X._livDebutQuinzaine('2026-06-20', 2026, true), 11);
chk('mouvement 2025 -> 0',     X._livDebutQuinzaine('2025-05-01', 2026, false), 0);

// ── Solde dérivé des mouvements ─────────────────────────────────────────────
chk('somme des mouvements', X._livSolde({ mouvements: [{ d: '2026-01-02', m: 1000 }, { d: '2026-03-01', m: -300 }] }), 700);
chk('jamais négatif',       X._livSolde({ mouvements: [{ d: '2026-01-02', m: 100 }, { d: '2026-03-01', m: -500 }] }), 0);
chk('repli ancien champ',   X._livSolde({ solde: 4200 }), 4200);

// ── Acquis et projection ────────────────────────────────────────────────────
const mai = { type: 'jeune', taux: 3.75, mouvements: [{ d: '2026-05-05', m: 850 }] };
chk('acquis = 5 quinzaines',   X._livAcquis(mai).net, 850 * r * 5 / 24);
chk('projeté = 15 quinzaines', X._livProjete(mai).net, 850 * r * 15 / 24);
chk('projeté >= acquis',       X._livProjete(mai).net >= X._livAcquis(mai).net ? 1 : 0, 1);

const aout = { type: 'jeune', taux: 3.75, mouvements: [{ d: '2026-08-06', m: 850 }] };
chk('déposé le 6 août : rien d’acquis', X._livAcquis(aout).net, 0);
chk('même solde, projection moindre',   X._livProjete(aout).net < X._livProjete(mai).net ? 1 : 0, 1);

// Un retrait ampute les deux, selon sa propre règle.
const retire = { type: 'livretA', mouvements: [{ d: '2025-01-01', m: 10000 }, { d: '2026-06-20', m: -4000 }] };
chk('retrait : solde',   X._livSolde(retire), 6000);
chk('retrait : acquis',  X._livAcquis(retire).net, 10000 * 0.017 * 14 / 24 - 4000 * 0.017 * (14 - 11) / 24);
chk('retrait : projeté', X._livProjete(retire).net, 10000 * 0.017 - 4000 * 0.017 * (24 - 11) / 24);

// ── Historique des taux ─────────────────────────────────────────────────────
// C'est le correctif : un livret change de taux au 1er février et au 1er août.
const hist = [
  { depuis: '2025-01-01', taux: 2.77 },
  { depuis: '2026-02-01', taux: 2.29 },
  { depuis: '2026-08-01', taux: 3.75 },
];
chk('taux en janvier',  X._livTauxA({ taux: 3.75, tauxHist: hist }, 1, 2026), 2.77);
chk('taux en mars',     X._livTauxA({ taux: 3.75, tauxHist: hist }, 5, 2026), 2.29);
chk('taux en août',     X._livTauxA({ taux: 3.75, tauxHist: hist }, 14, 2026), 3.75);
chk('sans historique : taux courant', X._livTauxA({ taux: 3.75 }, 5, 2026), 3.75);

const plein = { type: 'jeune', taux: 3.75, mouvements: [{ d: '2025-01-01', m: 1200 }], tauxHist: hist };
// 14 quinzaines révolues : 2 à 2,77 % (janvier), 12 à 2,29 % (février à juillet).
chk('acquis pondéré par les taux', X._livAcquis(plein).net,
    1200 * 0.0277 * 2 / 24 + 1200 * 0.0229 * 12 / 24);
// La projection ignore l'historique : la banque la calcule au taux du jour.
chk('projection au taux du jour', X._livProjete(plein).net, 1200 * 0.0375);
chk('historique ne change pas le solde', X._livSolde(plein), 1200);

// ── Relevé de la banque ─────────────────────────────────────────────────────
const rel = Object.assign({}, mai, { releve: { le: '2026-08-12', acquis: 6.58, projete: 19.94 } });
chk('acquis repris du relevé',  X._livAcquis(rel).net, 6.58);
chk('projeté repris du relevé', X._livProjete(rel).net, 19.94);
const vieux = Object.assign({}, mai, { releve: { le: '2026-07-14', acquis: 4, projete: 19.94 } });
chk('relevé ancien : l’acquis court', X._livAcquis(vieux).net, 4 + 850 * r * 2 / 24);
const partiel = Object.assign({}, mai, { releve: { le: '2026-08-12', acquis: 6.58, projete: null } });
chk('champ vide : calcul repris', X._livProjete(partiel).net, 850 * r * 15 / 24);

// ── Un mouvement postérieur au relevé le PROLONGE ───────────────────────────
// Les intérêts sont linéaires en le capital : la contribution d'un mouvement
// s'ajoute à ce que la banque a déjà projeté. On garde donc son chiffre — ses
// conventions, ses arrondis, sa base — et on n'ajoute que ce qu'elle ne pouvait
// pas connaître.
const stable = { type: 'jeune', taux: 3.75,
  mouvements: [{ d: '2026-05-05', m: 850 }],
  releve: { le: '2026-08-12', acquis: 6.58, projete: 19.94 } };
chk('sans mouvement postérieur : chiffre de la banque intact',
    X._livProjete(stable).net, 19.94);

// Versement du 13 août : quinzaine de départ 15, donc 9 quinzaines sur 24.
const verse = { type: 'jeune', taux: 3.75,
  mouvements: [{ d: '2026-05-05', m: 850 }, { d: '2026-08-13', m: 500 }],
  releve: { le: '2026-08-12', acquis: 6.58, projete: 19.94 } };
chk('versement après le relevé : ajouté au prévisionnel',
    X._livProjete(verse).net, 19.94 + 500 * r * 9 / 24);
chk('versement après le relevé : reste le chiffre de la banque',
    X._livProjete(verse).releve ? 1 : 0, 1);

// Un retrait compte négativement — ce que _livInteretsQ ne saurait pas faire,
// sa garde interdisant un capital négatif.
const retireApres = { type: 'jeune', taux: 3.75,
  mouvements: [{ d: '2026-05-05', m: 850 }, { d: '2026-08-13', m: -300 }],
  releve: { le: '2026-08-12', acquis: 6.58, projete: 19.94 } };
chk('retrait après le relevé : retranché du prévisionnel',
    X._livProjete(retireApres).net, 19.94 - 300 * r * (24 - 14) / 24);

// L'acquis court sur le capital RÉEL de chaque quinzaine, pas sur le solde
// d'aujourd'hui appliqué rétroactivement. Le relevé du 12 août tombant sur la
// quinzaine 14, et la date figée du test étant le 12 août, rien n'a couru.
chk('acquis : rien couru depuis un relevé du jour', X._livAcquis(verse).net, 6.58);
chk('acquis : toujours celui de la banque', X._livAcquis(verse).releve ? 1 : 0, 1);

// Un relevé plus ancien : deux quinzaines ont couru sur les 850 € seuls, le
// versement du 13 août n'ayant pas encore commencé à produire.
const ancien = { type: 'jeune', taux: 3.75,
  mouvements: [{ d: '2026-05-05', m: 850 }, { d: '2026-08-13', m: 500 }],
  releve: { le: '2026-07-14', acquis: 4, projete: 19.94 } };
chk('acquis : couru sur le capital réel', X._livAcquis(ancien).net, 4 + 850 * r * 2 / 24);
const pel = { type: 'pel', taux: 2, mouvements: [{ d: '2020-01-01', m: 20000 }],
              releve: { le: '2026-08-12', acquis: 250, projete: 400 } };
chk('relevé brut, affichage net', X._livAcquis(pel).net, 250 * 0.7);

// ── Plafonds ────────────────────────────────────────────────────────────────
chk('Livret A : reste à verser', X._livReste({ type: 'livretA', mouvements: [{ d: '2025-01-01', m: 10000 }] }), 12950);
chk('bancaire : sans plafond',   X._livPlafond({ type: 'bancaire' }), null);

console.log(t.join('\n'));
const ko = t.filter(x => x.startsWith('FAIL')).length;
console.log('\n' + (t.length - ko) + '/' + t.length + (ko ? '  >>> ECHEC' : '  >>> tout passe'));
process.exit(ko ? 1 : 0);
