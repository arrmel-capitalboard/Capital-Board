// Suite de tests de la projection PEA : le plafond de versement de 150 000 €.
//
// Ce que ça protège : la projection faisait rentrer des versements sans fin.
// À 500 €/mois, l'horizon 30 ans supposait 180 000 € d'apports, dont 30 000
// que la loi interdit. L'erreur ne se voyait qu'aux horizons longs — ceux
// qu'on regarde.
//
// La référence n'est pas un nombre recopié : chaque cas est comparé à une
// simulation mois par mois écrite ici, volontairement bête. Les formules
// fermées de `js/app.js` sont rapides mais faciles à écrire de travers d'un
// mois ; la simulation, elle, ne peut pas se tromper sur la règle.
//
// `js/app.js` est écrit pour le navigateur et touche au DOM dès le chargement :
// on en extrait la tranche de fonctions pures et on la compile seule — le test
// porte donc sur le code réellement livré, pas sur une copie.
const fs     = require('fs');
const path   = require('path');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function tranche(nom, ouvre, ferme) {
  const a = src.indexOf(ouvre), b = src.indexOf(ferme);
  if (a < 0 || b < 0 || b < a) {
    console.error('Bloc « ' + nom + ' » introuvable dans js/app.js — bornes déplacées ?');
    process.exit(1);
  }
  return src.slice(a, b);
}

// Les constantes viennent de la source, pas d'une copie : un plafond changé
// dans l'app doit se répercuter ici plutôt que faire diverger deux vérités.
const constantes = tranche('constantes', 'const LIVRET_A_RATE', '\n// Ce que l\'app sait déjà');
const calcul     = tranche('calcul', 'function projFv(', '\nfunction renderProjections()');

const mod = new module.constructor();
mod._compile(
  constantes + '\n' + calcul
  + '\nmodule.exports = { projFv, projApports, projContrib, projSerie, calcProjections,'
  + ' PROJ_HORIZONS, PEA_PLAFOND_VERSEMENTS, LIVRET_A_RATE };\n',
  'app-projections.js',
);
const P = mod.exports;

let ok = 0;
const t = (nom, fn) => {
  try { fn(); ok++; }
  catch (e) { console.error('✗ ' + nom + '\n  ' + e.message); process.exitCode = 1; }
};

// ── Référence : le même calcul, mois par mois ──────────────────────────────
// Chaque mois : le pot capitalise, puis on verse ce que le plafond permet
// encore. Convention de fin de mois, la même que les formules testées.
function simuler(monthly, tauxPct, plafond, mois) {
  const mr = tauxPct / 100 / 12;
  let pot = 0, verse = 0;
  for (let m = 1; m <= mois; m++) {
    pot *= (1 + mr);
    const v = Math.max(0, Math.min(monthly, plafond - verse));
    pot += v;
    verse += v;
  }
  return { pot, verse };
}

// ── Le plafond est bien celui du PEA ───────────────────────────────────────

t('le plafond de versement vaut 150 000 €', () => {
  assert.strictEqual(P.PEA_PLAFOND_VERSEMENTS, 150000);
});

// ── La formule fermée dit la même chose que la simulation ──────────────────

t('versements capitalisés : formule et simulation concordent', () => {
  let pire = 0, divergents = 0;
  for (const monthly of [0, 100, 500, 833.33, 2000, 150001])
    for (const taux of [-3, 0, 5, 7, 12])
      for (const plafond of [Infinity, 0, 1234, 90000, 150000])
        for (const annees of [1, 5, 10, 25, 30]) {
          const mois = annees * 12;
          const calc = P.projContrib(monthly, taux / 100 / 12, mois, plafond);
          const ref  = simuler(monthly, taux, plafond, mois).pot;
          const ecart = Math.abs(calc - ref) / Math.max(1, Math.abs(ref));
          if (ecart > 1e-9) divergents++;
          if (ecart > pire) pire = ecart;
        }
  assert.strictEqual(divergents, 0, divergents + ' cas divergents, écart max ' + pire.toExponential(2));
});

t('apports cumulés : formule et simulation concordent', () => {
  for (const monthly of [0, 100, 500, 833.33, 2000])
    for (const plafond of [Infinity, 0, 1234, 90000, 150000])
      for (const annees of [1, 10, 30]) {
        const mois = annees * 12;
        const calc = P.projApports(monthly, mois, plafond);
        const ref  = simuler(monthly, 5, plafond, mois).verse;
        // Tolérance relative : la simulation additionne 360 flottants, la
        // formule en multiplie deux. Les deux disent la même chose, pas au
        // même bit près.
        assert.ok(Math.abs(calc - ref) / Math.max(1, Math.abs(ref)) < 1e-12,
          `apports faux : ${monthly}/mois, plafond ${plafond}, ${annees} ans — ${calc} vs ${ref}`);
      }
});

// ── Le plafond mord, et seulement quand il doit ────────────────────────────

t('les apports ne dépassent jamais le plafond', () => {
  // 500 €/mois sur 30 ans, c'est 180 000 € : 30 000 de trop.
  assert.strictEqual(P.projApports(500, 30 * 12, 150000), 150000);
  assert.strictEqual(P.projApports(500, 25 * 12, 150000), 150000);
  // 25 ans pile, c'est le dernier horizon encore atteignable sans rogner.
  assert.strictEqual(P.projApports(500, 24 * 12, 150000), 144000);
});

t('un versement partiel finit le plafond, sans le dépasser', () => {
  // 7 000 € de reste à 2 000 €/mois : trois pleins puis 1 000 €.
  assert.strictEqual(P.projApports(2000, 12, 7000), 7000);
  const calc = P.projContrib(2000, 0.07 / 12, 12, 7000);
  const ref  = simuler(2000, 7, 7000, 12).pot;
  assert.ok(Math.abs(calc - ref) < 1e-6, `partiel mal capitalisé : ${calc} vs ${ref}`);
});

t('plafond déjà atteint : plus aucun versement, le capital travaille quand même', () => {
  assert.strictEqual(P.projApports(500, 360, 0), 0);
  assert.strictEqual(P.projContrib(500, 0.07 / 12, 360, 0), 0);
  // La base, elle, continue de capitaliser : c'est la série complète qui le dit.
  const serie = P.projSerie(100000, 500, 7, 0);
  const dix = serie[P.PROJ_HORIZONS.indexOf(10)];
  assert.ok(Math.abs(dix - 100000 * Math.pow(1.07, 10)) < 0.01,
    'le capital de départ doit continuer de croître : ' + dix);
});

t('sans plafond, rien ne change pour le compte-titres', () => {
  const mr = 0.07 / 12;
  assert.ok(Math.abs(P.projContrib(500, mr, 360, Infinity) - P.projFv(500, mr, 360)) < 1e-9);
  // 30 ans à 500 €/mois : les 180 000 € d'apports entrent tous.
  assert.strictEqual(P.projApports(500, 360, Infinity), 180000);
});

t('un apport nul ou négatif ne produit rien', () => {
  assert.strictEqual(P.projContrib(0, 0.07 / 12, 360, 150000), 0);
  assert.strictEqual(P.projApports(0, 360, 150000), 0);
});

t('un rendement nul ne divise pas par zéro', () => {
  assert.strictEqual(P.projContrib(500, 0, 120, Infinity), 60000);
  assert.strictEqual(P.projContrib(500, 0, 360, 150000), 150000);
});

// ── Le tableau rendu à l'écran reste cohérent ──────────────────────────────

t('plus-values = central − apports, plafond compris', () => {
  const data = P.calcProjections(50000, 500, 7, 2, 100000);
  for (const r of data) {
    assert.ok(Math.abs(r.plusValues - (r.central - r.apports)) < 0.02,
      `incohérent à ${r.years} ans : ${r.plusValues} ≠ ${r.central} − ${r.apports}`);
    assert.ok(r.apports <= 50000 + 100000 + 1e-9,
      `apports hors plafond à ${r.years} ans : ${r.apports}`);
    assert.ok(r.bas <= r.central + 1e-6 && r.central <= r.haut + 1e-6,
      `fourchette désordonnée à ${r.years} ans`);
  }
});

t('le plafond rabote bien la trajectoire aux horizons longs', () => {
  const sans = P.calcProjections(0, 500, 7, 2, Infinity);
  const avec = P.calcProjections(0, 500, 7, 2, 150000);
  const idx5  = P.PROJ_HORIZONS.indexOf(5);
  const idx30 = P.PROJ_HORIZONS.indexOf(30);
  // À 5 ans, 30 000 € versés : le plafond ne mord pas encore.
  assert.ok(Math.abs(sans[idx5].central - avec[idx5].central) < 1e-6, 'le plafond mord trop tôt');
  // À 30 ans, il manque 30 000 € de versements : la trajectoire doit baisser.
  assert.ok(avec[idx30].central < sans[idx30].central, 'le plafond ne mord pas à 30 ans');
});

t('le Livret A de comparaison garde son propre régime', () => {
  // Il sert de repère et a son propre plafond, sans rapport : la borne du PEA
  // ne doit pas le rogner, sinon la comparaison flatte le PEA.
  const avec = P.calcProjections(0, 500, 7, 2, 150000);
  const sans = P.calcProjections(0, 500, 7, 2, Infinity);
  for (let i = 0; i < avec.length; i++) {
    assert.ok(Math.abs(avec[i].livretA - sans[i].livretA) < 1e-9,
      'la ligne Livret A a changé avec le plafond du PEA');
  }
});

if (process.exitCode) console.error('\n✗ Projections : des cas ont échoué.');
else console.log('✓ Projections : ' + ok + ' cas passent (plafond de versement PEA).');
