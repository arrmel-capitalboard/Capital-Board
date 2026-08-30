// Suite de tests des livrets. Extrait les fonctions pures de js/app.js et les
// rejoue avec une date figée au 12 août 2026 (14 quinzaines révolues sur 24).
const src = require('fs').readFileSync('js/app.js', 'utf8');
const g = (re) => { const m = src.match(re); if (!m) throw new Error('introuvable ' + re); return m[0]; };

const bundle = [
  g(/const LIV_BAREME = \{[\s\S]*?\n\};/),
  g(/const LIV_PFU    = [^\n]*\n/),
  g(/const LIV_PFU_EL = [^\n]*\n/),
  g(/const LIV_PS  = [^\n]*\n/),
  g(/const LIV_EL_REFORME = [^\n]*\n/),
  'let _livBareme = null, _livCfg = null;',
  g(/function _livB\(\) \{[\s\S]*?\n\}/),
  g(/function _livType_\(t\)[^\n]*\n/),
  g(/function _livSolde\(l\) \{[\s\S]*?\n\}/),
  g(/function _livTaux\(l\) \{[\s\S]*?\n\}/),
  g(/function _livPlafond\(l\)[^\n]*\n/),
  g(/function _livSur\(l\) \{[\s\S]*?\n\}/),
  g(/function _livPlafondTotal\(l\) \{[\s\S]*?\n\}/),
  g(/function _livTranches\(l, capital\) \{[\s\S]*?\n\}/),
  g(/function _livRegime\(l, annee, q\) \{[\s\S]*?\n\}/),
  g(/function _livAtteint\(ouvIso, ans, annee, q\) \{[\s\S]*?\n\}/),
  g(/function _livEstEL\(l\) \{[\s\S]*?\n\}/),
  g(/function _livPfu\(l\) \{[\s\S]*?\n\}/),
  g(/function _livSeau\(regime, l\) \{[\s\S]*?\n\}/),
  g(/function _livImpot\(regime, l\) \{[\s\S]*?\n\}/),
  g(/function _livNet\(l, d\) \{[\s\S]*?\n\}/),
  g(/function _livTauxImpot\(l, d\) \{[\s\S]*?\n\}/),
  g(/function _livInterets\(l\) \{[\s\S]*?\n\}/),
  g(/function _livQuinzaines\(d\) \{[\s\S]*?\n\}/),
  g(/function _livQIndex\(d\)[^\n]*\n/),
  g(/function _livDebutQuinzaine\(dateIso, annee, retrait\) \{[\s\S]*?\n\}/),
  g(/function _livTauxHist\(l\) \{[\s\S]*?\n\}/),
  g(/function _livTauxA\(l, q, annee\) \{[\s\S]*?\n\}/),
  g(/function _livInteretsQ2\(l, jusqu, courant\) \{[\s\S]*?\n\}/),
  g(/function _livInteretsQ\(l, jusqu, courant\) \{[\s\S]*?\n\}/),
  g(/function _livReleve\(l\) \{[\s\S]*?\n\}/),
  g(/function _livAcquis\(l\) \{[\s\S]*?\n\}/),
  g(/function _livQuinzainesDe\(iso\) \{[\s\S]*?\n\}/),
  g(/function _livProjeteApres\(l, apres\) \{[\s\S]*?\n\}/),
  g(/function _livProjete\(l\) \{[\s\S]*?\n\}/),
  g(/function _livReste\(l\) \{[\s\S]*?\n\}/),
  g(/function _livTauxMarge\(l\) \{[\s\S]*?\n\}/),
  g(/function _livFicheEstSur\(f, t\) \{[\s\S]*?\n\}/),
  // `_livClasserFiche` lit le type en cours de saisie, porté par une variable
  // de module dans l'application. Le test le pose lui-même.
  'let _livType = "livretA";',
  g(/function _livClasserFiche\(f\) \{[\s\S]*?\n\}/),
  'module.exports = { _livSolde, _livTaux, _livTauxA, _livInterets, _livInteretsQ,' +
  ' _livAcquis, _livProjete, _livDebutQuinzaine, _livQuinzaines, _livReste, _livPlafond,' +
  ' _livSur, _livPlafondTotal, _livRegime, _livImpot, _livTauxMarge, _livFicheEstSur, _livClasserFiche, _livType_, _livB, LIV_PFU, LIV_PFU_EL };',
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

// Le jour même du relevé, le mouvement compte aussi. Sans quoi verser le jour
// où l'on saisit son relevé laisserait le prévisionnel figé — un chiffre qui
// ne bouge pas ne signale rien, alors qu'un chiffre trop haut se voit.
const memeJour = { type: 'jeune', taux: 3.75,
  mouvements: [{ d: '2026-05-05', m: 850 }, { d: '2026-08-12', m: 500 }],
  releve: { le: '2026-08-12', acquis: 6.58, projete: 19.94 } };
// Le 12 août tombe dans la quinzaine 14 ; un versement démarre à la suivante,
// soit 9 quinzaines restantes sur 24 — pas 10.
chk('versement le jour du relevé : compté',
    X._livProjete(memeJour).net, 19.94 + 500 * r * 9 / 24);
chk('versement le jour du relevé : reste le chiffre de la banque',
    X._livProjete(memeJour).releve ? 1 : 0, 1);

// La veille en revanche appartient au passé du relevé : la banque l'avait.
const veille = { type: 'jeune', taux: 3.75,
  mouvements: [{ d: '2026-05-05', m: 850 }, { d: '2026-08-11', m: 500 }],
  releve: { le: '2026-08-12', acquis: 6.58, projete: 19.94 } };
chk('versement de la veille : déjà dans le chiffre de la banque',
    X._livProjete(veille).net, 19.94);
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

// Un relevé de l'année précédente ne vaut plus rien : les intérêts ont été
// crédités le 31 décembre et le compteur est reparti de zéro. Le garder
// ajoutait les intérêts de l'an passé à ceux de l'année neuve.
const anPasse = { type: 'jeune', taux: 3.75,
  mouvements: [{ d: '2026-05-05', m: 850 }],
  releve: { le: '2025-08-13', acquis: 6.58, projete: 19.94 } };
chk('relevé de l’an dernier : ignoré pour l’acquis',
    X._livAcquis(anPasse).releve ? 1 : 0, 0);
chk('relevé de l’an dernier : acquis recalculé',
    X._livAcquis(anPasse).net, 850 * r * 5 / 24);
chk('relevé de l’an dernier : prévisionnel recalculé',
    X._livProjete(anPasse).net, 850 * r * 15 / 24);
const pel = { type: 'pel', taux: 2, mouvements: [{ d: '2020-01-01', m: 20000 }],
              releve: { le: '2026-08-12', acquis: 250, projete: 400 } };
chk('relevé brut, affichage net', X._livAcquis(pel).net, 250 * 0.7);

// ── Plafonds ────────────────────────────────────────────────────────────────
chk('Livret A : reste à verser', X._livReste({ type: 'livretA', mouvements: [{ d: '2025-01-01', m: 10000 }] }), 12950);
chk('bancaire : sans plafond',   X._livPlafond({ type: 'bancaire' }), null);

// ── Deux compartiments ──────────────────────────────────────────────────────
// Le plafond n'est pas un mur mais une frontière de taux : au-delà de 22 950 €,
// un Livret A du CIC rémunère 0,30 % au lieu de 1,70 %, et cette part est
// imposée. Fiche réelle du 13/08.
const gros = { type: 'livretA', surTaux: 0.3, surPlafond: 77050,
               mouvements: [{ d: '2025-01-01', m: 30000 }] };
const reglB = 22950 * 0.017, surB = 7050 * 0.003;
const partA = surB / (reglB + surB);

chk('deux tranches : solde au-dessus du plafond', X._livSolde(gros), 30000);
chk('deux tranches : plafond du produit entier', X._livPlafondTotal(gros), 100000);
chk('deux tranches : reste à verser sur le second', X._livReste(gros), 70000);
chk('deux tranches : acquis brut',  X._livAcquis(gros).brut, (reglB + surB) * 14 / 24);
chk('deux tranches : seul le dépassement est imposé',
    X._livAcquis(gros).net, (reglB + surB * (1 - X.LIV_PFU)) * 14 / 24);
chk('deux tranches : projeté au 31 décembre', X._livProjete(gros).brut, reglB + surB);
// `impot` est le taux d'imposition MOYEN des intérêts, pas la part imposée :
// c'est lui qu'on applique à un chiffre de banque, qui ne se décompose pas.
chk('deux tranches : taux d’imposition moyen',
    X._livInteretsQ(gros, 24, true).impot, 0.30 * partA);
chk('deux tranches : taux du prochain euro versé', X._livTauxMarge(gros), 0.3);
chk('sous le plafond : taux réglementé',
    X._livTauxMarge({ type: 'livretA', surTaux: 0.3, mouvements: [{ d: '2025-01-01', m: 100 }] }), 1.7);

// Un chiffre venu de la banque est global : la fiscalité s'y applique dans la
// proportion que le calcul, lui, sait établir.
const relGros = Object.assign({}, gros, { releve: { le: '2026-08-12', acquis: 100, projete: 200 } });
chk('relevé : imposé au prorata de la tranche', X._livAcquis(relGros).net, 100 * (1 - X.LIV_PFU * partA));
chk('relevé : prévisionnel au prorata',          X._livProjete(relGros).net, 200 * (1 - X.LIV_PFU * partA));

// Un versement postérieur au relevé se loge dans la tranche où il tombe : au
// taux du dépassement, puisque le livret est déjà plein.
const verseGros = Object.assign({}, relGros, {
  mouvements: [{ d: '2025-01-01', m: 30000 }, { d: '2026-08-13', m: 1000 }] });
chk('versement au-delà du plafond : rémunéré au taux du contrat',
    X._livProjete(verseGros).brut, 200 + 1000 * 0.003 * 9 / 24);

// Sans compartiment déclaré, le surplus reste au taux du livret : c'est ce qui
// se passe le lendemain de la capitalisation du 31 décembre, et le refuser
// rendait un Livret A plein impossible à saisir.
const capitalise = { type: 'livretA', mouvements: [{ d: '2025-01-01', m: 23000 }] };
chk('sans compartiment : tout au taux réglementé', X._livProjete(capitalise).brut, 23000 * 0.017);
chk('sans compartiment : rien d’imposé',           X._livProjete(capitalise).net,  23000 * 0.017);
chk('sans compartiment : reste à verser nul, pas négatif', X._livReste(capitalise), 0);

// Un taux de dépassement sans son plafond vaut mieux qu'un plafond inventé.
const sansBorne = { type: 'livretA', surTaux: 0.3, mouvements: [{ d: '2025-01-01', m: 30000 }] };
chk('sans plafond de dépassement : aucune borne connue', X._livPlafondTotal(sansBorne), null);
chk('sans plafond de dépassement : pas de reste à verser', X._livReste(sansBorne), null);
chk('sans plafond de dépassement : le taux s’applique', X._livInterets(sansBorne).brut, reglB + surB);
chk('livret sans plafond réglementé : pas de dépassement',
    X._livSur({ type: 'bancaire', taux: 2, surTaux: 0.3 }), null);
chk('sans surTaux : pas de compartiment', X._livSur({ type: 'livretA', surPlafond: 77050 }), null);

// ── Une fiche décrit-elle le livret ou son dépassement ? ────────────────────
const tA = X._livType_('livretA'), tJ = X._livType_('jeune');
chk('fiche : plafond 77 050 = compartiment', X._livFicheEstSur({ plafond: 77050, taux: 0.3 }, tA) ? 1 : 0, 1);
chk('fiche : plafond 22 950 = le livret',    X._livFicheEstSur({ plafond: 22950, taux: 1.7 }, tA) ? 1 : 0, 0);
chk('fiche : sans plafond, taux très bas',   X._livFicheEstSur({ taux: 0.3 }, tA) ? 1 : 0, 1);
chk('fiche : barème en retard n’est pas un compartiment',
    X._livFicheEstSur({ taux: 1.5 }, tA) ? 1 : 0, 0);
// Le taux d'un Livret Jeune est libre : il ne peut rien trancher.
chk('fiche : Livret Jeune à taux libre', X._livFicheEstSur({ taux: 1.5 }, tJ) ? 1 : 0, 0);

// L'ordre des blocs est celui de la capture, pas celui du produit : sur la
// fiche du 14/08, le compartiment de dépassement venait en premier et l'écran
// annonçait « fiche du livret » au-dessus d'un taux à 0,30 %.
const inverse = { taux: 0.3, solde: 0, plafond: 77050,
                  sur: { taux: 1.7, solde: 11.54, plafond: 22950, ouverture: '2023-05-17' } };
const remis = X._livClasserFiche(inverse);
chk('classement : le livret repasse devant', remis.taux, 1.7);
chk('classement : son plafond suit',         remis.plafond, 22950);
chk('classement : le dépassement passe dans sur', remis.sur.taux, 0.3);
chk('classement : plafond du dépassement',   remis.sur.plafond, 77050);
chk('classement : pas de troisième étage',   remis.sur.sur, undefined);

// La fiche d'un autre livret déposée sur le mauvais type : le plafond diffère,
// mais le taux est celui d'un produit réglementé, pas d'un dépassement. Sans
// cette garde, un Livret A importé sur un LDDS devenait un compartiment à
// 1,70 % — et tout le solde au-delà de 12 000 € aurait été imposé.
const tL = X._livType_('ldds');
chk('fiche : Livret A déposé sur un LDDS n’est pas un compartiment',
    X._livFicheEstSur({ plafond: 22950, taux: 1.7 }, tL) ? 1 : 0, 0);
chk('fiche : vrai dépassement sur un LDDS',
    X._livFicheEstSur({ plafond: 65000, taux: 0.3 }, tL) ? 1 : 0, 1);
// Le plancher légal du Livret Jeune suffit à trancher sans connaître son
// contrat : aucune banque ne peut le rémunérer sous le taux du Livret A.
chk('fiche : dépassement sous le plancher du Livret Jeune',
    X._livFicheEstSur({ plafond: 50000, taux: 0.3 }, tJ) ? 1 : 0, 1);

// Déjà dans l'ordre : rien ne bouge.
const droit = { taux: 1.7, plafond: 22950, sur: { taux: 0.3, plafond: 77050 } };
chk('classement : ordre correct laissé tel quel', X._livClasserFiche(droit).taux, 1.7);
chk('classement : fiche ordinaire intacte',
    X._livClasserFiche({ taux: 1.7, plafond: 22950 }).plafond, 22950);

// Seule la capture du dépassement a été envoyée : elle ne doit pas passer pour
// le livret. Il reste à saisir, le compartiment est déjà rempli.
const seule = X._livClasserFiche({ taux: 0.3, plafond: 77050, solde: 0 });
chk('classement : dépassement seul, livret vide', seule.taux, undefined);
chk('classement : dépassement seul, rangé au bon endroit', seule.sur.taux, 0.3);

// ── Barème des types ouverts ────────────────────────────────────────────────
//
// Ces livrets-là, personne dans l'équipe n'en détient : aucun relevé réel ne
// viendra les éprouver. Ce qui est vérifiable l'est donc ici — le barème est
// complet, et le calcul rend ce que la loi annonce. Le reste, la lecture d'un
// écran de banque, ne dépend pas du type.
const B = X._livB();
const ouverts = Object.keys(B.types).filter(k => !B.types[k].bientot);

chk('tous les types sont ouverts', ouverts.length, Object.keys(B.types).length);

// Un type ne s'ouvre qu'avec un barème décrit. `null` est une réponse : le
// livret bancaire n'a pas de plafond réglementé, le PEL fixe son taux au
// contrat. `undefined` n'en est pas une, et c'est ce que cette garde attrape.
ouverts.forEach(k => {
  const t = B.types[k];
  const plafondOk = t.plafond === null || (Number.isFinite(t.plafond) && t.plafond > 0);
  const tauxOk    = t.taux    === null || (Number.isFinite(t.taux)    && t.taux    > 0);
  chk('barème ' + k + ' : plafond décrit', plafondOk ? 1 : 0, 1);
  chk('barème ' + k + ' : taux décrit',    tauxOk ? 1 : 0, 1);
  chk('barème ' + k + ' : fiscalité posée', typeof t.fisc === 'boolean' ? 1 : 0, 1);
});

// Valeurs en vigueur du 1er août 2026 au 31 janvier 2027, vérifiées le 16/08
// sur les sources publiques. Elles ne se devinent pas : un chiffre faux ici se
// propage à tout ce que le membre lit.
chk('barème : Livret A à 1,70 %',   B.types.livretA.taux, 1.7);
chk('barème : Livret A à 22 950 €', B.types.livretA.plafond, 22950);
chk('barème : LDDS aligné sur le Livret A', B.types.ldds.taux, B.types.livretA.taux);
chk('barème : LDDS à 12 000 €',     B.types.ldds.plafond, 12000);
chk('barème : LEP à 2,50 %',        B.types.lep.taux, 2.5);
chk('barème : LEP à 10 000 €',      B.types.lep.plafond, 10000);
chk('barème : LEP exonéré',         B.types.lep.fisc ? 1 : 0, 0);
chk('barème : LDDS exonéré',        B.types.ldds.fisc ? 1 : 0, 0);
chk('barème : LDDS et LEP uniques par personne',
    (B.types.ldds.unique && B.types.lep.unique) ? 1 : 0, 1);
// Le plancher du Livret Jeune est le taux du Livret A, pas une valeur figée :
// il doit suivre les révisions du barème.
chk('barème : plancher du Livret Jeune', B.types.jeune.min, 'livretA');

// Un LDDS plein depuis l'an dernier, sur l'année entière. Rien de propre au
// type dans le calcul : c'est le même moteur que le Livret A, ce que ce cas
// vérifie chiffre en main.
const ldds = { type: 'ldds', mouvements: [{ d: '2025-01-01', m: 12000 }] };
chk('LDDS : acquis à 14 quinzaines', X._livAcquis(ldds).net, 12000 * 0.017 * 14 / 24);
chk('LDDS : projeté au 31 décembre', X._livProjete(ldds).net, 12000 * 0.017);
chk('LDDS : exonéré, net = brut',    X._livProjete(ldds).net, X._livProjete(ldds).brut);
chk('LDDS : plafond atteint',        X._livReste(ldds), 0);

// Un LEP à moitié rempli, alimenté en cours d'année : la quinzaine de départ
// compte autant que le taux.
const lep = { type: 'lep', mouvements: [{ d: '2026-05-05', m: 5000 }] };
chk('LEP : versé le 5 mai, 5 quinzaines acquises', X._livAcquis(lep).net, 5000 * 0.025 * 5 / 24);
chk('LEP : projeté sur 15 quinzaines',             X._livProjete(lep).net, 5000 * 0.025 * 15 / 24);
chk('LEP : reste à verser',                        X._livReste(lep), 5000);
chk('LEP : exonéré, net = brut', X._livAcquis(lep).net, X._livAcquis(lep).brut);

// La capitalisation passe le plafond chez tout le monde, compartiment ou pas :
// le solde est accepté et rémunéré au taux réglementé.
const lddsPlein = { type: 'ldds', mouvements: [{ d: '2025-01-01', m: 12204 }] };
chk('LDDS au-delà du plafond : rémunéré au taux du livret',
    X._livProjete(lddsPlein).brut, 12204 * 0.017);
chk('LDDS au-delà du plafond : reste à verser nul', X._livReste(lddsPlein), 0);
chk('LDDS au-delà du plafond : rien d’imposé',
    X._livProjete(lddsPlein).net, X._livProjete(lddsPlein).brut);

// ── Épargne logement : la fiscalité dépend de la date d'ouverture ───────────
//
// Règles vérifiées le 16/08 sur les sources publiques. Deux PEL identiques,
// l'un de 2015, l'autre de 2019, ne rendent pas le même net : le premier est
// exonéré d'impôt sur le revenu et ne supporte que les prélèvements sociaux ;
// le second subit le prélèvement forfaitaire dès le premier euro. Le PEL perd
// son exonération à douze ans, le CEL la garde.
const PS = 0.172, PFU = 0.314;

chk('régime : PEL de 2015 → prélèvements sociaux seuls',
    X._livRegime({ type: 'pel', ouverture: '2015-06-01' }, 2026, 14), 'ps');
chk('régime : PEL de 2019 → prélèvement forfaitaire',
    X._livRegime({ type: 'pel', ouverture: '2019-06-01' }, 2026, 14), 'pfu');
// La réforme vise les plans ouverts À COMPTER du 1er janvier 2018.
chk('régime : PEL du 31 décembre 2017 → encore l’ancien',
    X._livRegime({ type: 'pel', ouverture: '2017-12-31' }, 2026, 14), 'ps');
chk('régime : PEL du 1er janvier 2018 → le nouveau',
    X._livRegime({ type: 'pel', ouverture: '2018-01-01' }, 2026, 14), 'pfu');
chk('régime : CEL de 2015 → prélèvements sociaux seuls',
    X._livRegime({ type: 'cel', ouverture: '2015-06-01' }, 2026, 14), 'ps');
chk('régime : CEL de 2019 → prélèvement forfaitaire',
    X._livRegime({ type: 'cel', ouverture: '2019-06-01' }, 2026, 14), 'pfu');
chk('régime : Livret A → rien',
    X._livRegime({ type: 'livretA', ouverture: '2015-06-01' }, 2026, 14), 'exo');
chk('régime : livret bancaire → prélèvement forfaitaire, quelle que soit la date',
    X._livRegime({ type: 'bancaire', ouverture: '2010-06-01' }, 2026, 14), 'pfu');
// Sans date, on ne peut pas trancher : on retient le régime le moins flatteur,
// que le membre corrigera en datant son contrat.
chk('régime : PEL sans date d’ouverture → prélèvement forfaitaire',
    X._livRegime({ type: 'pel' }, 2026, 14), 'pfu');

// Le douzième anniversaire tombe en cours d'année : les intérêts d'avant
// restent exonérés d'impôt sur le revenu, ceux d'après ne le sont plus. Un PEL
// ouvert le 1er juillet 2014 a douze ans le 1er juillet 2026 — quinzaine 12.
const pel2014 = { type: 'pel', taux: 2, ouverture: '2014-07-01' };
chk('douze ans : quinzaine de juin encore exonérée', X._livRegime(pel2014, 2026, 10), 'ps');
chk('douze ans : quinzaine du 1er juillet imposée',  X._livRegime(pel2014, 2026, 12), 'pfu');
chk('douze ans : quinzaine du 16 juin encore exonérée', X._livRegime(pel2014, 2026, 11), 'ps');

chk('impôt : exonéré', X._livImpot('exo'), 0);
chk('impôt : prélèvements sociaux seuls', X._livImpot('ps'), PS);
// Le PFU de droit commun, à 31,4 % depuis 2026…
chk('impôt : prélèvement forfaitaire', X._livImpot('pfu', { type: 'bancaire' }), PFU);
// …mais l'épargne logement en a été exemptée et reste à 30 %. Les deux taux
// coexistent : c'est exactement ce que ce couple de cas verrouille.
chk('impôt : épargne logement épargnée par la hausse', X._livImpot('pfu', { type: 'pel' }), X.LIV_PFU_EL);
chk('impôt : les deux taux forfaitaires diffèrent', PFU === X.LIV_PFU_EL ? 1 : 0, 0);

// Chiffre en main. PEL de 2015, 20 000 € en place depuis l'an dernier, 2 % :
// tout l'acquis de l'année relève des prélèvements sociaux seuls.
const pelVieux = { type: 'pel', taux: 2, ouverture: '2015-06-01',
                   mouvements: [{ d: '2015-06-01', m: 20000 }] };
chk('PEL de 2015 : brut',  X._livAcquis(pelVieux).brut, 20000 * 0.02 * 14 / 24);
chk('PEL de 2015 : net à 17,2 %', X._livAcquis(pelVieux).net, 20000 * 0.02 * 14 / 24 * (1 - PS));

// Le même, ouvert en 2019 : le prélèvement forfaitaire s'applique, et le net
// perd 12,8 points de plus. À 30 % et non 31,4 : l'épargne logement a été
// exemptée de la hausse des prélèvements sociaux de 2026.
const pelNeuf = { type: 'pel', taux: 2, ouverture: '2019-06-01',
                  mouvements: [{ d: '2019-06-01', m: 20000 }] };
chk('PEL de 2019 : net à 30 %', X._livAcquis(pelNeuf).net, 20000 * 0.02 * 14 / 24 * (1 - X.LIV_PFU_EL));
chk('PEL de 2019 : moins net que celui de 2015',
    X._livAcquis(pelNeuf).net < X._livAcquis(pelVieux).net ? 1 : 0, 1);

// Année à cheval sur le douzième anniversaire : douze quinzaines aux
// prélèvements sociaux, deux au prélèvement forfaitaire.
const aCheval = Object.assign({}, pel2014, { mouvements: [{ d: '2014-07-01', m: 20000 }] });
chk('douze ans : acquis partagé entre les deux régimes',
    X._livAcquis(aCheval).net,
    20000 * 0.02 * 12 / 24 * (1 - PS) + 20000 * 0.02 * 2 / 24 * (1 - X.LIV_PFU_EL));

// Un relevé de banque est un brut global : on lui applique le taux moyen que
// le calcul établit, pas un régime choisi au hasard.
const pelReleve = Object.assign({}, pelVieux, { releve: { le: '2026-08-12', acquis: 100, projete: 200 } });
chk('PEL de 2015 : relevé net des seuls prélèvements sociaux',
    X._livAcquis(pelReleve).net, 100 * (1 - PS));

// CEL au taux réglementé — il ne se saisit plus, il vient du barème.
chk('barème : CEL à 1,25 %', B.types.cel.taux, 1.25);
chk('barème : CEL à 15 300 €', B.types.cel.plafond, 15300);
const cel2010 = { type: 'cel', ouverture: '2010-03-01', mouvements: [{ d: '2010-03-01', m: 10000 }] };
chk('CEL de 2010 : net des prélèvements sociaux',
    X._livProjete(cel2010).net, 10000 * 0.0125 * (1 - PS));
const cel2020 = { type: 'cel', ouverture: '2020-03-01', mouvements: [{ d: '2020-03-01', m: 10000 }] };
chk('CEL de 2020 : net du prélèvement forfaitaire',
    X._livProjete(cel2020).net, 10000 * 0.0125 * (1 - X.LIV_PFU_EL));
// Le CEL garde son exonération sans limite de durée : à seize ans, il est
// toujours au régime des prélèvements sociaux.
chk('CEL de 2010 : toujours exonéré d’impôt à seize ans',
    X._livRegime(cel2010, 2026, 23), 'ps');

// Un compartiment de dépassement reste au prélèvement forfaitaire même sur un
// contrat ancien : il n'est pas réglementé, c'est un produit de la banque.
const pelSur = { type: 'pel', taux: 2, ouverture: '2015-06-01', surTaux: 0.5, surPlafond: 20000,
                 mouvements: [{ d: '2015-06-01', m: 70000 }] };
chk('PEL ancien avec dépassement : deux régimes',
    X._livProjete(pelSur).net,
    61200 * 0.02 * (1 - PS) + 8800 * 0.005 * (1 - PFU));

console.log(t.join('\n'));
const ko = t.filter(x => x.startsWith('FAIL')).length;
console.log('\n' + (t.length - ko) + '/' + t.length + (ko ? '  >>> ECHEC' : '  >>> tout passe'));
process.exit(ko ? 1 : 0);
