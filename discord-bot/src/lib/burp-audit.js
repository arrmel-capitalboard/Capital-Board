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
//     statut: 'attente'|'traite'|'erreur',
//     fichierUrl,              // URL Discord, effacée dès l'analyse terminée
//     fichierNom, fichierTaille,
//     uploadedBy, createdAt, majLe, erreur, runUrl,
//   }
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
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, LabelBuilder, FileUploadBuilder, MessageFlags,
} = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const config = require('../config');

const COL = 'burpUploads';
const WORKFLOW = 'security-scan-burp.yml';
const SECURITE_CHANNEL = '1541530997005353030';
const FONDATEUR_ROLE   = '1512905140108001391';

// Discord plafonne déjà l'envoi bien plus bas (10 Mo sans Nitro) ; ce garde-fou
// ne sert qu'à refuser proprement un fichier qu'un boost rendrait acceptable
// côté Discord mais qui ne passerait pas l'analyse.
const TAILLE_MAX = 20 * 1024 * 1024;
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
  const label = new LabelBuilder()
    .setLabel('Export HTTP history (.xml ou .json)')
    .setDescription("Burp → Proxy → HTTP history → tout sélectionner → clic droit → Save items. Filtrez sur capitalboard.fr : Discord refuse au-delà de 10 Mo.")
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
    `Reçu, analyse en cours. Le résultat arrivera dans <#${SECURITE_CHANNEL}>.\n`
    + "L'export est redacté dans le runner avant analyse, et n'est stocké nulle part.",
  );
}

const isBurpButton = (customId) => customId.startsWith('burp:');
const isBurpModal  = (customId) => customId === 'burpaudit';

module.exports = { bouton, handleButton, handleModal, isBurpButton, isBurpModal, SECURITE_CHANNEL };
