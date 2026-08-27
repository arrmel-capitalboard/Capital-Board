// Ce test est la garantie que le caviardage tient. Les règles vivent dans
// caviardage.mjs, et rien d'autre ne sépare une capture d'audit d'une fuite
// d'identifiants : le 27/08/2026, un premier run réel a expédié vers Discord un
// code PIN en clair, un refreshToken et quatorze JWT, faute d'un contrôle avant
// l'envoi. Le corpus ci-dessous porte un exemplaire de chaque forme rencontrée
// ce jour-là. Un champ sensible ajouté à l'app sans sa règle fera tomber ce
// test au push, plutôt qu'au premier run.
//
// Les valeurs sont fabriquées pour ce fichier : aucun secret réel ici.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caviarder, resteDesSecrets, CAVIARDE } from './caviardage.mjs';

const JETON = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImZhdXgifQ.eyJzdWIiOiJ0ZXN0IiwiaWF0IjoxfQ.c2lnbmF0dXJlLWZhY3RpY2U';

const CORPUS = [
  ['en-tête Authorization', `GET /x HTTP/1.1\r\nAuthorization: Bearer ${JETON}\r\nHost: exemple\r\n\r\n`],
  ['en-tête Cookie', 'GET /x HTTP/1.1\r\nCookie: session=abcdef123456; autre=1\r\n\r\n'],
  ['en-tête Set-Cookie', 'HTTP/1.1 200 OK\r\nSet-Cookie: session=abcdef123456; HttpOnly\r\n\r\n'],
  ['en-tête App Check', `POST /x HTTP/1.1\r\nX-Firebase-AppCheck: ${JETON}\r\n\r\n`],
  ['idToken en JSON', `HTTP/1.1 200 OK\r\n\r\n{"idToken":"${JETON}","expiresIn":"3600"}`],
  ['refreshToken en JSON', 'HTTP/1.1 200 OK\r\n\r\n{"refreshToken":"AMf-vBxFAUX-jeton-de-rafraichissement-long"}'],
  ['refresh_token en JSON', 'HTTP/1.1 200 OK\r\n\r\n{"refresh_token":"AMf-vBxFAUX-jeton-de-rafraichissement-long"}'],
  ['code PIN', 'POST /verify-pin HTTP/1.1\r\n\r\n{"idToken":"x","pin":"123456"}'],
  ['mot de passe', 'POST /login HTTP/1.1\r\n\r\n{"email":"a@b.c","password":"Gi$@iT7x9N#3rU3"}'],
  ['jeton en formulaire', 'POST /x HTTP/1.1\r\n\r\nidToken=' + JETON + '&autre=1'],
  ['JWT nu dans un corps', `HTTP/1.1 200 OK\r\n\r\n{"donnee":{"jeton":"${JETON}"}}`],
];

for (const [nom, message] of CORPUS) {
  test(`caviarde : ${nom}`, () => {
    const propre = caviarder(message);
    assert.deepEqual(
      resteDesSecrets(propre), [],
      `un secret survit au caviardage dans le cas « ${nom} » :\n${propre}`,
    );
    assert.ok(!propre.includes(JETON), 'le JWT de test est encore présent en entier');
  });
}

test('le filet reconnaît un corpus non caviardé', () => {
  // Sans ce test, une règle qui n'attrape rien et un filet qui ne voit rien se
  // couvriraient mutuellement : les cas ci-dessus passeraient tous.
  const brut = CORPUS.map(([, m]) => m).join('\n');
  assert.ok(resteDesSecrets(brut).length > 0, 'le filet ne reconnaît plus aucun secret');
});

test('le filet ignore sa propre marque', () => {
  const marque = `HTTP/1.1 200 OK\r\nAuthorization: ${CAVIARDE}\r\n\r\n{"idToken":"${CAVIARDE}","pin":"${CAVIARDE}"}`;
  assert.deepEqual(resteDesSecrets(marque), [], 'le filet se signale lui-même');
});

test('la structure du message survit', () => {
  // L'audit doit continuer de voir QUE le jeton circule, et où : les noms
  // d'en-têtes et les clés JSON restent, seules les valeurs disparaissent.
  const propre = caviarder(`POST /verify-pin HTTP/1.1\r\nAuthorization: Bearer ${JETON}\r\nHost: api.exemple\r\n\r\n{"pin":"123456"}`);
  assert.match(propre, /^POST \/verify-pin HTTP\/1\.1/);
  assert.match(propre, /^Authorization: /m);
  assert.match(propre, /Host: api\.exemple/);
  assert.match(propre, /"pin":"/);
});

test("une capture sans secret n'est pas modifiée", () => {
  const anodin = 'GET /data/prix.json HTTP/1.1\r\nHost: capitalboard.fr\r\nAccept: application/json\r\n\r\n{"AAPL":231.4}';
  assert.equal(caviarder(anodin), anodin);
});
