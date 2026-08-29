'use strict';

// Alertes opérationnelles (quotas API externes pour l'instant) écrites par
// des scripts serveur via le SDK admin — scripts/daily-recap.js pour
// Tavily/Mistral. Même flux que signalements.js : le script écrit un doc, ce
// module l'écoute et le poste. Pas de règle Firestore à ouvrir : écriture et
// lecture passent toutes les deux par le SDK admin.
//
//   opsAlerts/{id} = { type, texte, createdAt, salon?, titre?, couleur?, mention?, posteLe?, messageId? }
//
// `salon` permet à l'émetteur de router son alerte vers un salon précis (le
// scan de sécurité a le sien) sans toucher à la config du bot. Absent, on
// retombe sur OPS_ALERTS_CHANNEL_ID.

const { EmbedBuilder } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const config = require('../config');
const quota = require('./quota');

const COL = 'opsAlerts';
const col = () => getDb().collection(COL);

function payload(data) {
  // `titre` et `couleur` permettent à l'émetteur de sortir de l'habillage
  // « alerte » : un compte rendu de scan sans problème arrive en vert.
  const embed = new EmbedBuilder()
    .setColor(Number.isInteger(data.couleur) ? data.couleur : 0xff9f43)
    .setTitle(data.titre || `⚠ Alerte ops — ${data.type || 'inconnue'}`)
    .setDescription(String(data.texte || '').slice(0, 4000))
    .setTimestamp(data.createdAt || Date.now());

  // Une mention placée dans un embed ne notifie personne : Discord ne la
  // résout que dans le contenu du message. `allowedMentions` la borne au seul
  // rôle demandé, pour qu'un texte d'alerte ne puisse pas pinger @everyone.
  const roleId = data.mention ? String(data.mention) : null;
  return {
    ...(roleId ? { content: `<@&${roleId}>` } : {}),
    embeds: [embed],
    allowedMentions: { roles: roleId ? [roleId] : [], parse: [] },
  };
}

async function poster(client, id, data) {
  const cible = data.salon || config.opsAlertsChannel;
  if (!cible) throw new Error('aucun salon de destination (ni `salon`, ni OPS_ALERTS_CHANNEL_ID)');
  const channel = await client.channels.fetch(cible);
  const msg = await channel.send(payload(data));
  await col().doc(id).update({ posteLe: Date.now(), messageId: msg.id, channelId: channel.id });
}

function start(client) {
  if (!config.opsAlertsChannel) {
    console.warn('[ops-alerts] OPS_ALERTS_CHANNEL_ID non défini : seules les alertes précisant un `salon` seront postées.');
  }
  if (!isConfigured()) {
    console.warn('[ops-alerts] Firestore non configuré : écoute désactivée.');
    return;
  }
  col().onSnapshot(
    (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;
        const doc = change.doc;
        if (doc.data().posteLe) continue;
        // Pas de garde `estEpuise()` ici : `posteLe` est ce qui empeche de
        // reposter la meme alerte au prochain demarrage. Se taire ferait
        // doublonner l'alerte plutot que d'economiser une ecriture.
        poster(client, doc.id, doc.data())
          .catch((e) => {
            if (!quota.signaler(client, e, 'ops-alerts')) console.error('[ops-alerts] envoi :', e.message);
          });
      }
    },
    (err) => console.error('[ops-alerts] listener interrompu :', err.message),
  );
}

module.exports = { start };
