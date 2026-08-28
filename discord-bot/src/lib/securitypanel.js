'use strict';

// Panneau permanent d'audit de sécurité, posé dans le salon des analyses de
// trafic. Il rassemble au même endroit ce qui était éparpillé : le rappel
// d'actions dans un salon, les comptes rendus dans un autre, et rien pour
// déclencher un audit à la demande entre deux passages du cron.
//
// Trois gestes, dans l'ordre où on les fait :
//
//   1) « Générer un scénario de test » tire une action dans la même rotation
//      que le cron, sans la consommer — un scénario qui ne convient pas se
//      régénère sans trouer la couverture.
//   2) Le scénario affiché porte « Réaliser le scénario et analyser », qui
//      lance le parcours automatisé sur cette action précise. L'action n'entre
//      dans l'historique qu'une fois le parcours réellement joué.
//   3) « Consulter les dernières analyses » relit `burpUploads`.
//
// Les réponses sont éphémères : le salon reste lisible, et les messages d'état
// qui comptent y sont déjà postés par lib/burp-audit.js.
//
// Les scénarios en attente vivent en mémoire, pas dans Firestore. Ils ne
// survivent donc pas à un redémarrage du bot — c'est assumé : le geste dure
// quelques secondes, et un scénario perdu se régénère d'un clic.

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags,
} = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const config = require('../config');
const E = require('./emojis');
const burpaudit = require('./burp-audit');
const securitytest = require('./securitytest');

const SALON = burpaudit.RESULTAT_CHANNEL;
const FONDATEUR_ROLE = '1512905140108001391';
const ORANGE = 0xf97316;

// Durée de vie d'un scénario généré. Assez large pour laisser le temps de
// préparer la VM, assez courte pour qu'un scénario oublié ne traîne pas.
const SCENARIO_TTL = 30 * 60 * 1000;

// id court → { action, creePar, creeLe }. L'id voyage dans le customId du
// bouton, que Discord plafonne à 100 caractères : l'action elle-même, souvent
// une phrase, n'y tiendrait pas.
const scenarios = new Map();

// Un seul parcours à la fois : le proxy d'interception tient le port 8080, et
// deux runs simultanés se marcheraient dessus.
let enCours = null;

function purger() {
  const limite = Date.now() - SCENARIO_TTL;
  for (const [id, s] of scenarios) if (s.creeLe < limite) scenarios.delete(id);
}

function retenirScenario(action, userId) {
  purger();
  const id = Math.random().toString(36).slice(2, 10);
  scenarios.set(id, { action, creePar: userId, creeLe: Date.now() });
  return id;
}

/** Embed permanent du salon, publié par `npm run embed -- securite`. */
function panelPayload() {
  const embed = new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle(`${E.ARROW}  Audit de sécurité`)
    .setDescription(
      "Déclenchez un audit quand vous voulez, en plus de celui qui tourne chaque matin à 8h.\n\n"
      + "**1.** Générez un scénario — une action est tirée dans la rotation, sans être consommée.\n"
      + "**2.** Réalisez-le : un navigateur le rejoue derrière le proxy, la capture est caviardée sur la VM, puis analysée.\n"
      + "**3.** Consultez les dernières analyses à tout moment.",
    )
    .setFooter({ text: 'Capital Board — réservé au rôle fondateur' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('sec:scenario')
      .setLabel('Générer un scénario de test')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎯'),
    new ButtonBuilder()
      .setCustomId('sec:analyses')
      .setLabel('Consulter les dernières analyses')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📊'),
  );

  return { embeds: [embed], components: [row] };
}

/** Tire une action et l'affiche, avec le bouton qui la joue. */
async function genererScenario(interaction) {
  const actions = securitytest.loadActions();
  if (!actions.length) {
    await interaction.reply({
      content: "Aucune action disponible : `security-test-actions.json` est absent ou vide sur la VM.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Même tirage que le cron, historique compris — mais rien n'est écrit ici.
  const [action] = securitytest.pickActions(actions, securitytest.lireHistorique(), 1);
  const id = retenirScenario(action, interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle('🎯 Scénario de test')
    .setDescription(action)
    .setFooter({ text: 'Valable 30 minutes. Régénérez-en un si celui-ci ne convient pas.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sec:run:${id}`)
      .setLabel('Réaliser le scénario et analyser')
      .setStyle(ButtonStyle.Success)
      .setEmoji('▶️'),
    new ButtonBuilder()
      .setCustomId('sec:scenario')
      .setLabel('Autre scénario')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

/** Lance le parcours sur le scénario retenu. */
async function lancerScenario(interaction, id) {
  const scenario = scenarios.get(id);
  if (!scenario) {
    await interaction.reply({
      content: "Ce scénario a expiré, ou le bot a redémarré depuis. Générez-en un nouveau.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (enCours) {
    await interaction.reply({
      content: `Un audit tourne déjà : « ${enCours} ». Le proxy n'accepte qu'un parcours à la fois.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  scenarios.delete(id);
  enCours = scenario.action;

  await interaction.reply({
    content: `Audit lancé sur « ${scenario.action} ». Le suivi arrive dans ce salon, comptez quelques minutes.`,
    flags: MessageFlags.Ephemeral,
  });

  // Le parcours dure plusieurs minutes, bien au-delà de la fenêtre d'une
  // interaction : on rend la main tout de suite. L'orchestrateur poste son
  // propre message d'état, réécrit à chaque changement (lib/burp-audit.js).
  securitytest.runAutomated(interaction.client, { action: scenario.action })
    .catch((err) => console.error('[securitypanel] audit :', err.message))
    .finally(() => { enCours = null; });
}

const ETIQUETTES = {
  attente: '📥 en attente',
  encours: '⏳ en cours',
  traite: '✅ terminée',
  erreur: '🔴 échouée',
};

/** Les cinq derniers dépôts et leur sort. */
async function listerAnalyses(interaction) {
  if (!isConfigured()) {
    await interaction.reply({
      content: 'Firestore non configuré sur la VM : rien à relire.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const snap = await getDb().collection('burpUploads')
    .orderBy('createdAt', 'desc').limit(5).get();

  if (snap.empty) {
    await interaction.editReply('Aucune analyse enregistrée pour le moment.');
    return;
  }

  const lignes = snap.docs.map((doc) => {
    const v = doc.data();
    // Horodatage relatif : Discord le rend dans le fuseau de qui lit.
    const quand = `<t:${Math.round((v.createdAt || Date.now()) / 1000)}:R>`;
    const etat = ETIQUETTES[v.statut] || v.statut || 'état inconnu';
    const run = v.runUrl ? ` · [run](${v.runUrl})` : '';
    return `${etat} — ${quand} · \`${v.fichierNom || 'export'}\`${run}`;
  });

  const embed = new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle('📊 Dernières analyses de trafic')
    .setDescription(lignes.join('\n'))
    .setFooter({ text: 'Le compte rendu de chaque analyse est posté dans ce salon.' });

  await interaction.editReply({ embeds: [embed] });
}

/** Routeur des boutons sec:*. */
async function handleButton(interaction) {
  if (!interaction.member?.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }

  const [, geste, arg] = interaction.customId.split(':');
  if (geste === 'scenario') { await genererScenario(interaction); return; }
  if (geste === 'run') { await lancerScenario(interaction, arg); return; }
  if (geste === 'analyses') { await listerAnalyses(interaction); return; }
}

const isSecurityButton = (customId) => customId.startsWith('sec:');

module.exports = { panelPayload, handleButton, isSecurityButton, SALON };
