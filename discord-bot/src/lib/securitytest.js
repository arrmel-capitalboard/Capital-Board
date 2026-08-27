'use strict';

// Tests de sécurité récurrents, toutes les 48h à 10h (heure de Paris).
//
// Le cron lance désormais un audit AUTOMATISÉ : une action tirée dans
// security-test-actions.json est rejouée par un navigateur derrière un proxy
// d'interception, puis la capture part à l'analyse (scripts/run-automated-audit.mjs).
// Le compte rendu est posté par l'orchestrateur, capture jointe.
//
// Le rappel manuel n'a pas disparu : `npm run security-test` poste toujours la
// liste d'actions à faire à la main, avec le bouton d'export Burp. C'est le
// parcours interactif, celui que l'automatisation ne remplace pas.
//
// Le contenu (actions + rappel) est volontairement hors du dépôt public : il
// vit sur la VM uniquement, voir security-test-actions.example.json pour le
// format. Il est relu à chaque envoi, donc son absence n'empêche pas le bot de
// démarrer — le rappel se désactive en le signalant dans les logs.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const burpaudit = require('./burp-audit');

const ACTIONS_FILE = path.join(__dirname, '..', '..', 'security-test-actions.json');
// Historique des actions déjà proposées, à côté de la liste : même logique,
// un fichier local sur la VM plutôt qu'une collection Firestore pour ça.
const HISTORIQUE_FILE = path.join(__dirname, '..', '..', 'security-test-history.json');
const CHANNEL_ID = '1542226706838978621';
const CRON_EXPR = '0 10 */2 * *';
// Nombre d'actions par rappel (tronqué si le fichier en contient moins).
const SAMPLE_SIZE = 12;
const ORANGE = 0xf97316;
// Utilisé si le fichier n'en fournit pas : rien de spécifique au dépôt public.
const DEFAULT_REMINDER = "Vérifie que ton proxy d'interception est actif avant de commencer.";

/**
 * Contenu du fichier : { actions, reminder }. Accepte aussi un simple tableau
 * d'actions (ancien format). Retourne une liste vide si le fichier est absent
 * ou invalide.
 */
function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(ACTIONS_FILE, 'utf8'));
    const list = Array.isArray(raw) ? raw : raw?.actions;
    const actions = Array.isArray(list) ? list.filter((a) => typeof a === 'string' && a.trim()) : [];
    const reminder = typeof raw?.reminder === 'string' && raw.reminder.trim() ? raw.reminder : DEFAULT_REMINDER;
    return { actions, reminder };
  } catch (err) {
    console.error(`[security-test] Lecture de ${ACTIONS_FILE} impossible : ${err.message}`);
    return { actions: [], reminder: DEFAULT_REMINDER };
  }
}

/** Raccourci : les actions seules. */
function loadActions() {
  return loadConfig().actions;
}

/** Mélange une copie (Fisher-Yates). */
function melange(liste) {
  const pool = [...liste];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/** Historique des actions déjà proposées, [] si le fichier manque. */
function lireHistorique() {
  try {
    const brut = JSON.parse(fs.readFileSync(HISTORIQUE_FILE, 'utf8'));
    return Array.isArray(brut) ? brut.filter((e) => e && typeof e.action === 'string') : [];
  } catch (err) {
    // Premier lancement : le fichier n'existe pas encore, ce n'est pas une erreur.
    if (err.code !== 'ENOENT') console.error(`[security-test] Historique illisible (${err.message}) — reparti de zéro.`);
    return [];
  }
}

/** Ajoute les actions envoyées et ne garde que la fenêtre récente. */
function ecrireHistorique(historique, actions, taillePool) {
  const postedAt = new Date().toISOString();
  const complet = [...historique, ...actions.map((action) => ({ action, postedAt }))];
  const garde = complet.slice(-fenetre(taillePool));
  try {
    fs.writeFileSync(HISTORIQUE_FILE, `${JSON.stringify(garde, null, 2)}\n`, 'utf8');
  } catch (err) {
    // Le rappel est déjà parti : un historique non écrit ne justifie pas une erreur.
    console.error(`[security-test] Historique non enregistré : ${err.message}`);
  }
}

/**
 * Taille de la fenêtre d'exclusion : tout le pool sauf trois, pour qu'une action
 * ne revienne pas tant qu'il en reste d'autres non couvertes. Jamais moins
 * qu'un tirage, sinon la fenêtre ne retiendrait même pas le rappel précédent.
 */
function fenetre(taillePool) {
  return Math.max(SAMPLE_SIZE, taillePool - 3);
}

/**
 * Tire `count` actions en écartant celles déjà proposées récemment.
 *
 * Le rappel en pose douze à la fois : exclure toute la fenêtre laisserait moins
 * de candidats que nécessaire. Quand c'est le cas, on prend d'abord tout ce qui
 * n'a jamais été proposé, puis on complète par les plus anciennes — la rotation
 * couvre ainsi la liste entière avant de se répéter, sans jamais tomber à court.
 */
function pickActions(actions, historique = [], count = SAMPLE_SIZE) {
  const recentes = new Set(historique.slice(-fenetre(actions.length)).map((e) => e.action));
  const jamais = melange(actions.filter((a) => !recentes.has(a)));
  if (jamais.length >= count) return jamais.slice(0, count);

  // Les plus anciennement proposées d'abord ; l'ordre du fichier est chronologique.
  const parAnciennete = [];
  for (const entree of historique) {
    if (actions.includes(entree.action) && !jamais.includes(entree.action) && !parAnciennete.includes(entree.action)) {
      parAnciennete.push(entree.action);
    }
  }
  return [...jamais, ...parAnciennete].slice(0, count);
}

/** Embed d'une liste d'actions de test. */
function buildEmbed(actions, reminder = DEFAULT_REMINDER) {
  const list = actions.map((a, i) => `**${i + 1}.** ${a}`).join('\n');
  return new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle(`🎯 Actions de test sécurité (${actions.length})`)
    .setDescription(list)
    .addFields({
      name: '⚠️ Rappel',
      value: reminder,
    })
    .setFooter({ text: 'Capital Board — test de sécurité manuel' })
    .setTimestamp();
}

/**
 * Tire une liste d'actions et la poste. Retourne les actions envoyées, ou null
 * si rien n'a pu être envoyé (fichier vide, salon inaccessible) : jamais de
 * throw, le process ne doit pas tomber sur un rappel raté.
 */
async function sendAction(client) {
  const { actions, reminder } = loadConfig();
  if (!actions.length) {
    console.error('[security-test] Aucune action disponible — rappel ignoré.');
    return null;
  }

  const historique = lireHistorique();
  const picked = pickActions(actions, historique);
  console.log(`[security-test] ${new Date().toISOString()} — ${picked.length} action(s) tiree(s), ${historique.length} en historique :`);
  picked.forEach((a, i) => console.log(`[security-test]   ${i + 1}. ${a}`));

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel?.isTextBased()) {
      console.error(`[security-test] Salon ${CHANNEL_ID} introuvable ou non textuel — message non envoye.`);
      return null;
    }
    // Le bouton d'export vit sur ce rappel ; l'analyse, elle, sort dans le
    // salon sécurité (voir lib/burp-audit.js).
    await channel.send({ embeds: [buildEmbed(picked, reminder)], components: [burpaudit.bouton()] });
    // Après l'envoi seulement : un rappel qui n'est pas parti ne doit pas
    // consommer des actions dans la rotation.
    ecrireHistorique(historique, picked, actions.length);
    return picked;
  } catch (err) {
    console.error(`[security-test] Envoi impossible dans le salon ${CHANNEL_ID} (permissions manquantes ou salon absent ?) : ${err.message}`);
    return null;
  }
}

/**
 * Lance un audit automatisé : une action tirée par la même rotation, rejouée
 * dans un navigateur derrière le proxy d'interception, puis analysée.
 *
 * Le bot choisit l'action et tient l'historique — l'orchestrateur ne fait que
 * l'exécuter. Le message de compte rendu vient de lui, avec la capture en pièce
 * jointe ; le bot ne parle ici que pour signaler un échec de lancement.
 */
async function runAutomated(client) {
  const { actions } = loadConfig();
  if (!actions.length) {
    console.error('[security-test] Aucune action disponible — audit automatisé ignoré.');
    return null;
  }

  const historique = lireHistorique();
  const [action] = pickActions(actions, historique, 1);
  console.log(`[security-test] ${new Date().toISOString()} — audit automatisé : ${action}`);

  const script = path.join(__dirname, '..', '..', '..', 'scripts', 'run-automated-audit.mjs');
  const code = await new Promise((resolve) => {
    const proc = spawn(process.execPath, [script, '--action', action], { stdio: ['ignore', 'inherit', 'inherit'] });
    proc.on('error', (err) => { console.error('[security-test] lancement impossible :', err.message); resolve(-1); });
    proc.on('exit', resolve);
  });

  if (code !== 0) {
    // L'action n'est pas consommée : elle repassera au prochain tour.
    console.error(`[security-test] Audit automatisé en échec (code ${code}).`);
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      await channel.send(`🔴 Audit automatisé en échec sur « ${action} ». Voir les logs de la VM (\`pm2 logs capitalboard-bot\`).`);
    } catch (err) {
      console.error(`[security-test] Signalement impossible : ${err.message}`);
    }
    return null;
  }

  ecrireHistorique(historique, [action], actions.length);
  return action;
}

/** Programme l'audit récurrent. */
function start(client) {
  cron.schedule(
    CRON_EXPR,
    () => {
      runAutomated(client).catch((err) => console.error('[security-test] erreur :', err.message));
    },
    { timezone: 'Europe/Paris' },
  );
  const total = loadActions().length;
  console.log(`[security-test] Audit automatise programme (${CRON_EXPR}, Europe/Paris) — ${total} actions, rotation sur ${fenetre(total)}.`);
}

module.exports = {
  start, sendAction, runAutomated, buildEmbed, pickActions, loadConfig, loadActions,
  lireHistorique, fenetre, CHANNEL_ID, CRON_EXPR, SAMPLE_SIZE,
};
