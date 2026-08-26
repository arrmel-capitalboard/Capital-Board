'use strict';

// Rappel de test de sécurité manuel : toutes les 48h à 10h (heure de Paris),
// une action est piochée dans security-test-actions.json (racine du bot) et
// postée dans le salon dédié, avec le rappel de lancer Burp Suite avant de la
// rejouer sur capitalboard.fr.
//
// La liste est lue à chaque envoi (pas au require) : elle peut vivre hors du
// dépôt, sur la VM seulement, sans empêcher le bot de démarrer si elle manque.

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');

const ACTIONS_FILE = path.join(__dirname, '..', '..', 'security-test-actions.json');
const CHANNEL_ID = '1542226706838978621';
const CRON_EXPR = '0 10 */2 * *';
const ORANGE = 0xf97316;

/** Liste des actions, ou [] si le fichier est absent/invalide. */
function loadActions() {
  try {
    const actions = JSON.parse(fs.readFileSync(ACTIONS_FILE, 'utf8'));
    return Array.isArray(actions) ? actions.filter((a) => typeof a === 'string' && a.trim()) : [];
  } catch (err) {
    console.error(`[security-test] Lecture de ${ACTIONS_FILE} impossible : ${err.message}`);
    return [];
  }
}

/** Embed d'une action de test. */
function buildEmbed(action) {
  return new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle('🎯 Action de test sécurité')
    .setDescription(action)
    .addFields({
      name: '⚠️ Rappel',
      value: 'Assure-toi que Burp Suite est ouvert avec le proxy actif (127.0.0.1:8080) avant de faire cette action sur capitalboard.fr',
    })
    .setFooter({ text: 'Capital Board — test de sécurité manuel' })
    .setTimestamp();
}

/**
 * Pioche une action et la poste. Retourne l'action envoyée, ou null si rien
 * n'a pu être envoyé (liste vide, salon inaccessible) : jamais de throw, le
 * process ne doit pas tomber sur un rappel raté.
 */
async function sendAction(client) {
  const actions = loadActions();
  if (!actions.length) {
    console.error('[security-test] Aucune action disponible — rappel ignoré.');
    return null;
  }

  const action = actions[Math.floor(Math.random() * actions.length)];
  console.log(`[security-test] ${new Date().toISOString()} — action tiree : ${action}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel?.isTextBased()) {
      console.error(`[security-test] Salon ${CHANNEL_ID} introuvable ou non textuel — message non envoye.`);
      return null;
    }
    await channel.send({ embeds: [buildEmbed(action)] });
    return action;
  } catch (err) {
    console.error(`[security-test] Envoi impossible dans le salon ${CHANNEL_ID} (permissions manquantes ou salon absent ?) : ${err.message}`);
    return null;
  }
}

/** Programme le rappel récurrent. */
function start(client) {
  cron.schedule(
    CRON_EXPR,
    () => {
      sendAction(client).catch((err) => console.error('[security-test] erreur :', err.message));
    },
    { timezone: 'Europe/Paris' },
  );
  console.log(`[security-test] Rappel programme (${CRON_EXPR}, Europe/Paris) — ${loadActions().length} actions.`);
}

module.exports = { start, sendAction, buildEmbed, loadActions, CHANNEL_ID, CRON_EXPR };
