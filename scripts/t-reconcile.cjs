// Suite de tests de scripts/reconcile-pea.cjs — l'outil qui met le journal
// d'un PEA face à l'état stocké et au relevé du courtier.
//
// Le scénario rejoue au centime les chiffres relevés sur un PEA Fortuneo réel :
// évaluation 2 068,72 €, coût de revient affiché 2 127,03 €, solde espèces
// affiché 266,03 €, versements 2 028,14 € — contre 2 054,97 € et 323,97 € sur
// le relevé. Les quantités étant justes (l'évaluation l'est), l'écart de coût
// ne peut venir que du PRU stocké : le journal, lui, rejoue bien 2 054,97 €.
//
// L'outil est lancé tel qu'un utilisateur le lance, et on lit sa sortie.
const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const { execFileSync } = require('child_process');

const OUTIL = path.join(__dirname, 'reconcile-pea.cjs');

// ── Le journal, tel qu'il devrait être ──────────────────────────────────────
// Trois lignes détenues et une position soldée. Les frais sont ceux d'un ordre
// Fortuneo. Coût de revient rejoué : 901,95 + 761,56 + 391,46 = 2 054,97 €.
const journal = [
  { id: 1, type: 'buy',  ticker: 'AI.PA',    name: 'Air Liquide',  qty: 5,  price: 180.00, fees: 1.95, date: '2026-01-15' },
  { id: 2, type: 'buy',  ticker: 'TTE.PA',   name: 'TotalEnergies', qty: 10, price: 55.00, fees: 1.95, date: '2026-01-20' },
  { id: 3, type: 'buy',  ticker: 'CW8.PA',   name: 'Amundi MSCI World', qty: 10, price: 95.00, fees: 1.95, date: '2026-02-10' },
  { id: 4, type: 'buy',  ticker: 'PAEEM.PA', name: 'Amundi PEA Emergent', qty: 11, price: 35.30, fees: 3.16, date: '2026-03-05' },
  { id: 5, type: 'sell', ticker: 'TTE.PA',   name: 'TotalEnergies', qty: 10, price: 84.71, fees: 1.95, date: '2026-05-12' },
  { id: 6, type: 'sell', ticker: 'CW8.PA',   name: 'Amundi MSCI World', qty: 2, price: 96.00, fees: 1.95, date: '2026-06-20' },
];

// ── Le portefeuille, tel qu'il est stocké ───────────────────────────────────
// Quantités justes — l'évaluation tombe à l'euro près sur le relevé. Mais le
// PRU d'Air Liquide porte 72,06 € de trop : 194,802 € au lieu de 180,39 €.
// C'est la dérive que l'application ne peut pas voir, faute de rejeu.
const portefeuille = [
  { ticker: 'AI.PA',    name: 'Air Liquide',        qty: 5,  buyPrice: 194.802,  currentPrice: 185.00 },
  { ticker: 'CW8.PA',   name: 'Amundi MSCI World',  qty: 8,  buyPrice: 95.195,   currentPrice: 97.00 },
  { ticker: 'PAEEM.PA', name: 'Amundi PEA Emergent', qty: 11, buyPrice: 35.5873, currentPrice: 34.50 },
];

const versements = [{ id: 10, amount: 2028.14, date: '2026-01-10' }];

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-reconcile-'));
const fichier = path.join(dossier, 'debug_pea_test.json');
fs.writeFileSync(fichier, JSON.stringify({ portfolio: portefeuille, transactions: journal, versements }));

const sortie = execFileSync(process.execPath,
  [OUTIL, fichier, '--titres=2068.72', '--latente=13.75', '--cash=323.97'],
  { encoding: 'utf8' });

const t = [];
const chk = (l, ok, extra) => {
  t.push((ok ? 'ok  ' : 'FAIL') + '  ' + l + (ok ? '' : '\n        ' + (extra || '')));
};
// Les montants sortent au format français, espace fine insécable comprise.
const nu = sortie.replace(/\s+/g, ' ');
const contient = s => nu.includes(s.replace(/\s+/g, ' '));

// ── Le coût de revient ──────────────────────────────────────────────────────
chk('coût stocké annoncé à 2 127,03 €', contient('2 127,03 €'), 'introuvable dans la sortie');
chk('coût rejoué depuis le journal à 2 054,97 €', contient('2 054,97 €'), 'introuvable dans la sortie');
chk('écart de 72,06 € affiché', contient('+72,06 €'), 'introuvable dans la sortie');
// La dérive est localisée sur une ligne, pas noyée dans un total.
chk('la ligne fautive est désignée', /AI\.PA[^\n]*974,01[^\n]*901,95[^\n]*\+72,06/.test(sortie),
    'la ligne AI.PA ne porte pas l’écart');
chk('les lignes saines ne sont pas signalées',
    !/CW8\.PA[^\n]*⟵/.test(sortie) && !/PAEEM\.PA[^\n]*⟵/.test(sortie),
    'une ligne juste est marquée à tort');

// ── Le solde espèces ────────────────────────────────────────────────────────
chk('solde espèces rejoué à 266,03 €', contient('266,03 €'), 'introuvable dans la sortie');
chk('écart de 57,94 € face au relevé', contient('-57,94 €'), 'introuvable dans la sortie');
// Aucune écriture ne pèse ce montant : l'écart vient de crédits absents du
// journal, pas d'une écriture fausse. L'outil doit le dire plutôt que de
// désigner une ligne au hasard.
chk('l’absence de coupable est dite explicitement',
    contient('aucune écriture isolée de ce montant'),
    'l’outil prétend avoir trouvé une écriture');

// ── La position soldée ──────────────────────────────────────────────────────
chk('TotalEnergies, soldée, ne fausse pas le total', !/TTE\.PA/.test(sortie.split('4. Écritures')[0]),
    'une position soldée est comptée dans le coût de revient');

// ── Le détecteur de doublons ────────────────────────────────────────────────
{
  const avecDoublon = journal.concat([{ ...journal[0], id: 99 }]);
  const f2 = path.join(dossier, 'doublon.json');
  fs.writeFileSync(f2, JSON.stringify({ portfolio: portefeuille, transactions: avecDoublon, versements }));
  const s2 = execFileSync(process.execPath, [OUTIL, f2], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  chk('un achat enregistré deux fois est signalé', s2.includes('2× la même écriture'),
      'le doublon passe inaperçu');
  chk('le doublon est chiffré', s2.includes('900,00 € en trop'), 'montant du doublon absent');
}

// ── Les autres détecteurs ───────────────────────────────────────────────────
{
  const abime = [
    { id: 1, type: 'buy',  ticker: 'AI.PA', qty: 5, price: 180.00, date: '2026-01-15' },
    { id: 2, type: 'sell', ticker: 'AI.PA', qty: 9, price: 190.00, date: '2026-02-15' }, // plus qu'il n'en détient
    { id: 3, type: 'buy',  ticker: 'XX.PA', qty: 2, price: 0,      date: '2026-03-01' }, // prix nul non marqué
    { id: 4, type: 'remboursement', ticker: 'YY.PA', qty: 1, price: 57.94, date: '2026-04-01' }, // type ignoré
    { id: 5, type: 'buy',  ticker: 'ZZ.PA', qty: 1, price: 10 },                          // sans date
  ];
  const f3 = path.join(dossier, 'abime.json');
  fs.writeFileSync(f3, JSON.stringify({ portfolio: [], transactions: abime, versements: [] }));
  const s3 = execFileSync(process.execPath, [OUTIL, f3], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  chk('vente à découvert signalée',  s3.includes('alors que le journal n\'en détient que'), 'non détectée');
  chk('achat à prix nul signalé',    s3.includes('achat à prix nul non marqué'), 'non détecté');
  chk('type inconnu signalé',        s3.includes('type que le calcul ignore'), 'non détecté');
  chk('écriture sans date signalée', s3.includes('sans date'), 'non détectée');
}

// ── L'en-tête de source ─────────────────────────────────────────────────────
// exportDebugData() exporte le compte AFFICHÉ à l'écran. Un export du CTO et un
// export du PEA se ressemblent trait pour trait : sans en-tête, on peut passer
// une heure à chercher un écart dans les écritures d'une autre enveloppe.
{
  const f4 = path.join(dossier, 'cto.json');
  fs.writeFileSync(f4, JSON.stringify({
    compte: 'cto', exporte: '2026-09-16T10:30:00.000Z', version: '20260916d',
    portfolio: [], transactions: [], versements: [],
  }));
  const s4 = execFileSync(process.execPath, [OUTIL, f4], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  chk('le compte exporté est nommé', s4.includes('Compte-titres'), 'en-tête absent');
  chk('la date d’export est rappelée', s4.includes('exporté le'), 'date absente');
  chk('la version est rappelée', s4.includes('20260916d'), 'version absente');

  // Un export d'avant le correctif ne dit rien : l'outil doit le dire, pas
  // supposer qu'il s'agit du PEA.
  const f5 = path.join(dossier, 'ancien.json');
  fs.writeFileSync(f5, JSON.stringify({ portfolio: [], transactions: [], versements: [] }));
  const s5 = execFileSync(process.execPath, [OUTIL, f5], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  // Un export administrateur doit s'annoncer : on ne relit pas les chiffres
  // d'un tiers en croyant relire les siens.
  const f6 = path.join(dossier, 'admin.json');
  fs.writeFileSync(f6, JSON.stringify({
    compte: 'pea', exporte: '2026-09-16T10:30:00.000Z', version: '20260916e',
    source: 'admin:A6nZQ8PcxdURytSesA17xK81I9T2',
    portfolio: [], transactions: [], versements: [],
  }));
  const s6 = execFileSync(process.execPath, [OUTIL, f6], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  chk('un export administrateur s’annonce', s6.includes('Export administrateur'), 'non signalé');
  chk('il rappelle qu’il s’agit d’un tiers', s6.includes('données d’un tiers')
      || s6.includes("données d'un tiers"), 'mention absente');

  // Un export client ne déclenche pas cette mention.
  const f7 = path.join(dossier, 'client.json');
  fs.writeFileSync(f7, JSON.stringify({
    compte: 'pea', exporte: '2026-09-16T10:30:00.000Z', source: 'client',
    portfolio: [], transactions: [], versements: [],
  }));
  const s7 = execFileSync(process.execPath, [OUTIL, f7], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  chk('un export client ne porte pas cette mention', !s7.includes('Export administrateur'),
      'mention affichée à tort');

  chk('un export anonyme est signalé comme tel',
      s5.includes('ne dit pas de quel compte il vient'), 'l’outil suppose le compte');
}

fs.rmSync(dossier, { recursive: true, force: true });

console.log(t.join('\n'));
const ko = t.filter(l => l.startsWith('FAIL')).length;
if (ko) { console.log('\n─── sortie de l’outil ───\n' + sortie); }
console.log('\n' + (t.length - ko) + '/' + t.length + ' tests passés.');
process.exit(ko ? 1 : 0);
