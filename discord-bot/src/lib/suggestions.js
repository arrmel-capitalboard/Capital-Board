'use strict';

// Suggestions communautaires.
//
// Flux :
//  1) `npm run embed -- suggestion` poste un embed + bouton dans le salon
//     suggestions (salon défini dans lib/embeds.js).
//  2) L'utilisateur clique « Proposer une suggestion » → modal (texte + liens
//     + captures optionnelles).
//  3) À l'envoi : la suggestion arrive dans le salon de validation avec boutons
//     Accepter / Refuser, et l'utilisateur reçoit une confirmation en DM.
//  4) L'équipe clique Accepter/Refuser → modal note (optionnelle) → l'auteur
//     reçoit la décision (+ note) en DM, et le message de validation est verrouillé.
//
// Pas de stockage : l'id de l'auteur est encodé dans le customId des boutons,
// et le texte de la suggestion est relu depuis l'embed de validation.

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, LabelBuilder, TextInputBuilder, TextInputStyle, FileUploadBuilder,
  AttachmentBuilder, MessageFlags,
} = require('discord.js');

const REVIEW_CHANNEL     = '1528920650570535132';
const FONDATEUR_ROLE     = '1512905140108001391';
const BRAND              = 0x7c6df5;
const GREEN              = 0x16a34a;
const RED                = 0xdc2626;

function isImageAttachment(att) {
  if (att.contentType && att.contentType.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(att.name || '');
}
function imageExt(att) {
  const m = (att.name || '').match(/\.(png|jpe?g|gif|webp)$/i);
  if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
  const ct = att.contentType || '';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  return 'jpg';
}

// ── Embed d'accueil (publié via lib/embeds.js) ─────────────────────────────
function panelPayload() {
  const embed = new EmbedBuilder()
    .setColor(BRAND)
    .setTitle('💡  Proposez vos suggestions')
    .setDescription(
      "Une idée pour améliorer Capital Board ? Une fonctionnalité qui vous manque ?\n\n"
      + "Cliquez sur le bouton ci-dessous, décrivez votre suggestion (ajoutez vos liens) "
      + "et joignez des captures d'écran si besoin. Une fois envoyée, notre équipe l'étudie "
      + "et vous répond directement en message privé.",
    )
    .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sugg:new').setLabel('Proposer une suggestion').setStyle(ButtonStyle.Primary).setEmoji('💡'),
  );
  return { embeds: [embed], components: [row] };
}

// ── Modal de soumission ────────────────────────────────────────────────────
function submitModal() {
  const text = new TextInputBuilder()
    .setCustomId('text').setStyle(TextInputStyle.Paragraph)
    .setRequired(true).setMaxLength(1500)
    .setPlaceholder('Décrivez votre suggestion, collez vos liens ici…');
  const textLabel = new LabelBuilder()
    .setLabel('Votre suggestion')
    .setDescription('Message + liens éventuels.')
    .setTextInputComponent(text);

  const upload = new FileUploadBuilder()
    .setCustomId('images').setMinValues(0).setMaxValues(5).setRequired(false);
  const upLabel = new LabelBuilder()
    .setLabel("Captures d'écran (optionnel)")
    .setDescription("Jusqu'à 5 images.")
    .setFileUploadComponent(upload);

  return new ModalBuilder()
    .setCustomId('suggnew').setTitle('Proposer une suggestion')
    .addLabelComponents(textLabel, upLabel);
}

// ── Modal de décision (note optionnelle) ────────────────────────────────────
function decisionModal(action, userId) {
  const note = new TextInputBuilder()
    .setCustomId('note').setStyle(TextInputStyle.Paragraph)
    .setRequired(false).setMaxLength(600)
    .setPlaceholder(action === 'ok' ? "Pourquoi c'est accepté (optionnel)…" : "Pourquoi c'est refusé (optionnel)…");
  const noteLabel = new LabelBuilder()
    .setLabel("Note pour l'auteur (optionnel)")
    .setDescription("Envoyée en message privé à l'auteur.")
    .setTextInputComponent(note);

  return new ModalBuilder()
    .setCustomId(`suggdec:${action}:${userId}`)
    .setTitle(action === 'ok' ? 'Accepter la suggestion' : 'Refuser la suggestion')
    .addLabelComponents(noteLabel);
}

// ── Routeur boutons (customId sugg:*) ───────────────────────────────────────
async function handleButton(interaction) {
  const parts = interaction.customId.split(':'); // sugg:new | sugg:ok:uid | sugg:no:uid
  const action = parts[1];

  if (action === 'new') {
    await interaction.showModal(submitModal());
    return;
  }

  // Décision : réservé au rôle fondateur/équipe.
  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: "Réservé à l'équipe.", flags: MessageFlags.Ephemeral });
    return;
  }
  const userId = parts[2];
  await interaction.showModal(decisionModal(action, userId));
}

// ── Routeur modals (suggnew | suggdec:*) ────────────────────────────────────
async function handleModal(interaction) {
  if (interaction.customId === 'suggnew') return submitSuggestion(interaction);
  if (interaction.customId.startsWith('suggdec:')) return finalizeDecision(interaction);
}

// Nom lisible d'un membre : son nom d'affichage s'il en a choisi un, son
// identifiant de compte sinon.
const nomAuteur = (user) => user.globalName || user.username || 'Membre';

async function submitSuggestion(interaction) {
  const text = (interaction.fields.getTextInputValue('text') || '').trim();
  if (!text) {
    await interaction.reply({ content: 'Suggestion vide.', flags: MessageFlags.Ephemeral });
    return;
  }
  const raw = interaction.fields.getUploadedFiles('images');
  const files = raw ? [...raw.values()] : [];
  const images = files.filter(isImageAttachment).map((a, i) => new AttachmentBuilder(a.url, { name: `sugg${i}.${imageExt(a)}` }));

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setColor(BRAND)
    .setTitle('💡 Nouvelle suggestion')
    .setDescription(text)
    // Le nom est écrit en clair à côté de la mention : l'auteur n'a pas accès au
    // salon de validation, et Discord n'y résout alors pas son identifiant — on
    // ne lisait qu'une suite de chiffres.
    .addFields({
      name: 'Auteur',
      value: `**${nomAuteur(interaction.user)}** · <@${interaction.user.id}>`,
      inline: true,
    })
    .setFooter({ text: `ID auteur : ${interaction.user.id}` })
    .setTimestamp();
  if (images.length) embed.setImage(`attachment://${images[0].name}`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sugg:ok:${interaction.user.id}`).setLabel('Accepter').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`sugg:no:${interaction.user.id}`).setLabel('Refuser').setStyle(ButtonStyle.Danger).setEmoji('❌'),
  );

  try {
    const ch = await interaction.client.channels.fetch(REVIEW_CHANNEL);
    await ch.send({ embeds: [embed], components: [row], files: images });
  } catch (e) {
    console.error('[suggestions] post review:', e.message);
    await interaction.editReply("Erreur lors de l'envoi. Réessayez plus tard.");
    return;
  }

  // Confirmation DM à l'auteur.
  try {
    const dm = new EmbedBuilder()
      .setColor(BRAND)
      .setTitle('✅ Suggestion transmise')
      .setDescription("Merci ! Votre suggestion a bien été transmise à l'équipe Capital Board. "
        + "Nous allons l'étudier et vous recevrez notre réponse ici même, en message privé.")
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });
    await interaction.user.send({ embeds: [dm] });
  } catch (_) { /* DM fermés : on ignore */ }

  await interaction.editReply('✅ Votre suggestion a été transmise ! La réponse arrivera en message privé.');
}

async function finalizeDecision(interaction) {
  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: "Réservé à l'équipe.", flags: MessageFlags.Ephemeral });
    return;
  }
  const [, action, userId] = interaction.customId.split(':'); // suggdec:ok:uid
  const approved = action === 'ok';
  const note = (interaction.fields.getTextInputValue('note') || '').trim();
  const msg = interaction.message;
  const suggestionText = msg && msg.embeds[0] ? (msg.embeds[0].description || '') : '';
  // Capture jointe à la suggestion (si présente) → on la remet dans le DM.
  // On repart de la pièce jointe du message, pas de l'URL de l'embed : celle-ci
  // vaut « attachment://sugg0.png », une référence interne au message de
  // validation qui ne veut rien dire ailleurs — d'où l'image vide côté auteur.
  // Le fichier est donc réenvoyé avec le DM, et l'embed le désigne à son tour.
  const reviewAtt = msg ? msg.attachments.first() : null;

  // DM à l'auteur.
  let dmOk = false;
  try {
    const user = await interaction.client.users.fetch(userId);
    const dm = new EmbedBuilder()
      .setColor(approved ? GREEN : RED)
      .setTitle(approved ? '✅ Suggestion acceptée' : '❌ Suggestion refusée')
      .setDescription(
        (suggestionText ? `**Votre suggestion :**\n> ${suggestionText.slice(0, 400).replace(/\n/g, '\n> ')}\n\n` : '')
        + (approved
          ? "Bonne nouvelle : votre suggestion a été retenue par l'équipe. Merci de votre contribution !"
          : "Votre suggestion n'a pas été retenue cette fois-ci. Merci quand même de votre participation !"),
      );
    const dmFiles = [];
    if (reviewAtt) {
      const name = `suggestion.${imageExt(reviewAtt)}`;
      dmFiles.push(new AttachmentBuilder(reviewAtt.url, { name }));
      dm.setImage(`attachment://${name}`);
    }
    if (note) dm.addFields({ name: "Note de l'équipe", value: note });
    dm.setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });
    await user.send({ embeds: [dm], files: dmFiles });
    dmOk = true;
  } catch (_) { /* DM fermés */ }

  // Verrouille le message de validation.
  try {
    if (msg && msg.embeds[0]) {
      const att = msg.attachments.first();
      const updated = EmbedBuilder.from(msg.embeds[0])
        .setColor(approved ? GREEN : RED)
        .addFields({
          name: approved ? '✅ Accepté' : '❌ Refusé',
          value: `par <@${interaction.user.id}>` + (note ? `\n> ${note.replace(/\n/g, '\n> ')}` : ''),
        });
      // Re-référence la pièce jointe par attachment:// pour éviter qu'elle
      // s'affiche À LA FOIS dans l'embed et comme pièce jointe séparée.
      if (att) updated.setImage(`attachment://${att.name}`);
      await msg.edit({ embeds: [updated], components: [], attachments: att ? [att] : [] });
    }
  } catch (e) {
    console.error('[suggestions] edit review:', e.message);
  }

  await interaction.reply({
    content: `Décision enregistrée.${dmOk ? ' Auteur prévenu en DM.' : " (DM impossible — l'auteur a peut-être fermé ses MP.)"}`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  // Le panneau est publié par `npm run embed -- suggestion` (voir lib/embeds.js).
  panelPayload,
  handleButton,
  handleModal,
  isSuggestionButton: (id) => id.startsWith('sugg:'),
  isSuggestionModal: (id) => id === 'suggnew' || id.startsWith('suggdec:'),
};
