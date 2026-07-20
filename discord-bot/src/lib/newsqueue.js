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
//     photoRefs: [{ msgId, channelId }], // messages portant les images jointes
//   }
//
// Flux : un doc « pending » est créé (par le workflow à chaque commit feat,
// ou par /nouveaute). Le bot poste un message avec trois boutons dans le salon
// validation : Valider, Rejeter, et Ajouter/Changer l'image. Le fondateur peut
// changer d'avis tant que la nouveauté n'a pas été publiée. Le lundi,
// newsweekly.js publie les « approved » non envoyés (texte + photos) et
// verrouille leur message de validation.

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');

const VALIDATION_CHANNEL = '1528790209150324807';
const FONDATEUR_ROLE     = '1512905140108001391';
const COL = 'newsQueue';
const COLLECT_MS = 60_000;

const col = () => getDb().collection(COL);

/** Une pièce jointe est-elle une image ? */
function isImageAttachment(att) {
  if (att.contentType && att.contentType.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(att.name || '');
}

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
    photoRefs: [],
  });
}

/** Message de validation, reflétant le statut courant. Boutons toujours cliquables. */
function validationPayload(id, text, status = 'pending', decidedBy = null, hasImage = false) {
  const approved = status === 'approved';
  const rejected = status === 'rejected';

  const embed = new EmbedBuilder()
    .setColor(approved ? 0x16a34a : rejected ? 0xdc2626 : 0x2563eb)
    .setTitle(approved ? '✅ Nouveauté validée' : rejected ? '❌ Nouveauté rejetée' : '🆕 Nouveauté à valider')
    .setDescription(text)
    .setFooter({
      text: status === 'pending'
        ? 'Publiée lundi 18h si validée.'
        : 'Changement d\'avis possible jusqu\'à la publication.',
    })
    .setTimestamp();

  if (decidedBy) embed.addFields({ name: 'Décision', value: `<@${decidedBy}>`, inline: true });
  if (hasImage) embed.addFields({ name: 'Image', value: '🖼️ jointe', inline: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`nv:ok:${id}`)
      .setLabel('Valider')
      .setStyle(approved ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`nv:no:${id}`)
      .setLabel('Rejeter')
      .setStyle(rejected ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`nv:img:${id}`)
      .setLabel(hasImage ? 'Changer l\'image' : 'Ajouter une image')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🖼️'),
  );
  return { embeds: [embed], components: [row] };
}

/** Payload depuis un doc Firestore. */
function payloadFromDoc(id, data) {
  return validationPayload(id, data.text, data.status || 'pending', data.decidedBy || null, Boolean(data.photoRefs?.length));
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

/** Garde commune aux boutons : fondateur, doc existant, non publié. Retourne le doc ou null. */
async function guardButton(interaction, id) {
  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return null;
  }
  const snap = await col().doc(id).get();
  if (!snap.exists) {
    await interaction.reply({ content: 'Nouveauté introuvable (déjà supprimée ?).', flags: MessageFlags.Ephemeral });
    return null;
  }
  if (snap.data().sentAt) {
    await interaction.reply({ content: 'Déjà publiée aux membres — non modifiable.', flags: MessageFlags.Ephemeral });
    return null;
  }
  return snap;
}

/** Routeur des boutons nv:*. */
async function handleButton(interaction) {
  const [, action, id] = interaction.customId.split(':');
  if (action === 'img') return addImage(interaction, id);
  return decide(interaction, id, action === 'ok' ? 'approved' : 'rejected');
}

/** Valider / rejeter. */
async function decide(interaction, id, status) {
  const snap = await guardButton(interaction, id);
  if (!snap) return;
  await snap.ref.update({ status, decidedBy: interaction.user.id, decidedAt: Date.now() });
  const data = { ...snap.data(), status, decidedBy: interaction.user.id };
  await interaction.update(payloadFromDoc(id, data));
}

/** Bouton « Ajouter/Changer l'image » : capte le prochain message-image du fondateur. */
async function addImage(interaction, id) {
  const snap = await guardButton(interaction, id);
  if (!snap) return;

  await interaction.reply({
    content: 'Envoyez l\'image dans ce salon (60 s). Elle remplacera l\'image actuelle.',
    flags: MessageFlags.Ephemeral,
  });

  const filter = (m) =>
    m.author.id === interaction.user.id && [...m.attachments.values()].some(isImageAttachment);
  const collector = interaction.channel.createMessageCollector({ filter, time: COLLECT_MS, max: 1 });

  collector.on('collect', async (m) => {
    try {
      await snap.ref.update({ photoRefs: [{ msgId: m.id, channelId: m.channelId }] });
      await m.react('✅').catch(() => {});
      const fresh = (await snap.ref.get()).data();
      await interaction.message.edit(payloadFromDoc(id, fresh)).catch(() => {});
      await interaction.editReply({ content: 'Image enregistrée.' }).catch(() => {});
    } catch (e) {
      console.error('[newsqueue] enregistrement image :', e.message);
      await interaction.editReply({ content: 'Erreur lors de l\'enregistrement.' }).catch(() => {});
    }
  });

  collector.on('end', (collected) => {
    if (!collected.size) {
      interaction.editReply({ content: 'Temps écoulé, aucune image ajoutée.' }).catch(() => {});
    }
  });
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
  addPending,
  publishedPayload,
  isImageAttachment,
  isNewsButton: (id) => id.startsWith('nv:'),
};
