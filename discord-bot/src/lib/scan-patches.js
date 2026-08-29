'use strict';

// Correctifs de sécurité proposés par le scan automatisé, à valider dans
// Discord avant d'être appliqués au dépôt.
//
//   scanPatches/{id} = {
//     resume,                  // compte rendu court, affiché dans l'embed
//     patch,                   // diff unifié, joint en pièce jointe
//     fichiers: [],            // fichiers touchés
//     base,                    // commit sur lequel le diff a été calculé
//     runUrl,
//     statut: 'attente'|'demande'|'applique'|'refuse'|'erreur',
//     createdAt, decidePar, decideLe,
//     messageId, channelId,
//     commitSha, erreur,       // remplis par le workflow d'application
//     revertDemande,           // sens de la dernière demande, pour la rejouer
//   }
//
// Flux : le scan écrit un doc « attente » et ne pousse rien. Le bot poste le
// compte rendu, le diff en pièce jointe, et deux boutons. Sur « Appliquer », il
// déclenche le workflow security-apply.yml qui applique le patch et pousse ;
// celui-ci repasse le doc en « applique » avec le SHA, et le bot propose alors
// « Revenir », qui rejoue le même workflow en marche arrière.
//
// Le bot ne pousse jamais lui-même : il ne fait que déclencher un workflow. Le
// jeton GitHub reste sur la VM, jamais dans le dépôt.

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AttachmentBuilder,
} = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const config = require('../config');
const quota = require('./quota');

const SECURITE_CHANNEL = '1541530997005353030';
const FONDATEUR_ROLE   = '1512905140108001391';
const COL = 'scanPatches';

const col = () => getDb().collection(COL);

const COULEURS = {
  attente:  0xff9f43,
  demande:  0x5b8def,
  applique: 0x22d98a,
  refuse:   0x6b7280,
  erreur:   0xff4d6a,
};

const TITRES = {
  attente:  '🛠 Correctif proposé — à valider',
  demande:  '⏳ Application en cours…',
  applique: '✅ Correctif appliqué',
  refuse:   '❌ Correctif refusé',
  erreur:   '🔴 Application échouée',
};

function payload(id, data) {
  const statut = data.statut || 'attente';
  const fichiers = data.fichiers || [];

  const embed = new EmbedBuilder()
    .setColor(COULEURS[statut] ?? COULEURS.attente)
    .setTitle(TITRES[statut] ?? TITRES.attente)
    .setDescription(String(data.resume || '').slice(0, 3900))
    .setTimestamp(data.createdAt || Date.now());

  if (fichiers.length) {
    embed.addFields({ name: 'Fichiers touchés', value: fichiers.map((f) => `\`${f}\``).join('\n').slice(0, 1000) });
  }
  if (data.decidePar) embed.addFields({ name: 'Décision', value: `<@${data.decidePar}>`, inline: true });
  if (data.commitSha) embed.addFields({ name: 'Commit', value: `\`${String(data.commitSha).slice(0, 12)}\``, inline: true });
  if (data.erreur) embed.addFields({ name: 'Erreur', value: String(data.erreur).slice(0, 1000) });

  let row = null;
  if (statut === 'attente') {
    row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`sp:ok:${id}`).setLabel('Appliquer').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`sp:no:${id}`).setLabel('Refuser').setStyle(ButtonStyle.Danger),
    );
  } else if (statut === 'applique') {
    row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`sp:rev:${id}`).setLabel('Revenir en arrière').setStyle(ButtonStyle.Danger).setEmoji('↩️'),
    );
  } else if (statut === 'erreur') {
    // Sans bouton ici, un déclenchement raté fige la proposition : plus rien à
    // cliquer, et il faut rouvrir Firestore avec la clé de service pour la
    // relancer. Arrivé le 25/08, le jeton GitHub de la VM étant mauvais.
    row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`sp:retry:${id}`)
        .setLabel(data.revertDemande ? "Réessayer l'annulation" : 'Réessayer')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔁'),
      new ButtonBuilder().setCustomId(`sp:no:${id}`).setLabel('Abandonner').setStyle(ButtonStyle.Secondary),
    );
  }

  return { embeds: [embed], components: row ? [row] : [] };
}

/** Poste la proposition, avec le diff en pièce jointe pour qu'il soit lisible en entier. */
async function poster(client, id, data) {
  // `salon` permet à l'émetteur de router sa proposition (une analyse de trafic
  // a le sien) sans toucher à la config du bot. Absent, c'est le salon des scans.
  const channel = await client.channels.fetch(data.salon || SECURITE_CHANNEL);
  const base = payload(id, data);
  const fichiersJoints = data.patch
    ? [new AttachmentBuilder(Buffer.from(data.patch, 'utf8'), { name: `correctif-${id}.patch` })]
    : [];
  // Une décision est attendue : le rôle fondateur est mentionné, comme pour les
  // alertes du scan. La mention doit être dans le contenu (Discord ne la résout
  // pas dans un embed) et `allowedMentions` la borne à ce seul rôle. Seul l'envoi
  // la porte : les mises à jour de statut passent par payload(), sans contenu.
  const msg = await channel.send({
    content: `<@&${FONDATEUR_ROLE}>`,
    allowedMentions: { roles: [FONDATEUR_ROLE], parse: [] },
    ...base,
    files: fichiersJoints,
  });
  await col().doc(id).update({ messageId: msg.id, channelId: channel.id });
}

/** Réécrit le message existant après un changement de statut. */
async function rafraichir(client, id, data) {
  if (!data.messageId || !data.channelId) return;
  const channel = await client.channels.fetch(data.channelId);
  const msg = await channel.messages.fetch(data.messageId);
  await msg.edit(payload(id, data));
}

/**
 * Déclenche security-apply.yml. Le bot n'écrit jamais dans le dépôt lui-même :
 * il demande à GitHub de lancer un workflow, qui applique et pousse.
 */
async function lancerWorkflow(patchId, { revert = false } = {}) {
  if (!config.githubToken) throw new Error('GITHUB_DISPATCH_TOKEN absent sur la VM');
  const url = `https://api.github.com/repos/${config.githubRepo}/actions/workflows/security-apply.yml/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main', inputs: { patchId, revert: revert ? 'true' : 'false' } }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} : ${(await res.text()).slice(0, 200)}`);
}

/** Routeur des boutons sp:*. */
async function handleButton(interaction) {
  const [, action, id] = interaction.customId.split(':');

  if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }

  // Discord invalide le jeton d'interaction au bout de 3 s, et ce qui suit fait
  // deux appels Firestore avant de repondre. On accuse reception d'abord : le
  // message reste tel quel a l'ecran jusqu'au editReply.
  await interaction.deferUpdate();

  const snap = await col().doc(id).get();
  if (!snap.exists) {
    await interaction.followUp({ content: 'Correctif introuvable.', flags: MessageFlags.Ephemeral });
    return;
  }
  const data = snap.data();

  if (action === 'no') {
    const maj = { statut: 'refuse', decidePar: interaction.user.id, decideLe: Date.now() };
    if (!(await enregistrer(interaction, snap.ref, maj))) return;
    await interaction.editReply(payload(id, { ...data, ...maj }));
    return;
  }

  // Appliquer, Revenir et Réessayer passent tous par le workflow ; seul le sens
  // change. Réessayer rejoue celui qui a échoué : l'embed n'en garde pas trace,
  // le document si.
  const revert = action === 'rev' || (action === 'retry' && data.revertDemande === true);

  const attenduPour = { retry: 'erreur', rev: 'applique', ok: 'attente' };
  if (data.statut !== attenduPour[action]) {
    const message = action === 'rev'
      ? 'Rien à annuler : ce correctif n\'est pas appliqué.'
      : `Déjà traité (${data.statut}).`;
    await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
    return;
  }

  const maj = {
    statut: 'demande',
    decidePar: interaction.user.id,
    decideLe: Date.now(),
    erreur: null,
    revertDemande: revert,
  };
  if (!(await enregistrer(interaction, snap.ref, maj))) return;
  await interaction.editReply(payload(id, { ...data, ...maj }));

  try {
    await lancerWorkflow(id, { revert });
  } catch (e) {
    await enregistrer(interaction, snap.ref, { statut: 'erreur', erreur: e.message });
    console.error('[scan-patches] dispatch :', e.message);
  }
}

/**
 * Écrit la décision, et dit au fondateur si elle n'a pas pu être enregistrée.
 *
 * Contrairement à un relevé de machine, une décision ne se tait pas quand le
 * quota est épuisé : on ne peut pas la rejouer plus tard, personne ne saura
 * qu'elle a été prise. On tente donc toujours l'écriture — mais un échec doit
 * se voir, sinon le bouton change de couleur et le correctif reste en attente.
 *
 * @returns {boolean} vrai si l'écriture a abouti.
 */
async function enregistrer(interaction, ref, maj) {
  try {
    await ref.update(maj);
    return true;
  } catch (e) {
    const cause = quota.signaler(interaction.client, e, 'scan-patches')
      ? `le quota Firestore est épuisé jusqu'à ${quota.prochaineRemiseAZero()?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) || 'la remise à zéro'}`
      : e.message;
    console.error('[scan-patches] décision non enregistrée :', e.message);
    await interaction.followUp({
      content: `⚠️ Votre décision n'a **pas** été enregistrée : ${cause}. Le correctif reste dans son état précédent — reprenez le bouton plus tard.`,
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return false;
  }
}

const isScanPatchButton = (customId) => customId.startsWith('sp:');

/** Poste les nouveaux correctifs, et suit les changements de statut. */
function watch(client) {
  if (!isConfigured()) {
    console.warn('[scan-patches] Firestore non configuré : écoute désactivée.');
    return;
  }
  col().onSnapshot(
    (snap) => {
      for (const change of snap.docChanges()) {
        const doc = change.doc;
        const data = doc.data();
        if (change.type === 'added' && !data.messageId) {
          poster(client, doc.id, data).catch((e) => {
            if (!quota.signaler(client, e, 'scan-patches')) console.error('[scan-patches] post :', e.message);
          });
        } else if (change.type === 'modified' && data.messageId) {
          rafraichir(client, doc.id, data).catch((e) => console.error('[scan-patches] maj :', e.message));
        }
      }
    },
    (err) => console.error('[scan-patches] listener interrompu :', err.message),
  );
}

module.exports = { watch, handleButton, isScanPatchButton };
