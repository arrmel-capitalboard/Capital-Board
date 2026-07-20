'use strict';

// File d'attente des nouveautés à valider avant publication communautaire.
//
//   newsQueue/{id} = {
//     text,                     // ligne affichée aux membres
//     source: 'commit'|'manuel',
//     sha,                      // hash du commit (source commit) ou null
//     status: 'pending'|'approved'|'rejected',
//     createdAt, decidedAt, decidedBy, sentAt,
//     messageId, channelId,     // message de validation Discord
//   }
//
// Flux : un doc « pending » est créé (par le workflow à chaque commit feat,
// ou par /nouveaute). Le bot écoute la collection, poste un message avec deux
// boutons dans le salon validation, et enregistre le messageId. Le fondateur
// clique ✅/❌ → statut mis à jour. Le lundi, newsweekly.js publie les
// « approved » non encore envoyés (voir ce module).

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');

const VALIDATION_CHANNEL = '1528790209150324807';
const FONDATEUR_ROLE     = '1512905140108001391';
const COL = 'newsQueue';

const col = () => getDb().collection(COL);

/** Ajoute une nouveauté manuelle à la file (le watcher postera le message). */
async function addPending(text, { source = 'manuel', sha = null } = {}) {
  await col().add({
    text,
    source,
    sha,
    status: 'pending',
    createdAt: Date.now(),
    sentAt: null,
    messageId: null,
  });
}

function validationPayload(id, text) {
  const embed = new EmbedBuilder()
    .setColor(0x2563eb)
    .setTitle('🆕 Nouveauté à valider')
    .setDescription(text)
    .setFooter({ text: 'Publiée aux membres lundi 18h si validée.' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`nv:ok:${id}`).setLabel('Valider').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`nv:no:${id}`).setLabel('Rejeter').setStyle(ButtonStyle.Danger),
  );
  return { embeds: [embed], components: [row] };
}

/** Poste le message de validation et mémorise son id. */
async function postValidation(client, id, text) {
  const channel = await client.channels.fetch(VALIDATION_CHANNEL);
  const msg = await channel.send(validationPayload(id, text));
  await col().doc(id).update({ messageId: msg.id, channelId: channel.id });
}

/** Écoute les nouveaux docs « pending » sans message et poste leur validation. */
function watch(client) {
  col()
    .where('status', '==', 'pending')
    .onSnapshot(
      (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type !== 'added') continue;
          const doc = change.doc;
          if (doc.data().messageId) continue; // déjà posté (chargement initial)
          postValidation(client, doc.id, doc.data().text)
            .catch((e) => console.error('[newsqueue] post validation :', e.message));
        }
      },
      (err) => console.error('[newsqueue] listener interrompu :', err.message),
    );
}

/** Clic sur ✅/❌ sous un message de validation. */
async function handleButton(interaction) {
  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Validation reservee au role fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }

  const [, action, id] = interaction.customId.split(':');
  const approved = action === 'ok';

  await col().doc(id).update({
    status: approved ? 'approved' : 'rejected',
    decidedBy: interaction.user.id,
    decidedAt: Date.now(),
  });

  const base = interaction.message.embeds[0];
  const embed = EmbedBuilder.from(base)
    .setColor(approved ? 0x16a34a : 0xdc2626)
    .setTitle(approved ? '✅ Nouveauté validée' : '❌ Nouveauté rejetée')
    .setFields({ name: 'Décision', value: `<@${interaction.user.id}>`, inline: true })
    .setFooter({ text: approved ? 'Sera publiée au prochain envoi (lundi 18h).' : 'Ne sera pas publiée.' });

  await interaction.update({ embeds: [embed], components: [] });
}

function startWatch(client) {
  if (!isConfigured()) {
    console.log('[newsqueue] désactivé (Firestore non configuré)');
    return;
  }
  watch(client);
}

module.exports = { startWatch, handleButton, addPending, isNewsButton: (id) => id.startsWith('nv:') };
