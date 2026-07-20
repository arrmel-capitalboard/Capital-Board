'use strict';

// Publication hebdomadaire des nouveautés validées : chaque lundi à 18h
// (heure de Paris), un récap groupé des « approved » non encore envoyés est
// posté dans le salon nouveautés, puis ces entrées sont marquées envoyées et
// leur message de validation est verrouillé.
//
// Pas de calcul de délai (DST, redémarrages) : on vérifie l'heure de Paris
// toutes les 10 min et on garde en Firestore la date du dernier lundi traité
// pour ne publier qu'une fois par semaine, même si le bot redémarre.

const { EmbedBuilder } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const newsqueue = require('./newsqueue');

const COMMUNITY_CHANNEL = '1512909014990586047';
const NEWS_IMAGE = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/nouveaute.gif';
const VIOLET = 0x8b5cf6;
const COL = 'newsQueue';
const META = 'botState/newsWeekly';
const CHECK_INTERVAL = 10 * 60 * 1000;

/** Parties de la date courante en heure de Paris. */
function parisParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
}

/** Verrouille le message de validation d'une entrée publiée (best-effort). */
async function lockMessage(client, data) {
  if (!data.messageId || !data.channelId) return;
  try {
    const channel = await client.channels.fetch(data.channelId);
    const msg = await channel.messages.fetch(data.messageId);
    await msg.edit(newsqueue.publishedPayload(data.text, data.imageName || null));
  } catch (e) {
    console.error('[newsweekly] verrouillage message :', e.message);
  }
}

/** URLs fraîches des photos rattachées à une nouveauté (ré-résout les liens signés). */
async function freshImageUrls(client, photoRefs) {
  const urls = [];
  for (const ref of photoRefs || []) {
    try {
      const channel = await client.channels.fetch(ref.channelId);
      const msg = await channel.messages.fetch(ref.msgId);
      for (const att of msg.attachments.values()) {
        if (newsqueue.isImageAttachment(att)) urls.push(att.url);
      }
    } catch (e) {
      console.error('[newsweekly] photo introuvable :', e.message);
    }
  }
  return urls;
}

/**
 * Publie les nouveautés validées non envoyées. Retourne le nombre publié.
 * Partagé par l'envoi automatique du lundi et l'envoi forcé.
 */
async function publish(client) {
  const db = getDb();
  const snap = await db.collection(COL).where('status', '==', 'approved').get();
  const toSend = snap.docs.filter((d) => !d.data().sentAt);
  if (!toSend.length) return 0;

  const embed = new EmbedBuilder()
    .setColor(VIOLET)
    .setTitle('✨ Nouveautés de la semaine')
    .setDescription(toSend.map((d) => `✅  ${d.data().text}`).join('\n'))
    .setImage(NEWS_IMAGE)
    .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
    .setTimestamp();

  const channel = await client.channels.fetch(COMMUNITY_CHANNEL);
  await channel.send({ embeds: [embed] });

  // Photos rattachées : un message par nouveauté qui en a, sous le récap.
  for (const d of toSend) {
    const urls = await freshImageUrls(client, d.data().photoRefs);
    if (!urls.length) continue;
    const embeds = urls.slice(0, 10).map((url, i) => {
      const e = new EmbedBuilder().setColor(VIOLET).setImage(url);
      if (i === 0) e.setTitle(`✅  ${d.data().text}`);
      return e;
    });
    await channel.send({ embeds }).catch((e) => console.error('[newsweekly] envoi photos :', e.message));
  }

  const batch = db.batch();
  toSend.forEach((d) => batch.update(d.ref, { sentAt: Date.now() }));
  await batch.commit();

  for (const d of toSend) await lockMessage(client, d.data());

  console.log(`[newsweekly] ${toSend.length} nouveauté(s) publiée(s)`);
  return toSend.length;
}

/** Envoi forcé (commande /nouveaute-envoi), sans condition de jour/heure. */
function sendNow(client) {
  return publish(client);
}

async function maybeSend(client) {
  const p = parisParts();
  if (p.weekday !== 'Mon' || Number(p.hour) < 18) return;

  const todayKey = `${p.year}-${p.month}-${p.day}`;
  const metaRef = getDb().doc(META);
  const meta = await metaRef.get();
  if (meta.exists && meta.data().lastMonday === todayKey) return; // déjà fait cette semaine

  const n = await publish(client);
  if (!n) console.log('[newsweekly] aucune nouveauté validée à publier cette semaine');
  await metaRef.set({ lastMonday: todayKey }, { merge: true });
}

function start(client) {
  if (!isConfigured()) {
    console.log('[newsweekly] désactivé (Firestore non configuré)');
    return;
  }
  maybeSend(client).catch((e) => console.error('[newsweekly] erreur :', e.message));
  setInterval(() => maybeSend(client).catch((e) => console.error('[newsweekly] erreur :', e.message)), CHECK_INTERVAL);
}

module.exports = { start, sendNow };
