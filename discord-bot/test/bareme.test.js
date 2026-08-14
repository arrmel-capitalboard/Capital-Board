'use strict';

// Lecture des taux de l'épargne réglementée sur service-public.fr.
//
//   cd discord-bot && npm test
//
// Aucun réseau : les extraits ci-dessous sont recopiés des vraies fiches, le
// 16/08/2026. Ce sont eux qui verrouillent le comportement — le jour où une
// page change de formulation, c'est ici qu'il faudra le constater, pas sur le
// patrimoine d'un membre.

const test = require('node:test');
const assert = require('node:assert');
const { extraireTaux, verifier, fenetre } = require('../src/lib/bareme');

// Les quatre formulations rencontrées. Elles ne se ressemblent pas : le Livret
// A répète son nom dans la phrase, le LDDS ne le fait pas, le LEP pose sa
// question autrement et fait suivre d'un onglet « Anciens taux », le CEL glisse
// une incise. C'est ce qui a fait choisir une ancre en deux temps — la question
// qui nomme le produit, puis « est de » dans ce qui suit.
const FICHES = {
  livretA: `<p>Quel est le taux de rémunération du livret A ?</p>
            <p>Le taux d'intérêt annuel du livret A est de 1,7&nbsp;%.</p>
            <p>Comment sont calculés les intérêts du livret A ?</p>`,
  ldds: `<h3>Quel est le taux de rémunération du LDDS ?</h3><p>Taux</p>
         <p>Le taux d'intérêt annuel est de 1,7&nbsp;%</p><p>Calcul des intérêts</p>`,
  lep: `<h3>Quelle est la rémunération du LEP ?</h3>
        <p>Taux d'intérêts</p><p>Taux actuel</p><p>Anciens taux</p><p>Taux actuel</p>
        <p>Le taux d'intérêt du LEP est de 2,50&nbsp;%.</p>
        <p>Anciens taux</p><table><tr><td>1er février 2025</td><td>3,50 %</td></tr></table>`,
  cel: `<h3>Quel est le taux d'intérêt du CEL ?</h3>
        <p>Le taux d'intérêt du CEL, hors prime d'État, est de 1,25&nbsp;%.</p>
        <p>Les intérêts sont soumis à l'impôt sur le revenu au taux forfaitaire de 12,8 %
           auquel sont ajoutés les prélèvements sociaux pour un taux global de 17,2 %.</p>`,
};

test('taux lus sur les quatre fiches', () => {
  assert.strictEqual(extraireTaux(FICHES.livretA, 'livret A'), 1.7);
  assert.strictEqual(extraireTaux(FICHES.ldds, 'LDDS'), 1.7);
  assert.strictEqual(extraireTaux(FICHES.lep, 'LEP'), 2.5);
  assert.strictEqual(extraireTaux(FICHES.cel, 'CEL'), 1.25);
});

test('le prélèvement forfaitaire de la page du CEL n’est pas pris pour un taux', () => {
  assert.notStrictEqual(extraireTaux(FICHES.cel, 'CEL'), 12.8);
  assert.notStrictEqual(extraireTaux(FICHES.cel, 'CEL'), 17.2);
});

test('un ancien taux du LEP n’est pas pris pour le taux courant', () => {
  assert.strictEqual(extraireTaux(FICHES.lep, 'LEP'), 2.5);
});

test('rien à lire plutôt qu’un chiffre au hasard', () => {
  // Page qui ne parle pas du produit : aucune question ne le nomme.
  assert.strictEqual(extraireTaux('<p>Le taux est de 3,00 %</p>', 'LEP'), null);
  // Question posée, mais plus de « est de » derrière : la formulation a changé,
  // et c'est exactement le cas qu'il ne faut pas deviner.
  assert.strictEqual(extraireTaux(
    '<h3>Quelle est la rémunération du LEP ?</h3><p>Il s’élève à 2,50 %.</p>', 'LEP'), null);
  assert.strictEqual(extraireTaux('', 'LEP'), null);
  assert.strictEqual(extraireTaux(null, 'LEP'), null);
});

test('apostrophe courbe acceptée', () => {
  assert.strictEqual(extraireTaux(
    '<h3>Quel est le taux d’intérêt du CEL ?</h3><p>Il est de 1,25 %.</p>', 'CEL'), 1.25);
});

// ── Contrôles de vraisemblance ───────────────────────────────────────────────
const COURANTS = { livretA: 1.7, ldds: 1.7, lep: 2.5, cel: 1.25 };

test('une révision plausible passe', () => {
  assert.deepStrictEqual(
    verifier({ livretA: 1.5, ldds: 1.5, lep: 2.2, cel: 1 }, COURANTS), []);
});

test('un taux hors bornes est refusé', () => {
  assert.strictEqual(verifier({ livretA: 17 }, COURANTS).length, 1);
  assert.strictEqual(verifier({ livretA: 0 }, COURANTS).length, 1);
});

test('un saut trop grand est refusé', () => {
  // 1,7 → 5 : aucune révision ne fait ça, c'est une lecture qui a dérapé.
  assert.strictEqual(verifier({ livretA: 5 }, COURANTS).length, 1);
});

test('le LDDS désaligné du Livret A est refusé', () => {
  // Les deux sont alignés par la loi : un écart signale une mauvaise lecture,
  // même si chaque chiffre pris seul est plausible.
  const refus = verifier({ livretA: 1.7, ldds: 1.5 }, COURANTS);
  assert.strictEqual(refus.length, 1);
  assert.match(refus[0], /désaligné/);
});

test('un LEP sous le Livret A est refusé', () => {
  const refus = verifier({ livretA: 1.7, lep: 1.2 }, COURANTS);
  assert.strictEqual(refus.length, 1);
  assert.match(refus[0], /sous le Livret A/);
});

// ── Fenêtre de validité ──────────────────────────────────────────────────────
// Les taux sont révisés au 1er février et au 1er août : la période affichée
// sous la liste des livrets se déduit de la date, sans rien avoir à lire.
test('fenêtre du premier semestre', () => {
  assert.deepStrictEqual(fenetre(new Date(2027, 2, 15)),
    { effet: '1er février 2027', jusqu: '31 juillet 2027' });
});

test('fenêtre du second semestre', () => {
  assert.deepStrictEqual(fenetre(new Date(2026, 7, 16)),
    { effet: '1er août 2026', jusqu: '31 janvier 2027' });
});

test('janvier appartient encore à la fenêtre ouverte en août', () => {
  assert.deepStrictEqual(fenetre(new Date(2027, 0, 10)),
    { effet: '1er août 2026', jusqu: '31 janvier 2027' });
});
