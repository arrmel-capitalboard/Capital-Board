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
// ou par /nouveaute). Le bot poste un message avec deux boutons dans le salon
// validation : Valider / Rejeter. Les images se joignent via /nouveaute-image
// (pièce jointe native), qui ré-héberge l'image dans le salon validation pour
// disposer d'URLs fraîches à la publication (les liens CDN Discord expirent).
// Le lundi, newsweekly.js publie les « approved » non envoyés (texte + photos)
// et verrouille leur message de validation.

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  ModalBuilder, LabelBuilder, FileUploadBuilder,
} = require('discord.js');
const { getDb, isConfigured } = require('../firebase');

const VALIDATION_CHANNEL = '1528790209150324807';
const FONDATEUR_ROLE     = '1512905140108001391';
const COL = 'newsQueue';

const col = () => getDb().collection(COL);

/** Une pièce jointe est-elle une image ? */
function isImageAttachment(att) {
  if (att.contentType && att.contentType.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(att.name || '');
}

/** Ajoute une nouveauté à la file. Retourne l'id du doc créé. */
async function addPending(text, { source = 'manuel', sha = null, photoRefs = [] } = {}) {
  const ref = await col().add({
    text,
    source,
    sha,
    status: 'pending',
    createdAt: Date.now(),
    sentAt: null,
    messageId: null,
    photoRefs,
  });
  return ref.id;
}

/** Message de validation, reflétant le statut courant. */
function validationPayload(id, text, status = 'pending', decidedBy = null, hasImage = false) {
  const approved = status === 'approved';
  const rejected = status === 'rejected';

  const embed = new EmbedBuilder()
    .setColor(approved ? 0x16a34a : rejected ? 0xdc2626 : 0x2563eb)
    .setTitle(approved ? '✅ Nouveauté validée' : rejected ? '❌ Nouveauté rejetée' : '🆕 Nouveauté à valider')
    .setDescription(text)
    .setFooter({
      text: status === 'pending'
        ? 'Publiée lundi 18h si validée. Image : /nouveaute-image'
        : 'Changement d\'avis possible jusqu\'à la publication.',
    })
    .setTimestamp();

  if (decidedBy) embed.addFields({ name: 'Décision', value: `<@${decidedBy}>`, inline: true });
  if (hasImage) embed.addFields({ name: 'Image', value: '🖼️ jointe', inline: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`nv:ok:${id}`).setLabel('Valider').setStyle(approved ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`nv:no:${id}`).setLabel('Rejeter').setStyle(rejected ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`nv:img:${id}`).setLabel(hasImage ? 'Changer l\'image' : 'Ajouter une image').setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
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
async function postValidation(client, id, data) {
  const channel = await client.channels.fetch(VALIDATION_CHANNEL);
  const msg = await channel.send(payloadFromDoc(id, data));
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
          postValidation(client, doc.id, doc.data())
            .catch((e) => console.error('[newsqueue] post validation :', e.message));
        }
      },
      (err) => console.error('[newsqueue] listener interrompu :', err.message),
    );
}

/** Routeur des boutons nv:*. */
async function handleButton(interaction) {
  const [, action, id] = interaction.customId.split(':');
  if (action === 'img') return showImageModal(interaction, id);

  // Valider / rejeter.
  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }
  const snap = await col().doc(id).get();
  if (!snap.exists) {
    await interaction.reply({ content: 'Nouveauté introuvable (déjà supprimée ?).', flags: MessageFlags.Ephemeral });
    return;
  }
  if (snap.data().sentAt) {
    await interaction.reply({ content: 'Déjà publiée aux membres — non modifiable.', flags: MessageFlags.Ephemeral });
    return;
  }

  const status = action === 'ok' ? 'approved' : 'rejected';
  await snap.ref.update({ status, decidedBy: interaction.user.id, decidedAt: Date.now() });
  await interaction.update(payloadFromDoc(id, { ...snap.data(), status, decidedBy: interaction.user.id }));
}

/** Bouton « Ajouter/Changer l'image » → ouvre un modal avec upload de fichiers. */
async function showImageModal(interaction, id) {
  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }
  const snap = await col().doc(id).get();
  if (!snap.exists) {
    await interaction.reply({ content: 'Nouveauté introuvable (déjà supprimée ?).', flags: MessageFlags.Ephemeral });
    return;
  }
  if (snap.data().sentAt) {
    await interaction.reply({ content: 'Déjà publiée aux membres — non modifiable.', flags: MessageFlags.Ephemeral });
    return;
  }

  const upload = new FileUploadBuilder()
    .setCustomId('images')
    .setMinValues(1)
    .setMaxValues(10)
    .setRequired(true);
  const label = new LabelBuilder()
    .setLabel('Image(s) de la nouveauté')
    .setDescription('Jusqu\'à 10 fichiers image. Remplace l\'image actuelle.')
    .setFileUploadComponent(upload);
  const modal = new ModalBuilder()
    .setCustomId(`nvimg:${id}`)
    .setTitle('Ajouter une image')
    .addLabelComponents(label);

  await interaction.showModal(modal);
}

/** Soumission du modal d'upload : ré-héberge les fichiers et les rattache. */
async function handleImageModal(interaction) {
  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }

  const id = interaction.customId.slice('nvimg:'.length);
  const raw = interaction.fields.getUploadedFiles('images');
  // getUploadedFiles renvoie une Collection : .values() marche aussi pour un array.
  const files = raw ? [...raw.values()] : [];
  const images = files.filter(isImageAttachment);
  if (!images.length) {
    await interaction.reply({ content: 'Aucune image valide reçue.', flags: MessageFlags.Ephemeral });
    return;
  }

  const ref = col().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    await interaction.reply({ content: 'Nouveauté introuvable.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (snap.data().sentAt) {
    await interaction.reply({ content: 'Déjà publiée — non modifiable.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const channel = await interaction.client.channels.fetch(VALIDATION_CHANNEL);
  const msg = await channel.send({
    content: `🖼️ ${snap.data().text}`.slice(0, 200),
    files: images.map((a) => a.url),
  });
  await ref.update({ photoRefs: [{ msgId: msg.id, channelId: channel.id }] });

  const data = (await ref.get()).data();
  if (data.messageId && data.channelId) {
    try {
      const ch = await interaction.client.channels.fetch(data.channelId);
      const vm = await ch.messages.fetch(data.messageId);
      await vm.edit(payloadFromDoc(id, data));
    } catch (e) {
      console.error('[newsqueue] refresh validation msg :', e.message);
    }
  }

  await interaction.editReply(`${images.length} image(s) jointe(s).`);
}

/** Ré-héberge une image dans le salon validation (URLs fraîches durables). */
async function rehost(client, url, text) {
  const channel = await client.channels.fetch(VALIDATION_CHANNEL);
  const msg = await channel.send({ content: `🖼️ ${text}`.slice(0, 200), files: [url] });
  return { msgId: msg.id, channelId: channel.id };
}

/** Nouveautés encore modifiables (pour l'autocomplétion de /nouveaute-image). */
async function listOpen() {
  const snap = await col().where('status', 'in', ['pending', 'approved']).get();
  return snap.docs.filter((d) => !d.data().sentAt).map((d) => ({ id: d.id, text: d.data().text }));
}

/** Joint (ou remplace) l'image d'une nouveauté existante. */
async function attachImage(client, id, url, text) {
  const ref = col().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, reason: 'Nouveauté introuvable.' };
  if (snap.data().sentAt) return { ok: false, reason: 'Déjà publiée — non modifiable.' };

  const photoRef = await rehost(client, url, text || snap.data().text);
  await ref.update({ photoRefs: [photoRef] });

  const data = (await ref.get()).data();
  if (data.messageId && data.channelId) {
    try {
      const ch = await client.channels.fetch(data.channelId);
      const vm = await ch.messages.fetch(data.messageId);
      await vm.edit(payloadFromDoc(id, data));
    } catch (e) {
      console.error('[newsqueue] refresh validation msg :', e.message);
    }
  }
  return { ok: true };
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
  handleImageModal,
  addPending,
  rehost,
  attachImage,
  listOpen,
  publishedPayload,
  isImageAttachment,
  isNewsButton: (id) => id.startsWith('nv:'),
  isNewsModal: (id) => id.startsWith('nvimg:'),
};
