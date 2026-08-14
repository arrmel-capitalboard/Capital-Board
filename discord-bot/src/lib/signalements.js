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
//   }
//
// Flux : le client écrit un doc, le bot l'écoute et le poste dans le salon de
// suivi. Le Worker n'est pas sur le chemin — il n'a plus qu'à ranger la capture
// dans R2 (POST /support-upload), Firestore ne stockant pas d'octets.
//
// Un signalement n'est pas une file d'attente : rien à valider, rien à
// modifier. Le doc est écrit une fois, posté une fois, et marqué pour ne pas
// l'être deux fois au redémarrage du bot.

const { EmbedBuilder } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');

const CHANNEL = '1537760259203014766';
const COL = 'signalements';

const col = () => getDb().collection(COL);

// Discord ne rend pas les mentions d'un bot sans permission, mais un texte
// écrit par un membre ne doit de toute façon pas pouvoir en émettre.
const propre = (s) => String(s || '').replace(/@(everyone|here)/gi, '@​$1');

function payload(data) {
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

  return { embeds: [embed] };
}

async function poster(client, id, data) {
  const channel = await client.channels.fetch(CHANNEL);
  const msg = await channel.send(payload(data));
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

module.exports = { start };
