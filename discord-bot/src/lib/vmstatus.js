'use strict';

// Remontée de l'état de la VM (CPU, RAM, disque) dans un message Discord,
// réécrit en place toutes les minutes.
//
// ── Pourquoi plus par Firestore ───────────────────────────────────────────
// Le relevé passait par `ops/vmStatus`, lu en direct par le panneau admin de
// l'application. Firestore servait de boîte aux lettres, faute de pouvoir
// parler à la VM depuis un navigateur : elle n'a qu'une IP nue, sans HTTPS.
//
// Ça marchait, mais le prix était le mauvais. Le forfait Spark accorde 20 000
// écritures par jour à TOUT le projet, et ce module en consommait 720 par jour
// au repos, 900 par heure de panneau ouvert. Le 28/08, quatre heures de panneau
// ont épuisé le quota : Firestore a refusé toute écriture, le compteur du code
// PIN compris, et l'application s'est fermée à tout le monde.
//
// Discord ne facture rien et sait éditer un message en place. Le relevé y vit
// donc désormais, et son coût Firestore est exactement zéro — ni le relevé, ni
// la demande de cadence que le panneau posait toutes les vingt secondes.
//
// L'identifiant du message est gardé dans un fichier local, comme le fait
// `statusmonitor.js` : le mémoriser dans Firestore aurait réintroduit ce qu'on
// vient d'en sortir.
//
// ── Cadence ───────────────────────────────────────────────────────────────
// Une minute, en continu. Plus de bascule rapide/lente : elle n'existait que
// pour ménager le quota, et il n'y en a plus. Discord tolère très largement une
// édition par minute sur un même message.
//
// ── Poids sur la machine ──────────────────────────────────────────────────
// Le disque est lu par `df`, un processus fils : sa valeur est gardée en cache
// 30 s. Le reste est natif — `os.cpus()`, `os.totalmem()`.
//
// Le pourcentage CPU vient de la différence entre deux relevés de `os.cpus()`,
// pas de `loadavg()` : une moyenne sur une minute dirait autre chose — la file
// d'attente, pas l'occupation. Les trois charges restent affichées à côté.
//
// Rien ici ne doit pouvoir arrêter le bot : une lecture système ou une édition
// qui échoue est journalisée, et le cycle suivant retentera.

const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { EmbedBuilder } = require('discord.js');

// Salon de supervision, avec l'état des services : c'est là qu'on regarde
// quand on se demande si quelque chose est tombé. Pas le salon des analyses,
// dont le ménage horaire emporterait le message.
const SALON = '1543303590486089809';

// Identifiant du message à réécrire. Fichier local et non Firestore : c'est
// précisément ce qu'on vient d'en sortir.
const FICHIER = path.join(__dirname, '..', '..', 'data', 'vm-status-message.json');

// Une minute : un relevé de machine n'a pas besoin de la seconde près, et rien
// ne pousse à aller plus vite maintenant que ça ne coûte plus rien.
const PERIODE_MS = 60_000;

let bot = null;
const DISQUE_CACHE_MS = 30_000;
const MO = 1024 * 1024;

let minuterie = null;
let dernierCpu = null;
let disqueCache = { valeur: null, le: 0 };

/**
 * Occupation du disque racine, relue au plus toutes les 30 s.
 *
 * `df -kP` plutôt que `df -h` : la sortie POSIX tient sur une ligne aux
 * colonnes fixes, en blocs de 1 Ko. `-h` arrondit et change d'unité selon la
 * taille, ce qui casse un parseur au premier disque qui franchit le gigaoctet.
 */
function disque() {
  if (disqueCache.valeur && Date.now() - disqueCache.le < DISQUE_CACHE_MS) {
    return Promise.resolve(disqueCache.valeur);
  }
  return new Promise((resolve) => {
    execFile('df', ['-kP', '/'], { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve(disqueCache.valeur);
      const ligne = String(stdout).trim().split('\n')[1];
      if (!ligne) return resolve(disqueCache.valeur);
      const [, blocs, utilises, dispo] = ligne.split(/\s+/);
      const totalMo = Math.round(Number(blocs) / 1024);
      if (!totalMo) return resolve(disqueCache.valeur);
      const valeur = {
        totalMo,
        utiliseMo: Math.round(Number(utilises) / 1024),
        libreMo: Math.round(Number(dispo) / 1024),
        // Sur le total facturé, comme `df` : les blocs réservés au système
        // expliquent que utilisé + libre ne fasse pas exactement le total.
        pourcent: Math.round((Number(utilises) / Number(blocs)) * 100),
      };
      disqueCache = { valeur, le: Date.now() };
      resolve(valeur);
    });
  });
}

/** Occupation CPU depuis le relevé précédent, en pourcentage. */
function cpuPourcent() {
  let inactif = 0, total = 0;
  for (const c of os.cpus()) {
    for (const [nom, ms] of Object.entries(c.times)) {
      total += ms;
      if (nom === 'idle') inactif += ms;
    }
  }
  const precedent = dernierCpu;
  dernierCpu = { inactif, total };
  // Premier tour : aucune différence à calculer, donc rien d'honnête à dire.
  if (!precedent) return null;
  const dTotal = total - precedent.total;
  const dInactif = inactif - precedent.inactif;
  if (dTotal <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((1 - dInactif / dTotal) * 100)));
}

/** Relevé complet, tel qu'il sera écrit. */
async function mesurer() {
  const [charge1, charge5, charge15] = os.loadavg();
  const coeurs = os.cpus().length || 1;
  const totalMo = Math.round(os.totalmem() / MO);
  const libreMo = Math.round(os.freemem() / MO);
  const occupation = cpuPourcent();

  return {
    cpu: {
      charge1: Number(charge1.toFixed(2)),
      charge5: Number(charge5.toFixed(2)),
      charge15: Number(charge15.toFixed(2)),
      coeurs,
      // Occupation réelle sur l'intervalle ; au premier tour, on se rabat sur
      // la charge rapportée aux cœurs, faute de point de comparaison.
      pourcent: occupation === null ? Math.round((charge1 / coeurs) * 100) : occupation,
    },
    ram: {
      totalMo,
      libreMo,
      utiliseMo: totalMo - libreMo,
      pourcent: Math.round(((totalMo - libreMo) / totalMo) * 100),
    },
    disque: await disque(),
    uptimeS: Math.round(os.uptime()),
    hote: os.hostname(),
    updatedAt: Date.now(),
  };
}

// ── Affichage ─────────────────────────────────────────────────────────────

const enGo = (mo) => (mo >= 1024 ? (mo / 1024).toFixed(1) + ' Go' : mo + ' Mo');

/** Barre de progression en caractères, plus lisible qu'un pourcentage seul. */
function jauge(pourcent) {
  const plein = Math.max(0, Math.min(10, Math.round((pourcent || 0) / 10)));
  return '`' + '█'.repeat(plein) + '░'.repeat(10 - plein) + '` ' + (pourcent || 0) + ' %';
}

function duree(secondes) {
  const j = Math.floor(secondes / 86400);
  const h = Math.floor((secondes % 86400) / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  if (j) return `${j} j ${h} h`;
  if (h) return `${h} h ${m} min`;
  return `${m} min`;
}

/** Couleur du bandeau : ce qui saute aux yeux avant même de lire les chiffres. */
function couleur(m) {
  const pire = Math.max(m.cpu.pourcent || 0, m.ram.pourcent || 0, m.disque?.pourcent || 0);
  if (pire >= 90) return 0xff4d6a;
  if (pire >= 75) return 0xff9f43;
  return 0x22d98a;
}

function construireEmbed(m) {
  const e = new EmbedBuilder()
    .setColor(couleur(m))
    .setTitle('🖥️ État de la machine')
    .addFields(
      {
        name: `Processeur · ${m.cpu.coeurs} cœur(s)`,
        value: jauge(m.cpu.pourcent)
          + `\ncharge ${m.cpu.charge1} / ${m.cpu.charge5} / ${m.cpu.charge15}`,
      },
      {
        name: 'Mémoire',
        value: jauge(m.ram.pourcent) + `\n${enGo(m.ram.utiliseMo)} sur ${enGo(m.ram.totalMo)}`,
      },
    )
    .setFooter({ text: `${m.hote} · en service depuis ${duree(m.uptimeS)} · ↻ chaque minute` })
    .setTimestamp(m.updatedAt);

  if (m.disque) {
    e.addFields({
      name: 'Disque',
      value: jauge(m.disque.pourcent) + `\n${enGo(m.disque.libreMo)} libres sur ${enGo(m.disque.totalMo)}`,
    });
  }
  return e;
}

// ── Le message, retenu d'un redémarrage à l'autre ──────────────────────────

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
    // Sans le fichier, un redémarrage reposera un message : gênant, pas grave.
    console.error('[vmstatus] identifiant non mémorisé :', e.message);
  }
}

/** Un cycle : mesure, puis édition du message. N'échoue jamais bruyamment. */
async function pousser() {
  if (!bot) return;
  try {
    const embed = construireEmbed(await mesurer());
    const salon = await bot.channels.fetch(SALON);
    const id = lireId();
    if (id) {
      try {
        const msg = await salon.messages.fetch(id);
        await msg.edit({ embeds: [embed] });
        return;
      } catch {
        // Message supprimé à la main : on en repose un plutôt que d'abandonner.
      }
    }
    const msg = await salon.send({ embeds: [embed] });
    ecrireId(msg.id);
  } catch (e) {
    console.error('[vmstatus] relevé non publié :', e.message);
  }
}

/** Démarre la remontée. Appelé au ready du bot. */
function start(client) {
  bot = client;
  if (minuterie) return;
  pousser();
  minuterie = setInterval(pousser, PERIODE_MS);
  console.log(`[vmstatus] relevé Discord toutes les ${PERIODE_MS / 1000} s`);
}

function stop() {
  if (minuterie) clearInterval(minuterie);
  minuterie = null;
}

module.exports = { start, stop, mesurer, construireEmbed, PERIODE_MS };
