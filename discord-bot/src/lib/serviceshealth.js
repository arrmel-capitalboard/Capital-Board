'use strict';

// État des services (Worker, Firestore, Google/FCM, email, cours, favoris,
// filtrage IP, bot) publié dans un message Discord réécrit en place.
//
// ── Pourquoi ici plutôt que dans le panneau admin ─────────────────────────
// Le bilan s'affichait dans la page Admin de l'application, rafraîchi toutes
// les vingt secondes tant que la page restait ouverte. Chaque passage lisait
// `config/discordStats` — 180 lectures Firestore par heure de panneau ouvert,
// pour savoir si le bot répond encore.
//
// La supervision n'a rien à faire dans une page qu'il faut penser à ouvrir :
// ce qu'on veut d'un état de service, c'est qu'il vienne à nous quand il vire
// au rouge. Discord fait ça mieux, et sans rien facturer.
//
// ── L'authentification ────────────────────────────────────────────────────
// `/admin/health` exige un jeton d'identité du compte fondateur. Le bot en
// forge un avec la clé de service : elle a déjà tous les pouvoirs sur le
// projet, cette route n'en ajoute aucun. Le jeton est demandé à chaque cycle
// et jeté aussitôt — un jeton d'une heure gardé en mémoire ne vaudrait pas les
// quelques millisecondes économisées.
//
// Rien ici ne doit pouvoir arrêter le bot : une sonde ou une édition qui
// échoue est journalisée, et le cycle suivant retentera.

const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const { isConfigured } = require('../firebase');

// Salon de supervision. Le même que l'état de la machine : c'est là qu'on
// regarde quand on se demande si quelque chose est tombé.
const SALON = '1543303590486089809';

const FICHIER = path.join(__dirname, '..', '..', 'data', 'services-health-message.json');

// Cinq minutes. Une panne de service ne se répare pas en vingt secondes, et
// éditer un message plus souvent n'apprendrait rien de plus.
const PERIODE_MS = 5 * 60_000;

// Compte fondateur, seul autorisé par la route. Même valeur que côté client
// (`ADMIN_UID` dans js/app.js) : c'est un identifiant, pas un secret.
const ADMIN_UID = 'A6nZQ8PcxdURytSesA17xK81I9T2';

const WORKER = process.env.WORKER_URL || 'https://api.capitalboard.fr';

// Clé Web de l'application Firebase. Ce n'est pas un secret : elle est servie
// en clair dans js/app.js à chaque visiteur du site, et elle n'ouvre rien par
// elle-même — c'est un identifiant de projet, les règles Firestore et
// l'authentification font le travail. La mettre ici évite une variable
// d'environnement de plus sur la VM.
const CLE_WEB = 'AIzaSyBnHkOTwFoJNMvYOgG7Ne-AFKgE3GBRiNU';

// Ordre d'affichage, et libellés. La clé est celle que renvoie le Worker.
const SERVICES = [
  ['firestore', 'Firestore'],
  ['google', 'Google / FCM'],
  ['email', 'Email (Resend)'],
  ['yahoo', 'Cours (Yahoo)'],
  ['instagram', 'Favoris (Instagram)'],
  ['abuseipdb', 'Filtrage IP (AbuseIPDB)'],
];

let bot = null;
let minuterie = null;

/**
 * Jeton d'identité du compte fondateur, forgé avec la clé de service.
 *
 * Deux temps, comme le fait le parcours d'audit : la clé signe un jeton
 * personnalisé, que l'API Identity Toolkit échange contre un jeton d'identité —
 * le seul format que `verifyIdToken` accepte côté Worker.
 */
async function jetonAdmin() {
  const { getAuth } = require('firebase-admin/auth');
  const { getDb } = require('../firebase');
  getDb();   // force l'initialisation de l'app admin, si ce n'est pas déjà fait
  const custom = await getAuth().createCustomToken(ADMIN_UID);

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${CLE_WEB}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  const d = await res.json();
  if (!res.ok || !d.idToken) throw new Error(`echange refuse : ${d.error?.message || res.status}`);
  return d.idToken;
}

/** Interroge le Worker. Retourne le bilan, ou lève. */
async function sonder() {
  const idToken = await jetonAdmin();
  const res = await fetch(`${WORKER}/admin/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(20000),
  });
  const d = await res.json();
  if (!res.ok || !d.services) throw new Error(d.error || `HTTP ${res.status}`);
  return d.services;
}

function construireEmbed(s, erreur) {
  if (erreur) {
    return new EmbedBuilder()
      .setColor(0xff4d6a)
      .setTitle('🔴 État des services — bilan indisponible')
      .setDescription(
        'Le Worker n\'a pas répondu, ou le jeton d\'administration a été refusé.\n'
        + '```' + String(erreur).slice(0, 300) + '```\n'
        + 'Le Worker lui-même est peut-être en cause : c\'est lui qui porte cette sonde.',
      )
      .setFooter({ text: '↻ nouvelle tentative dans 5 minutes' })
      .setTimestamp();
  }

  const lignes = SERVICES.map(([cle, nom]) => {
    const etat = s[cle];
    const point = etat === 'ok' ? '🟢' : '🔴';
    return `${point}  ${nom}`;
  });
  // Le Worker a répondu : par construction, il est debout.
  lignes.unshift('🟢  Worker (API)');

  const enPanne = SERVICES.filter(([cle]) => s[cle] !== 'ok');
  const e = new EmbedBuilder()
    .setColor(enPanne.length ? 0xff4d6a : 0x22d98a)
    .setTitle(enPanne.length
      ? `🔴 ${enPanne.length} service(s) en panne`
      : '🟢 Tous les services répondent')
    .setDescription(lignes.join('\n'))
    .setFooter({ text: '↻ mise à jour toutes les 5 minutes' })
    .setTimestamp();

  // Le motif vaut mieux qu'un point rouge : « jeton expiré » et « quota du jour
  // épuisé » ne se soignent pas de la même façon.
  if (s.instagram !== 'ok' && s.instagramError) {
    e.addFields({ name: 'Instagram', value: String(s.instagramError).slice(0, 500) });
  }
  if (s.abuseipdb !== 'ok' && s.abuseipdbError) {
    e.addFields({ name: 'AbuseIPDB', value: String(s.abuseipdbError).slice(0, 500) });
  }
  return e;
}

function lireId() {
  try {
    return JSON.parse(fs.readFileSync(FICHIER, 'utf8')).messageId || null;
  } catch {
    return null;
  }
}

function ecrireId(messageId) {
  try {
    fs.mkdirSync(path.dirname(FICHIER), { recursive: true });
    fs.writeFileSync(FICHIER, JSON.stringify({ messageId, salon: SALON }, null, 2));
  } catch (e) {
    console.error('[services] identifiant non mémorisé :', e.message);
  }
}

async function pousser() {
  if (!bot) return;
  let embed;
  try {
    embed = construireEmbed(await sonder(), null);
  } catch (e) {
    // Une sonde qui échoue est elle-même une information : on la publie plutôt
    // que de laisser le message d'hier donner le change.
    embed = construireEmbed(null, e.message);
  }
  try {
    const salon = await bot.channels.fetch(SALON);
    const id = lireId();
    if (id) {
      try {
        const msg = await salon.messages.fetch(id);
        await msg.edit({ embeds: [embed] });
        return;
      } catch {
        // Message supprimé à la main : on en repose un.
      }
    }
    const msg = await salon.send({ embeds: [embed] });
    ecrireId(msg.id);
  } catch (e) {
    console.error('[services] bilan non publié :', e.message);
  }
}

function start(client) {
  if (!isConfigured()) {
    console.warn('[services] Firestore non configuré : bilan désactivé.');
    return;
  }
  bot = client;
  if (minuterie) return;
  pousser();
  minuterie = setInterval(pousser, PERIODE_MS);
  console.log(`[services] bilan Discord toutes les ${PERIODE_MS / 60000} min`);
}

function stop() {
  if (minuterie) clearInterval(minuterie);
  minuterie = null;
}

module.exports = { start, stop, sonder, construireEmbed, PERIODE_MS };
