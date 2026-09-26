'use strict';

// Alertes opérationnelles (quotas API externes, comptes rendus d'analyse de
// sécurité) écrites par des scripts serveur via le SDK admin —
// scripts/daily-recap.js pour Tavily/Mistral, scripts/ops-alert.js pour le
// reste. Même flux que signalements.js : le script écrit un doc, ce module
// l'écoute et le poste. Pas de règle Firestore à ouvrir : écriture et lecture
// passent toutes les deux par le SDK admin.
//
//   opsAlerts/{id} = {
//     type, texte, createdAt, salon?, titre?, couleur?, mention?,
//     posteLe?, messageId?, channelId?,
//     corrigible?,                              // bouton « Corriger » sous l'alerte
//     fixStatut?, fixPar?, fixLe?, fixPatchId?, fixErreur?,
//   }
//
// `salon` permet à l'émetteur de router son alerte vers un salon précis (le
// scan de sécurité a le sien) sans toucher à la config du bot. Absent, on
// retombe sur OPS_ALERTS_CHANNEL_ID.
//
// ── Le bouton « Corriger » ──────────────────────────────────────────────────
// Une revue de sécurité décrit des problèmes ; elle n'écrit un correctif que
// lorsqu'elle est sûre d'elle. Quand elle s'abstient, son compte rendu arrivait
// dans le salon sans rien à cliquer : il fallait ouvrir un terminal pour
// avancer, et le problème attendait.
//
// `corrigible: true` ajoute donc un bouton. Il ne corrige rien lui-même : il
// déclenche security-fix.yml dans le dépôt d'analyse privé, qui relit ce
// document, écrit le correctif et le propose comme les autres — un document
// scanPatches, avec « Appliquer » et « Refuser » (voir scan-patches.js). La
// décision d'écrire dans le dépôt reste au même endroit qu'avant.

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const config = require('../config');
const quota = require('./quota');

const COL = 'opsAlerts';
const col = () => getDb().collection(COL);

const FONDATEUR_ROLE = '1512905140108001391';

// Libellé du pied d'embed selon l'avancement de la demande de correctif.
const SUIVI_FIX = {
  demande: '⏳ Correctif demandé — écriture en cours…',
  produit: '🛠 Correctif proposé — voir le message suivant.',
  vide:    '🤷 Rien de corrigeable trouvé — à traiter à la main.',
  echec:   '🔴 Écriture du correctif échouée.',
};

function payload(id, data) {
  const embed = new EmbedBuilder()
    // `titre` et `couleur` permettent à l'émetteur de sortir de l'habillage
    // « alerte » : un compte rendu de scan sans problème arrive en vert.
    .setColor(Number.isInteger(data.couleur) ? data.couleur : 0xff9f43)
    .setTitle(data.titre || `⚠ Alerte ops — ${data.type || 'inconnue'}`)
    .setDescription(String(data.texte || '').slice(0, 4000))
    .setTimestamp(data.createdAt || Date.now());

  const suivi = SUIVI_FIX[data.fixStatut];
  if (suivi) embed.addFields({ name: 'Correctif', value: suivi });
  if (data.fixErreur) embed.addFields({ name: 'Erreur', value: String(data.fixErreur).slice(0, 1000) });
  if (data.fixPar) embed.addFields({ name: 'Demandé par', value: `<@${data.fixPar}>`, inline: true });

  // Une mention placée dans un embed ne notifie personne : Discord ne la
  // résout que dans le contenu du message. `allowedMentions` la borne au seul
  // rôle demandé, pour qu'un texte d'alerte ne puisse pas pinger @everyone.
  const roleId = data.mention ? String(data.mention) : null;

  return {
    ...(roleId ? { content: `<@&${roleId}>` } : {}),
    embeds: [embed],
    allowedMentions: { roles: roleId ? [roleId] : [], parse: [] },
    components: boutons(id, data),
  };
}

// Une demande dont on n'a plus de nouvelles après ce délai est considérée
// perdue. Le workflow s'arrête de lui-même à 30 minutes et rend compte quoi
// qu'il arrive ; au-delà, c'est qu'il n'a jamais démarré, ou que le runner est
// mort sans un mot.
const DEMANDE_PERIMEE_MS = 45 * 60 * 1000;

const demandeEnCours = (data) => data.fixStatut === 'demande'
  && Date.now() - (data.fixLe || 0) < DEMANDE_PERIMEE_MS;

// Rien à cliquer sur une alerte non corrigeable, ni sous un correctif déjà
// proposé — celui-ci porte ses propres boutons. Partout ailleurs il reste une
// suite possible, y compris après un échec : sans cela une demande ratée fige
// l'alerte et il faut rouvrir Firestore pour la relancer, la leçon du 25/08.
//
// Le bouton reste donc affiché pendant que le travail tourne. C'est délibéré :
// le cacher rendait l'alerte irrattrapable quand le run mourait sans rendre
// compte, puisque plus rien ne déclenchait un réaffichage. Un clic de trop
// pendant ces minutes-là reçoit un refus, ce qui est le moindre mal.
function boutons(id, data) {
  if (data.corrigible !== true) return [];
  const statut = data.fixStatut || '';
  if (statut === 'produit') return [];

  const rejoue = statut === 'echec' || statut === 'vide';
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`oa:fix:${id}`)
      .setLabel(rejoue ? 'Réessayer' : 'Corriger')
      .setStyle(rejoue || demandeEnCours(data) ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setEmoji(rejoue ? '🔁' : '🛠'),
  )];
}

async function poster(client, id, data) {
  const cible = data.salon || config.opsAlertsChannel;
  if (!cible) throw new Error('aucun salon de destination (ni `salon`, ni OPS_ALERTS_CHANNEL_ID)');
  const channel = await client.channels.fetch(cible);
  const msg = await channel.send(payload(id, data));
  await col().doc(id).update({ posteLe: Date.now(), messageId: msg.id, channelId: channel.id });
}

/** Réécrit le message existant après un changement d'état de la demande. */
async function rafraichir(client, id, data) {
  if (!data.messageId || !data.channelId) return;
  const channel = await client.channels.fetch(data.channelId);
  const msg = await channel.messages.fetch(data.messageId);
  // Pas de `content` ici : une mise à jour ne doit pas re-notifier le rôle.
  await msg.edit({ ...payload(id, data), content: '' });
}

/**
 * Déclenche security-fix.yml. Comme pour les correctifs, le bot n'écrit jamais
 * dans un dépôt : il demande à GitHub de lancer un workflow. Celui-ci vit dans
 * le dépôt d'analyse privé — il y lit les consignes qui décrivent comment
 * contourner les défenses de l'app, ce qui n'a rien à faire dans le public.
 */
async function lancerWorkflow(alerteId) {
  if (!config.githubToken) throw new Error('GITHUB_DISPATCH_TOKEN absent sur la VM');
  const depot = config.githubSecurityRepo;
  const url = `https://api.github.com/repos/${depot}/actions/workflows/security-fix.yml/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main', inputs: { alerteId } }),
  });
  if (!res.ok) {
    const corps = (await res.text()).slice(0, 200);
    // 404 sur un dépôt privé veut aussi dire « jeton sans accès » : GitHub ne
    // distingue pas, et chercher un workflow absent ferait perdre du temps.
    const indice = res.status === 404
      ? ` — workflow absent de ${depot}, ou jeton sans accès à ce dépôt privé`
      : '';
    throw new Error(`GitHub ${res.status}${indice} : ${corps}`);
  }
}

const isOpsAlertButton = (customId) => customId.startsWith('oa:');

/** Routeur du bouton oa:fix. */
async function handleButton(interaction) {
  const [, action, id] = interaction.customId.split(':');
  if (action !== 'fix') return;

  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }

  // Discord invalide le jeton d'interaction au bout de 3 s, et ce qui suit fait
  // une lecture Firestore puis un appel GitHub. On accuse réception d'abord.
  await interaction.deferUpdate();

  const snap = await col().doc(id).get();
  if (!snap.exists) {
    await interaction.followUp({ content: 'Alerte introuvable.', flags: MessageFlags.Ephemeral });
    return;
  }
  const data = snap.data();

  if (data.corrigible !== true) {
    await interaction.followUp({ content: 'Cette alerte ne porte rien à corriger.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (data.fixStatut === 'produit') {
    await interaction.followUp({ content: 'Un correctif a déjà été proposé pour cette alerte.', flags: MessageFlags.Ephemeral });
    return;
  }
  // Deux clics rapprochés lanceraient deux sessions sur le même compte rendu,
  // et donc deux correctifs concurrents à départager. Passé le délai, on
  // considère au contraire la demande perdue et on laisse relancer : c'est le
  // seul moyen de sortir d'un run mort sans avoir rendu compte.
  if (demandeEnCours(data)) {
    const depuis = Math.round((Date.now() - (data.fixLe || 0)) / 60000);
    await interaction.followUp({
      content: `Correctif déjà demandé il y a ${depuis} min — laissez-le finir. Relançable au bout de 45 min.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const maj = {
    fixStatut: 'demande',
    fixPar: interaction.user.id,
    fixLe: Date.now(),
    fixErreur: null,
  };
  if (!(await enregistrer(interaction, snap.ref, maj))) return;
  await interaction.editReply({ ...payload(id, { ...data, ...maj }), content: '' });

  try {
    await lancerWorkflow(id);
  } catch (e) {
    // L'état reste sur le document : le bouton redevient « Réessayer » par le
    // listener, sans qu'on ait à réécrire le message ici.
    await snap.ref.update({ fixStatut: 'echec', fixErreur: e.message }).catch(() => {});
    console.error('[ops-alerts] dispatch :', e.message);
  }
}

/**
 * Écrit la demande, et dit au fondateur si elle n'a pas pu être enregistrée.
 * Même raison que dans scan-patches.js : un bouton qui change d'aspect sans
 * que rien ne soit enregistré laisse croire que le travail est lancé.
 *
 * @returns {boolean} vrai si l'écriture a abouti.
 */
async function enregistrer(interaction, ref, maj) {
  try {
    await ref.update(maj);
    return true;
  } catch (e) {
    const cause = quota.signaler(interaction.client, e, 'ops-alerts')
      ? 'le quota Firestore est épuisé'
      : e.message;
    console.error('[ops-alerts] demande non enregistrée :', e.message);
    await interaction.followUp({
      content: `⚠️ Demande **non** enregistrée : ${cause}. Rien n'a été lancé — reprenez le bouton plus tard.`,
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return false;
  }
}

function start(client) {
  if (!config.opsAlertsChannel) {
    console.warn('[ops-alerts] OPS_ALERTS_CHANNEL_ID non défini : seules les alertes précisant un `salon` seront postées.');
  }
  if (!isConfigured()) {
    console.warn('[ops-alerts] Firestore non configuré : écoute désactivée.');
    return;
  }
  col().onSnapshot(
    (snap) => {
      for (const change of snap.docChanges()) {
        const doc = change.doc;
        const data = doc.data();
        if (change.type === 'added') {
          if (data.posteLe) continue;
          // Pas de garde `estEpuise()` ici : `posteLe` est ce qui empeche de
          // reposter la meme alerte au prochain demarrage. Se taire ferait
          // doublonner l'alerte plutot que d'economiser une ecriture.
          poster(client, doc.id, data).catch((e) => {
            if (!quota.signaler(client, e, 'ops-alerts')) console.error('[ops-alerts] envoi :', e.message);
          });
        } else if (change.type === 'modified' && data.messageId) {
          // L'avancement d'une demande de correctif se lit dans le message
          // d'origine : le workflow écrit sur ce document, le bot suit.
          rafraichir(client, doc.id, data).catch((e) => console.error('[ops-alerts] maj :', e.message));
        }
      }
    },
    (err) => console.error('[ops-alerts] listener interrompu :', err.message),
  );
}

// `payload` est exporté pour le test : c'est lui qui décide quel bouton porte
// une alerte, et cette table d'états est ce que la revue de lundi a rendu
// nécessaire. Le reste du module parle à Discord et à Firestore.
module.exports = { start, handleButton, isOpsAlertButton, payload };
