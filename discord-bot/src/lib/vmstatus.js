'use strict';

// Remontée de l'état de la VM (CPU, RAM, disque) dans Firestore, pour le panel
// admin de l'app.
//
// Pourquoi Firestore plutôt qu'une petite API sur la VM : aucun port à ouvrir,
// aucun secret de plus, et le panel admin lit déjà Firestore. Le document est
// écrit par la clé de service, donc hors des règles ; celles-ci n'autorisent
// que la lecture, et seulement au compte fondateur (firestore.rules).
//
// Un seul document, réécrit en place : l'historique ne nous intéresse pas, et
// une collection grossirait sans fin. À 30 s, cela fait ~2 900 écritures par
// jour, loin du quota gratuit de Firestore.
//
// Rien ici ne doit pouvoir arrêter le bot : une lecture système ou une écriture
// qui échoue est journalisée, et le cycle suivant retentera.

const os = require('node:os');
const { execFile } = require('node:child_process');
const { getDb, isConfigured } = require('../firebase');

const PERIODE_MS = 30_000;
const MO = 1024 * 1024;

let minuterie = null;

/**
 * Occupation du disque racine.
 *
 * `df -kP` plutôt que `df -h` : la sortie POSIX tient sur une ligne aux
 * colonnes fixes, en blocs de 1 Ko. `-h` arrondit et change d'unité selon la
 * taille, ce qui casse un parseur au premier disque qui franchit le gigaoctet.
 */
function disque() {
  return new Promise((resolve, reject) => {
    execFile('df', ['-kP', '/'], { timeout: 5000 }, (err, stdout) => {
      if (err) return reject(err);
      const ligne = String(stdout).trim().split('\n')[1];
      if (!ligne) return reject(new Error('df n\'a rien renvoyé pour /'));
      const [, blocs, utilises, dispo] = ligne.split(/\s+/);
      const totalMo = Math.round(Number(blocs) / 1024);
      const utiliseMo = Math.round(Number(utilises) / 1024);
      const libreMo = Math.round(Number(dispo) / 1024);
      if (!totalMo) return reject(new Error('taille de disque illisible'));
      resolve({
        totalMo,
        utiliseMo,
        libreMo,
        // Sur le total facturé, comme `df` : les blocs réservés au système
        // expliquent que utilisé + libre ne fasse pas exactement le total.
        pourcent: Math.round((utiliseMo / totalMo) * 100),
      });
    });
  });
}

/** Relevé complet, tel qu'il sera écrit. */
async function mesurer() {
  const [charge1, charge5, charge15] = os.loadavg();
  const coeurs = os.cpus().length || 1;
  const totalMo = Math.round(os.totalmem() / MO);
  const libreMo = Math.round(os.freemem() / MO);

  return {
    cpu: {
      charge1: Number(charge1.toFixed(2)),
      charge5: Number(charge5.toFixed(2)),
      charge15: Number(charge15.toFixed(2)),
      coeurs,
      // La charge est un nombre de processus prêts, pas un pourcentage : elle
      // se lit rapportée au nombre de cœurs. Au-delà de 100 %, ça attend.
      pourcent: Math.round((charge1 / coeurs) * 100),
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

/** Un cycle : mesure et écriture. N'échoue jamais bruyamment. */
async function pousser() {
  try {
    await getDb().collection('ops').doc('vmStatus').set(await mesurer());
  } catch (e) {
    console.error('[vmstatus] relevé non écrit :', e.message);
  }
}

/** Démarre la remontée périodique. Appelé au ready du bot. */
function start() {
  if (!isConfigured()) {
    console.warn('[vmstatus] Firestore non configuré : remontée désactivée.');
    return;
  }
  if (minuterie) return;
  pousser();
  minuterie = setInterval(pousser, PERIODE_MS);
  console.log(`[vmstatus] Remontée de l'état VM toutes les ${PERIODE_MS / 1000} s.`);
}

function stop() {
  if (minuterie) clearInterval(minuterie);
  minuterie = null;
}

module.exports = { start, stop, mesurer, PERIODE_MS };
