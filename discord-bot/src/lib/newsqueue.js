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
// clique ✅/❌ — et peut changer d'avis tant que la nouveauté n'a pas été
// publiée. Le lundi, newsweekly.js publie les « approved » non envoyés et
// verrouille leur message de validation.

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

/** Message de validation, reflétant le statut courant. Boutons toujours cliquables. */
function validationPayload(id, text, status = 'pending', decidedBy = null) {
  const approved = status === 'approved';
  const rejected = status === 'rejected';

  const embed = new EmbedBuilder()
    .setColor(approved ? 0x16a34a : rejected ? 0xdc2626 : 0x2563eb)
    .setTitle(approved ? '✅ Nouveauté validée' : rejected ? '❌ Nouveauté rejetée' : '🆕 Nouveauté à valider')
    .setDescription(text)
    .setFooter({
      text: status === 'pending'
        ? 'Publiée lundi 18h si validée. Répondez avec des images pour les joindre.'
        : 'Changement d\'avis possible jusqu\'à la publication. Répondez avec des images pour les joindre.',
    })
    .setTimestamp();

  if (decidedBy) embed.addFields({ name: 'Décision', value: `<@${decidedBy}>`, inline: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`nv:ok:${id}`)
      .setLabel('Valider')
      .setStyle(approved ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`nv:no:${id}`)
      .setLabel('Rejeter')
      .setStyle(rejected ? ButtonStyle.Danger : ButtonStyle.Secondary),
  );
  return { embeds: [embed], components: [row] };
}

/** Une pièce jointe est-elle une image ? */
function isImageAttachment(att) {
  if (att.contentType && att.contentType.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(att.name || '');
}

/**
 * Réponse à un message de validation contenant des images : rattache ces
 * photos à la nouveauté (par référence au message, pour récupérer des URLs
 * fraîches le lundi). Retourne true si le message a été traité.
 */
async function handlePhotoReply(message) {
  if (message.channelId !== VALIDATION_CHANNEL) return false;
  const refId = message.reference?.messageId;
  if (!refId) return false;

  const images = [...message.attachments.values()].filter(isImageAttachment);
  if (!images.length) return false;

  const q = await col().where('messageId', '==', refId).limit(1).get();
  if (q.empty) return false; // réponse à un autre message : on laisse passer

  const doc = q.docs[0];
  if (doc.data().sentAt) {
    const warn = await message.reply('Nouveauté déjà publiée — photo non prise en compte.').catch(() => null);
    if (warn) setTimeout(() => warn.delete().catch(() => {}), 6000);
    return true;
  }

  const refs = doc.data().photoRefs || [];
  refs.push({ msgId: message.id, channelId: message.channelId });
  await doc.ref.update({ photoRefs: refs });

  await message.react('✅').catch(() => {});
  return true;
}

/** Message verrouillé après publication (plus de boutons). */
function publishedPayload(text) {
  const embed = new EmbedBuilder()
    .setColor(0x16a34a)
    .setTitle('📢 Publiée aux membres')
    .setDescription(text)
    .setFooter({ text: 'Nouveauté envoyée dans le salon communautaire.' })
    .setTimestamp();
  return { embeds: [embed], components: [] };
}

/** Poste le message de validation et mémorise son id. */
async function postValidation(client, id, text) {
  const channel = await client.channels.fetch(VALIDATION_CHANNEL);
  const msg = await channel.send(validationPayload(id, text, 'pending'));
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
  const ref = col().doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    await interaction.reply({ content: 'Nouveauté introuvable (déjà supprimée ?).', flags: MessageFlags.Ephemeral });
    return;
  }
  if (snap.data().sentAt) {
    await interaction.reply({ content: 'Déjà publiée aux membres — non modifiable.', flags: MessageFlags.Ephemeral });
    return;
  }

  const status = action === 'ok' ? 'approved' : 'rejected';
  await ref.update({ status, decidedBy: interaction.user.id, decidedAt: Date.now() });
  await interaction.update(validationPayload(id, snap.data().text, status, interaction.user.id));
}

function startWatch(client) {
  if (!isConfigured()) {
    console.log('[newsqueue] désactivé (Firestore non configuré)');
    return;
  }
  watch(client);
}

module.exports = {
  startWatch,
  handleButton,
  handlePhotoReply,
  addPending,
  publishedPayload,
  isImageAttachment,
  isNewsButton: (id) => id.startsWith('nv:'),
};
