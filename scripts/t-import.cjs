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

// ── Voie PDF ────────────────────────────────────────────────────────────────
// pdf.js n'est pas chargé ici : seule l'analyse est testée, sur les lignes
// telles que getTextContent() les rend une fois regroupées par ordonnée.
const P = CB.pdf;

// Fabrique une ligne : chaque fragment est [texte, x, largeur].
const L = (frags) => ({ y: 0, page: 1, items: frags.map(f => ({ str: f[0], x: f[1], w: f[2] })) });

// Relevé à quatre colonnes : Date, Libellé, Débit, Crédit, Solde.
const entete = L([['Date', 40, 24], ['Libellé', 90, 34], ['Débit', 300, 28],
                  ['Crédit', 380, 32], ['Solde', 460, 28]]);
const pdfCic = [
  entete,
  L([['06/08/2026', 40, 48], ['Vir De M Armel Plantier', 90, 120], ['735,00', 366, 32], ['850,00', 446, 32]]),
  L([['06/08/2026', 40, 48], ['Vir C/C Contrat Personnel', 90, 130], ['105,00', 286, 32], ['115,00', 446, 32]]),
  L([['Report à nouveau', 90, 90], ['220,00', 446, 32]]),
  L([['Page 1 sur 2', 250, 60]]),
];
const rP = P.analyser(pdfCic);
chk('PDF : lignes sans date écartées', rP.length, 2);
chk('PDF : crédit positif',  rP[0].m, 735);
chk('PDF : débit négatif',   rP[1].m, -105);
chk('PDF : solde ignoré',    rP.every(r => Math.abs(r.m) !== 850 && Math.abs(r.m) !== 115), true);
chk('PDF : libellé reconstitué', rP[0].label, 'Vir De M Armel Plantier');

// Colonne montant unique, signe porté par le nombre.
const pdfMontant = [
  L([['Date', 40, 24], ['Libellé', 90, 34], ['Montant', 360, 40]]),
  L([['04/07/2026', 40, 48], ['Virement recu', 90, 70], ['250,00', 356, 32]]),
  L([['18/07/2026', 40, 48], ['Retrait', 90, 40], ['-100,00', 350, 38]]),
];
const rM = P.analyser(pdfMontant);
chk('PDF : colonne montant unique', rM.map(r => r.m), [250, -100]);

// Sans entête du tout : le premier nombre de la ligne fait foi.
const pdfBrut = [
  L([['06/08/2026', 40, 48], ['Virement', 90, 50], ['735,00', 300, 32], ['850,00', 400, 32]]),
];
chk('PDF : sans entête, premier nombre', P.analyser(pdfBrut)[0].m, 735);

// Montant éclaté en deux fragments par le moteur de rendu.
const frag = P._montantsDe([{ str: '1', x: 300, w: 6 }, { str: '234,56', x: 306, w: 34 }]);
chk('PDF : fragments recollés', frag.length, 1);
chk('PDF : valeur recollée',   frag[0].v, 1234.56);

// Une date n'est pas un montant, même si elle en a l'air.
chk('PDF : date ignorée comme montant',
  P._montantsDe([{ str: '06/08/2026', x: 40, w: 48 }]).length, 0);

// Regroupement par ordonnée : deux fragments à la même hauteur font une ligne.
const groupes = P._lignesDePage([
  { str: 'a', transform: [1, 0, 0, 1, 40, 700], width: 8 },
  { str: 'b', transform: [1, 0, 0, 1, 90, 701], width: 8 },
  { str: 'c', transform: [1, 0, 0, 1, 40, 680], width: 8 },
], 1);
chk('PDF : deux lignes distinctes', groupes.length, 2);
chk('PDF : fragments regroupés',    groupes[0].items.length, 2);
chk('PDF : haut de page en premier', groupes[0].items[0].str, 'a');

// ── Voie OCR ────────────────────────────────────────────────────────────────
// tesseract.js n'est pas chargé : on lui donne le texte qu'il rendrait, et on
// vérifie l'analyse. Date figée pour que « 06 août » soit reproductible.
const O = CB.ocr;
const LE13AOUT = new Date('2026-08-13T12:00:00');

// Le cas réel : capture de l'appli CIC. Aucune date par ligne, un en-tête de
// groupe, le libellé au-dessus du montant.
const capture = [
  '06 août',
  'Vir De M Armel Plantier',
  'Virements internes',
  '+ 735,00 €',
  '01 août',
  'Nouveau Taux Du Livret Jeune',
  'Hors budget, divers',
  '+ 0,00 €',
  '30 juillet',
  'Vir C/C Contrat Personnel Parcours',
  'Virements internes',
  '- 150,00 €',
].join('\n');
const rO = O.analyserTexte(capture, LE13AOUT);
chk('OCR : ligne à 0 € écartée', rO.length, 2);
chk('OCR : date héritée du groupe', rO[0].d, '2026-08-06');
chk('OCR : versement positif',     rO[0].m, 735);
chk('OCR : libellé pris au-dessus', rO[0].label, 'Vir De M Armel Plantier');
chk('OCR : « Virements internes » écarté',
  rO[0].label.indexOf('Virements internes'), -1);
chk('OCR : retrait négatif', rO[1].m, -150);
chk('OCR : date du second groupe', rO[1].d, '2026-07-30');

// En-têtes de date sous toutes leurs formes.
chk('OCR : jour et mois',        O.enTeteDate('06 août', LE13AOUT), '2026-08-06');
chk('OCR : mois abrégé',         O.enTeteDate('06 janv.', LE13AOUT), '2026-01-06');
chk('OCR : année explicite',     O.enTeteDate('31 décembre 2025', LE13AOUT), '2025-12-31');
chk('OCR : date au format jj/mm/aaaa', O.enTeteDate('06/08/2026', LE13AOUT), '2026-08-06');
// Une date qui tombe après aujourd'hui appartient à l'année précédente : un
// relevé ne parle jamais du futur.
chk('OCR : décembre est celui d’avant', O.enTeteDate('20 décembre', LE13AOUT), '2025-12-20');
chk('OCR : libellé n’est pas une date', O.enTeteDate('Vir De M Armel Plantier', LE13AOUT), null);

// Signes malmenés par l'OCR : U+2212 et le tiret demi-cadratin.
chk('OCR : signe moins Unicode',
  O.analyserTexte('06 août\nRetrait\n− 105,00 €', LE13AOUT)[0].m, -105);
chk('OCR : tiret demi-cadratin',
  O.analyserTexte('06 août\nRetrait\n– 105,00 €', LE13AOUT)[0].m, -105);

// Confusions de caractères sur les chiffres.
chk('OCR : O lu pour zéro',  O._redresser('1O5,OO €'), '105,00 €');
chk('OCR : mot sans chiffre intact', O._redresser('Solde'), 'Solde');
chk('OCR : mot mêlé laissé tel quel', O._redresser('Vir C/C 2026'), 'Vir C/C 2026');

// Capture rognée : une opération lue avant tout en-tête garde la date du jour
// plutôt que d'être perdue.
const rognee = O.analyserTexte('Vir De M Armel Plantier\n+ 200,00 €', LE13AOUT);
chk('OCR : sans en-tête, date du jour', rognee[0].d, '2026-08-13');
chk('OCR : sans en-tête, montant gardé', rognee[0].m, 200);

// Montant et libellé sur la même ligne — mise en page de tablette.
chk('OCR : libellé sur la ligne du montant',
  O.analyserTexte('06 août\nVir De M Armel Plantier + 735,00 €', LE13AOUT)[0].label,
  'Vir De M Armel Plantier');

console.log(t.join('\n'));
const ko = t.filter(x => x.startsWith('FAIL')).length;
console.log('\n' + (t.length - ko) + '/' + t.length + (ko ? '  >>> ECHEC' : '  >>> tout passe'));
process.exit(ko ? 1 : 0);
