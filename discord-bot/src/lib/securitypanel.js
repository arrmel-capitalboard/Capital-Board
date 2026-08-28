'use strict';

// Panneau permanent d'audit de sécurité, posé dans le salon des analyses de
// trafic. Il rassemble au même endroit ce qui était éparpillé : le rappel
// d'actions dans un salon, les comptes rendus dans un autre, et rien pour
// déclencher un audit à la demande entre deux passages du cron.
//
// Deux gestes, chacun en deux temps :
//
//   « Générer un scénario de test » demande d'abord combien de scénarios (1 à
//   10), puis les tire dans la même rotation que le cron — sans les consommer.
//   Un scénario qui ne convient pas se régénère sans trouer la couverture, et
//   une action n'entre dans l'historique qu'une fois son parcours joué. Le
//   bouton « Réaliser » les enchaîne ensuite un par un.
//
//   « Consulter les dernières analyses » liste les cinq derniers comptes
//   rendus, correctifs et alertes confondus ; le menu déroulant en ouvre un en
//   entier — ce qui n'allait pas, et ce qui a été fait pour le corriger.
//
// Les réponses sont éphémères : le salon reste lisible, et les messages d'état
// qui comptent y sont déjà postés par lib/burp-audit.js et lib/scan-patches.js.
//
// Les scénarios en attente vivent en mémoire, pas dans Firestore. Ils ne
// survivent donc pas à un redémarrage du bot — c'est assumé : le geste dure
// quelques secondes, et un scénario perdu se régénère d'un clic.

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const config = require('../config');
const E = require('./emojis');
const burpaudit = require('./burp-audit');
const securitytest = require('./securitytest');

const SALON = burpaudit.RESULTAT_CHANNEL;
const FONDATEUR_ROLE = '1512905140108001391';
const ORANGE = 0xf97316;

// Salons où sortent les comptes rendus de sécurité. Sert à ne relire que ces
// alertes-là : `opsAlerts` porte aussi les quotas d'API, hors sujet ici.
const SALONS_SECURITE = new Set([
  SALON,                  // analyses de trafic
  '1541530997005353030',  // scans de code
]);

const MAX_SCENARIOS = 10;

// Durée de vie d'un tirage. Assez large pour laisser le temps de préparer la
// VM, assez courte pour qu'un scénario oublié ne traîne pas.
const SCENARIO_TTL = 30 * 60 * 1000;

// id court → { actions, creePar, creeLe }. L'id voyage dans le customId du
// bouton, que Discord plafonne à 100 caractères : les actions elles-mêmes,
// des phrases, n'y tiendraient pas.
const scenarios = new Map();

// Un seul parcours à la fois : le proxy d'interception tient le port 8080, et
// deux runs simultanés se marcheraient dessus. Un lot de scénarios s'enchaîne
// donc en série, jamais en parallèle.
let enCours = null;

function purger() {
  const limite = Date.now() - SCENARIO_TTL;
  for (const [id, s] of scenarios) if (s.creeLe < limite) scenarios.delete(id);
}

function retenirScenarios(actions, userId) {
  purger();
  const id = Math.random().toString(36).slice(2, 10);
  scenarios.set(id, { actions, creePar: userId, creeLe: Date.now() });
  return id;
}

/** Embed permanent du salon, publié par `npm run embed -- securite`. */
function panelPayload() {
  const embed = new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle(`${E.ARROW}  Audit de sécurité`)
    .setDescription(
      "Déclenchez un audit quand vous voulez, en plus de celui qui tourne chaque matin à 8h.\n\n"
      + `**1.** Générez de 1 à ${MAX_SCENARIOS} scénarios — tirés dans la rotation, sans être consommés.\n`
      + "**2.** Réalisez-les : un navigateur les rejoue derrière le proxy, la capture est caviardée sur la VM, puis analysée.\n"
      + "**3.** Consultez les dernières analyses — ce qui n'allait pas, et ce qui a été corrigé.",
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

// ── Génération des scénarios ───────────────────────────────────────────────

/** Premier temps : demander combien de scénarios tirer. */
async function demanderCombien(interaction) {
  const actions = securitytest.loadActions();
  if (!actions.length) {
    await interaction.reply({
      content: "Aucune action disponible : `security-test-actions.json` est absent ou vide sur la VM.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Jamais plus que ce que la liste contient : proposer un nombre intenable
  // ferait tirer des doublons.
  const plafond = Math.min(MAX_SCENARIOS, actions.length);
  const options = Array.from({ length: plafond }, (_, i) => {
    const n = i + 1;
    return new StringSelectMenuOptionBuilder()
      .setValue(String(n))
      .setLabel(n === 1 ? '1 scénario' : `${n} scénarios`)
      .setDescription(n === 1 ? 'Un seul parcours' : `${n} parcours enchaînés, un par un`);
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('sec:nb')
    .setPlaceholder('Combien de scénarios ?')
    .addOptions(options);

  await interaction.reply({
    content: `Combien de scénarios voulez-vous jouer ? (1 à ${plafond})`,
    components: [new ActionRowBuilder().addComponents(menu)],
    flags: MessageFlags.Ephemeral,
  });
}

/** Second temps : tirer les actions et proposer de les jouer. */
async function genererScenarios(interaction) {
  const actions = securitytest.loadActions();
  if (!actions.length) {
    await interaction.update({
      content: "Aucune action disponible : `security-test-actions.json` est absent ou vide sur la VM.",
      components: [], embeds: [],
    });
    return;
  }

  const demande = Number(interaction.values[0]);
  const combien = Math.min(Math.max(demande, 1), Math.min(MAX_SCENARIOS, actions.length));

  // Même tirage que le cron, historique compris — mais rien n'est écrit ici.
  const tirees = securitytest.pickActions(actions, securitytest.lireHistorique(), combien);
  const id = retenirScenarios(tirees, interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle(tirees.length === 1 ? '🎯 Scénario de test' : `🎯 ${tirees.length} scénarios de test`)
    .setDescription(tirees.map((a, i) => `**${i + 1}.** ${a}`).join('\n').slice(0, 4000))
    .setFooter({
      text: tirees.length === 1
        ? 'Valable 30 minutes. Régénérez si celui-ci ne convient pas.'
        : `Valable 30 minutes. Comptez quelques minutes par scénario, joués un par un.`,
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sec:run:${id}`)
      .setLabel(tirees.length === 1 ? 'Réaliser le scénario et analyser' : `Réaliser les ${tirees.length} scénarios et analyser`)
      .setStyle(ButtonStyle.Success)
      .setEmoji('▶️'),
    new ButtonBuilder()
      .setCustomId('sec:scenario')
      .setLabel('Autre tirage')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ content: '', embeds: [embed], components: [row] });
}

/** Joue le lot, un scénario après l'autre. */
async function lancerScenarios(interaction, id) {
  const lot = scenarios.get(id);
  if (!lot) {
    await interaction.reply({
      content: "Ce tirage a expiré, ou le bot a redémarré depuis. Générez-en un nouveau.",
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
  const { actions } = lot;

  await interaction.reply({
    content: actions.length === 1
      ? `Audit lancé sur « ${actions[0]} ». Le suivi arrive dans ce salon, comptez quelques minutes.`
      : `${actions.length} audits lancés, joués un par un. Le suivi de chacun arrive dans ce salon.`,
    flags: MessageFlags.Ephemeral,
  });

  // Un parcours dure plusieurs minutes, bien au-delà de la fenêtre d'une
  // interaction : on rend la main tout de suite. L'orchestrateur poste son
  // propre message d'état, réécrit à chaque changement (lib/burp-audit.js).
  enchainer(interaction.client, actions).catch((err) => {
    console.error('[securitypanel] lot d\'audits :', err.message);
  });
}

async function enchainer(client, actions) {
  try {
    for (const action of actions) {
      enCours = action;
      // Une action ratée n'arrête pas le lot : runAutomated signale l'échec
      // dans Discord et rend la main sans lever.
      await securitytest.runAutomated(client, { action })
        .catch((err) => console.error(`[securitypanel] « ${action} » :`, err.message));
    }
  } finally {
    enCours = null;
  }
}

// ── Relecture des analyses ─────────────────────────────────────────────────

const ETAT_PATCH = {
  attente:  '🛠 correctif à valider',
  demande:  '⏳ application en cours',
  applique: '✅ correctif appliqué',
  refuse:   '❌ correctif refusé',
  erreur:   '🔴 application échouée',
};

const COULEUR_PATCH = {
  attente: 0xff9f43, demande: 0x5b8def, applique: 0x22d98a, refuse: 0x6b7280, erreur: 0xff4d6a,
};

const lienCommit = (sha) => `https://github.com/${config.githubRepo}/commit/${sha}`;

/** Première ligne utile d'un compte rendu, pour la ligne de résumé. */
function accroche(texte) {
  const ligne = String(texte || '')
    .split('\n')
    .map((l) => l.replace(/^[*_>#•\s]+/, '').trim())
    .find((l) => l && !/^\*\*Regard/i.test(l));
  return ligne ? ligne.slice(0, 90) : 'compte rendu vide';
}

/**
 * Les cinq derniers comptes rendus, correctifs et alertes confondus.
 *
 * Deux collections parce que deux sorties possibles : un problème assorti d'un
 * correctif devient un `scanPatches` avec ses boutons ; un compte rendu sans
 * correctif part en `opsAlerts`. Aucun lien entre les deux, d'où la fusion ici
 * plutôt qu'une jointure côté base.
 */
async function derniersComptesRendus() {
  const db = getDb();

  const [patches, alertes] = await Promise.all([
    db.collection('scanPatches').orderBy('createdAt', 'desc').limit(10).get(),
    db.collection('opsAlerts').orderBy('createdAt', 'desc').limit(20).get(),
  ]);

  const entrees = [
    ...patches.docs.map((d) => ({ source: 'patch', id: d.id, data: d.data() })),
    // `opsAlerts` porte aussi les quotas d'API : on ne garde que ce qui est
    // sorti dans un salon de sécurité.
    ...alertes.docs
      .filter((d) => SALONS_SECURITE.has(String(d.data().salon || '')))
      .map((d) => ({ source: 'alerte', id: d.id, data: d.data() })),
  ];

  entrees.sort((a, b) => (b.data.createdAt || 0) - (a.data.createdAt || 0));
  return entrees.slice(0, 5);
}

function ligneResume(entree) {
  const { data } = entree;
  const quand = `<t:${Math.round((data.createdAt || Date.now()) / 1000)}:R>`;
  if (entree.source === 'patch') {
    const etat = ETAT_PATCH[data.statut] || data.statut || 'état inconnu';
    return `${etat} · ${quand}\n${accroche(data.resume)}`;
  }
  return `📄 compte rendu · ${quand}\n${accroche(data.texte)}`;
}

/** Liste + menu pour ouvrir un compte rendu en entier. */
async function listerAnalyses(interaction) {
  if (!isConfigured()) {
    await interaction.reply({
      content: 'Firestore non configuré sur la VM : rien à relire.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const entrees = await derniersComptesRendus();
  if (!entrees.length) {
    await interaction.editReply('Aucune analyse enregistrée pour le moment.');
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle('📊 Dernières analyses de sécurité')
    .setDescription(entrees.map((e, i) => `**${i + 1}.** ${ligneResume(e)}`).join('\n\n').slice(0, 4000))
    .setFooter({ text: 'Choisissez une ligne pour lire le compte rendu en entier.' });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('sec:detail')
    .setPlaceholder('Ouvrir un compte rendu')
    .addOptions(entrees.map((e, i) => new StringSelectMenuOptionBuilder()
      .setValue(`${e.source}:${e.id}`)
      .setLabel(`${i + 1}. ${e.source === 'patch' ? (ETAT_PATCH[e.data.statut] || 'correctif') : 'compte rendu'}`.slice(0, 100))
      .setDescription(accroche(e.data.resume || e.data.texte).slice(0, 100))));

  await interaction.editReply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

/** Un compte rendu en entier : le problème, et ce qui a été fait. */
async function ouvrirDetail(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const [source, id] = String(interaction.values[0]).split(':');
  const col = source === 'patch' ? 'scanPatches' : 'opsAlerts';
  const doc = await getDb().collection(col).doc(id).get();

  if (!doc.exists) {
    await interaction.editReply("Ce compte rendu n'existe plus.");
    return;
  }
  const data = doc.data();

  if (source === 'alerte') {
    const embed = new EmbedBuilder()
      .setColor(Number.isInteger(data.couleur) ? data.couleur : ORANGE)
      .setTitle(data.titre || `Compte rendu — ${data.type || 'analyse'}`)
      .setDescription(String(data.texte || '').slice(0, 4000))
      .setTimestamp(data.createdAt || Date.now())
      .setFooter({ text: 'Aucun correctif joint : le compte rendu se suffisait.' });
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const statut = data.statut || 'attente';
  const embed = new EmbedBuilder()
    .setColor(COULEUR_PATCH[statut] ?? ORANGE)
    .setTitle(ETAT_PATCH[statut] || 'Correctif')
    .setDescription(String(data.resume || '').slice(0, 3800))
    .setTimestamp(data.createdAt || Date.now());

  const fichiers = data.fichiers || [];
  if (fichiers.length) {
    embed.addFields({ name: 'Fichiers touchés', value: fichiers.map((f) => `\`${f}\``).join('\n').slice(0, 1000) });
  }

  // Ce qui répond à « comment ça a été corrigé » : le commit, s'il existe.
  if (data.commitSha) {
    embed.addFields({
      name: 'Corrigé par',
      value: `[\`${String(data.commitSha).slice(0, 12)}\`](${lienCommit(data.commitSha)})`,
      inline: true,
    });
  } else if (statut === 'attente') {
    embed.addFields({ name: 'Correction', value: 'Proposée, en attente de votre décision.', inline: true });
  } else if (statut === 'refuse') {
    embed.addFields({ name: 'Correction', value: 'Refusée — rien n’a été appliqué.', inline: true });
  }

  if (data.decidePar) embed.addFields({ name: 'Décision', value: `<@${data.decidePar}>`, inline: true });
  if (data.runUrl) embed.addFields({ name: 'Run', value: `[Voir l'exécution](${data.runUrl})`, inline: true });
  if (data.erreur) embed.addFields({ name: 'Erreur', value: String(data.erreur).slice(0, 1000) });

  await interaction.editReply({ embeds: [embed] });
}

// ── Routage ────────────────────────────────────────────────────────────────

/** Boutons et menus `sec:*`. */
async function handleComponent(interaction) {
  if (!interaction.member?.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }

  const [, geste, arg] = interaction.customId.split(':');
  if (geste === 'scenario') { await demanderCombien(interaction); return; }
  if (geste === 'nb') { await genererScenarios(interaction); return; }
  if (geste === 'run') { await lancerScenarios(interaction, arg); return; }
  if (geste === 'analyses') { await listerAnalyses(interaction); return; }
  if (geste === 'detail') { await ouvrirDetail(interaction); return; }
}

const isSecurityComponent = (customId) => customId.startsWith('sec:');

module.exports = { panelPayload, handleComponent, isSecurityComponent, SALON, MAX_SCENARIOS };
