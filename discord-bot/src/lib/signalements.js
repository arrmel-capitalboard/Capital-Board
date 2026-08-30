'use strict';

// Signalements d'erreur envoyés depuis l'application.
//
//   signalements/{id} = {
//     uid, nom, email,          // auteur
//     module,                   // « Livrets & épargne », …
//     texte,                    // ce que le membre décrit
//     imageUrl,                 // capture déposée dans R2, ou null
//     createdAt,
//     posteLe, messageId,       // posés ici une fois le message envoyé
//     statut, deciLe,           // posés au clic sur « À corriger » / « Écarter »
//   }
//
// Flux : le client écrit un doc, le bot l'écoute et le poste dans le salon de
// suivi. Le Worker n'est pas sur le chemin — il n'a plus qu'à ranger la capture
// dans R2 (POST /support-upload), Firestore ne stockant pas d'octets.
//
// Le message porte deux boutons, comme la boîte à suggestions : un signalement
// se lit, puis se tranche. Sans eux, le salon accumulait des rapports dont rien
// ne disait s'ils avaient été vus, et encore moins traités.
//
// La décision **ferme le message en place** plutôt que de le supprimer : le
// rapport reste lisible, et un message édité ne remonte pas le salon. Le
// supprimer aurait fait disparaître ce qu'on vient de décider de corriger.

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const { getDb, isConfigured } = require('../firebase');

const CHANNEL = '1537760259203014766';
const FONDATEUR_ROLE = '1512905140108001391';
const COL = 'signalements';

const col = () => getDb().collection(COL);

// Discord ne rend pas les mentions d'un bot sans permission, mais un texte
// écrit par un membre ne doit de toute façon pas pouvoir en émettre.
const propre = (s) => String(s || '').replace(/@(everyone|here)/gi, '@​$1');

function payload(id, data) {
  const embed = new EmbedBuilder()
    .setColor(0xf5b731)
    .setTitle(`Erreur signalée — ${propre(data.module || 'Application').slice(0, 200)}`)
    .setDescription(propre(data.texte).slice(0, 4000))
    .setTimestamp(data.createdAt || Date.now());

  // Nom et email sur la même ligne : le premier sert à répondre, le second à
  // retrouver le compte. À défaut, l'uid, qui n'est jamais vide.
  const qui = [data.nom, data.email].filter(Boolean).join(' — ') || data.uid;
  if (qui) embed.addFields({ name: 'Membre', value: propre(qui).slice(0, 300), inline: false });
  // L'URL est signée et sans expiration : Discord la charge une fois pour son
  // aperçu, et le message reste lisible ensuite.
  if (data.imageUrl) embed.setImage(String(data.imageUrl));

  const boutons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sig:ok:${id}`).setLabel('À corriger')
      .setStyle(ButtonStyle.Success).setEmoji('🔧'),
    new ButtonBuilder().setCustomId(`sig:no:${id}`).setLabel('Écarter')
      .setStyle(ButtonStyle.Secondary).setEmoji('🗑️'),
  );

  return { embeds: [embed], components: [boutons] };
}

async function poster(client, id, data) {
  const channel = await client.channels.fetch(CHANNEL);
  const msg = await channel.send(payload(id, data));
  await col().doc(id).update({ posteLe: Date.now(), messageId: msg.id, channelId: channel.id });
}

/** Écoute les signalements non encore postés. */
function start(client) {
  if (!isConfigured()) {
    console.warn('[signalements] Firestore non configuré : écoute désactivée.');
    return;
  }
  // Pas de `where` sur `posteLe` : un doc écrit par le client ne porte pas ce
  // champ, et Firestore n'indexe pas l'absence. Le tri se fait donc ici, sur un
  // flux qui reste court.
  col().onSnapshot(
    (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;
        const doc = change.doc;
        if (doc.data().posteLe) continue;      // déjà posté (chargement initial)
        poster(client, doc.id, doc.data())
          .catch((e) => console.error('[signalements] envoi :', e.message));
      }
    },
    (err) => console.error('[signalements] listener interrompu :', err.message),
  );
}

/** true si le customId est un bouton de ce module. */
const isButton = (customId) => typeof customId === 'string' && customId.startsWith('sig:');

async function handleButton(interaction) {
  if (!interaction.member?.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }
  // `deferUpdate` avant tout appel distant : Discord invalide le jeton
  // d'interaction au bout de trois secondes, et Firestore est plus lent que ça
  // quand le réseau tousse.
  const [, action, id] = interaction.customId.split(':');
  await interaction.deferUpdate();
  const aCorriger = action === 'ok';

  try {
    await col().doc(id).update({
      statut: aCorriger ? 'a_corriger' : 'ecarte',
      deciLe: Date.now(),
    });
  } catch (e) {
    console.error('[signalements] mise à jour :', e.message);
    // Le dire, plutôt que de laisser le message changer d'état pendant que le
    // document, lui, reste intact.
    await interaction.followUp({
      content: `La décision n'a pas été enregistrée : ${e.message}`,
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return;
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  if (aCorriger) {
    embed.setColor(0x16a34a).setTitle('🔧 À corriger')
      .addFields({ name: 'Décision', value: `<@${interaction.user.id}>` });
  } else {
    embed.setColor(0x6b7280).setTitle('🗑️ Écarté')
      .addFields({ name: 'Décision', value: `<@${interaction.user.id}>` });
  }
  // Boutons retirés : un bouton mort invite à cliquer pour rien.
  await interaction.editReply({ embeds: [embed], components: [] });
}

module.exports = { start, isButton, handleButton };
