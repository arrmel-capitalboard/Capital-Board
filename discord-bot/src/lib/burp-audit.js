'use strict';

// Audit Burp déposé depuis Discord.
//
// Flux :
//  1) L'embed de rappel (lib/security-test.js) porte un bouton « Exporter mon
//     audit Burp ».
//  2) Clic → modal avec un champ fichier (export HTTP history, .xml ou .json),
//     même composant que la soumission de suggestion.
//  3) À l'envoi, le bot écrit `burpUploads/{id}` et déclenche
//     security-scan-burp.yml, qui télécharge la pièce jointe, la redacte et
//     l'analyse. Le résultat sort dans le salon sécurité via `opsAlerts` ou
//     `scanPatches`, exactement comme un scan de code.
//
//   burpUploads/{id} = {
//     statut: 'attente'|'encours'|'traite'|'erreur',
//     fichierUrl,              // URL Discord, effacée dès l'analyse terminée
//     fichierNom, fichierTaille,
//     uploadedBy, createdAt, majLe, erreur, runUrl,
//     messageId, channelId,    // message d'état, réécrit à chaque changement
//   }
//
// Un message d'état est posté dès le dépôt et suit le run : sans lui, entre le
// « reçu » et le compte rendu, rien ne dit si l'analyse tourne ou si elle a
// planté. Le workflow passe le document en `encours` avec l'URL du run dès son
// démarrage, puis en `traite` ou `erreur`.
//
// Le bot ne stocke ni ne redacte le fichier : il ne transmet que l'URL de la
// pièce jointe Discord. Un export non redacté n'atterrit donc jamais sur la VM
// ni dans Firestore — la redaction se fait dans le runner, qui est éphémère.
// Contrepartie assumée : cette URL expire (~24 h), un run rejoué trop tard ne
// retrouve plus le fichier et il faut redéposer l'export.
//
// Comme scan-patches.js, le bot ne touche jamais au dépôt : il demande à GitHub
// de lancer un workflow, avec le même jeton, qui reste sur la VM.

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
  ModalBuilder, LabelBuilder, FileUploadBuilder, MessageFlags,
} = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const config = require('../config');

const COL = 'burpUploads';
const WORKFLOW = 'security-scan-burp.yml';
// Salon des analyses de trafic. Distinct du salon des scans de code : ces
// comptes rendus portent sur une session de test manuelle, pas sur un commit.
const RESULTAT_CHANNEL = '1542258866505388083';
const FONDATEUR_ROLE   = '1512905140108001391';

// Discord plafonne l'envoi selon le compte et le niveau de boost du serveur
// (10 Mo, 50 Mo, 100 Mo) : ce garde-fou ne sert qu'à refuser ce que l'analyse
// ne saurait pas traiter. Le digest est dédupliqué par endpoint, donc un gros
// export reste exploitable — c'est le téléchargement dans le runner qui borne.
const TAILLE_MAX = 100 * 1024 * 1024;
const EXTENSION_OK = /\.(xml|json)$/i;

const col = () => getDb().collection(COL);

/** Bouton posé sous l'embed de rappel. */
function bouton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('burp:new')
      .setLabel('Exporter mon audit Burp')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📤'),
  );
}

/** Modal de dépôt : un seul fichier, l'analyse en prend un à la fois. */
function depotModal() {
  const upload = new FileUploadBuilder()
    .setCustomId('export').setMinValues(1).setMaxValues(1).setRequired(true);
  // Discord plafonne la description d'un label à 100 caractères : la marche à
  // suivre complète vit dans le rappel de l'embed, pas ici.
  const label = new LabelBuilder()
    .setLabel('Export HTTP history (.xml ou .json)')
    .setDescription('Burp → HTTP history → Save items. Filtrer sur capitalboard.fr aide, sans être requis.')
    .setFileUploadComponent(upload);

  return new ModalBuilder()
    .setCustomId('burpaudit')
    .setTitle('Exporter mon audit Burp')
    .addLabelComponents(label);
}

/**
 * Déclenche security-scan-burp.yml. Même mécanisme et même jeton que
 * scan-patches.js : le bot demande, GitHub exécute.
 */
async function lancerWorkflow(docId) {
  if (!config.githubToken) throw new Error('GITHUB_DISPATCH_TOKEN absent sur la VM');
  const url = `https://api.github.com/repos/${config.githubRepo}/actions/workflows/${WORKFLOW}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main', inputs: { docId } }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} : ${(await res.text()).slice(0, 200)}`);
}

/** Routeur des boutons burp:*. */
async function handleButton(interaction) {
  if (!interaction.member?.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.showModal(depotModal());
}

/** Réception du fichier : écrit le document, puis déclenche le workflow. */
async function handleModal(interaction) {
  // Avant toute chose : télécharger la pièce jointe et joindre GitHub prend
  // plus que les 3 s d'une réponse d'interaction.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const recus = interaction.fields.getUploadedFiles('export');
  const fichier = recus ? [...recus.values()][0] : null;
  if (!fichier) {
    await interaction.editReply('Aucun fichier reçu.');
    return;
  }
  if (!EXTENSION_OK.test(fichier.name || '')) {
    await interaction.editReply(`Format non géré : \`${fichier.name}\`. Attendu .xml ou .json.`);
    return;
  }
  if (fichier.size > TAILLE_MAX) {
    await interaction.editReply(`Fichier trop gros (${Math.round(fichier.size / 1048576)} Mo). Filtrez le scope dans Burp avant l'export.`);
    return;
  }
  if (!isConfigured()) {
    await interaction.editReply('Firestore non configuré sur la VM : dépôt impossible.');
    return;
  }

  // Id auto-généré : deux exports déposés en même temps produisent deux
  // documents distincts et deux runs indépendants.
  const ref = await col().add({
    statut: 'attente',
    fichierUrl: fichier.url,
    fichierNom: fichier.name || 'export',
    fichierTaille: fichier.size || 0,
    uploadedBy: interaction.user.id,
    createdAt: Date.now(),
  });

  try {
    await lancerWorkflow(ref.id);
  } catch (e) {
    await ref.update({ statut: 'erreur', erreur: e.message, majLe: Date.now() });
    console.error('[burp-audit] dispatch :', e.message);
    await interaction.editReply(`Fichier reçu, mais le lancement de l'analyse a échoué : ${e.message}`);
    return;
  }

  console.log(`[burp-audit] ${COL}/${ref.id} déposé par ${interaction.user.id} (${fichier.size} octets), workflow lancé.`);
  await interaction.editReply(
    `Reçu. Le suivi et le résultat arrivent dans <#${RESULTAT_CHANNEL}>.\n`
    + "L'export est redacté dans le runner avant analyse, et n'est stocké nulle part.",
  );
}

// ── Message d'état ─────────────────────────────────────────────────────────
const ETATS = {
  attente: { titre: '📥 Export reçu — analyse en attente', couleur: 0x5b8def },
  encours: { titre: '⏳ Analyse du trafic en cours…', couleur: 0xff9f43 },
  traite: { titre: '✅ Analyse terminée', couleur: 0x22d98a },
  erreur: { titre: '🔴 Analyse échouée', couleur: 0xff4d6a },
};

const enMo = (octets) => `${(Number(octets || 0) / 1048576).toFixed(1)} Mo`;

function etatPayload(data) {
  const etat = ETATS[data.statut] || ETATS.attente;
  const embed = new EmbedBuilder()
    .setColor(etat.couleur)
    .setTitle(etat.titre)
    .setTimestamp(data.createdAt || Date.now())
    .addFields(
      { name: 'Export', value: `\`${data.fichierNom || 'export'}\` · ${enMo(data.fichierTaille)}`, inline: true },
      { name: 'Déposé par', value: `<@${data.uploadedBy}>`, inline: true },
    );

  if (data.statut === 'traite') {
    embed.setDescription('Le compte rendu arrive juste après ce message.');
  } else if (data.statut === 'encours') {
    embed.setDescription("Le trafic est redacté puis relu. Comptez quelques minutes.");
  } else if (data.statut === 'erreur') {
    embed.setDescription("L'analyse ne s'est pas terminée. Le lien du run dit à quelle étape.");
  }

  if (data.runUrl) embed.addFields({ name: 'Run', value: `[Voir l'exécution](${data.runUrl})`, inline: true });
  if (data.erreur) embed.addFields({ name: 'Erreur', value: String(data.erreur).slice(0, 1000) });

  return { embeds: [embed] };
}

/** Poste le message d'état, puis le réécrit à chaque changement de statut. */
function watch(client) {
  if (!isConfigured()) {
    console.warn('[burp-audit] Firestore non configuré : écoute désactivée.');
    return;
  }
  col().onSnapshot(
    (snap) => {
      for (const change of snap.docChanges()) {
        const doc = change.doc;
        const data = doc.data();

        if (change.type === 'added' && !data.messageId) {
          client.channels.fetch(RESULTAT_CHANNEL)
            .then((channel) => channel.send(etatPayload(data)))
            .then((msg) => doc.ref.update({ messageId: msg.id, channelId: msg.channelId }))
            .catch((e) => console.error('[burp-audit] envoi état :', e.message));
          continue;
        }

        if (change.type === 'modified' && data.messageId) {
          client.channels.fetch(data.channelId || RESULTAT_CHANNEL)
            .then((channel) => channel.messages.fetch(data.messageId))
            .then((msg) => msg.edit(etatPayload(data)))
            .catch((e) => console.error('[burp-audit] maj état :', e.message));
        }

        // Analyse finie : la pièce jointe n'a plus de raison d'être, et Discord
        // en garderait sinon une copie indéfiniment, servie par un lien CDN. On
        // la détache plutôt que de supprimer le message, qui porte aussi le
        // bouton d'export manuel. Le champ est vidé ensuite, sans quoi chaque
        // écriture suivante rejouerait le détachement.
        if (change.type === 'modified' && data.pieceMessageId
            && (data.statut === 'traite' || data.statut === 'erreur')) {
          client.channels.fetch(data.pieceChannelId || RESULTAT_CHANNEL)
            .then((channel) => channel.messages.fetch(data.pieceMessageId))
            .then((msg) => msg.edit({ attachments: [] }))
            .then(() => doc.ref.update({ pieceMessageId: null, pieceDetacheeLe: Date.now() }))
            .catch((e) => console.error('[burp-audit] détachement de la capture :', e.message));
        }
      }
    },
    (err) => console.error('[burp-audit] listener interrompu :', err.message),
  );
}

const isBurpButton = (customId) => customId.startsWith('burp:');
const isBurpModal  = (customId) => customId === 'burpaudit';

// `depotModal` est exporté pour être validé hors ligne : Discord refuse une
// description de label au-delà de 100 caractères, et l'erreur ne se voyait
// qu'au clic, en production.
module.exports = {
  bouton, depotModal, handleButton, handleModal, watch, etatPayload,
  isBurpButton, isBurpModal, RESULTAT_CHANNEL,
};
