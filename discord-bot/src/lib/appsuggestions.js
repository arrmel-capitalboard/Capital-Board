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
//     notifieLe,                // quand le récap hebdo a été envoyé (null tant que non)
//   }
//
// Flux : le membre écrit un doc depuis l'app. Le bot l'écoute et le poste dans
// le salon de revue avec deux boutons ; le fondateur tranche là, sans MP à
// l'auteur. Chaque lundi, un récap groupe les suggestions acceptées non encore
// annoncées et les envoie en un seul MP par auteur — sans ça, accepter 100
// suggestions d'un coup enverrait 100 messages.

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const cron = require('node-cron');
const { getDb, isConfigured } = require('../firebase');
const { getDiscordId } = require('./links');

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

  // Récap hebdo : chaque lundi 9h (heure de Paris).
  cron.schedule('0 9 * * 1', () => {
    recapHebdo(client).catch((e) => console.error('[appsuggestions] récap :', e.message));
  }, { timezone: 'Europe/Paris' });
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

  // notifieLe: null seulement à l'acceptation → repêché par le récap du lundi.
  // Un refus n'annonce rien, donc pas de champ de suivi à poser.
  const maj = accepte
    ? { statut: 'accepted', decidLe: Date.now(), notifieLe: null }
    : { statut: 'rejected', decidLe: Date.now() };
  try {
    await col().doc(id).update(maj);
  } catch (e) {
    console.error('[appsuggestions] mise à jour :', e.message);
    return;
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  if (accepte) {
    embed.setColor(0x16a34a).setTitle('✅ Suggestion acceptée')
      .addFields({ name: 'Décision', value: `<@${interaction.user.id}> — récap au prochain lundi` });
  } else {
    embed.setColor(0x6b7280).setTitle('🗑️ Suggestion refusée')
      .addFields({ name: 'Décision', value: `<@${interaction.user.id}>` });
  }
  await interaction.editReply({ embeds: [embed], components: [] });
}

/**
 * Récap hebdo. Regroupe les suggestions acceptées non encore annoncées par
 * auteur, résout le Discord de chacun et envoie un unique MP récapitulatif,
 * puis marque ces suggestions comme annoncées. Un auteur non lié à Discord est
 * simplement sauté (ses suggestions restent à annoncer, reprises dès qu'il lie
 * son compte).
 */
async function recapHebdo(client) {
  // Pas de double `where` (éviterait un index composite) : on filtre notifieLe
  // en mémoire, l'ensemble accepté restant court.
  const snap = await col().where('statut', '==', 'accepted').get();
  const parAuteur = new Map();   // uid → [{ id, texte }]
  snap.forEach((d) => {
    const data = d.data();
    if (data.notifieLe) return;
    if (!parAuteur.has(data.uid)) parAuteur.set(data.uid, []);
    parAuteur.get(data.uid).push({ id: d.id, texte: data.texte });
  });
  if (parAuteur.size === 0) return;

  for (const [uid, items] of parAuteur) {
    let discordId;
    try { discordId = await getDiscordId(uid); } catch { discordId = null; }
    if (!discordId) continue;   // compte non lié : on réessaiera plus tard

    try {
      const user = await client.users.fetch(discordId);
      const liste = items.map((it) => `• ${propre(it.texte).slice(0, 300)}`).join('\n').slice(0, 4000);
      const embed = new EmbedBuilder()
        .setColor(0x16a34a)
        .setTitle(items.length > 1 ? `✅ ${items.length} de vos suggestions ont été retenues` : '✅ Votre suggestion a été retenue')
        .setDescription(liste)
        .setFooter({ text: 'Merci d\'aider à faire grandir CapitalBoard 💛' })
        .setTimestamp();
      await user.send({ embeds: [embed] });
    } catch (e) {
      console.error(`[appsuggestions] MP récap ${uid} :`, e.message);
      continue;   // MP fermés : on ne marque pas, retenté au prochain lundi
    }

    // Marquer annoncées seulement après un envoi réussi.
    const batch = getDb().batch();
    const t = Date.now();
    for (const it of items) batch.update(col().doc(it.id), { notifieLe: t });
    await batch.commit().catch((e) => console.error('[appsuggestions] marquage :', e.message));
  }
}

function _millis(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (v.seconds) return v.seconds * 1000;
  return 0;
}

module.exports = { start, isButton, handleButton };
