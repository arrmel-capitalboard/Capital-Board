'use strict';

// Quel bouton porte une alerte, selon son état.
//
//   cd discord-bot && npm test
//
// Ce qu'on verrouille ici : une alerte corrigeable doit toujours offrir une
// suite depuis Discord. C'est ce qui manquait à la revue hebdo du 22/09 — deux
// problèmes décrits, aucun correctif joint, et rien à cliquer : il fallait
// ouvrir un terminal pour avancer.
//
// L'inverse compte autant. Une alerte de quota n'a rien à corriger, et une
// demande déjà en cours ne doit pas pouvoir être relancée d'un second clic :
// deux sessions sur le même compte rendu produiraient deux correctifs
// concurrents à départager.
//
// Aucun réseau : `payload` ne fait que construire un message.

const test = require('node:test');
const assert = require('node:assert');

process.env.DISCORD_TOKEN ||= 'test';
process.env.CLIENT_ID ||= 'test';

const { payload } = require('../src/lib/ops-alerts');

// Le libellé du seul bouton posé, ou null s'il n'y en a aucun.
const bouton = (data) => {
  const { components } = payload('alerte-1', { texte: 'compte rendu', ...data });
  if (!components.length) return null;
  const row = components[0].toJSON();
  assert.equal(row.components.length, 1, 'une seule action attendue par alerte');
  return row.components[0].label;
};

test('une alerte ordinaire ne porte aucun bouton', () => {
  assert.equal(bouton({ type: 'quota Mistral' }), null);
  assert.equal(bouton({ type: 'quota Mistral', corrigible: false }), null);
});

test('un compte rendu corrigeable propose de corriger', () => {
  assert.equal(bouton({ corrigible: true }), 'Corriger');
});

test('un correctif déjà proposé porte ses propres boutons, pas celui-ci', () => {
  assert.equal(bouton({ corrigible: true, fixStatut: 'produit' }), null);
});

test('un échec reste rattrapable sans passer par Firestore', () => {
  assert.equal(bouton({ corrigible: true, fixStatut: 'echec' }), 'Réessayer');
  assert.equal(bouton({ corrigible: true, fixStatut: 'vide' }), 'Réessayer');
});

// Le cas qui fige l'alerte : le run meurt sans rendre compte, donc plus rien
// n'écrit sur le document, donc plus rien ne réaffiche le message. Si le
// bouton avait disparu à la demande, il ne reviendrait jamais.
test('une demande en cours garde son bouton', () => {
  assert.equal(bouton({ corrigible: true, fixStatut: 'demande', fixLe: Date.now() }), 'Corriger');
});

test('une demande dont on n’a plus de nouvelles reste relançable', () => {
  const vieux = Date.now() - 60 * 60 * 1000;
  assert.equal(bouton({ corrigible: true, fixStatut: 'demande', fixLe: vieux }), 'Corriger');
  // `fixLe` absent — un document écrit avant cette version : traité comme périmé
  // plutôt que comme éternellement en cours.
  assert.equal(bouton({ corrigible: true, fixStatut: 'demande' }), 'Corriger');
});

test("l'avancement se lit dans l'embed, pas dans un log de run", () => {
  const champ = (data) => {
    const e = payload('alerte-1', { texte: 'x', corrigible: true, ...data }).embeds[0].toJSON();
    return (e.fields || []).find((f) => f.name === 'Correctif')?.value || null;
  };
  assert.equal(champ({}), null);
  assert.match(champ({ fixStatut: 'demande' }), /en cours/);
  assert.match(champ({ fixStatut: 'produit' }), /proposé/);
  assert.match(champ({ fixStatut: 'echec' }), /échouée/);

  const avecErreur = payload('alerte-1', {
    texte: 'x', corrigible: true, fixStatut: 'echec', fixErreur: 'GitHub 404',
  }).embeds[0].toJSON();
  assert.ok((avecErreur.fields || []).some((f) => f.value.includes('GitHub 404')),
    "la raison de l'échec doit être lisible dans le salon");
});

test('une mise à jour ne re-mentionne pas le rôle fondateur', () => {
  // La mention part avec l'envoi seulement ; rafraichir() force `content` à
  // vide, et payload ne doit pas la réintroduire ailleurs que dans le contenu.
  const envoi = payload('alerte-1', { texte: 'x', mention: '123' });
  assert.equal(envoi.content, '<@&123>');
  assert.deepEqual(envoi.allowedMentions, { roles: ['123'], parse: [] });
});
