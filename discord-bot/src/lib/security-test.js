'use strict';

// Rappel de test de sécurité manuel : toutes les 48h à 10h (heure de Paris),
// une liste d'actions est tirée au sort dans security-test-actions.json (racine
// du bot) et postée dans le salon dédié, avec le rappel de lancer Burp Suite
// avant de les rejouer sur capitalboard.fr.
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
// Nombre d'actions par rappel (tronqué si le fichier en contient moins).
const SAMPLE_SIZE = 12;
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

/** Tire au sort `count` actions distinctes (Fisher-Yates sur une copie). */
function pickActions(actions, count = SAMPLE_SIZE) {
  const pool = [...actions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/** Embed d'une liste d'actions de test. */
function buildEmbed(actions) {
  const list = actions.map((a, i) => `**${i + 1}.** ${a}`).join('\n');
  return new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle(`🎯 Actions de test sécurité (${actions.length})`)
    .setDescription(list)
    .addFields({
      name: '⚠️ Rappel',
      value: 'Assure-toi que Burp Suite est ouvert avec le proxy actif (127.0.0.1:8080) avant de faire ces actions sur capitalboard.fr',
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
  const actions = loadActions();
  if (!actions.length) {
    console.error('[security-test] Aucune action disponible — rappel ignoré.');
    return null;
  }

  const picked = pickActions(actions);
  console.log(`[security-test] ${new Date().toISOString()} — ${picked.length} action(s) tiree(s) :`);
  picked.forEach((a, i) => console.log(`[security-test]   ${i + 1}. ${a}`));

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel?.isTextBased()) {
      console.error(`[security-test] Salon ${CHANNEL_ID} introuvable ou non textuel — message non envoye.`);
      return null;
    }
    await channel.send({ embeds: [buildEmbed(picked)] });
    return picked;
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
  console.log(`[security-test] Rappel programme (${CRON_EXPR}, Europe/Paris) — ${loadActions().length} actions, ${SAMPLE_SIZE} par envoi.`);
}

module.exports = { start, sendAction, buildEmbed, pickActions, loadActions, CHANNEL_ID, CRON_EXPR, SAMPLE_SIZE };
