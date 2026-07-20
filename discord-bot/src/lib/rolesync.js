'use strict';

// Attribution automatique du rôle « compte lié » selon l'état du compte Capital Board.
//
// Un membre a droit au rôle si :
//   1. discordLinks/{discordId} existe (liaison faite via /link + confirmation site)
//   2. users/{uid} existe encore (le compte n'a pas été supprimé)
//
// La condition 2 est nécessaire : deleteAllUserData() (js/app.js) supprime
// users/{uid} mais ne peut pas retrouver le doc discordLinks correspondant
// (indexé par discordId, pas par uid). Le lien reste donc orphelin — le sweep
// le détecte et le supprime.
//
// Deux mécanismes complémentaires :
//   - listener Firestore sur discordLinks : attribution/retrait immédiat
//   - sweep périodique : réconciliation complète (rattrape les comptes supprimés,
//     les événements manqués pendant un redémarrage du bot, les rôles retirés à la main)

const { getDb, isConfigured } = require('../firebase');
const config = require('../config');

const SWEEP_INTERVAL = 15 * 60 * 1000;

const roleId = () => config.roleCompteLie;

/** Serveurs où le rôle existe (le bot peut être sur plusieurs guilds). */
function targetGuilds(client) {
  return [...client.guilds.cache.values()].filter((g) => g.roles.cache.has(roleId()));
}

/** True si le compte Capital Board existe encore. */
async function userExists(uid) {
  if (!uid) return false;
  const snap = await getDb().doc(`users/${uid}`).get();
  return snap.exists;
}

/** Ajoute ou retire le rôle à un membre, sur tous les serveurs concernés. */
async function applyRole(client, discordId, grant) {
  for (const guild of targetGuilds(client)) {
    let member;
    try {
      member = await guild.members.fetch(discordId);
    } catch {
      continue; // pas (ou plus) sur le serveur
    }

    const has = member.roles.cache.has(roleId());
    if (grant === has) continue;

    try {
      if (grant) await member.roles.add(roleId());
      else await member.roles.remove(roleId());
      console.log(`[rolesync] ${grant ? '+' : '-'} rôle pour ${member.user.tag}`);
    } catch (err) {
      // Cause la plus fréquente : le rôle du bot est sous le rôle à attribuer
      // dans la hiérarchie du serveur.
      console.error(`[rolesync] échec ${grant ? 'ajout' : 'retrait'} pour ${discordId} : ${err.message}`);
    }
  }
}

/** Retrait immédiat, appelé par /unlink (le listener le ferait aussi, mais plus tard). */
async function revoke(client, discordId) {
  if (!roleId()) return;
  await applyRole(client, discordId, false).catch(() => {});
}

/**
 * Réconciliation complète : lit tous les liens, supprime les orphelins,
 * puis aligne les rôles de tous les membres sur cet état.
 */
async function sweep(client) {
  const db = getDb();
  const snap = await db.collection('discordLinks').get();

  const eligible = new Set();
  const orphans = [];

  if (!snap.empty) {
    const refs = snap.docs.map((d) => db.doc(`users/${d.data().uid || '__absent__'}`));
    const users = await db.getAll(...refs);
    snap.docs.forEach((doc, i) => {
      if (users[i].exists) eligible.add(doc.id);
      else orphans.push(doc.ref);
    });
  }

  if (orphans.length) {
    const batch = db.batch();
    orphans.forEach((ref) => batch.delete(ref));
    await batch.commit();
    console.log(`[rolesync] ${orphans.length} lien(s) orphelin(s) supprimé(s) (compte supprimé)`);
  }

  for (const guild of targetGuilds(client)) {
    const members = await guild.members.fetch();
    for (const member of members.values()) {
      if (member.user.bot) continue;
      const should = eligible.has(member.id);
      const has = member.roles.cache.has(roleId());
      if (should !== has) await applyRole(client, member.id, should);
    }
  }
}

/** Écoute les changements de discordLinks pour réagir sans attendre le sweep. */
function watch(client) {
  getDb()
    .collection('discordLinks')
    .onSnapshot(
      (snap) => {
        for (const change of snap.docChanges()) {
          const discordId = change.doc.id;
          if (change.type === 'removed') {
            applyRole(client, discordId, false).catch(() => {});
          } else {
            userExists(change.doc.data().uid)
              .then((ok) => applyRole(client, discordId, ok))
              .catch(() => {});
          }
        }
      },
      (err) => console.error('[rolesync] listener interrompu :', err.message),
    );
}

function start(client) {
  if (!isConfigured()) {
    console.log('[rolesync] désactivé (Firestore non configuré)');
    return;
  }
  if (!roleId()) {
    console.log('[rolesync] désactivé (ROLE_COMPTE_LIE non renseigné)');
    return;
  }

  watch(client);
  sweep(client).catch((err) => console.error('[rolesync] erreur sweep initial :', err.message));
  setInterval(
    () => sweep(client).catch((err) => console.error('[rolesync] erreur sweep :', err.message)),
    SWEEP_INTERVAL,
  );
}

module.exports = { start, revoke };
