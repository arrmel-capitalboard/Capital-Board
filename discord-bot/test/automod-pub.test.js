'use strict';

// Corpus de référence du filtre pub. Verrouille le comportement de scoreMessage :
// les termes ambigus d'une conversation d'investissement (« x10 sur Nvidia »,
// « j'ai gagné 200 € », « je te réponds en MP ») doivent rester sous MID_SCORE,
// donc ne déclencher aucun appel Mistral, tandis que la vraie pub doit au moins
// partir en classification.
//
//   cd discord-bot && npm test
//
// Aucun réseau : scoreMessage est purement local, et MISTRAL_API_KEY n'est pas
// lue ici.

const test = require('node:test');
const assert = require('node:assert');
const { scoreMessage, HIGH_SCORE, MID_SCORE } = require('../src/lib/automod-pub');

// Chaque message est scoré sous un userId unique : le détecteur de répétition
// garde 5 minutes d'historique par utilisateur et fausserait les scores suivants.
let n = 0;
const tier = (msg) => {
  const { score } = scoreMessage(msg, 'test-user-' + (++n));
  if (score >= HIGH_SCORE) return 'supprime';
  if (score >= MID_SCORE) return 'mistral';
  return 'ignore';
};

// Messages légitimes : aucun ne doit sortir du niveau « ignore ».
const LEGITIMES = [
  'Nvidia a fait x10 depuis 2023, incroyable',
  "j'ai gagné 240 € de dividendes cette année",
  'je follow cette valeur depuis un moment',
  'je te réponds en MP dès que possible',
  'tu peux m\'expliquer le calcul du TWR ?',
  "j'ai vendu ma ligne Air Liquide hier à 168 €",
  'le CAC a gagné 1,2 % aujourd\'hui',
  'x2 sur mon ETF World en 5 ans, je garde',
  'quelqu\'un connaît un bon ETF éligible PEA sur le S&P 500 ?',
  'mon PEA a 5 ans le mois prochain, enfin',
];

// Pub caractérisée : au minimum une classification Mistral, au mieux suppression.
const PUBS = [
  'REJOINS MON SERVEUR DISCORD POUR DES SIGNAUX CRYPTO GRATUITS !!!!',
  'envoie moi un mp pour recevoir la formation, prix en mp',
  'gagnez 500€ par jour, lien en bio, cliquez ici',
  'dm moi pour les infos, code promo dispo',
  'abonnez-vous à mon telegram, airdrop garanti, x100 assuré',
  'je vends mon compte, contactez moi en dm, offre limitée',
  'formation trading -50% de réduction, link in bio',
];

test('les messages légitimes ne sont pas escaladés', () => {
  for (const m of LEGITIMES) {
    assert.strictEqual(tier(m), 'ignore', `escalade à tort : ${m}`);
  }
});

test('la pub est au moins envoyée en classification', () => {
  for (const m of PUBS) {
    assert.notStrictEqual(tier(m), 'ignore', `pub non détectée : ${m}`);
  }
});

test('un terme ambigu seul reste sous le seuil de classification', () => {
  // C'est la régression corrigée le 30/07 : ces mots pesaient 2 points, donc un
  // seul suffisait à atteindre MID_SCORE et à appeler Mistral à chaque message.
  for (const m of ['x10', 'gagné', 'follow', 'mp', 'dm']) {
    const { score } = scoreMessage(`il a fait ${m} sur cette valeur`, 'test-ambigu-' + (++n));
    assert.ok(score < MID_SCORE, `« ${m} » seul déclenche encore une classification (score ${score})`);
  }
});

test('la répétition d\'un même message est pénalisée', () => {
  const uid = 'test-repetition';
  const msg = 'regardez cette valeur elle va exploser bientôt';
  const first = scoreMessage(msg, uid).score;
  const second = scoreMessage(msg, uid).score;
  assert.ok(second > first, 'le second envoi identique devrait scorer plus haut');
});

test('les seuils gardent leurs valeurs documentées', () => {
  assert.strictEqual(HIGH_SCORE, 8);
  assert.strictEqual(MID_SCORE, 2);
});
