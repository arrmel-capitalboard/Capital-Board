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
// Rien n'est éphémère : tout est posté en clair, puis retiré par le ménage au
// bout d'une heure. Un message que seul son auteur voit ne se relit pas, ne se
// montre pas, et disparaît au rechargement — c'est le salon lui-même qui doit
// porter la trace de ce qui a été fait, le temps que ça compte.
//
// Les scénarios en attente vivent en mémoire, pas dans Firestore. Ils ne
// survivent donc pas à un redémarrage du bot — c'est assumé : le geste dure
// quelques secondes, et un scénario perdu se régénère d'un clic.
//
// Le panneau se pose tout seul au démarrage du bot, et se met à jour si son
// texte a changé : rien à publier à la main, rien à supprimer avant de
// republier. Son identifiant de message vit dans `config/panneauSecurite`.
// Supprimé ou noyé dans un vidage de salon, il revient de lui-même.

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, MessageFlags,
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

// Filet de sécurité du panneau : un message effacé pendant que le bot était
// éteint, ou évincé du cache avant sa suppression, revient au plus tard ici.
const VERIFICATION_PERIODIQUE = 15 * 60 * 1000;

// Repos entre deux scénarios d'un même lot. La VM tourne sur des cœurs
// partagés : quatre minutes de navigateur et de proxy épuisent ses crédits de
// rafale, et le parcours suivant démarre alors sur une machine bridée, où tout
// expire. Deux minutes de calme les laissent se reconstituer.
const REPOS_ENTRE_SCENARIOS = 2 * 60 * 1000;

// Combien de temps un message reste dans le salon avant d'etre efface. Les
// comptes rendus, eux, vivent dans Firestore : « Consulter les dernieres
// analyses » les relit, et c'est la leur vraie place. Le salon ne sert qu'a
// suivre ce qui se passe maintenant.
const RETENTION_SALON = 60 * 60 * 1000;
const CADENCE_MENAGE = 10 * 60 * 1000;

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

// Arret demande depuis le panneau : coupe le parcours courant et annule ceux
// qui suivent, plutot que d'enchainer sur un lot dont on ne veut plus.
let arretDemande = false;

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
      + "Un seul à la fois, avec deux minutes de repos entre chacun — la VM ne tient pas la charge autrement.\n"
      + "**3.** Lancez un pentest — les attaques d'un intrus jouées pour de vrai, pas seulement déduites.\n"
      + "**4.** Consultez les dernières analyses — ce qui n'allait pas, et ce qui a été corrigé.\n\n"
      + "_Le salon se vide de lui-même : passé une heure, les messages disparaissent. Les comptes rendus, eux, restent consultables ici._",
    )
    .setFooter({ text: 'Capital Board — réservé au rôle fondateur' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('sec:scenario')
      .setLabel('Générer un scénario de test')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎯'),
    new ButtonBuilder()
      .setCustomId('sec:pentest')
      .setLabel('Lancer un pentest')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🛡️'),
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
    });
    return;
  }
  if (enCours) {
    await interaction.reply({
      content: `Un audit tourne déjà : « ${enCours} ». Le proxy n'accepte qu'un parcours à la fois.`,
    });
    return;
  }

  scenarios.delete(id);
  const { actions } = lot;

  await interaction.reply({
    content: actions.length === 1
      ? 'Audit lancé. Le suivi arrive dans ce salon.'
      : `${actions.length} audits lancés, joués un par un. Le suivi arrive dans ce salon.`,
  });

  // Un parcours dure plusieurs minutes, bien au-delà de la fenêtre d'une
  // interaction : on rend la main tout de suite.
  enchainer(interaction.client, actions).catch((err) => {
    console.error("[securitypanel] lot d'audits :", err.message);
  });
}

// Liste des exécutions de l'analyse de trafic, dans le dépôt privé de sécurité.
const LIEN_RUNS = `https://github.com/${config.githubSecurityRepo}/actions/workflows/security-scan-burp.yml`;

// État de chaque scénario du lot, tel qu'affiché dans le message d'avancement.
const PUCES = { attente: '\u{26AA}', repos: '\u{1F634}', encours: '\u{1F535}', fait: '\u{2705}', rate: '\u{1F534}', annule: '\u{23F9}' };

function avancementPayload(actions, etats, fini, depuis) {
  const traites = etats.filter((e) => e === 'fait' || e === 'rate').length;
  const auRepos = etats.includes('repos');
  const rates = etats.filter((e) => e === 'rate').length;

  const embed = new EmbedBuilder()
    .setColor(fini ? (rates ? 0xff9f43 : 0x22d98a) : 0x5b8def)
    .setTitle(fini
      ? `\u{1F9EA} Audit à la demande — terminé (${traites - rates}/${actions.length})`
      : `\u{1F9EA} Audit à la demande — ${Math.min(traites + 1, actions.length)}/${actions.length}`)
    .setDescription(actions.map((a, i) => `${PUCES[etats[i]]} ${a}`).join('\n').slice(0, 4000))
    .setTimestamp();

  // Horodatage relatif : Discord le fait vieillir tout seul. C'est ce qui rend
  // un lot mort reconnaissable — figé sur « en cours depuis 40 minutes », il ne
  // trompe personne, là où un texte fixe laisserait croire que ça travaille
  // encore. Le bot ne réécrit rien entre deux scénarios, et plus rien du tout
  // s'il redémarre en cours de lot.
  const quand = `<t:${Math.round(depuis / 1000)}:R>`;
  embed.addFields({
    name: fini ? 'Terminé' : (auRepos ? 'En repos depuis' : 'Scénario en cours depuis'),
    value: fini ? `${quand}${rates ? ` · ${rates} raté${rates > 1 ? 's' : ''}` : ''}` : quand,
    inline: true,
  });

  // Sans ces deux repères, rien ne distingue « ça travaille » de « c'est
  // planté » : le message d'état de la capture n'arrive qu'au dépôt, en fin de
  // parcours.
  // Le run GitHub n'existe qu'une fois la capture déposée, donc en fin de
  // parcours : on pointe la liste des exécutions du workflow, valable avant
  // comme après. Le lien direct vers un run précis, lui, arrive sur le message
  // d'état de la capture (lib/burp-audit.js).
  embed.addFields({
    name: 'Analyse',
    value: `[Exécutions du workflow](${LIEN_RUNS})`,
    inline: true,
  });

  embed.setFooter({
    text: fini
      ? "Le compte rendu de chaque analyse arrive séparément."
      : "Navigation, capture, caviardage, puis analyse. Le run GitHub n'apparaît qu'à la fin du parcours.",
  });

  // Le bouton disparait a la fin : un lot termine n'a plus rien a arreter, et
  // un bouton mort invite a cliquer pour rien.
  const composants = fini ? [] : [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('sec:stop')
      .setLabel("Arrêter l'audit")
      .setStyle(ButtonStyle.Danger)
      .setEmoji('\u{23F9}'),
  )];

  return { embeds: [embed], components: composants };
}

/**
 * Joue le lot en série et tient un message d'avancement.
 *
 * Le message d'état posté par lib/burp-audit.js n'apparaît qu'au dépôt de la
 * capture, donc après tout le parcours : sans celui-ci, un lot de trois
 * scénarios laisse le salon muet une dizaine de minutes.
 */
async function enchainer(client, actions) {
  const etats = actions.map(() => 'attente');
  let message = null;
  let depuis = Date.now();
  let minuterieRepos = null;

  try {
    const channel = await client.channels.fetch(SALON);
    message = await channel.send(avancementPayload(actions, etats, false, depuis));
  } catch (err) {
    // L'avancement est un confort : son absence ne doit pas empêcher l'audit.
    console.error("[securitypanel] message d'avancement :", err.message);
  }

  const rafraichir = (fini) => {
    if (!message) return Promise.resolve();
    return message.edit(avancementPayload(actions, etats, fini, depuis))
      .catch((err) => console.error('[securitypanel] maj avancement :', err.message));
  };

  try {
    for (let i = 0; i < actions.length; i++) {
      if (arretDemande) { etats[i] = 'annule'; continue; }
      enCours = actions[i];
      etats[i] = 'encours';
      depuis = Date.now();
      await rafraichir(false);

      // Une action ratée n'arrête pas le lot : runAutomated signale l'échec
      // dans Discord et rend la main sans lever — elle retourne null en ce cas.
      const ok = await securitytest.runAutomated(client, { action: actions[i] })
        .catch((err) => { console.error(`[securitypanel] « ${actions[i]} » :`, err.message); return null; });

      etats[i] = ok ? 'fait' : (arretDemande ? 'annule' : 'rate');

      // Repos avant le suivant, jamais apres le dernier : la machine doit
      // reprendre son souffle, pas nous faire attendre pour rien.
      if (i < actions.length - 1 && !arretDemande) {
        enCours = null;
        etats[i + 1] = 'repos';
        depuis = Date.now();
        await rafraichir(false);
        await new Promise((resolve) => {
          minuterieRepos = setTimeout(resolve, REPOS_ENTRE_SCENARIOS);
          couperRepos = () => { clearTimeout(minuterieRepos); resolve(); };
        });
        minuterieRepos = null;
        couperRepos = () => {};
      }
    }
  } finally {
    enCours = null;
    arretDemande = false;
    await rafraichir(true);
  }
}

// Interrompt le repos en cours, s'il y en a un : sans cela, un arret demande
// pendant la pause ne prendrait effet que deux minutes plus tard.
let couperRepos = () => {};

/** Coupe le parcours en cours et annule la suite du lot. */
async function arreterAudit(interaction) {
  if (!enCours && !arretDemande) {
    await interaction.reply({ content: 'Aucun audit en cours.' });
    return;
  }
  const vise = enCours;
  arretDemande = true;
  const tue = securitytest.tuerParcours(true);
  couperRepos();
  await interaction.reply({
    content: tue
      ? `Arrêt demandé sur \u00ab ${vise} \u00bb. Le navigateur et le proxy sont coupés, la suite du lot est annulée.`
      : "Le parcours ne répondait plus : il est considéré comme arrêté, la suite du lot est annulée.",
  });
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

/**
 * Lance le pentest actif et poste son compte rendu.
 *
 * Le run prend plusieurs minutes — un navigateur, puis la batterie d'attaques.
 * On defère aussitôt, on annonce, puis on remplace par le résultat. Le compte
 * rendu vient tel quel de la sortie du script : classification déterministe,
 * rien à interpréter côté bot.
 */
async function lancerPentest(interaction) {
  const enTete = '🛡️ **Pentest en cours** — attaques réelles, production, périmètre sûr.\n\n';
  await interaction.reply({ content: enTete + '_Démarrage…_' });

  // Chaque étape franchie coche la précédente et affiche celle en cours. Le
  // message s'édite au fil de l'eau ; on limite la cadence pour ne pas se faire
  // gronder par Discord (une édition à la seconde au plus).
  const faites = [];
  let enCours = null;
  let derniereEdition = 0;
  let editionEnVol = false;

  const peindre = async (force = false) => {
    if (editionEnVol) return;
    const maintenant = Date.now();
    if (!force && maintenant - derniereEdition < 1100) return;
    editionEnVol = true;
    derniereEdition = maintenant;
    const lignes = faites.map((e) => `✅ ${e}`);
    if (enCours) lignes.push(`⏳ ${enCours}`);
    try {
      await interaction.editReply({ content: enTete + lignes.join('\n') });
    } catch (_) { /* une édition ratée n'arrête pas le pentest */ }
    editionEnVol = false;
  };

  const onEtape = (nom) => {
    if (enCours) faites.push(enCours);
    enCours = nom;
    peindre();
  };

  const { code, rapport, data, motif } = await securitytest.runPentest(onEtape);
  if (enCours) { faites.push(enCours); enCours = null; }

  if (code !== 0) {
    await interaction.editReply({
      content: '🔴 **Pentest en échec.**' + (motif ? `\n> ${motif}` : ' Voir les logs de la VM (`journalctl --user -u capitalboard-bot`).'),
    });
    return;
  }

  const findings = (data && data.findings) || [];
  const notes = (data && data.notes) || [];
  const pistesIA = (data && data.pistesIA) || [];
  const testes = (data && data.testes) || faites.length;
  const rate = findings.length > 0;

  const embed = new EmbedBuilder()
    .setColor(rate ? 0xff4d6a : 0x22d98a)
    .setTitle(rate ? `🔴 ${findings.length} faille(s) trouvée(s)` : '🟢 Aucune faille')
    .setDescription(`Pentest actif — **${testes}** attaques jouées contre la production, périmètre sûr.`)
    .setTimestamp();

  const PASTILLE = { 5: '🔴', 4: '🔴', 3: '🟠', 2: '🟡', 1: '⚪' };
  for (const f of findings.slice(0, 8)) {
    embed.addFields({
      name: `${PASTILLE[f.gravite] || '⚪'} ${f.gravite}/5 — ${f.titre}`.slice(0, 256),
      value: `${f.famille} · ${f.detail}\n\`${f.chemin}\``.slice(0, 1024),
    });
  }

  // La liste que l'IA a décidé de tester — réussies ou non, c'est ce que le
  // fondateur veut voir : de quoi le modèle a eu l'idée.
  if (pistesIA.length) {
    const l = pistesIA.slice(0, 12).map((x) => `${x.bloque ? '✅' : '🔴'} \`${x.chemin}\``).join('\n');
    embed.addFields({ name: `🤖 Pistes générées par l'IA (${pistesIA.length})`, value: l.slice(0, 1024) });
  }

  if (notes.length) {
    embed.addFields({
      name: 'Notes de robustesse',
      value: notes.slice(0, 5).map((n) => `⚪ ${n.titre} — ${n.detail}`).join('\n').slice(0, 1024),
    });
  }

  // Bouton Corriger : n'apparaît que s'il y a des failles. Les familles trouvées
  // sont retenues en mémoire (TTL 30 min) pour que le bouton affiche les étapes
  // de correction ciblées.
  const composants = [];
  if (rate) {
    const id = Math.random().toString(36).slice(2, 8);
    const familles = [...new Set(findings.map((f) => f.famille))];
    correctifsEnAttente.set(id, { familles, le: Date.now() });
    composants.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`sec:fix:${id}`).setLabel('Corriger').setStyle(ButtonStyle.Success).setEmoji('🔧'),
    ));
  }

  await interaction.editReply({
    content: rate ? `<@&${FONDATEUR_ROLE}>` : '',
    embeds: [embed],
    components: composants,
    allowedMentions: { roles: rate ? [FONDATEUR_ROLE] : [], parse: [] },
  });
}

// Familles trouvées par le dernier pentest, le temps d'appuyer sur « Corriger ».
// En mémoire, comme les scénarios : on ne persiste pas un état d'affichage.
const correctifsEnAttente = new Map();

// Comment corriger, par famille. Deterministe : chaque famille a un remede
// connu. Pas d'auto-application — Cloudflare, npm, regles Firestore et code ne
// se corrigent pas de la meme facon, et appliquer a l'aveugle serait pire.
const REMEDES = {
  'En-têtes': 'Poser les en-têtes manquants du **site** par une règle Cloudflare :\n'
    + 'Rules → Transform Rules → *Modify Response Header* → Add :\n'
    + '`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.\n'
    + '_(L\'API est déjà corrigée côté Worker.)_',
  'Dépendances': 'Dans le dossier cité : `npm audit fix` (ou `npm audit` pour le détail).\n'
    + 'Relancer les tests avant de déployer.',
  'Résistance du login': 'Vérifier `LOGIN_RL_MAX` et `LOGIN_IP_RL_MAX` dans le Worker.',
  'XSS stocké': 'Échapper la sortie dans la fonction citée (`_escapeHtmlChat` / `_attr`, js/app.js).',
  'Lecture croisée (IDOR)': 'Renforcer `firestore.rules` sur le chemin cité (exiger `_isSelf(uid)`),\n'
    + 'puis `npx firebase deploy --only firestore:rules`.',
  'Pistes IA (lecture croisée)': 'Renforcer `firestore.rules` sur le chemin cité (exiger `_isSelf(uid)`),\n'
    + 'puis `npx firebase deploy --only firestore:rules`.',
  'Élévation de privilège': 'Remettre le contrôle admin en tête de la route du Worker :\n'
    + '`verifyIdToken` puis `localId === ADMIN_UID`, avant toute action.',
  'Jeton trafiqué': 'Vérifier que `verifyIdToken` contrôle bien la signature (JWKS) — un `alg:none` doit être rejeté.',
  'Contrôle d\'accès': 'Exiger une preuve de connexion en tête de route (`verifyIdToken`).',
};

async function afficherCorrectifs(interaction, id) {
  const entree = correctifsEnAttente.get(id);
  if (!entree) {
    await interaction.reply({ content: 'Ce pentest a expiré. Relancez-en un pour obtenir les correctifs.', flags: MessageFlags.Ephemeral });
    return;
  }
  const embed = new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle('🔧 Comment corriger')
    .setDescription('Étapes ciblées par famille de faille. À appliquer à la main : Cloudflare, npm, règles et code ne se corrigent pas pareil.');
  for (const fam of entree.familles) {
    embed.addFields({ name: fam, value: (REMEDES[fam] || 'Voir le détail du finding.').slice(0, 1024) });
  }
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/** Liste + menu pour ouvrir un compte rendu en entier. */
async function listerAnalyses(interaction) {
  if (!isConfigured()) {
    await interaction.reply({
      content: 'Firestore non configuré sur la VM : rien à relire.',
    });
    return;
  }

  await interaction.deferReply();

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
  await interaction.deferReply();

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

// ── Le panneau se pose seul ────────────────────────────────────────────────

// Le message du panneau, retenu dans Firestore. Sans lui, retrouver l'embed
// demanderait de remonter l'historique du salon — que les comptes rendus font
// defiler — et un panneau introuvable serait repose en double.
const DOC_PANNEAU = 'config/panneauSecurite';

/**
 * Pose le panneau au demarrage, ou remet a jour celui qui existe.
 *
 * Publier a la main depuis le poste de dev supposait d'avoir le jeton Discord
 * en local, de supprimer l'ancien message, et de penser a le refaire a chaque
 * changement de texte. Le bot sait le faire lui-meme : il connait l'etat voulu,
 * et il redemarre a chaque deploiement.
 */
async function assurerPanneau(client) {
  if (!isConfigured()) {
    console.warn('[securitypanel] Firestore non configuré : panneau non posé.');
    return;
  }
  // Un vidage de salon declenche une rafale de suppressions : sans ce verrou,
  // chacune reposerait son panneau et le salon se remplirait de doublons.
  if (poseEnCours) return;
  poseEnCours = true;
  try {
    await poserPanneau(client);
  } finally {
    poseEnCours = false;
  }
}

let poseEnCours = false;

async function poserPanneau(client) {
  const ref = getDb().doc(DOC_PANNEAU);
  const connu = (await ref.get()).data() || {};
  const channel = await client.channels.fetch(SALON);

  if (connu.messageId) {
    try {
      const message = await channel.messages.fetch(connu.messageId);
      await message.edit(panelPayload());
      console.log(`[securitypanel] \u{1F4CC} panneau à jour — message ${message.id}`);
      return;
    } catch (err) {
      // Supprime a la main, ou salon change : on en repose un.
      console.warn(`[securitypanel] panneau introuvable (${err.message}) — nouveau message.`);
    }
  }

  const message = await channel.send(panelPayload());
  await ref.set({ messageId: message.id, channelId: message.channelId, majLe: Date.now() }, { merge: true });
  console.log(`[securitypanel] \u{1F4CC} panneau posé — message ${message.id}`);
}

/**
 * Efface les messages du salon passe une heure, sauf le panneau.
 *
 * Rien n'est perdu : les comptes rendus vivent dans `opsAlerts` et
 * `scanPatches`, que « Consulter les dernieres analyses » relit. Ce qui
 * disparait ici, ce sont les messages d'avancement et les etats de capture,
 * dont l'interet est passe.
 */
async function menage(client) {
  if (!isConfigured()) return;

  const channel = await client.channels.fetch(SALON);
  const panneau = (await getDb().doc(DOC_PANNEAU).get()).data()?.messageId;
  const limite = Date.now() - RETENTION_SALON;

  const messages = await channel.messages.fetch({ limit: 100 });
  // Un message qui porte encore des boutons attend une decision. Les correctifs
  // proposes par une analyse de trafic arrivent ici (lib/scan-patches.js), et
  // leur « Appliquer » n'existe nulle part ailleurs : efface, le correctif ne
  // peut plus etre applique. Le menage les epargne donc, comme le panneau.
  const vieux = messages.filter((m) => m.id !== panneau
    && m.createdTimestamp < limite
    && !m.components?.length);
  if (!vieux.size) return;

  // Le second argument ecarte ce que Discord refuse de supprimer en lot : rien
  // au-dela de quatorze jours. Sans lui, un seul vieux message ferait echouer
  // toute la fournee.
  const effaces = await channel.bulkDelete(vieux, true);
  console.log(`[securitypanel] \u{1F9F9} ${effaces.size} message(s) effacé(s) — plus vieux qu'une heure.`);
}

/**
 * Garde le panneau en place : au demarrage, apres chaque suppression dans le
 * salon, et par verification periodique.
 *
 * Les trois se completent. L'evenement de suppression ne porte que sur les
 * messages en cache, et un vidage de salon peut evincer le panneau du cache
 * avant sa propre suppression ; la verification periodique rattrape ce cas,
 * comme elle rattrape un message efface pendant que le bot etait eteint.
 */
function surveiller(client) {
  const verifier = () => assurerPanneau(client)
    .catch((err) => console.error('[securitypanel] panneau :', err.message));

  client.on(Events.MessageDelete, (message) => {
    if (message.channelId === SALON) verifier();
  });
  client.on(Events.MessageBulkDelete, (messages, channel) => {
    if (channel?.id === SALON) verifier();
  });

  setInterval(verifier, VERIFICATION_PERIODIQUE).unref();

  const nettoyer = () => menage(client)
    .catch((err) => console.error('[securitypanel] ménage :', err.message));
  setInterval(nettoyer, CADENCE_MENAGE).unref();

  // Le panneau d'abord : le menage a besoin de son identifiant pour l'epargner.
  return verifier().then(nettoyer);
}

// ── Routage ────────────────────────────────────────────────────────────────

/** Boutons et menus `sec:*`. */
async function handleComponent(interaction) {
  if (!interaction.member?.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.' });
    return;
  }

  const [, geste, arg] = interaction.customId.split(':');
  if (geste === 'scenario') { await demanderCombien(interaction); return; }
  if (geste === 'nb') { await genererScenarios(interaction); return; }
  if (geste === 'run') { await lancerScenarios(interaction, arg); return; }
  if (geste === 'stop') { await arreterAudit(interaction); return; }
  if (geste === 'pentest') { await lancerPentest(interaction); return; }
  if (geste === 'fix') { await afficherCorrectifs(interaction, arg); return; }
  if (geste === 'analyses') { await listerAnalyses(interaction); return; }
  if (geste === 'detail') { await ouvrirDetail(interaction); return; }
}

const isSecurityComponent = (customId) => customId.startsWith('sec:');

module.exports = { panelPayload, assurerPanneau, surveiller, handleComponent, isSecurityComponent, SALON, MAX_SCENARIOS };
