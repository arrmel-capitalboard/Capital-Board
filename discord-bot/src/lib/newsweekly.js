'use strict';

// Publication hebdomadaire des nouveautés validées : chaque lundi à 18h
// (heure de Paris), un récap groupé des « approved » non encore envoyés est
// posté dans le salon nouveautés, puis ces entrées sont marquées envoyées.
//
// Pas de calcul de délai (DST, redémarrages) : on vérifie l'heure de Paris
// toutes les 10 min et on garde en Firestore la date du dernier lundi traité
// pour ne publier qu'une fois par semaine, même si le bot redémarre.

const { EmbedBuilder } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');

const COMMUNITY_CHANNEL = '1512909014990586047';
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

async function maybeSend(client) {
  const p = parisParts();
  if (p.weekday !== 'Mon' || Number(p.hour) < 18) return;

  const todayKey = `${p.year}-${p.month}-${p.day}`;
  const db = getDb();
  const metaRef = db.doc(META);
  const meta = await metaRef.get();
  if (meta.exists && meta.data().lastMonday === todayKey) return; // déjà fait cette semaine

  const snap = await db.collection(COL).where('status', '==', 'approved').get();
  const toSend = snap.docs.filter((d) => !d.data().sentAt);

  if (toSend.length) {
    const embed = new EmbedBuilder()
      .setColor(0xfde047)
      .setTitle('✨ Nouveautés de la semaine')
      .setDescription(toSend.map((d) => `✅  ${d.data().text}`).join('\n'))
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();

    const channel = await client.channels.fetch(COMMUNITY_CHANNEL);
    await channel.send({ embeds: [embed] });

    const batch = db.batch();
    toSend.forEach((d) => batch.update(d.ref, { sentAt: Date.now() }));
    await batch.commit();
    console.log(`[newsweekly] ${toSend.length} nouveauté(s) publiée(s)`);
  } else {
    console.log('[newsweekly] aucune nouveauté validée à publier cette semaine');
  }

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

module.exports = { start };
