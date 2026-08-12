// Suite de tests du parseur de relevés (js/import.js), voie CSV.
//
// Le fichier est écrit pour le navigateur : on lui pose un `window` minimal
// avant de le charger. Aucun test ne touche au DOM — seules les fonctions
// pures du parseur sont exercées.
const fs = require('fs');
const path = require('path');

global.window = {};
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'import.js'), 'utf8');
const mod = new module.constructor();
mod._compile(src, 'import.js');
const CB = global.window.CBImport;
const C  = CB.csv;

const t = [];
const chk = (l, a, b) => {
  const ok = (typeof a === 'number' && typeof b === 'number')
    ? Math.abs(a - b) < 0.005
    : JSON.stringify(a) === JSON.stringify(b);
  t.push((ok ? 'ok  ' : 'FAIL') + '  ' + l +
    (ok ? '' : '\n        obtenu  ' + JSON.stringify(a) + '\n        attendu ' + JSON.stringify(b)));
};

// ── Montants ────────────────────────────────────────────────────────────────
chk('montant simple',        C.parseMontant('123,45'), 123.45);
chk('point décimal',         C.parseMontant('123.45'), 123.45);
chk('négatif',               C.parseMontant('-1 234,56'), -1234.56);
chk('insécable U+00A0',      C.parseMontant('1 234,56'), 1234.56);
chk('insécable fine U+202F', C.parseMontant('1 234,56'), 1234.56);
chk('milliers à la française',C.parseMontant('1.234,56'), 1234.56);
chk('milliers à l’anglaise', C.parseMontant('1,234.56'), 1234.56);
chk('parenthèses = négatif', C.parseMontant('(120,00)'), -120);
chk('symbole euro',          C.parseMontant('850,00 €'), 850);
chk('vide → NaN',            Number.isNaN(C.parseMontant('')), true);
chk('texte → NaN',           Number.isNaN(C.parseMontant('Libellé')), true);
chk('zéro reste zéro',       C.parseMontant('0,00'), 0);

// ── Dates ───────────────────────────────────────────────────────────────────
chk('jj/mm/aaaa',   C.parseDate('06/08/2026'), '2026-08-06');
chk('jj-mm-aaaa',   C.parseDate('06-08-2026'), '2026-08-06');
chk('jj.mm.aa',     C.parseDate('06.08.26'),   '2026-08-06');
chk('déjà ISO',     C.parseDate('2026-08-06'), '2026-08-06');
chk('jour avant mois', C.parseDate('03/04/2026'), '2026-04-03');
chk('date absurde → null', C.parseDate('32/13/2026'), null);
chk('texte → null',        C.parseDate('Libellé'), null);

// ── CSV type CIC : débit et crédit en deux colonnes, séparateur ; ───────────
const cic = [
  'Date;Date de valeur;Débit;Crédit;Libellé;Solde',
  '06/08/2026;06/08/2026;;735,00;Vir De M Armel Plantier;850,00',
  '06/08/2026;06/08/2026;105,00;;Vir C/C Contrat Personnel Parcours;115,00',
  '01/08/2026;01/08/2026;;0,00;Nouveau Taux Du Livret Jeune;220,00',
  '30/07/2026;30/07/2026;150,00;;Vir C/C Contrat Personnel Parcours;220,00',
].join('\n');
const rCic = C.analyser(cic);
chk('CIC : ligne à 0 € écartée', rCic.length, 3);
chk('CIC : crédit positif',  rCic.find(r => r.m > 0).m, 735);
chk('CIC : débit négatif',   rCic.filter(r => r.m < 0).map(r => r.m), [-105, -150]);
// analyser() rend les lignes dans l'ordre du fichier — un relevé descend du
// plus récent. C'est le socle qui trie, une fois pour les trois voies.
chk('CIC : ordre du fichier conservé', rCic.map(r => r.d),
  ['2026-08-06', '2026-08-06', '2026-07-30']);
chk('CIC : libellé conservé', rCic.find(r => r.m === 735).label, 'Vir De M Armel Plantier');

// ── Colonne montant unique, séparateur virgule ──────────────────────────────
const unique = [
  'Date,Libelle,Montant',
  '2026-01-06,Virement recu,900.00',
  '2026-01-17,Retrait,-50.00',
].join('\n');
const rU = C.analyser(unique);
chk('montant unique : 2 lignes', rU.length, 2);
chk('montant unique : signes',   rU.map(r => r.m), [900, -50]);

// ── Séparateur au milieu d’un libellé entre guillemets ──────────────────────
const guill = [
  'Date;Libellé;Montant',
  '06/08/2026;"Vir De M Armel Plantier; solde";735,00',
].join('\n');
chk('guillemets : libellé entier',
  C.analyser(guill)[0].label, 'Vir De M Armel Plantier; solde');
chk('guillemets : montant intact', C.analyser(guill)[0].m, 735);

// ── Préambule avant l’entête ────────────────────────────────────────────────
const preambule = [
  'Compte;Livret Jeune',
  'IBAN;FR76 XXXX',
  'Période;du 01/01/2026 au 13/08/2026',
  '',
  'Date;Libellé;Montant',
  '04/07/2026;Vir De M Armel Plantier;250,00',
].join('\n');
chk('préambule ignoré', C.analyser(preambule).length, 1);
chk('préambule : montant', C.analyser(preambule)[0].m, 250);

// ── Sans entête du tout : détection par le contenu ──────────────────────────
const brut = [
  '06/08/2026;Vir De M Armel Plantier;735,00',
  '30/07/2026;Vir C/C Contrat Personnel;-150,00',
  '18/07/2026;Vir C/C Contrat Personnel;-100,00',
].join('\n');
const rB = C.analyser(brut);
chk('sans entête : 3 lignes', rB.length, 3);
chk('sans entête : montants', rB.map(r => r.m).sort((a, b) => a - b), [-150, -100, 735]);
chk('sans entête : libellé deviné', rB.find(r => r.m === 735).label, 'Vir De M Armel Plantier');

// ── Tabulation ──────────────────────────────────────────────────────────────
const tab = 'Date\tLibellé\tMontant\n06/08/2026\tVirement\t735,00';
chk('séparateur tabulation', C.analyser(tab)[0].m, 735);

// ── Robustesse ──────────────────────────────────────────────────────────────
chk('fichier vide',        C.analyser(''), []);
chk('une seule ligne',     C.analyser('Date;Montant'), []);
chk('que du texte',        C.analyser('bonjour\nau revoir'), []);

// ── Le vrai cas : 47 opérations rejouées, solde attendu 499,16 € ────────────
const reel = ['Date;Libellé;Débit;Crédit'].concat([
  ['06/01/2026', 'Vir De M Armel Plantier', '', '900,00'],
  ['17/01/2026', 'Vir C/C Contrat Personnel Parcours', '50,00', ''],
  ['19/01/2026', 'Vir C/C Contrat Personnel Parcours', '200,00', ''],
  ['26/01/2026', 'Vir C/C Contrat Personnel Parcours', '100,00', ''],
  ['27/01/2026', 'Vir C/C Contrat Personnel Parcours', '50,00', ''],
  ['02/02/2026', 'Vir C/C Contrat Personnel Parcours', '100,00', ''],
  ['03/02/2026', 'Vir De M Armel Plantier', '', '100,00'],
  ['03/02/2026', 'Vir De M Armel Plantier', '', '700,00'],
  ['04/02/2026', 'Vir C/C Contrat Personnel Parcours', '60,00', ''],
  ['14/02/2026', 'Vir C/C Contrat Personnel Parcours', '90,00', ''],
  ['02/03/2026', 'Vir C/C Contrat Personnel Parcours', '60,00', ''],
  ['03/03/2026', 'Vir De M Armel Plantier', '', '259,16'],
  ['31/03/2026', 'Vir C/C Contrat Personnel Parcours', '200,00', ''],
  ['31/03/2026', 'Vir C/C Contrat Personnel Parcours', '200,00', ''],
  ['31/03/2026', 'Vir C/C Contrat Personnel Parcours', '200,00', ''],
  ['03/04/2026', 'Vir De M Armel Plantier', '', '150,00'],
  ['03/04/2026', 'Vir De M Armel Plantier', '', '250,00'],
  ['03/04/2026', 'Vir De M Armel Plantier', '', '200,00'],
  ['16/04/2026', 'Vir C/C Contrat Personnel Parcours', '1590,00', ''],
  ['05/05/2026', 'Vir C/C Contrat Personnel Parcours', '450,00', ''],
  ['05/05/2026', 'Vir C/C Contrat Personnel Parcours', '60,00', ''],
  ['05/05/2026', 'Vir De M Armel Plantier', '', '990,00'],
  ['08/05/2026', 'Vir De M Armel Plantier', '', '100,00'],
  ['13/05/2026', 'Vir De M Armel Plantier', '', '110,00'],
  ['15/05/2026', 'Vir De M Armel Plantier', '', '100,00'],
  ['17/05/2026', 'Vir C/C Contrat Personnel Parcours', '50,00', ''],
  ['27/05/2026', 'Vir C/C Contrat Personnel Parcours', '100,00', ''],
  ['28/05/2026', 'Vir C/C Contrat Personnel Parcours', '600,00', ''],
  ['29/05/2026', 'Vir De M Armel Plantier', '', '400,00'],
  ['29/05/2026', 'Vir De M Armel Plantier', '', '200,00'],
  ['05/06/2026', 'Vir De M Armel Plantier', '', '20,00'],
  ['05/06/2026', 'Vir De M Armel Plantier', '', '140,00'],
  ['05/06/2026', 'Vir De M Armel Plantier', '', '100,00'],
  ['05/06/2026', 'Vir C/C Contrat Personnel Parcours', '640,00', ''],
  ['05/06/2026', 'Vir De M Armel Plantier', '', '400,00'],
  ['05/06/2026', 'Vir C/C Contrat Personnel Parcours', '400,00', ''],
  ['11/06/2026', 'Vir De M Armel Plantier', '', '200,00'],
  ['11/06/2026', 'Vir C/C Contrat Personnel Parcours', '200,00', ''],
  ['17/06/2026', 'Vir C/C Contrat Personnel Parcours', '250,00', ''],
  ['20/06/2026', 'Vir C/C Contrat Personnel Parcours', '100,00', ''],
  ['20/06/2026', 'Vir De M Armel Plantier', '', '100,00'],
  ['04/07/2026', 'Vir De M Armel Plantier', '', '250,00'],
  ['18/07/2026', 'Vir C/C Contrat Personnel Parcours', '100,00', ''],
  ['30/07/2026', 'Vir C/C Contrat Personnel Parcours', '150,00', ''],
  ['06/08/2026', 'Vir De M Armel Plantier', '', '735,00'],
  ['06/08/2026', 'Vir De M Armel Plantier', '', '200,00'],
  ['06/08/2026', 'Vir C/C Contrat Personnel Parcours', '105,00', ''],
].map(r => r.join(';'))).join('\n');

const rReel = C.analyser(reel);
chk('cas réel : 47 opérations', rReel.length, 47);
chk('cas réel : somme 499,16 €',
  Math.round(rReel.reduce((s, r) => s + r.m, 0) * 100) / 100, 499.16);
chk('cas réel : premier mouvement', rReel[0].d, '2026-01-06');
chk('cas réel : dernier mouvement', rReel[rReel.length - 1].d, '2026-08-06');
chk('cas réel : rien à zéro', rReel.every(r => r.m !== 0), true);

console.log(t.join('\n'));
const ko = t.filter(x => x.startsWith('FAIL')).length;
console.log('\n' + (t.length - ko) + '/' + t.length + (ko ? '  >>> ECHEC' : '  >>> tout passe'));
process.exit(ko ? 1 : 0);
