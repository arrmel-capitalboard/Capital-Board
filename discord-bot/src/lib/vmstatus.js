'use strict';

// Remontée de l'état de la VM (CPU, RAM, disque) dans Firestore, pour le panel
// admin de l'app.
//
// Pourquoi Firestore plutôt qu'une petite API sur la VM : aucun port à ouvrir,
// aucun secret de plus, et le panel admin lit déjà Firestore. Le document est
// écrit par la clé de service, donc hors des règles ; celles-ci n'autorisent
// que la lecture, et seulement au compte fondateur (firestore.rules).
//
// ── Cadence ───────────────────────────────────────────────────────────────
// Une seconde en continu ferait 86 400 écritures par jour, quatre fois le
// quota gratuit — donc facturé, pour des mesures que personne ne regarde la
// plupart du temps. La VM écrit donc vite seulement quand le panel est ouvert.
//
// Le panel pose `ops/vmWatch { until }` tant qu'il est affiché ; ce module
// l'écoute (un seul listener, une lecture par changement) et bascule entre
// 1 s et 60 s. Dix minutes de consultation par jour coûtent 600 écritures.
//
// ── Poids sur la machine ──────────────────────────────────────────────────
// À 1 s, lancer `df` à chaque tour ferait un processus par seconde sur une
// e2-micro. Le disque ne bouge pas à cette échelle : sa lecture est gardée en
// cache 30 s. Le reste est natif — `os.cpus()`, `os.totalmem()` — donc sans
// processus fils.
//
// Le pourcentage CPU vient de la différence entre deux relevés de `os.cpus()`,
// pas de `loadavg()` : une moyenne sur une minute ne bouge pas à la seconde,
// elle afficherait une valeur figée. Les trois charges restent remontées à
// côté, elles disent autre chose — la file d'attente, pas l'occupation.
//
// Rien ici ne doit pouvoir arrêter le bot : une lecture système ou une
// écriture qui échoue est journalisée, et le cycle suivant retentera.

const os = require('node:os');
const { execFile } = require('node:child_process');
const { getDb, isConfigured } = require('../firebase');

const PERIODE_LENTE_MS = 60_000;
const PERIODE_RAPIDE_MS = 1_000;
const DISQUE_CACHE_MS = 30_000;
const MO = 1024 * 1024;

let minuterie = null;
let cadence = PERIODE_LENTE_MS;
let arretEcoute = null;
let rapideJusqua = 0;
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
    // Le panel s'en sert pour juger de la fraîcheur : sans elle, il ne saurait
    // pas si un relevé de 20 s est normal ou inquiétant.
    cadenceMs: cadence,
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

/** (Re)programme la minuterie sur la cadence voulue. */
function programmer(periode) {
  if (minuterie && cadence === periode) return;
  if (minuterie) clearInterval(minuterie);
  cadence = periode;
  minuterie = setInterval(pousser, periode);
  console.log(`[vmstatus] cadence ${periode / 1000} s`);
  pousser();
}

/**
 * Écoute la demande du panel. `until` est une date : tant qu'elle est dans le
 * futur, quelqu'un regarde. Le panel la repousse régulièrement, donc un onglet
 * fermé brutalement retombe tout seul en cadence lente.
 */
function ecouterDemande() {
  arretEcoute = getDb().collection('ops').doc('vmWatch').onSnapshot(
    (snap) => {
      rapideJusqua = (snap.exists ? snap.data().until : 0) || 0;
      programmer(Date.now() < rapideJusqua ? PERIODE_RAPIDE_MS : PERIODE_LENTE_MS);
    },
    (e) => console.error('[vmstatus] écoute de la demande interrompue :', e.message),
  );
}

/** Démarre la remontée. Appelé au ready du bot. */
function start() {
  if (!isConfigured()) {
    console.warn('[vmstatus] Firestore non configuré : remontée désactivée.');
    return;
  }
  if (minuterie) return;
  programmer(PERIODE_LENTE_MS);
  ecouterDemande();

  // La demande peut expirer sans qu'aucun changement de document ne survienne :
  // sans ce contrôle, une cadence rapide durerait jusqu'à la prochaine écriture
  // du panel — c'est-à-dire indéfiniment si l'onglet a été fermé.
  setInterval(() => {
    if (cadence === PERIODE_RAPIDE_MS && Date.now() >= rapideJusqua) programmer(PERIODE_LENTE_MS);
  }, 5_000);
}

function stop() {
  if (minuterie) clearInterval(minuterie);
  minuterie = null;
  if (arretEcoute) arretEcoute();
  arretEcoute = null;
}

module.exports = { start, stop, mesurer, PERIODE_LENTE_MS, PERIODE_RAPIDE_MS };
