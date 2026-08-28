'use strict';

// Tests de sécurité récurrents, chaque jour à 8h (heure de Paris).
//
// Le cron lance désormais un audit AUTOMATISÉ : une action tirée dans
// security-test-actions.json est rejouée par un navigateur derrière un proxy
// d'interception, puis la capture part à l'analyse. Le parcours lui-même vit
// dans le dépôt privé capitalboard-securite, cloné à côté sur la VM.
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
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const burpaudit = require('./burp-audit');
const config = require('../config');

const ACTIONS_FILE = path.join(__dirname, '..', '..', 'security-test-actions.json');
// Historique des actions déjà proposées, à côté de la liste : même logique,
// un fichier local sur la VM plutôt qu'une collection Firestore pour ça.
const HISTORIQUE_FILE = path.join(__dirname, '..', '..', 'security-test-history.json');
const CHANNEL_ID = '1542226706838978621';
const CRON_EXPR = '0 8 * * *';
// Nombre d'actions par rappel (tronqué si le fichier en contient moins).
const SAMPLE_SIZE = 12;
const ORANGE = 0xf97316;
// Motif d'échec relayé par l'orchestrateur sur sa sortie d'erreur.
const LIGNE_ECHEC = /\[audit-auto\] Échec\s*:\s*(.+)/;
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

// ── Parcours en cours, et sa mise a mort ──────────────────────────────────
//
// Le parcours d'audit tourne dans son propre groupe de processus, avec ses
// petits-enfants : le navigateur et le proxy d'interception. Tant que le bot
// vit, il en garde la trace pour pouvoir tuer l'arbre entier quand il s'arrete.
// Sans cela, chaque redemarrage du bot en laisse un derriere lui.

let groupeParcours = null;

// Un arret demande n'est pas un echec : sans ce drapeau, couper un audit depuis
// Discord y postait une alerte rouge, comme si le parcours avait casse.
let interruptionVoulue = false;

function suivreParcours(proc) {
  groupeParcours = proc.pid;
}

function oublierParcours() {
  groupeParcours = null;
}

/**
 * Tue le parcours et tout ce qu'il a lance.
 *
 * @param {boolean} voulue vrai quand l'arret vient d'une demande explicite, et
 *   non de l'extinction du bot : le compte rendu le dira autrement.
 * @returns {boolean} vrai si un parcours tournait.
 */
function tuerParcours(voulue = false) {
  if (!groupeParcours) return false;
  const pid = groupeParcours;
  groupeParcours = null;
  interruptionVoulue = voulue;
  try {
    // Le negatif vise le groupe, donc le parcours, le navigateur et le proxy.
    process.kill(-pid, 'SIGTERM');
    console.log(`[security-test] \u{23F9} parcours ${pid} arrêté${voulue ? ' à la demande' : ' avec le bot'}.`);
    return true;
  } catch (err) {
    if (err.code !== 'ESRCH') console.error(`[security-test] arrêt du parcours : ${err.message}`);
    return false;
  }
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => { tuerParcours(); process.exit(0); });
}
process.on('exit', tuerParcours);

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
 * jointe ; le bot ne parle ici que pour signaler un échec de lancement — dans le
 * salon des analyses, celui du panneau, et non dans celui du rappel manuel : un
 * audit raté doit se voir là où on l'a déclenché.
 *
 * `action` impose le scénario au lieu de le tirer : c'est ce que fait le
 * panneau du salon sécurité, où le scénario a été montré avant d'être joué.
 */
async function runAutomated(client, { action: impose } = {}) {
  const { actions } = loadConfig();
  if (!actions.length) {
    console.error('[security-test] Aucune action disponible — audit automatisé ignoré.');
    return null;
  }

  // La VM est une e2-micro : Chromium, mitmproxy et le bot y tiennent tout
  // juste. Lancer un parcours sur une machine deja chargee ne le fait pas
  // echouer franchement, il expire partout a la fois — vu le 28/08, ou meme les
  // ecritures Firestore du bot ont depasse neuf minutes. Mieux vaut refuser.
  const charge = os.loadavg()[0];
  const coeurs = os.cpus().length || 1;
  if (charge > coeurs * 2) {
    console.error(`[security-test] VM trop chargee (${charge.toFixed(1)} sur ${coeurs} coeurs) — audit refuse.`);
    try {
      const channel = await client.channels.fetch(burpaudit.RESULTAT_CHANNEL);
      await channel.send(
        `\u{1F7E0} Audit refusé : la VM est saturée (charge ${charge.toFixed(1)} sur ${coeurs} cœurs).`
        + '\nLancer un parcours maintenant le ferait expirer. Réessayez dans quelques minutes.',
      );
    } catch (err) {
      console.error(`[security-test] Signalement impossible : ${err.message}`);
    }
    return null;
  }

  const historique = lireHistorique();
  const action = impose || pickActions(actions, historique, 1)[0];
  console.log(`[security-test] ${new Date().toISOString()} — audit automatisé : ${action}`);

  // Le parcours d'audit a rejoint le depot prive de securite : il decrit le
  // contournement de Turnstile et d'App Check, ce qui ne pouvait pas rester
  // dans un depot public. Sur la VM, les deux clones sont voisins.
  const racine = path.join(__dirname, '..', '..', '..');
  const depot = config.depotSecurite || path.join(racine, '..', 'capitalboard-securite');
  const script = path.join(depot, 'scripts', 'run-automated-audit.mjs');

  // Verifie avant de lancer : sans ce clone, spawn echouerait avec un ENOENT
  // qui ne dit pas ce qui manque, et l'action serait consommee pour rien.
  if (!fs.existsSync(script)) {
    console.error(`[security-test] Parcours d'audit introuvable : ${script}`);
    console.error('[security-test] Clonez arrmel-capitalboard/capitalboard-securite a cote du depot public, ou posez DEPOT_SECURITE.');
    try {
      const channel = await client.channels.fetch(burpaudit.RESULTAT_CHANNEL);
      await channel.send([
        "🔴 Audit automatisé impossible : le dépôt de sécurité n'est pas cloné sur la VM.",
        `Attendu dans \`${depot}\` — ou posez \`DEPOT_SECURITE\` dans le .env.`,
      ].join('\n'));
    } catch (err) {
      console.error(`[security-test] Signalement impossible : ${err.message}`);
    }
    return null;
  }

  // stderr est tuyauté plutôt qu'hérité : le motif de l'échec est écrit là, et
  // sans lui Discord ne pouvait qu'inviter à ouvrir les logs de la VM. Tout est
  // réémis tel quel, la sortie de pm2 ne change pas.
  let motif = null;
  const code = await new Promise((resolve) => {
    // `detached` place le parcours dans son propre groupe de processus. Sans
    // lui, un `pm2 restart` tue le bot et laisse derriere Chromium et mitmproxy,
    // qui continuent de manger la VM : quatre deploiements dans la soiree du
    // 28/08 ont suffi a monter la charge a 23 sur 2 vCPU, et tout ce qui touche
    // au reseau expirait, y compris les ecritures Firestore du bot. Le groupe
    // permet de tuer l'arbre entier d'un coup, a l'arret.
    const proc = spawn(process.execPath, [script, '--action', action], {
      stdio: ['ignore', 'inherit', 'pipe'],
      detached: true,
    });
    suivreParcours(proc);
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (bloc) => {
      process.stderr.write(bloc);
      for (const ligne of bloc.split(/\r?\n/)) {
        const trouve = ligne.match(LIGNE_ECHEC);
        if (trouve) motif = trouve[1].trim();
      }
    });
    proc.on('error', (err) => { console.error('[security-test] lancement impossible :', err.message); oublierParcours(); resolve(-1); });
    proc.on('exit', (code2) => { oublierParcours(); resolve(code2); });
  });

  if (interruptionVoulue) {
    // Arret demande : rien a signaler en rouge, le panneau a deja repondu.
    interruptionVoulue = false;
    console.log(`[security-test] \u{23F9} audit interrompu sur « ${action} » — action non consommée.`);
    return null;
  }

  if (code !== 0) {
    // L'action n'est pas consommée : elle repassera au prochain tour.
    console.error(`[security-test] Audit automatisé en échec (code ${code}).`);
    try {
      const channel = await client.channels.fetch(burpaudit.RESULTAT_CHANNEL);
      await channel.send(motif
        ? `🔴 Audit automatisé en échec sur « ${action} ».\n> ${motif}`
        : `🔴 Audit automatisé en échec sur « ${action} ». Voir les logs de la VM (\`pm2 logs capitalboard-bot\`).`);
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
  lireHistorique, fenetre, tuerParcours, CHANNEL_ID, CRON_EXPR, SAMPLE_SIZE,
};
