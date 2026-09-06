'use strict';

// Suggestions communautaires.
//
// Flux :
//  1) `npm run embed -- suggestion` poste un embed + bouton dans le salon
//     suggestions (salon défini dans lib/embeds.js).
//  2) L'utilisateur clique « Proposer une suggestion » → modal (texte + liens
//     + captures optionnelles).
//  3) À l'envoi : la suggestion arrive dans le salon de validation avec boutons
//     Accepter / Refuser. L'auteur voit un message de confirmation dans le
//     salon, éphémère — aucun MP.
//  4) L'équipe clique Accepter/Refuser → modal note (optionnelle) → la décision
//     est rangée en base et le message de validation verrouillé. Toujours
//     aucun MP.
//  5) Le lundi matin, un seul MP par auteur récapitule tout ce qui a été
//     décidé pour lui dans la semaine.
//
// Le point 5 est la raison du stockage. Avant, chaque décision partait aussitôt
// en MP : traiter quinze suggestions d'affilée en envoyait quinze, et la boîte
// de l'auteur devenait un fil de notifications. Une décision n'a pas besoin
// d'arriver dans la minute ; elle a besoin d'arriver.
//
//   suggestionsDiscord/{id} = {
//     discordId, auteur,        // qui a proposé
//     texte, imageUrl,          // la suggestion
//     statut,                   // 'pending' | 'accepted' | 'rejected'
//     note,                     // mot de l'équipe, facultatif
//     createdAt, decidLe, decidePar,
//     notifieLe,                // quand le récap du lundi est parti (null sinon)
//   }

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, LabelBuilder, TextInputBuilder, TextInputStyle, FileUploadBuilder,
  AttachmentBuilder, MessageFlags,
} = require('discord.js');
const cron = require('node-cron');
const { getDb, isConfigured } = require('../firebase');
const { getUid } = require('./links');
const appnotif = require('./appnotif');

const REVIEW_CHANNEL     = '1528920650570535132';
const COL                = 'suggestionsDiscord';
const FONDATEUR_ROLE     = '1512905140108001391';
const BRAND              = 0x7c6df5;
const GREEN              = 0x16a34a;
const RED                = 0xdc2626;

const col = () => getDb().collection(COL);

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
      + "et joignez des captures d'écran si besoin.\n\n"
      + "Notre équipe l'étudie, puis la réponse vous parvient de deux façons : dans "
      + "l'onglet **Notifications** de l'application si votre compte Discord y est lié, "
      + "et en message privé le lundi matin, avec tout ce qui a été décidé pour vous "
      + "dans la semaine.",
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
    .setDescription("Reprise dans le récap du lundi et dans l'app.")
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

  /* La suggestion est rangée avant d'être postée : c'est son identifiant que
     portent les boutons, et c'est lui qui permettra au récap du lundi de
     retrouver l'auteur. Sans base, la décision devait partir sur-le-champ. */
  let docId = null;
  if (isConfigured()) {
    try {
      const ref = await col().add({
        discordId: interaction.user.id,
        auteur: nomAuteur(interaction.user),
        texte: text.slice(0, 1500),
        imageUrl: images.length ? files.filter(isImageAttachment)[0].url : null,
        statut: 'pending',
        note: null,
        createdAt: Date.now(),
        decidLe: null,
        notifieLe: null,
      });
      docId = ref.id;
    } catch (e) {
      console.error('[suggestions] enregistrement :', e.message);
    }
  }

  /* Sans base — Firestore indisponible — on retombe sur l'identifiant de
     l'auteur : la décision partira alors en MP tout de suite, comme avant.
     Mieux vaut un MP de trop qu'une réponse perdue. */
  const cible = docId || `u${interaction.user.id}`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sugg:ok:${cible}`).setLabel('Accepter').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`sugg:no:${cible}`).setLabel('Refuser').setStyle(ButtonStyle.Danger).setEmoji('❌'),
  );

  try {
    const ch = await interaction.client.channels.fetch(REVIEW_CHANNEL);
    await ch.send({ embeds: [embed], components: [row], files: images });
  } catch (e) {
    console.error('[suggestions] post review:', e.message);
    await interaction.editReply("Erreur lors de l'envoi. Réessayez plus tard.");
    return;
  }

  // Plus de MP de confirmation : le message éphémère ci-dessous dit la même
  // chose, dans le salon, sans ouvrir un fil privé que l'auteur n'a pas
  // demandé.
  await interaction.editReply(
    '✅ Votre suggestion a été transmise, merci ! Les réponses sont envoyées '
    + "groupées le lundi, et apparaissent dans l'onglet Notifications de l'app.",
  );
}

async function finalizeDecision(interaction) {
  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: "Réservé à l'équipe.", flags: MessageFlags.Ephemeral });
    return;
  }
  const [, action, cible] = interaction.customId.split(':'); // suggdec:ok:<id>
  const approved = action === 'ok';
  const note = (interaction.fields.getTextInputValue('note') || '').trim();
  const msg = interaction.message;
  const suggestionText = msg && msg.embeds[0] ? (msg.embeds[0].description || '') : '';

  /* Deux cas se traitent sur-le-champ, en MP, parce qu'il n'y a rien en base
     pour les retrouver lundi :

       `u<id>`   — suggestion reçue alors que Firestore ne répondait pas ;
       17 à 20 chiffres — message de validation posté AVANT ce changement :
                  ses boutons portent l'identifiant Discord de l'auteur, pas
                  celui d'un document. Sans ce test, la mise à jour échouerait
                  en silence et l'auteur n'aurait jamais de réponse. */
  const ancienFormat = /^\d{17,20}$/.test(cible);
  const sansBase = cible.startsWith('u') || ancienFormat;
  let envoiImmediat = false;

  if (sansBase) {
    envoiImmediat = await prevenirEnMp(interaction.client, ancienFormat ? cible : cible.slice(1), {
      approved, note, texte: suggestionText, piece: msg ? msg.attachments.first() : null,
    });
  } else {
    try {
      const ref = col().doc(cible);
      const snap = await ref.get();
      await ref.update({
        statut: approved ? 'accepted' : 'rejected',
        note: note || null,
        decidLe: Date.now(),
        decidePar: interaction.user.id,
        // Repêché par le récap du lundi. Un refus sans note n'annonce rien :
        // il n'y a pas de nouvelle à donner, seulement une absence de suite.
        notifieLe: (approved || note) ? null : Date.now(),
      });

      /* L'app d'abord, si le compte Discord y est lié : la réponse attend dans
         l'onglet Notifications, sans push ni e-mail. Le MP du lundi ne fait
         que doubler, pour ceux qui vivent sur Discord. */
      const data = snap.exists ? snap.data() : {};
      const discordId = data.discordId || null;
      if (discordId && (approved || note)) {
        const uid = await getUid(discordId).catch(() => null);
        if (uid) {
          await appnotif.ajouter(uid, {
            type: 'suggestion',
            title: approved ? 'Votre suggestion a été retenue' : "Votre suggestion n'a pas été retenue",
            body: (data.texte ? `« ${String(data.texte).slice(0, 200)} »` : '')
              + (note ? `\n\nRéponse de l'équipe : ${note}` : ''),
          });
        }
      }
    } catch (e) {
      console.error('[suggestions] décision :', e.message);
    }
  }

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

  const suite = sansBase
    ? (envoiImmediat
      ? `Auteur prévenu en MP (${ancienFormat ? 'suggestion postée avant le passage au récap' : 'suggestion reçue hors base'}).`
      : "MP impossible, et la suggestion n'était pas en base : l'auteur ne saura rien.")
    : (approved || note
      ? "L'auteur la verra dans l'app, et dans le récap de lundi."
      : "Aucune annonce à l'auteur (refus sans note).");

  await interaction.reply({
    content: `Décision enregistrée. ${suite}`,
    flags: MessageFlags.Ephemeral,
  });
}

/** MP direct — ne sert plus qu'au cas dégradé, quand la base n'a rien gardé. */
async function prevenirEnMp(client, discordId, { approved, note, texte, piece }) {
  try {
    const user = await client.users.fetch(discordId);
    const dm = new EmbedBuilder()
      .setColor(approved ? GREEN : RED)
      .setTitle(approved ? '✅ Suggestion acceptée' : '❌ Suggestion refusée')
      .setDescription(
        (texte ? `**Votre suggestion :**\n> ${texte.slice(0, 400).replace(/\n/g, '\n> ')}\n\n` : '')
        + (approved
          ? "Bonne nouvelle : votre suggestion a été retenue par l'équipe. Merci de votre contribution !"
          : "Votre suggestion n'a pas été retenue cette fois-ci. Merci quand même de votre participation !"),
      );
    const files = [];
    if (piece) {
      const name = `suggestion.${imageExt(piece)}`;
      files.push(new AttachmentBuilder(piece.url, { name }));
      dm.setImage(`attachment://${name}`);
    }
    if (note) dm.addFields({ name: "Note de l'équipe", value: note });
    dm.setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });
    await user.send({ embeds: [dm], files });
    return true;
  } catch (_) {
    return false;   // MP fermés
  }
}

// ── Récap du lundi ─────────────────────────────────────────────────────────
/**
 * Un seul MP par auteur, avec tout ce qui a été décidé pour lui depuis le
 * dernier envoi. Les suggestions ne sont marquées annoncées qu'après un envoi
 * réussi : des MP fermés ce lundi les reportent au suivant, ils ne les perdent
 * pas.
 */
async function recapHebdo(client, { dry = false } = {}) {
  // Un seul `where` : filtrer aussi sur notifieLe demanderait un index
  // composite, pour un ensemble qui tient de toute façon en mémoire.
  const snap = await col().where('statut', 'in', ['accepted', 'rejected']).get();

  const parAuteur = new Map();   // discordId → [suggestions]
  snap.forEach((d) => {
    const data = d.data();
    if (data.notifieLe || !data.discordId) return;
    if (!parAuteur.has(data.discordId)) parAuteur.set(data.discordId, []);
    parAuteur.get(data.discordId).push({ id: d.id, ...data });
  });
  if (!parAuteur.size) return;

  for (const [discordId, items] of parAuteur) {
    const retenues = items.filter((i) => i.statut === 'accepted');
    const ecartees = items.filter((i) => i.statut === 'rejected');

    const bloc = (liste) => liste
      .map((i) => `• ${String(i.texte || '').slice(0, 220)}${i.note ? `\n  ↳ ${i.note.slice(0, 220)}` : ''}`)
      .join('\n')
      .slice(0, 1000);

    const embed = new EmbedBuilder()
      .setColor(retenues.length ? GREEN : BRAND)
      .setTitle(retenues.length > 1 ? `✅ ${retenues.length} de vos suggestions ont été retenues`
        : retenues.length === 1 ? '✅ Votre suggestion a été retenue'
          : 'Vos suggestions ont été étudiées')
      .setFooter({ text: "CapitalBoard · merci d'aider à faire grandir l'app 💛" })
      .setTimestamp();

    if (retenues.length) embed.addFields({ name: 'Retenues', value: bloc(retenues) });
    if (ecartees.length) embed.addFields({ name: 'Non retenues cette fois', value: bloc(ecartees) });

    try {
      const user = await client.users.fetch(discordId);
      if (dry) {
        console.log(`[dry][discord] ${user.tag} (${discordId}) — `
          + `${retenues.length} retenue(s), ${ecartees.length} écartée(s) ; rien envoyé, rien marqué.`);
        continue;
      }
      await user.send({ embeds: [embed] });
    } catch (e) {
      console.error(`[suggestions] récap ${discordId} :`, e.message);
      continue;   // MP fermés : rien n'est marqué, on retentera lundi prochain
    }

    const batch = getDb().batch();
    const quand = Date.now();
    for (const i of items) batch.update(col().doc(i.id), { notifieLe: quand });
    await batch.commit().catch((e) => console.error('[suggestions] marquage :', e.message));
  }
}

function start(client) {
  if (!isConfigured()) {
    console.warn('[suggestions] Firestore non configuré : récap hebdo désactivé.');
    return;
  }
  // Cinq minutes après celui des suggestions venues de l'app : deux MP à la
  // même seconde pour la même personne, c'est un doublon apparent.
  cron.schedule('5 9 * * 1', () => {
    recapHebdo(client).catch((e) => console.error('[suggestions] récap :', e.message));
  }, { timezone: 'Europe/Paris' });
}

module.exports = {
  // Le panneau est publié par `npm run embed -- suggestion` (voir lib/embeds.js).
  panelPayload,
  start,
  // Exporté pour `npm run recap` : tester avant lundi, et rattraper après.
  recapHebdo,
  handleButton,
  handleModal,
  isSuggestionButton: (id) => id.startsWith('sugg:'),
  isSuggestionModal: (id) => id === 'suggnew' || id.startsWith('suggdec:'),
};
