'use strict';

// File d'attente des nouveautés à valider avant publication communautaire.
//
//   newsQueue/{id} = {
//     text,                     // ligne affichée aux membres
//     source: 'quotidien'|'manuel',
//     sha, shas,                // commits couverts par la phrase (ou null)
//     subject,                  // sujets techniques d'origine, jamais publiés
//     jour,                     // journée relue (AAAA-MM-JJ), source quotidien
//     status: 'pending'|'approved'|'rejected',
//     createdAt, decidedAt, decidedBy, sentAt,
//     messageId, channelId,     // message de validation Discord
//   }
//
// Flux : un doc « pending » est créé, soit par le balayage du matin (10h,
// scripts/news-daily.mjs relit les commits de la veille et en tire au plus
// quatre phrases regroupées), soit à la main par /nouveaute. Le bot poste un
// message avec ses boutons dans le salon validation : Valider / Rejeter /
// Modifier le texte. Les nouveautés sont texte seul — aucune image ne peut
// être jointe. Les règles de rédaction sont dans nouveautes.md, à la racine.
// Le lundi, newsweekly.js publie les « approved » non envoyés et verrouille
// leur message de validation.

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  ModalBuilder, LabelBuilder,
  TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { getDb, isConfigured } = require('../firebase');

const VALIDATION_CHANNEL = '1528790209150324807';
const FONDATEUR_ROLE     = '1512905140108001391';
const COL = 'newsQueue';

const col = () => getDb().collection(COL);

/** Ajoute une nouveauté à la file. Retourne l'id du doc créé. */
async function addPending(text, { source = 'manuel', sha = null } = {}) {
  const ref = await col().add({
    text,
    source,
    sha,
    status: 'pending',
    createdAt: Date.now(),
    sentAt: null,
    messageId: null,
  });
  return ref.id;
}

/** Message de validation, reflétant le statut courant. */
function validationPayload(id, text, status = 'pending', decidedBy = null, subject = null) {
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

  /* Le ou les sujets de commit d'origine. Ils ne partent jamais aux membres :
     ils sont là pour juger la reformulation — une phrase peut être jolie et
     décrire autre chose que ce qui a été fait. */
  if (subject) {
    embed.addFields({ name: 'Écrit à partir de', value: `\`${String(subject).slice(0, 1000)}\`` });
  }

  if (decidedBy) embed.addFields({ name: 'Décision', value: `<@${decidedBy}>`, inline: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`nv:ok:${id}`).setLabel('Valider').setStyle(approved ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`nv:no:${id}`).setLabel('Rejeter').setStyle(rejected ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`nv:edit:${id}`).setLabel('Modifier le texte').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
  );
  return { embeds: [embed], components: [row] };
}

/** Payload depuis un doc Firestore. */
function payloadFromDoc(id, data) {
  return validationPayload(id, data.text, data.status || 'pending', data.decidedBy || null, data.subject || null);
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
  if (action === 'edit') return showTextModal(interaction, id);

  // Valider / rejeter.
  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }
  // Discord invalide le jeton d'interaction au bout de 3 s. Les deux appels
  // Firestore qui suivent depassent ce delai des que la base ralentit — d'ou
  // les « Unknown interaction » (10062). On accuse reception d'abord : le
  // message reste tel quel a l'ecran jusqu'au editReply.
  await interaction.deferUpdate();

  const snap = await col().doc(id).get();
  if (!snap.exists) {
    await interaction.followUp({ content: 'Nouveauté introuvable (déjà supprimée ?).', flags: MessageFlags.Ephemeral });
    return;
  }
  if (snap.data().sentAt) {
    await interaction.followUp({ content: 'Déjà publiée aux membres — non modifiable.', flags: MessageFlags.Ephemeral });
    return;
  }

  const status = action === 'ok' ? 'approved' : 'rejected';
  await snap.ref.update({ status, decidedBy: interaction.user.id, decidedAt: Date.now() });
  await interaction.editReply(payloadFromDoc(id, { ...snap.data(), status, decidedBy: interaction.user.id }));
}

/** Bouton « Modifier le texte » → modal pré-rempli avec le texte courant. */
async function showTextModal(interaction, id) {
  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }
  // Un modal doit etre la premiere reponse a l'interaction : impossible de
  // deferer, et le jeton meurt en 3 s. Le texte courant est deja dans l'embed
  // du message, on evite donc la lecture Firestore ; l'existence du doc et le
  // fait qu'il ne soit pas deja publie sont reverifies a la soumission.
  const courant = interaction.message?.embeds?.[0]?.description || '';

  const input = new TextInputBuilder()
    .setCustomId('text')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(courant.slice(0, 500))
    .setRequired(true)
    .setMaxLength(500);
  const label = new LabelBuilder()
    .setLabel('Texte de la nouveauté (en français)')
    .setDescription('Ce texte sera affiché aux membres. Rédigez-le en français.')
    .setTextInputComponent(input);
  const modal = new ModalBuilder()
    .setCustomId(`nvtxt:${id}`)
    .setTitle('Modifier le texte')
    .addLabelComponents(label);

  await interaction.showModal(modal);
}

/** Soumission du modal texte : met à jour le texte et rafraîchit la validation. */
async function handleTextModal(interaction) {
  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }

  const id = interaction.customId.slice('nvtxt:'.length);
  const text = (interaction.fields.getTextInputValue('text') || '').trim();
  if (!text) {
    await interaction.reply({ content: 'Le texte ne peut pas être vide.', flags: MessageFlags.Ephemeral });
    return;
  }

  // Trois appels distants suivent, pour 3 s de jeton : on accuse reception.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const ref = col().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    await interaction.editReply({ content: 'Nouveauté introuvable.' });
    return;
  }
  if (snap.data().sentAt) {
    await interaction.editReply({ content: 'Déjà publiée — non modifiable.' });
    return;
  }

  const data = snap.data();
  await ref.update({ text });

  // Rafraîchit le message de validation avec le nouveau texte.
  try {
    if (data.messageId && data.channelId) {
      const ch = await interaction.client.channels.fetch(data.channelId);
      const vm = await ch.messages.fetch(data.messageId);
      await vm.edit(payloadFromDoc(id, { ...data, text }));
    }
  } catch (e) {
    console.error('[newsqueue] edit texte validation :', e.message);
  }

  await interaction.editReply({ content: 'Texte mis à jour.' });
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
  handleTextModal,
  addPending,
  publishedPayload,
  isNewsButton: (id) => id.startsWith('nv:'),
  isNewsTextModal: (id) => id.startsWith('nvtxt:'),
};
