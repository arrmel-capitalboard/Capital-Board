'use strict';

// Tests de sécurité, lancés à la main depuis le panneau du salon de sécurité.
//
// Il n'y a plus de cron : l'audit ne part plus seul chaque matin. Deux entrées,
// toutes deux déclenchées par un bouton — l'audit de trafic (une action rejouée
// par un navigateur derrière un proxy, capture analysée) et le pentest actif.
// Le parcours et le pentest vivent dans le dépôt privé capitalboard-securite,
// cloné à côté sur la VM ; le compte rendu est posté par l'orchestrateur.
//
// Le rappel manuel a été retiré le 28/08 : il vivait dans son propre salon, avec
// un bouton de dépôt d'export Burp que personne n'utilisait. Tout passe
// désormais par le panneau du salon des analyses.
//
// Le contenu (actions + rappel) est volontairement hors du dépôt public : il
// vit sur la VM uniquement, voir security-test-actions.example.json pour le
// format. Il est relu à chaque envoi, donc son absence n'empêche pas le bot de
// démarrer — le rappel se désactive en le signalant dans les logs.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const burpaudit = require('./burp-audit');
const config = require('../config');

const ACTIONS_FILE = path.join(__dirname, '..', '..', 'security-test-actions.json');
// Historique des actions déjà proposées, à côté de la liste : même logique,
// un fichier local sur la VM plutôt qu'une collection Firestore pour ça.
const HISTORIQUE_FILE = path.join(__dirname, '..', '..', 'security-test-history.json');
// Largeur de la fenêtre d'exclusion de la rotation. Héritée du rappel manuel,
// qui posait douze actions à la fois ; elle ne sert plus qu'à décider combien
// d'actions doivent défiler avant qu'une puisse revenir.
const SAMPLE_SIZE = 12;
// Motif d'échec relayé par l'orchestrateur sur sa sortie d'erreur.
const LIGNE_ECHEC = /\[audit-auto\] Échec\s*:\s*(.+)/;

/**
 * Actions du fichier. Accepte le format { actions } comme un simple tableau
 * (ancien format). Retourne une liste vide si le fichier est absent ou invalide.
 *
 * Le champ `reminder` qu'il peut porter n'est plus lu : il n'habillait que le
 * rappel manuel, retiré le 28/08. Le laisser dans le fichier ne gêne pas.
 */
function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(ACTIONS_FILE, 'utf8'));
    const list = Array.isArray(raw) ? raw : raw?.actions;
    return { actions: Array.isArray(list) ? list.filter((a) => typeof a === 'string' && a.trim()) : [] };
  } catch (err) {
    console.error(`[security-test] Lecture de ${ACTIONS_FILE} impossible : ${err.message}`);
    return { actions: [] };
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
/**
 * Lance le pentest ACTIF, une fois, à la demande depuis le panneau.
 *
 * Contrairement à l'audit de trafic, il n'a besoin ni de mitmproxy ni de
 * scénario : le script forge une session, joue les attaques, se nettoie et écrit
 * son compte rendu sur sa sortie standard. On le lit et on le rend à l'appelant,
 * qui le poste.
 *
 * @returns {Promise<{code:number, rapport:string, motif:string|null}>}
 */
async function runPentest(onEtape = () => {}) {
  // Même garde de charge que l'audit : le pentest lance un navigateur pour
  // obtenir le jeton, et une e2-micro saturée le ferait expirer.
  const charge = os.loadavg()[0];
  const coeurs = os.cpus().length || 1;
  if (charge > coeurs * 2) {
    return { code: -1, rapport: '', motif: `VM saturée (charge ${charge.toFixed(1)} sur ${coeurs} cœurs), pentest refusé.` };
  }

  const racine = path.join(__dirname, '..', '..', '..');
  const depot = config.depotSecurite || path.join(racine, '..', 'capitalboard-securite');
  const script = path.join(depot, 'scripts', 'pentest.mjs');
  if (!fs.existsSync(script)) {
    return { code: -1, rapport: '', motif: `pentest.mjs introuvable dans ${depot} — clone du dépôt de sécurité manquant.` };
  }

  let rapport = '';
  let motif = null;
  const code = await new Promise((resolve) => {
    const proc = spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    suivreParcours(proc);
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (bloc2) => { rapport += bloc2; });
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (bloc2) => {
      process.stderr.write(bloc2);
      for (const ligne of bloc2.split(/\r?\n/)) {
        // Étape en cours : le script la marque « [[ETAPE]] … », affichée en direct.
        const e = ligne.match(/\[\[ETAPE\]\]\s*(.+)/);
        if (e) { try { onEtape(e[1].trim()); } catch (_) { /* l'affichage ne casse rien */ } }
        // Le script écrit « échec — <motif> » sur stderr en cas d'arrêt net.
        const t = ligne.match(/pentest[^\]]*\]\s*échec\s*—\s*(.+)/i);
        if (t) motif = t[1].trim();
      }
    });
    proc.on('error', (err) => { oublierParcours(); motif = motif || err.message; resolve(-1); });
    proc.on('exit', (c) => { oublierParcours(); resolve(c); });
  });

  // Le script emet un bloc « [[RESULTAT]]{json} » : on le detache du reste.
  let data = null;
  const m = rapport.match(/\[\[RESULTAT\]\](\{.*\})/s);
  if (m) { try { data = JSON.parse(m[1]); } catch (_) { /* embed indisponible, on garde le texte */ } }
  const texte = rapport.replace(/\[\[RESULTAT\]\]\{.*\}/s, '').trim();

  return { code, rapport: texte, data, motif };
}

function start() {
  // Plus d'audit automatique. Il tournait chaque matin a 8h ; desormais tout
  // est lance a la main depuis le panneau du salon de securite — « Generer un
  // scenario » puis « Realiser » pour l'audit de trafic, « Lancer un pentest »
  // pour l'attaque active. Un audit qui part seul contre la production, sans
  // personne pour en lire le resultat dans la foulee, ne se justifiait plus.
  //
  // `runAutomated` et `runPentest` restent exportes : le panneau les appelle.
  const total = loadActions().length;
  console.log(`[security-test] Audit a la demande uniquement — ${total} actions disponibles, rotation sur ${fenetre(total)}.`);
}

/**
 * Scan des secrets du depot, a la demande depuis le panneau.
 *
 * Mode git (pas --no-git) : on scanne le contenu COMMITE, pas les fichiers de
 * la VM. Le .env et la cle Firebase vivent en clair sur la VM pour faire
 * tourner le bot — c'est normal, ils sont gitignores. Les scanner ici les
 * ferait remonter a chaque fois. La question posee est « un secret est-il dans
 * le depot ? », donc dans git.
 *
 * gitleaks est telecharge une fois dans /tmp s'il n'est pas la. Le rapport JSON
 * est lu puis rendu a l'appelant, secrets caviardes.
 *
 * @returns {Promise<{ok:boolean, findings:Array, motif:string|null}>}
 */
async function runScanRepo() {
  const racine = path.join(__dirname, '..', '..', '..');   // clone public
  const rapport = path.join(os.tmpdir(), `gitleaks-${Date.now()}.json`);
  const GL = '8.18.4';
  const script = [
    'set -euo pipefail',
    'BIN=/tmp/gitleaks',
    'if [ ! -x "$BIN" ]; then',
    `  curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v${GL}/gitleaks_${GL}_linux_x64.tar.gz" -o /tmp/gl.tgz`,
    '  tar -xzf /tmp/gl.tgz -C /tmp gitleaks',
    '  chmod +x "$BIN"',
    'fi',
    // --exit-code 0 : on ne veut pas que gitleaks fasse echouer le job, on lit
    // le rapport nous-memes. Mode git par defaut, source = le clone public.
    `"$BIN" detect --source "${racine}" --config "${racine}/.gitleaks.toml" --report-format json --report-path "${rapport}" --redact --exit-code 0`,
  ].join('\n');

  const code = await new Promise((resolve) => {
    const proc = spawn('/bin/bash', ['-c', script], { stdio: ['ignore', 'inherit', 'inherit'] });
    proc.on('error', () => resolve(-1));
    proc.on('exit', (c) => resolve(c));
  });

  if (code !== 0) {
    return { ok: false, findings: [], motif: `gitleaks n'a pas pu s'executer (code ${code}).` };
  }

  let findings = [];
  try {
    const brut = fs.readFileSync(rapport, 'utf8');
    findings = JSON.parse(brut || '[]');
  } catch (e) {
    return { ok: false, findings: [], motif: `rapport illisible : ${e.message}` };
  } finally {
    try { fs.unlinkSync(rapport); } catch (_) { /* deja parti */ }
  }

  // On ne garde que ce qui sert a l'affichage. Le secret est deja caviarde par
  // gitleaks (--redact) ; on ne le renvoie meme pas.
  const clair = findings.map((f) => ({
    fichier: String(f.File || '').replace(racine, '').replace(/^[/\\]+/, ''),
    regle: f.RuleID || f.Description || 'secret',
    ligne: f.StartLine || f.Line || 0,
  }));
  return { ok: true, findings: clair, motif: null };
}

module.exports = {
  start, runAutomated, runPentest, runScanRepo, pickActions, loadConfig, loadActions,
  lireHistorique, fenetre, tuerParcours, SAMPLE_SIZE,
};
