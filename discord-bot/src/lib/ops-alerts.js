'use strict';

// Alertes opérationnelles (quotas API externes pour l'instant) écrites par
// des scripts serveur via le SDK admin — scripts/daily-recap.js pour
// Tavily/Mistral. Même flux que signalements.js : le script écrit un doc, ce
// module l'écoute et le poste. Pas de règle Firestore à ouvrir : écriture et
// lecture passent toutes les deux par le SDK admin.
//
//   opsAlerts/{id} = { type, texte, createdAt, posteLe?, messageId? }

const { EmbedBuilder } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const config = require('../config');

const COL = 'opsAlerts';
const col = () => getDb().collection(COL);

function payload(data) {
  const embed = new EmbedBuilder()
    .setColor(0xff9f43)
    .setTitle(`⚠ Alerte ops — ${data.type || 'inconnue'}`)
    .setDescription(String(data.texte || '').slice(0, 4000))
    .setTimestamp(data.createdAt || Date.now());
  return { embeds: [embed] };
}

async function poster(client, id, data) {
  const channel = await client.channels.fetch(config.opsAlertsChannel);
  const msg = await channel.send(payload(data));
  await col().doc(id).update({ posteLe: Date.now(), messageId: msg.id, channelId: channel.id });
}

function start(client) {
  if (!config.opsAlertsChannel) {
    console.warn('[ops-alerts] OPS_ALERTS_CHANNEL_ID non défini : écoute désactivée.');
    return;
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
        poster(client, doc.id, doc.data())
          .catch((e) => console.error('[ops-alerts] envoi :', e.message));
      }
    },
    (err) => console.error('[ops-alerts] listener interrompu :', err.message),
  );
}

module.exports = { start };
