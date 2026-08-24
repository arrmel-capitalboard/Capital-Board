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
  }

  return { embeds: [embed], components: row ? [row] : [] };
}

/** Poste la proposition, avec le diff en pièce jointe pour qu'il soit lisible en entier. */
async function poster(client, id, data) {
  const channel = await client.channels.fetch(SECURITE_CHANNEL);
  const base = payload(id, data);
  const fichiersJoints = data.patch
    ? [new AttachmentBuilder(Buffer.from(data.patch, 'utf8'), { name: `correctif-${id}.patch` })]
    : [];
  const msg = await channel.send({ ...base, files: fichiersJoints });
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

  const snap = await col().doc(id).get();
  if (!snap.exists) {
    await interaction.reply({ content: 'Correctif introuvable.', flags: MessageFlags.Ephemeral });
    return;
  }
  const data = snap.data();

  if (action === 'no') {
    const maj = { statut: 'refuse', decidePar: interaction.user.id, decideLe: Date.now() };
    await snap.ref.update(maj);
    await interaction.update(payload(id, { ...data, ...maj }));
    return;
  }

  // Appliquer et Revenir passent tous deux par le workflow ; seul le sens change.
  const revert = action === 'rev';
  if (!revert && data.statut !== 'attente') {
    await interaction.reply({ content: `Déjà traité (${data.statut}).`, flags: MessageFlags.Ephemeral });
    return;
  }
  if (revert && data.statut !== 'applique') {
    await interaction.reply({ content: 'Rien à annuler : ce correctif n\'est pas appliqué.', flags: MessageFlags.Ephemeral });
    return;
  }

  const maj = { statut: 'demande', decidePar: interaction.user.id, decideLe: Date.now(), erreur: null };
  await snap.ref.update(maj);
  await interaction.update(payload(id, { ...data, ...maj }));

  try {
    await lancerWorkflow(id, { revert });
  } catch (e) {
    await snap.ref.update({ statut: 'erreur', erreur: e.message });
    console.error('[scan-patches] dispatch :', e.message);
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
          poster(client, doc.id, data).catch((e) => console.error('[scan-patches] post :', e.message));
        } else if (change.type === 'modified' && data.messageId) {
          rafraichir(client, doc.id, data).catch((e) => console.error('[scan-patches] maj :', e.message));
        }
      }
    },
    (err) => console.error('[scan-patches] listener interrompu :', err.message),
  );
}

module.exports = { watch, handleButton, isScanPatchButton };
