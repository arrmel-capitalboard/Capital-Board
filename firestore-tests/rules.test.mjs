// Tests des Firestore Security Rules (firestore.rules), contre l'émulateur.
// Ne couvre pas chaque `match` du fichier : se concentre sur les invariants
// propres à ce projet (listes de champs autorisés, docId interdits en
// écriture client, garde admin à double condition) — la logique générique
// (self-only, auth != null) est secondaire, la logique bespoke est ce qui se
// casse silencieusement à la prochaine modification des règles.
//
// Lancer : cd firestore-tests && npm install && npm test
// (ou, avec l'émulateur : firebase emulators:exec --only firestore "npm test" depuis firestore-tests)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs,
} from 'firebase/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_PATH = path.join(__dirname, '..', 'firestore.rules');

// UID codé en dur dans firestore.rules — voir _isAdmin(). Un second
// administrateur imposerait de modifier les règles, donc ce test.
const ADMIN_UID = 'A6nZQ8PcxdURytSesA17xK81I9T2';
const ALICE = 'alice-uid';
const BOB   = 'bob-uid';

let testEnv;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'capitalboard-rules-test',
    firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
  });
});

test.after(async () => {
  await testEnv.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
});

function asVerified(uid) {
  return testEnv.authenticatedContext(uid, { email_verified: true }).firestore();
}
function asUnverified(uid) {
  return testEnv.authenticatedContext(uid, { email_verified: false }).firestore();
}
function asAdmin() {
  return testEnv.authenticatedContext(ADMIN_UID, { email_verified: true }).firestore();
}
function anon() {
  return testEnv.unauthenticatedContext().firestore();
}
async function seedAsAdmin(path_, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(path_).set(data);
  });
}

// ── users/{uid} ─────────────────────────────────────────────────────────

test('users/{uid} : le titulaire lit et écrit son propre doc', async () => {
  await assertSucceeds(setDoc(doc(asVerified(ALICE), `users/${ALICE}`), { foo: 1 }));
  await assertSucceeds(getDoc(doc(asVerified(ALICE), `users/${ALICE}`)));
});

test('users/{uid} : un autre membre ne lit ni n\'écrit', async () => {
  await seedAsAdmin(`users/${ALICE}`, { foo: 1 });
  await assertFails(getDoc(doc(asVerified(BOB), `users/${ALICE}`)));
  await assertFails(setDoc(doc(asVerified(BOB), `users/${ALICE}`), { foo: 2 }));
});

test('users/{uid} : email non vérifié ne peut pas écrire', async () => {
  await assertFails(setDoc(doc(asUnverified(ALICE), `users/${ALICE}`), { foo: 1 }));
});

// ── users/{uid}/data/{docId} ────────────────────────────────────────────

test('data/security : le client peut poser adminOptOut seul', async () => {
  await assertSucceeds(setDoc(doc(asVerified(ALICE), `users/${ALICE}/data/security`),
    { adminOptOut: true, adminOptOutAt: 123 }));
});

test('data/security : un champ hors liste est refusé à la création', async () => {
  await assertFails(setDoc(doc(asVerified(ALICE), `users/${ALICE}/data/security`),
    { adminOptOut: true, pinHash: 'x' }));
});

test('data/security : la mise à jour ne peut toucher que adminOptOut(At)', async () => {
  await seedAsAdmin(`users/${ALICE}/data/security`, { adminOptOut: false, pinHash: 'legacy' });
  await assertSucceeds(updateDoc(doc(asVerified(ALICE), `users/${ALICE}/data/security`),
    { adminOptOut: true }));
  await assertFails(updateDoc(doc(asVerified(ALICE), `users/${ALICE}/data/security`),
    { pinHash: 'new' }));
});

test('data/trustedDevices et data/loginLog : jamais écrits par le client, même par le titulaire', async () => {
  await assertFails(setDoc(doc(asVerified(ALICE), `users/${ALICE}/data/trustedDevices`), { a: 1 }));
  await assertFails(setDoc(doc(asVerified(ALICE), `users/${ALICE}/data/loginLog`), { a: 1 }));
  await seedAsAdmin(`users/${ALICE}/data/loginLog`, { a: 1 });
  await assertFails(deleteDoc(doc(asVerified(ALICE), `users/${ALICE}/data/loginLog`)));
  // Restent lisibles par leur titulaire.
  await assertSucceeds(getDoc(doc(asVerified(ALICE), `users/${ALICE}/data/loginLog`)));
});

test('data/{docId} : un docId libre reste écrivable normalement', async () => {
  await assertSucceeds(setDoc(doc(asVerified(ALICE), `users/${ALICE}/data/portfolio`), { any: 'thing' }));
});

// ── signalements ────────────────────────────────────────────────────────

test('signalements : création valide par son auteur', async () => {
  await assertSucceeds(setDoc(doc(asVerified(ALICE), 'signalements/s1'),
    { uid: ALICE, texte: 'ça bug', module: 'Livrets' }));
});

test('signalements : uid usurpé refusé', async () => {
  await assertFails(setDoc(doc(asVerified(ALICE), 'signalements/s1'),
    { uid: BOB, texte: 'ça bug', module: 'Livrets' }));
});

test('signalements : texte vide ou absent refusé', async () => {
  await assertFails(setDoc(doc(asVerified(ALICE), 'signalements/s1'),
    { uid: ALICE, texte: '', module: 'Livrets' }));
});

test('signalements : ni lecture, ni update, ni delete, pas même par l\'auteur', async () => {
  await seedAsAdmin('signalements/s1', { uid: ALICE, texte: 'x', module: 'm' });
  await assertFails(getDoc(doc(asVerified(ALICE), 'signalements/s1')));
  await assertFails(updateDoc(doc(asVerified(ALICE), 'signalements/s1'), { texte: 'y' }));
  await assertFails(deleteDoc(doc(asVerified(ALICE), 'signalements/s1')));
});

test('signalements : champ hors liste refusé', async () => {
  await assertFails(setDoc(doc(asVerified(ALICE), 'signalements/s1'),
    { uid: ALICE, texte: 'x', module: 'm', evil: 'field' }));
});

test('signalements : email ne peut pas être celui d\'un tiers', async () => {
  const alice = testEnv.authenticatedContext(ALICE, { email_verified: true, email: 'alice@x.com' }).firestore();
  await assertSucceeds(setDoc(doc(alice, 'signalements/ok'),
    { uid: ALICE, texte: 'x', module: 'm', email: 'alice@x.com' }));
  await assertFails(setDoc(doc(alice, 'signalements/ko'),
    { uid: ALICE, texte: 'x', module: 'm', email: 'victime@x.com' }));
});

test('signalements : imageUrl doit pointer vers notre stockage', async () => {
  await assertSucceeds(setDoc(doc(asVerified(ALICE), 'signalements/ok'),
    { uid: ALICE, texte: 'x', module: 'm', imageUrl: 'https://api.capitalboard.fr/support-file/support/abc?s=deadbeef' }));
  await assertFails(setDoc(doc(asVerified(ALICE), 'signalements/ko'),
    { uid: ALICE, texte: 'x', module: 'm', imageUrl: 'https://evil.example/x.png' }));
});

// ── roles ───────────────────────────────────────────────────────────────

test('roles/{uid} : création par soi avec champs autorisés', async () => {
  await assertSucceeds(setDoc(doc(asVerified(ALICE), `roles/${ALICE}`),
    { firstName: 'A', lastName: 'B' }));
});

test('roles/{uid} : le client ne peut pas écrire username (réservé au Worker)', async () => {
  // L'unicité/blocklist du pseudo ne s'imposent qu'au Worker : le client qui
  // écrit username directement contournait tout. Interdit à la création…
  await assertFails(setDoc(doc(asVerified(ALICE), `roles/${ALICE}`),
    { firstName: 'A', lastName: 'B', username: 'alice' }));
  // …et à la mise à jour.
  await seedAsAdmin(`roles/${ALICE}`, { firstName: 'A', lastName: 'B', username: 'alice' });
  await assertFails(updateDoc(doc(asVerified(ALICE), `roles/${ALICE}`), { username: 'squatt' }));
});

test('roles/{uid} : impossible de s\'auto-promouvoir admin', async () => {
  await assertFails(setDoc(doc(asVerified(ALICE), `roles/${ALICE}`),
    { firstName: 'A', lastName: 'B', role: 'admin' }));
});

test('roles/{uid} : champ hors liste refusé', async () => {
  await assertFails(setDoc(doc(asVerified(ALICE), `roles/${ALICE}`),
    { firstName: 'A', lastName: 'B', email: 'a@b.com' }));
});

test('roles/{uid} : lecture réservée au titulaire et à l\'admin', async () => {
  await seedAsAdmin(`roles/${ALICE}`, { firstName: 'A', lastName: 'B', username: 'alice' });
  await assertFails(getDoc(doc(asVerified(BOB), `roles/${ALICE}`)));
  await seedAsAdmin(`roles/${ADMIN_UID}`, { role: 'superadmin' });
  await assertSucceeds(getDoc(doc(asAdmin(), `roles/${ALICE}`)));
});

// ── usernames (réservation) ─────────────────────────────────────────────

test('usernames/{name} : fermée au client, lecture comprise', async () => {
  // La disponibilité passe par le Worker (Admin SDK). Aucun code client ne lit
  // cette collection : la garder lisible en faisait un annuaire name→uid.
  await seedAsAdmin('usernames/alice', { uid: ALICE });
  await assertFails(getDoc(doc(asVerified(BOB), 'usernames/alice')));
  await assertFails(getDoc(doc(anon(), 'usernames/alice')));
});

test('usernames/{name} : aucune écriture client, même sur son propre pseudo', async () => {
  await assertFails(setDoc(doc(asVerified(ALICE), 'usernames/alice'), { uid: ALICE }));
});

// ── auditLog ────────────────────────────────────────────────────────────

test('auditLog : réservé à l\'admin en lecture et en création', async () => {
  await assertFails(setDoc(doc(asVerified(ALICE), 'auditLog/a1'), { action: 'x' }));
  await seedAsAdmin('auditLog/a1', { action: 'x' });
  await assertFails(getDoc(doc(asVerified(ALICE), 'auditLog/a1')));
  await seedAsAdmin(`roles/${ADMIN_UID}`, { role: 'superadmin' });
  await assertSucceeds(getDoc(doc(asAdmin(), 'auditLog/a1')));
});

// ── config ──────────────────────────────────────────────────────────────

test('config : lecture publique, écriture admin uniquement', async () => {
  await seedAsAdmin('config/app', { signupOpen: true });
  await assertSucceeds(getDoc(doc(anon(), 'config/app')));
  await assertFails(setDoc(doc(asVerified(ALICE), 'config/app'), { signupOpen: false }));
  await seedAsAdmin(`roles/${ADMIN_UID}`, { role: 'superadmin' });
  await assertSucceeds(setDoc(doc(asAdmin(), 'config/app'), { signupOpen: false }));
});

// ── ideas (mur à idées) ─────────────────────────────────────────────────

test('ideas : création valide, en attente, compteurs à zéro', async () => {
  await assertSucceeds(setDoc(doc(asVerified(ALICE), 'ideas/i1'), {
    title: 'Titre', body: 'Corps', authorUid: ALICE, authorName: 'membre',
    status: 'pending', up: 0, down: 0, score: 0,
  }));
});

test('ideas : impossible de se publier directement (status != pending)', async () => {
  await assertFails(setDoc(doc(asVerified(ALICE), 'ideas/i1'), {
    title: 'Titre', body: 'Corps', authorUid: ALICE, authorName: 'membre',
    status: 'published', up: 0, down: 0, score: 0,
  }));
});

test('ideas : usurper le nom d\'auteur est refusé', async () => {
  await assertFails(setDoc(doc(asVerified(ALICE), 'ideas/i1'), {
    title: 'Titre', body: 'Corps', authorUid: ALICE, authorName: 'quelquun-dautre',
    status: 'pending', up: 0, down: 0, score: 0,
  }));
});

test('ideas : un non-admin ne peut pas changer le statut', async () => {
  await seedAsAdmin('ideas/i1', {
    title: 'Titre', body: 'Corps', authorUid: ALICE, authorName: 'membre',
    status: 'pending', up: 0, down: 0, score: 0,
  });
  await assertFails(updateDoc(doc(asVerified(ALICE), 'ideas/i1'), { status: 'published' }));
});

test('ideas : une idée en attente n\'est visible que de son auteur', async () => {
  await seedAsAdmin('ideas/i1', {
    title: 'Titre', body: 'Corps', authorUid: ALICE, authorName: 'membre',
    status: 'pending', up: 0, down: 0, score: 0,
  });
  await assertSucceeds(getDoc(doc(asVerified(ALICE), 'ideas/i1')));
  await assertFails(getDoc(doc(asVerified(BOB), 'ideas/i1')));
});

test('ideas : une idée publiée est visible de tout compte connecté', async () => {
  await seedAsAdmin('ideas/i1', {
    title: 'Titre', body: 'Corps', authorUid: ALICE, authorName: 'membre',
    status: 'published', up: 0, down: 0, score: 0,
  });
  await assertSucceeds(getDoc(doc(asVerified(BOB), 'ideas/i1')));
});

// ops/ — plus rien n'y est ouvert. L'etat de la VM passait par `ops/vmStatus`,
// lu en direct par le panneau admin, et `ops/vmWatch` portait sa demande de
// cadence. Le releve vit desormais dans un message Discord (voir
// discord-bot/src/lib/vmstatus.js) : il coutait 720 ecritures Firestore par
// jour au repos et 900 par heure de panneau ouvert, et c'est ce poste qui a
// epuise le quota le 28/08 en fermant l'application a tout le monde.
//
// Le test ci-dessous garde sa valeur : il verifie qu'aucun document de `ops/`
// n'est lisible, ce qui vaut maintenant pour vmStatus et vmWatch comme pour
// les autres.
test('ops : aucun document de la collection ne reste accessible', async () => {
  // Plus aucun `match` sous ops/ : ni les anciens documents de la VM, ni un
  // futur voisin ne doivent devenir lisibles par inadvertance.
  await seedAsAdmin(`roles/${ADMIN_UID}`, { role: 'superadmin' });
  for (const chemin of ['ops/autre', 'ops/vmStatus', 'ops/vmWatch']) {
    await seedAsAdmin(chemin, { x: 1 });
    await assertFails(getDoc(doc(asAdmin(), chemin)));
    await assertFails(setDoc(doc(asAdmin(), chemin), { x: 2 }));
  }
});
