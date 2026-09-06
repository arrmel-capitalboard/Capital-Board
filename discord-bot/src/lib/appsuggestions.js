'use strict';

// Boîte à suggestions — versant application.
//
//   suggestions/{id} = {
//     uid, authorName,          // auteur (compte app)
//     texte,                    // la suggestion
//     statut,                   // 'pending' | 'accepted' | 'rejected'
//     createdAt,
//     posteLe, messageId, channelId,   // posés une fois le message envoyé
//     decidLe,                  // quand acceptée / refusée
//   }
//
// Flux : le membre écrit un doc depuis l'app. Le bot l'écoute et le poste dans
// le salon de revue avec deux boutons ; le fondateur tranche là. La réponse
// est déposée dans l'onglet Notifications de l'app — ni push, ni e-mail, ni
// message privé : l'auteur a écrit depuis l'app, c'est là qu'il revient.

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const appnotif = require('./appnotif');

const CHANNEL = '1528920650570535132';   // même salon de revue que les suggestions Discord
const COL = 'suggestions';
const FONDATEUR_ROLE = '1512905140108001391';

const col = () => getDb().collection(COL);

// Un texte écrit par un membre ne doit pas pouvoir mentionner @everyone/@here.
const propre = (s) => String(s || '').replace(/@(everyone|here)/gi, '@​$1');

function payload(id, data) {
  const embed = new EmbedBuilder()
    .setColor(0xf5b731)
    .setTitle('💡 Nouvelle suggestion')
    .setDescription(propre(data.texte).slice(0, 4000))
    .addFields({ name: 'Membre', value: `${propre(data.authorName || 'membre')} — \`${data.uid}\``.slice(0, 300) })
    .setFooter({ text: 'CapitalBoard · Boîte à suggestions' })
    .setTimestamp(_millis(data.createdAt) || Date.now());
  const boutons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`appsug:ok:${id}`).setLabel('Accepter').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`appsug:no:${id}`).setLabel('Refuser').setStyle(ButtonStyle.Secondary).setEmoji('🗑️'),
  );
  return { embeds: [embed], components: [boutons] };
}

async function poster(client, id, data) {
  const channel = await client.channels.fetch(CHANNEL);
  const msg = await channel.send(payload(id, data));
  await col().doc(id).update({ posteLe: Date.now(), messageId: msg.id, channelId: channel.id });
}

/** Écoute les suggestions non encore postées. */
function start(client) {
  if (!isConfigured()) {
    console.warn('[appsuggestions] Firestore non configuré : écoute désactivée.');
    return;
  }
  // Pas de `where` sur posteLe : un doc écrit par le client ne porte pas ce
  // champ, et Firestore n'indexe pas l'absence. Filtrage ici, sur un flux court.
  col().onSnapshot(
    (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;
        const doc = change.doc;
        if (doc.data().posteLe) continue;   // déjà posté (chargement initial)
        poster(client, doc.id, doc.data())
          .catch((e) => console.error('[appsuggestions] envoi :', e.message));
      }
    },
    (err) => console.error('[appsuggestions] listener interrompu :', err.message),
  );
}

/** true si le customId est un bouton de cette boîte. */
function isButton(customId) {
  return typeof customId === 'string' && customId.startsWith('appsug:');
}

async function handleButton(interaction) {
  if (!interaction.member?.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }
  const [, action, id] = interaction.customId.split(':');
  await interaction.deferUpdate();
  const accepte = action === 'ok';

  const maj = { statut: accepte ? 'accepted' : 'rejected', decidLe: Date.now() };
  try {
    await col().doc(id).update(maj);
  } catch (e) {
    console.error('[appsuggestions] mise à jour :', e.message);
    return;
  }

  /* La réponse attend dans l'onglet Notifications de l'app : ni push, ni
     e-mail. L'auteur écrit depuis l'app, c'est là qu'il revient — le MP du
     lundi ne fait que doubler pour ceux qui sont aussi sur Discord. */
  try {
    const data = (await col().doc(id).get()).data() || {};
    await appnotif.ajouter(data.uid, {
      type: 'suggestion',
      title: accepte ? 'Votre suggestion a été retenue' : "Votre suggestion n'a pas été retenue",
      body: data.texte ? `« ${String(data.texte).slice(0, 200)} »` : '',
    });
  } catch (e) {
    console.error('[appsuggestions] notification app :', e.message);
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  if (accepte) {
    embed.setColor(0x16a34a).setTitle('✅ Suggestion acceptée')
      .addFields({ name: 'Décision', value: `<@${interaction.user.id}> — l'auteur est prévenu dans l'app` });
  } else {
    embed.setColor(0x6b7280).setTitle('🗑️ Suggestion refusée')
      .addFields({ name: 'Décision', value: `<@${interaction.user.id}>` });
  }
  await interaction.editReply({ embeds: [embed], components: [] });
}

function _millis(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (v.seconds) return v.seconds * 1000;
  return 0;
}

module.exports = { start, isButton, handleButton };
