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

// Les parseurs rendent { lignes, taux } : un relevé porte des opérations, et
// parfois ses propres révisions de taux. La plupart des cas ne s'intéressent
// qu'aux opérations — d'où ces trois raccourcis.
const anaC = (s)    => C.analyser(s).lignes;
const anaP = (l)    => CB.pdf.analyser(l).lignes;
const anaO = (s, d) => CB.ocr.analyserTexte(s, d).lignes;

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
const rCic = anaC(cic);
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
const rU = anaC(unique);
chk('montant unique : 2 lignes', rU.length, 2);
chk('montant unique : signes',   rU.map(r => r.m), [900, -50]);

// ── Séparateur au milieu d’un libellé entre guillemets ──────────────────────
const guill = [
  'Date;Libellé;Montant',
  '06/08/2026;"Vir De M Armel Plantier; solde";735,00',
].join('\n');
chk('guillemets : libellé entier',
  anaC(guill)[0].label, 'Vir De M Armel Plantier; solde');
chk('guillemets : montant intact', anaC(guill)[0].m, 735);

// ── Préambule avant l’entête ────────────────────────────────────────────────
const preambule = [
  'Compte;Livret Jeune',
  'IBAN;FR76 XXXX',
  'Période;du 01/01/2026 au 13/08/2026',
  '',
  'Date;Libellé;Montant',
  '04/07/2026;Vir De M Armel Plantier;250,00',
].join('\n');
chk('préambule ignoré', anaC(preambule).length, 1);
chk('préambule : montant', anaC(preambule)[0].m, 250);

// ── Sans entête du tout : détection par le contenu ──────────────────────────
const brut = [
  '06/08/2026;Vir De M Armel Plantier;735,00',
  '30/07/2026;Vir C/C Contrat Personnel;-150,00',
  '18/07/2026;Vir C/C Contrat Personnel;-100,00',
].join('\n');
const rB = anaC(brut);
chk('sans entête : 3 lignes', rB.length, 3);
chk('sans entête : montants', rB.map(r => r.m).sort((a, b) => a - b), [-150, -100, 735]);
chk('sans entête : libellé deviné', rB.find(r => r.m === 735).label, 'Vir De M Armel Plantier');

// ── Tabulation ──────────────────────────────────────────────────────────────
const tab = 'Date\tLibellé\tMontant\n06/08/2026\tVirement\t735,00';
chk('séparateur tabulation', anaC(tab)[0].m, 735);

// ── Robustesse ──────────────────────────────────────────────────────────────
chk('fichier vide',        anaC(''), []);
chk('une seule ligne',     anaC('Date;Montant'), []);
chk('que du texte',        anaC('bonjour\nau revoir'), []);

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

const rReel = anaC(reel);
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
const rP = anaP(pdfCic);
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
const rM = anaP(pdfMontant);
chk('PDF : colonne montant unique', rM.map(r => r.m), [250, -100]);

// Sans entête du tout : le premier nombre de la ligne fait foi.
const pdfBrut = [
  L([['06/08/2026', 40, 48], ['Virement', 90, 50], ['735,00', 300, 32], ['850,00', 400, 32]]),
];
chk('PDF : sans entête, premier nombre', anaP(pdfBrut)[0].m, 735);

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
const rO = anaO(capture, LE13AOUT);
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
  anaO('06 août\nRetrait\n− 105,00 €', LE13AOUT)[0].m, -105);
chk('OCR : tiret demi-cadratin',
  anaO('06 août\nRetrait\n– 105,00 €', LE13AOUT)[0].m, -105);

// Confusions de caractères sur les chiffres.
chk('OCR : O lu pour zéro',  O._redresser('1O5,OO €'), '105,00 €');
chk('OCR : mot sans chiffre intact', O._redresser('Solde'), 'Solde');
chk('OCR : mot mêlé laissé tel quel', O._redresser('Vir C/C 2026'), 'Vir C/C 2026');

// Capture rognée : une opération lue avant tout en-tête garde la date du jour
// plutôt que d'être perdue.
const rognee = anaO('Vir De M Armel Plantier\n+ 200,00 €', LE13AOUT);
chk('OCR : sans en-tête, date du jour', rognee[0].d, '2026-08-13');
chk('OCR : sans en-tête, montant gardé', rognee[0].m, 200);

// Montant et libellé sur la même ligne — mise en page de tablette.
chk('OCR : libellé sur la ligne du montant',
  anaO('06 août\nVir De M Armel Plantier + 735,00 €', LE13AOUT)[0].label,
  'Vir De M Armel Plantier');

// ── Révisions de taux lues dans les libellés ────────────────────────────────
// Le relevé journalise ses changements de taux sous forme d'opérations à zéro
// euro. C'est la saisie la plus pénible du formulaire, et la seule information
// qu'on ne peut lire nulle part ailleurs.
const R = CB.revisionTaux;

// Le libellé réel du CIC. Le séparateur décimal sort en espace : « 3 500% »
// vaut 3,500 %, et non trois mille cinq cents.
chk('taux : libellé CIC complet',
  R('NOUVEAU TAUX DU LIVRET JEUNE 3 500% NET AU 01/02/2026', '2026-02-01'),
  { depuis: '2026-02-01', taux: 3.5 });
chk('taux : seconde révision',
  R('NOUVEAU TAUX DU LIVRET JEUNE 3 750% NET AU 01/08/2026', '2026-08-01'),
  { depuis: '2026-08-01', taux: 3.75 });
chk('taux : séparateur virgule',
  R('Nouveau taux du Livret A 1,70% au 01/08/2026', '2026-08-01').taux, 1.7);
chk('taux : date prise sur la ligne à défaut',
  R('Nouveau taux du livret 2,40%', '2026-02-01').depuis, '2026-02-01');
chk('taux : une opération ordinaire n’en est pas une',
  R('VIR DE M ARMEL PLANTIER', '2026-08-06'), null);
// 3500 % n'existe pas sur un livret : la borne à 20 % lève l'ambiguïté toute
// seule, et écarte au passage un libellé qui contiendrait un gros nombre.
chk('taux : au-delà de 20 % refusé', R('Nouveau taux 3500%', '2026-02-01'), null);
chk('taux : sans pourcentage', R('Nouveau taux du livret jeune', '2026-02-01'), null);

// Bout en bout sur un CSV : les révisions sortent séparées des opérations.
const avecTaux = [
  'Date;Date de valeur;Débit;Crédit;Libellé;Solde',
  '01/02/2026;01/02/2026;;0,00;NOUVEAU TAUX DU LIVRET JEUNE 3 500% NET AU 01/02/2026;220,00',
  '06/08/2026;01/08/2026;;735,00;VIR DE M ARMEL PLANTIER;850,00',
  '01/08/2026;01/08/2026;;0,00;NOUVEAU TAUX DU LIVRET JEUNE 3 750% NET AU 01/08/2026;115,00',
].join('\n');
const rT = C.analyser(avecTaux);
chk('CSV : opérations et taux séparés', rT.lignes.length, 1);
chk('CSV : deux révisions trouvées',    rT.taux.length, 2);
chk('CSV : révisions dans l’ordre',     rT.taux.map(x => x.taux), [3.5, 3.75]);
chk('CSV : dates des révisions',        rT.taux.map(x => x.depuis),
  ['2026-02-01', '2026-08-01']);

// La colonne « Date » prime sur « Date de valeur ». Ce n'est pas cosmétique :
// la date de valeur intègre déjà la règle des quinzaines, et l'importer
// reviendrait à l'appliquer deux fois.
const deuxDates = [
  'Date;Date de valeur;Débit;Crédit;Libellé;Solde',
  '03/03/2026;16/03/2026;;100,00;VIR DE M PLANTIER ARMEL;300,00',
].join('\n');
chk('CSV : date d’opération, pas date de valeur', anaC(deuxDates)[0].d, '2026-03-03');

// Sur une capture, la révision se lit au-dessus du montant à zéro.
const capTaux = O.analyserTexte(
  '01 août\nNouveau Taux Du Livret Jeune 3 750% net au 01/08/2026\nHors budget, divers\n+ 0,00 €',
  LE13AOUT);
chk('OCR : révision de taux trouvée', capTaux.taux.length, 1);
chk('OCR : valeur du taux',           capTaux.taux[0].taux, 3.75);
chk('OCR : aucune opération créée',   capTaux.lignes.length, 0);

// ── Solde d'ouverture déduit de la colonne Solde ────────────────────────────
// Un export liste des opérations, pas un état. Ce qu'il y avait avant la
// première ligne ne figure que dans la colonne Solde, qui porte l'état APRÈS
// chaque opération.
const ouvert = [
  'Date;Date de valeur;Débit;Crédit;Libellé;Solde',
  '31/12/2024;01/01/2025;;23,83;INTERETS 2024;33,83',
  '16/02/2025;01/03/2025;;300,00;VIR DE M PLANTIER ARMEL;333,83',
  '27/02/2025;16/02/2025;-145,00;;VIR C/C CONTRAT PERSONNEL PARCO;188,83',
].join('\n');
const rOuv = C.analyser(ouvert);
chk('report : montant déduit',    rOuv.report.m, 10);
chk('report : veille de la 1re opération', rOuv.report.d, '2024-12-30');
chk('report : libellé explicite',  rOuv.report.label, 'Solde avant le 31/12/2024');
chk('report : opérations intactes', rOuv.lignes.length, 3);

// Fichier descendant, du plus récent au plus ancien : le tri doit rattraper.
const descendant = [
  'Date;Débit;Crédit;Libellé;Solde',
  '27/02/2025;-145,00;;VIR C/C;188,83',
  '16/02/2025;;300,00;VIR DE M PLANTIER;333,83',
  '31/12/2024;;23,83;INTERETS 2024;33,83',
].join('\n');
chk('report : fichier descendant', C.analyser(descendant).report.m, 10);

// Le contrôle de cohérence est ce qui autorise à proposer le report : en
// repartant de lui et en rejouant tout, on doit retomber sur le dernier solde.
// Un solde trafiqué doit donc faire renoncer.
const incoherent = [
  'Date;Débit;Crédit;Libellé;Solde',
  '31/12/2024;;23,83;INTERETS 2024;33,83',
  '16/02/2025;;300,00;VIR;999,99',
].join('\n');
chk('report : incohérence détectée', C.analyser(incoherent).report, null);

// Un compte qui part réellement de zéro n'a pas de report à proposer.
const deZero = [
  'Date;Débit;Crédit;Libellé;Solde',
  '31/12/2024;;100,00;PREMIER VERSEMENT;100,00',
  '16/02/2025;;300,00;VIR;400,00',
].join('\n');
chk('report : compte parti de zéro', C.analyser(deZero).report, null);

// Sans colonne Solde, on ne devine pas.
chk('report : pas de colonne solde', C.analyser(cic).report, null);
chk('report : fichier trop court',   C.analyser('Date;Montant\n06/08/2026;735,00').report, null);

// Le report franchit une année, donc un changement de mois et de siècle de
// quinzaines : le 1er janvier doit reculer au 31 décembre précédent.
const anNeuf = [
  'Date;Débit;Crédit;Libellé;Solde',
  '01/01/2026;;50,00;VIR;150,00',
  '02/01/2026;;50,00;VIR;200,00',
].join('\n');
chk('report : veille passe l’année', C.analyser(anNeuf).report.d, '2025-12-31');

// ── Fiche « Caractéristiques » lue sur une capture ──────────────────────────
// C'est le seul écran qui porte les intérêts acquis et prévisionnels : ni le
// CSV ni le PDF ne les contiennent, et aucun calcul ne les reproduit.
const ficheCic = [
  'Livret Jeune',
  'Opérations    Caractéristiques',
  'Caractéristiques générales',
  'Solde +850,00 EUR',
  'Taux 3,75 %',
  'Intérêts à ce jour +6,58 EUR',
  'Intérêts prévisionnels +19,94 EUR',
  'Plafond +1 600,00 EUR',
  'Fiscalité Livret réglementé, non fiscalisé',
  'Date de fin de validité 31/12/2031',
  'Compte de repli Non renseigné',
  "Date d'ouverture 18/09/2018",
].join('\n');
const F = O.analyserFiche(ficheCic);
chk('fiche : intérêts acquis',       F.acquis, 6.58);
chk('fiche : intérêts prévisionnels', F.projete, 19.94);
chk('fiche : taux',                  F.taux, 3.75);
chk('fiche : solde',                 F.solde, 850);
chk('fiche : plafond',               F.plafond, 1600);
chk('fiche : date d’ouverture',      F.ouverture, '2018-09-18');
chk('fiche : fin de validité',       F.fin, '2031-12-31');

// Mise en page à deux colonnes : l'OCR rend souvent la valeur sur la ligne
// suivante plutôt qu'après le libellé.
const surDeuxLignes = [
  'Solde', '+850,00 EUR',
  'Intérêts à ce jour', '+6,58 EUR',
  'Intérêts prévisionnels', '+19,94 EUR',
  "Date d'ouverture", '18/09/2018',
].join('\n');
const F2 = O.analyserFiche(surDeuxLignes);
chk('fiche : valeur sur la ligne suivante', F2.acquis, 6.58);
chk('fiche : prévisionnel sur deux lignes', F2.projete, 19.94);
chk('fiche : date sur deux lignes',         F2.ouverture, '2018-09-18');

// Le signe d'une fiche est décoratif : « +850,00 » est un solde, pas un
// versement. Il ne doit pas ressortir en négatif sur un plafond ou un solde.
chk('fiche : signe ignoré', O.analyserFiche(
  'Intérêts à ce jour +6,58 EUR\nIntérêts prévisionnels +19,94 EUR\nSolde -850,00 EUR').solde, 850);

// Un écran d'opérations contient « Solde » lui aussi : un seul repère ne suffit
// pas à en faire une fiche, sans quoi toute capture serait mal aiguillée.
chk('fiche : écran d’opérations refusé',
  O.analyserFiche('Solde :\n+ 850,00 €\n06 août\nVir De M Armel Plantier\n+ 735,00 €'), null);
chk('fiche : texte quelconque refusé', O.analyserFiche('bonjour\nau revoir'), null);

// Le libellé doit ouvrir la ligne, sinon « Plafond » se ferait voler par une
// phrase qui le mentionne.
chk('fiche : libellé en milieu de phrase ignoré',
  O.analyserFiche('Vous avez atteint le plafond de 1 600,00 EUR sur ce livret\n' +
                  "Date d'ouverture 18/09/2018\nIntérêts à ce jour +6,58 EUR").plafond,
  undefined);

// Le taux d'un livret ne dépasse pas 20 % : au-delà, c'est autre chose qui a
// été lu.
chk('fiche : taux aberrant écarté', O.analyserFiche(
  'Taux 3750 %\nIntérêts à ce jour +6,58 EUR\nPlafond +1 600,00 EUR').taux, undefined);

// ── Rattrapage : colonnes désignées à la main ───────────────────────────────
// Aucun dictionnaire ne couvrira toutes les banques. Quand rien n'est reconnu,
// l'analyse le dit au lieu d'échouer, et accepte un mapping imposé.

// Entêtes dans une langue et un ordre inconnus, colonnes inversées.
const exotique = [
  'Buchungstag;Verwendungszweck;Betrag;Kontostand',
  '06.08.2026;Ueberweisung Armel;735,00;850,00',
  '30.07.2026;Dauerauftrag;-150,00;115,00',
].join('\n');

const auto = C.analyser(exotique);
// Le devineur s'en sort ici — les dates et les montants se reconnaissent au
// contenu, quelle que soit la langue de l'entête.
chk('exotique : deviné sans dictionnaire', auto.lignes.length, 2);
chk('exotique : montants',  auto.lignes.map(l => l.m), [735, -150]);

// Un fichier où même le devineur échoue : pas assez de dates reconnaissables.
const opaque = [
  'ref|texte|valeur',
  'A1|Paiement|735,00',
  'A2|Retrait|-150,00',
].join('\n');
const illisible = C.analyser(opaque);
chk('opaque : aucune ligne',         illisible.lignes.length, 0);
chk('opaque : signalé à l’appelant', illisible.colonnesInconnues, true);

// Le même fichier, colonnes désignées à la main. C'est ce que fait l'écran de
// rattrapage : la date manque, mais le membre peut pointer une colonne qui en
// contient dans un autre fichier — ici on vérifie surtout le passage du
// mapping.
const force = [
  'reference;intitule;somme;jour',
  'A1;Paiement carte;735,00;06/08/2026',
  'A2;Retrait especes;-150,00;30/07/2026',
].join('\n');
const manuel = C.analyser(force, { date: 3, label: 1, montant: 2, depuis: 1 });
chk('manuel : deux opérations',   manuel.lignes.length, 2);
chk('manuel : dates lues',        manuel.lignes.map(l => l.d), ['2026-08-06', '2026-07-30']);
chk('manuel : montants signés',   manuel.lignes.map(l => l.m), [735, -150]);
chk('manuel : libellés',          manuel.lignes[0].label, 'Paiement carte');

// La ligne d'entête doit être exclue, sinon elle ressort en opération.
const avecEntete = C.analyser(force, { date: 3, label: 1, montant: 2, depuis: 0 });
chk('manuel : entête non datée, écartée seule', avecEntete.lignes.length, 2);

// Débit et crédit désignés séparément.
const dc = [
  'quand;quoi;sortie;entree',
  '06/08/2026;Virement;;735,00',
  '30/07/2026;Prelevement;150,00;',
].join('\n');
const rdc = C.analyser(dc, { date: 0, label: 1, debit: 2, credit: 3, depuis: 1 });
chk('manuel : débit et crédit séparés', rdc.lignes.map(l => l.m), [735, -150]);

// Les colonnes non désignées ne doivent pas être lues par accident.
chk('manuel : colonne solde absente sans dégât', rdc.report, null);

// Aperçu servi à l'écran de rattrapage.
const ap = C.apercu(force);
chk('aperçu : nombre de colonnes', ap.colonnes, 4);
chk('aperçu : entête détectée',    ap.entete, true);
chk('aperçu : première cellule',   ap.table[0][0], 'reference');
const apSansEntete = C.apercu('06/08/2026;Virement;735,00\n30/07/2026;Retrait;-150,00');
chk('aperçu : sans entête',        apSansEntete.entete, false);
chk('aperçu : fichier vide',       C.apercu(''), null);

console.log(t.join('\n'));
const ko = t.filter(x => x.startsWith('FAIL')).length;
console.log('\n' + (t.length - ko) + '/' + t.length + (ko ? '  >>> ECHEC' : '  >>> tout passe'));
process.exit(ko ? 1 : 0);
