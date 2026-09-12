// Suite de tests de l'import/export CSV des versements (js/app.js).
//
// Le parseur de versements ne relit pas les dates et les montants lui-même :
// il emprunte ceux du parseur de relevés (js/import.js). Les deux fichiers
// sont donc chargés ensemble ici, comme dans le navigateur — un test qui
// bouchonnerait le parseur ne dirait rien du vrai comportement.
//
// js/app.js touche au DOM dès le chargement : on n'en extrait que la tranche
// de fonctions pures, repérée par ses bornes.
const fs   = require('fs');
const path = require('path');

global.window = {};
const modImport = new module.constructor();
modImport._compile(fs.readFileSync(path.join(__dirname, '..', 'js', 'import.js'), 'utf8'), 'import.js');
const CSV = global.window.CBImport.csv;

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const a = src.indexOf('function _cleVersement(v) {');
const b = src.indexOf('\nasync function importVersementsCSV(');
if (a < 0 || b < 0 || b < a) {
  console.error('Bloc des versements introuvable dans js/app.js — bornes déplacées ?');
  process.exit(1);
}
const mod = new module.constructor();
mod._compile(src.slice(a, b) +
  '\nmodule.exports = { _cleVersement, _versementsAAjouter, parseVersementsCSV };\n', 'app-versements.js');
const A = mod.exports;

// Le parseur est injecté explicitement : en test il n'y a pas de `window`
// applicatif, et on veut exercer le vrai CSV de js/import.js.
const lire = (texte) => A.parseVersementsCSV(texte, CSV);

const t = [];
const chk = (l, x, y) => {
  const ok = (typeof x === 'number' && typeof y === 'number')
    ? Math.abs(x - y) < 0.005
    : JSON.stringify(x) === JSON.stringify(y);
  t.push((ok ? 'ok  ' : 'FAIL') + '  ' + l +
    (ok ? '' : '\n        obtenu  ' + JSON.stringify(x) + '\n        attendu ' + JSON.stringify(y)));
};

// Reproduit exactement ce qu'écrit exportVersementsCSV : c'est le contrat de
// l'aller-retour, et le test casse si le format d'export change sans l'import.
const exporte = (versements) => 'Date,Montant\n' + [...versements]
  .sort((x, y) => (x.date || '').localeCompare(y.date || ''))
  .map(v => v.date + ',' + v.amount.toFixed(2)).join('\n');

// ── L'aller-retour export → import ─────────────────────────────────────────
{
  const miens = [
    { amount: 1000,   date: '2026-01-15' },
    { amount: 250.5,  date: '2026-03-02' },
    { amount: 42.42,  date: '2026-02-20' },
  ];
  const relu = lire(exporte(miens));
  chk('aller-retour : tout revient', relu.versements,
      [{ amount: 1000, date: '2026-01-15' },
       { amount: 42.42, date: '2026-02-20' },
       { amount: 250.5, date: '2026-03-02' }]);
  chk('aller-retour : seul l’en-tête est écarté', relu.ignorees, 1);
  chk('aller-retour : total conservé',
      relu.versements.reduce((s, v) => s + v.amount, 0), 1292.92);
  // Réimporter son propre export ne doit rien ajouter.
  chk('réimport du même fichier → rien à ajouter',
      A._versementsAAjouter(miens, relu.versements).length, 0);
}

// ── Formats acceptés ───────────────────────────────────────────────────────
chk('date française',        lire('15/01/2026,1000').versements, [{ amount: 1000, date: '2026-01-15' }]);
chk('date ISO',              lire('2026-01-15,1000').versements, [{ amount: 1000, date: '2026-01-15' }]);
chk('date à deux chiffres',  lire('15/01/26,1000').versements,   [{ amount: 1000, date: '2026-01-15' }]);
chk('séparateur point-virgule', lire('15/01/2026;1000').versements, [{ amount: 1000, date: '2026-01-15' }]);
chk('séparateur tabulation', lire('15/01/2026\t1000').versements, [{ amount: 1000, date: '2026-01-15' }]);
chk('décimale à la virgule', lire('15/01/2026;1000,50').versements, [{ amount: 1000.5, date: '2026-01-15' }]);
chk('espace insécable',      lire('15/01/2026;1 234,56').versements, [{ amount: 1234.56, date: '2026-01-15' }]);
chk('symbole euro',          lire('15/01/2026;1000,00 €').versements, [{ amount: 1000, date: '2026-01-15' }]);
chk('champs entre guillemets', lire('"15/01/2026","1000,50"').versements, [{ amount: 1000.5, date: '2026-01-15' }]);
chk('montant avant la date', lire('1000;15/01/2026').versements, [{ amount: 1000, date: '2026-01-15' }]);
chk('colonnes en trop ignorées',
    lire('15/01/2026;1000;Virement SEPA;PEA').versements, [{ amount: 1000, date: '2026-01-15' }]);
chk('arrondi au centime',    lire('15/01/2026;100,005').versements, [{ amount: 100.01, date: '2026-01-15' }]);
chk('fins de ligne Windows',
    lire('Date,Montant\r\n15/01/2026,100\r\n16/01/2026,200').versements.length, 2);

// ── Ce qui est écarté ──────────────────────────────────────────────────────
chk('en-tête seul',        lire('Date,Montant'), { versements: [], ignorees: 1 });
chk('fichier vide',        lire(''),             { versements: [], ignorees: 0 });
chk('texte absent',        lire(undefined),      { versements: [], ignorees: 0 });
chk('lignes blanches sautées', lire('15/01/2026,100\n\n\n16/01/2026,200').versements.length, 2);
// Un apport est positif : la saisie manuelle refuse déjà le reste, et un
// montant négatif serait un retrait — que le modèle ne connaît pas.
chk('montant négatif écarté', lire('15/01/2026,-100'), { versements: [], ignorees: 1 });
chk('montant nul écarté',     lire('15/01/2026,0'),    { versements: [], ignorees: 1 });
chk('ligne sans date écartée', lire('Virement,100'),   { versements: [], ignorees: 1 });
chk('ligne sans montant écartée', lire('15/01/2026,Virement'), { versements: [], ignorees: 1 });
chk('date impossible écartée', lire('32/13/2026,100'), { versements: [], ignorees: 1 });
chk('le bon grain et l’ivraie',
    lire('Date,Montant\n15/01/2026,100\nligne cassée\n16/01/2026,200'),
    { versements: [{ amount: 100, date: '2026-01-15' }, { amount: 200, date: '2026-01-16' }], ignorees: 2 });

// ── La fusion : ajouter sans écraser ni doubler ────────────────────────────
const V = (date, amount) => ({ date, amount });

chk('liste vide : tout est ajouté',
    A._versementsAAjouter([], [V('2026-01-15', 100), V('2026-02-15', 200)]).length, 2);
chk('rien à importer', A._versementsAAjouter([V('2026-01-15', 100)], []).length, 0);
chk('déjà présent → ignoré',
    A._versementsAAjouter([V('2026-01-15', 100)], [V('2026-01-15', 100)]).length, 0);
chk('recouvrement partiel : seul le nouveau passe',
    A._versementsAAjouter([V('2026-01-15', 100)], [V('2026-01-15', 100), V('2026-02-15', 200)]),
    [V('2026-02-15', 200)]);
chk('même date, montant différent → ajouté',
    A._versementsAAjouter([V('2026-01-15', 100)], [V('2026-01-15', 150)]).length, 1);
chk('même montant, date différente → ajouté',
    A._versementsAAjouter([V('2026-01-15', 100)], [V('2026-02-15', 100)]).length, 1);

// Le point délicat : deux virements identiques le même jour sont deux
// versements réels. Un `Set` en aurait perdu un.
chk('doublon légitime conservé',
    A._versementsAAjouter([], [V('2026-01-15', 100), V('2026-01-15', 100)]).length, 2);
chk('un existant n’absorbe qu’un seul import identique',
    A._versementsAAjouter([V('2026-01-15', 100)], [V('2026-01-15', 100), V('2026-01-15', 100)]).length, 1);
chk('deux existants absorbent deux imports',
    A._versementsAAjouter([V('2026-01-15', 100), V('2026-01-15', 100)],
                          [V('2026-01-15', 100), V('2026-01-15', 100)]).length, 0);
chk('comparaison au centime, pas au flottant',
    A._versementsAAjouter([V('2026-01-15', 100.005)], [V('2026-01-15', 100.01)]).length, 0);

// ── Sortie ──────────────────────────────────────────────────────────────────
console.log(t.join('\n'));
const ko = t.filter(l => l.startsWith('FAIL')).length;
console.log('\n' + (t.length - ko) + '/' + t.length + ' tests passés.');
process.exit(ko ? 1 : 0);
