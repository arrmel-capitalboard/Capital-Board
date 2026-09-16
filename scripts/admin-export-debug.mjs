// ═══════════════════════════════════════════════════════════════════════════
//  admin-export-debug.mjs — export de diagnostic du compte d'un membre
//
//  Pourquoi un script et pas une Cloud Function
//  Le projet n'en déploie aucune : pas de dossier functions/, aucun bloc
//  functions dans firebase.json, et l'en-tête de backup-firestore.mjs dit que
//  le plan Blaze a été écarté à dessein. Une callable aurait demandé une
//  surface de déploiement entière — plan, CI, runtime, clé de service dans un
//  secret de plus — pour un outil lancé par une seule personne, de temps en
//  temps. scripts/ porte déjà dix scripts Admin SDK sur le même modèle : celui
//  -ci en est le onzième.
//
//  Ce qui garde réellement la porte
//  La clé de service, et elle seule. L'Admin SDK ignore les règles Firestore
//  par construction : qui tient FIREBASE_SERVICE_ACCOUNT lit toute la base,
//  avec ou sans ce script. Le contrôle de rôle ci-dessous n'est donc pas un
//  rempart contre une clé volée — il n'y en a pas — mais deux choses utiles :
//  retirer le rôle `superadmin` dans Firestore désarme l'outil pour un usage
//  normal, et la trace d'audit désigne un compte, pas « quelqu'un qui avait la
//  clé ». Le vrai rempart reste la garde de cette clé.
//
//  RGPD
//  Ce fichier contient les données financières d'un tiers. Chaque exécution,
//  réussie ou refusée, laisse une entrée dans `auditLog` — la collection que
//  le Worker alimente déjà à chaque route privilégiée, et qu'un cron purge à
//  un an. Une seconde collection n'aurait servi qu'à ce qu'on oublie de la
//  regarder, et lui aurait fait manquer cette péremption.
//  L'écriture d'audit précède la remise du fichier : pas de trace, pas
//  d'export.
//
//  Le dépôt est PUBLIC. Le fichier produit ne doit JAMAIS y atterrir : le
//  script refuse toute destination située sous la racine du dépôt.
//
//  Usage
//    export FIREBASE_SERVICE_ACCOUNT="$(cat cle-service.json)"
//    export ADMIN_UID="…"
//    node scripts/admin-export-debug.mjs --uid=<uid> [--compte=pea|cto] [--out=<dossier>]
//    node scripts/admin-export-debug.mjs --email=membre@exemple.fr --compte=cto
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import os   from 'os';

const ICI   = path.dirname(fileURLToPath(import.meta.url));
const DEPOT = path.resolve(ICI, '..');

// ── Le format, extrait de js/app.js ────────────────────────────────────────
//
// Le client et cet outil doivent rendre le même fichier, sans quoi
// reconcile-pea.cjs aurait deux formats à connaître. Plutôt que de recopier la
// sérialisation, on compile la fonction du client. Si quelqu'un la déplace, le
// script s'arrête net au lieu de produire un fichier d'une autre forme.
function trancheApp(nom, ouvre, ferme) {
  const src = readFileSync(path.join(DEPOT, 'js', 'app.js'), 'utf8');
  const a = src.indexOf(ouvre), b = src.indexOf(ferme);
  if (a < 0 || b < 0 || b < a) {
    throw new Error('Bloc « ' + nom + ' » introuvable dans js/app.js — bornes déplacées ?');
  }
  return src.slice(a, b);
}

export function chargerFormatClient() {
  const bloc = trancheApp('format d\'export', 'function buildDebugExport(o) {', '\nfunction exportDebugData() {');
  // eslint-disable-next-line no-new-func
  return new Function(bloc + '\nreturn buildDebugExport;')();
}

// Suffixe de collection par enveloppe. Même règle que `_col` dans js/app.js :
// le compte-titres vit dans des documents suffixés « Cto », le PEA sans
// suffixe. Trois documents seulement, jamais rangés dans les annexes.
const COLS = ['portfolio', 'transactions', 'versements'];
const nomCol = (base, compte) => (compte === 'cto' ? base + 'Cto' : base);

// ── Le cœur, sans dépendance à Firebase ────────────────────────────────────
//
// `db` et `auth` sont injectés : le script réel passe l'Admin SDK, les tests
// passent un double. C'est ce qui permet de vérifier le refus d'accès et la
// trace d'audit sans émulateur ni clé.
export async function exporterDebugAdmin({
  db, auth, adminUid, uid, email, compte = 'pea',
  buildDebugExport, horodatage, version = null,
}) {
  if (!db) throw new Error('db manquant');
  if (!adminUid) throw new Error('ADMIN_UID manquant : impossible d\'attribuer cet accès à quelqu\'un.');
  if (compte !== 'pea' && compte !== 'cto') throw new Error('compte inconnu : ' + compte + ' (attendu pea ou cto)');
  if (!uid && !email) throw new Error('désignez le membre par --uid ou --email');

  // Même forme que les entrées du Worker (voir audit() dans
  // capital-board-worker/src/index.js) : `action`, `details`, `by`, `source`
  // et `at`. Le panneau d'administration les lit telles quelles.
  //
  // `at` doit être un horodatage Firestore, pas une chaîne : la purge annuelle
  // filtre sur `at.timestampValue` et laisserait une chaîne s'accumuler pour
  // toujours — dans une collection de traces d'accès, c'est le contraire de ce
  // qu'on veut.
  //
  // `targetUid` et `compte` s'ajoutent à cette forme : ils rendent le journal
  // interrogeable (« tous mes accès au compte de X »), ce qu'une phrase libre
  // dans `details` ne permet pas.
  const audit = {
    action:  'adminExportDebug',
    by:      adminUid,
    source:  'script:admin-export-debug',
    compte,
    cible:   uid ? { uid } : { email },
    at:      horodatage ? horodatage() : new Date(),
  };

  // Journaliser quoi qu'il arrive, y compris le refus — une trace qui ne
  // garde que les accès réussis ne dit rien des tentatives.
  const tracer = async () => {
    try { await db.collection('auditLog').add(audit); }
    catch (e) { console.error('AUDIT NON ÉCRIT : ' + (e && e.message)); throw e; }
  };

  try {
    // ── Verrou : le compte qui lance porte-t-il le rôle ? ────────────────
    // `roles/{uid}.role == 'superadmin'`, la même définition que celle des
    // règles Firestore (voir _isAdmin dans firestore.rules).
    const roleSnap = await db.doc('roles/' + adminUid).get();
    const role = roleSnap && roleSnap.exists ? (roleSnap.data() || {}).role : null;
    if (role !== 'superadmin') {
      throw new Error('accès refusé : ' + adminUid + ' ne porte pas le rôle superadmin');
    }

    // ── Résolution du membre ────────────────────────────────────────────
    let cibleUid = uid;
    if (!cibleUid) {
      if (!auth) throw new Error('résolution par email impossible : auth manquant');
      const u = await auth.getUserByEmail(email);
      if (!u || !u.uid) throw new Error('aucun compte pour ' + email);
      cibleUid = u.uid;
    }
    audit.targetUid = cibleUid;

    // ── Lecture des trois documents ─────────────────────────────────────
    const lu = {};
    for (const base of COLS) {
      const col  = nomCol(base, compte);
      const snap = await db.doc('users/' + cibleUid + '/data/' + col).get();
      lu[base] = snap && snap.exists ? ((snap.data() || {}).items || []) : [];
    }

    const data = buildDebugExport({
      compte,
      version,
      source:       'admin:' + adminUid,
      portfolio:    lu.portfolio,
      transactions: lu.transactions,
      versements:   lu.versements,
    });

    audit.resultat = 'ok';
    audit.volume = {
      lignes:       data.portfolio.length,
      transactions: data.transactions.length,
      versements:   data.versements.length,
    };
    audit.details = 'export debug ' + compte + ' du membre ' + cibleUid + ' — '
      + data.portfolio.length + ' lignes, ' + data.transactions.length + ' écritures, '
      + data.versements.length + ' versements';
    // La trace est écrite AVANT que le fichier ne soit rendu : un export qui
    // n'aurait pas pu être tracé n'a pas lieu.
    await tracer();
    return { data, targetUid: cibleUid };

  } catch (e) {
    if (!audit.resultat) {
      audit.resultat = 'refus';
      audit.motif    = e && e.message;
      audit.details  = 'export debug REFUSÉ — ' + (e && e.message || '');
      try { await tracer(); } catch (_) { /* déjà signalé */ }
    }
    throw e;
  }
}

// ── Garde-fou de destination ───────────────────────────────────────────────
//
// Le dépôt est public. Un export contenant les avoirs d'un membre n'y entre
// pas, même par inadvertance d'un `--out=.`.
export function verifierDestination(dossier, depot = DEPOT) {
  const abs = path.resolve(dossier);
  const rel = path.relative(depot, abs);
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
    throw new Error(
      'destination refusée : ' + abs + '\n' +
      'Elle est dans le dépôt, qui est public. Choisissez un dossier hors dépôt.');
  }
  if (!existsSync(abs) || !statSync(abs).isDirectory()) {
    throw new Error('destination introuvable ou pas un dossier : ' + abs);
  }
  return abs;
}

// ── Ligne de commande ──────────────────────────────────────────────────────
async function principal() {
  const args = process.argv.slice(2);
  const opt = n => {
    const a = args.find(x => x.startsWith('--' + n + '='));
    return a ? a.slice(n.length + 3) : null;
  };

  const uid    = opt('uid');
  const email  = opt('email');
  const compte = opt('compte') || 'pea';
  const sortie = verifierDestination(opt('out') || os.tmpdir());

  const brut = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!brut) {
    console.error('FIREBASE_SERVICE_ACCOUNT manquant.');
    console.error('  export FIREBASE_SERVICE_ACCOUNT="$(cat cle-service.json)"');
    process.exit(1);
  }
  const adminUid = process.env.ADMIN_UID;
  if (!adminUid) { console.error('ADMIN_UID manquant : l\'audit doit nommer quelqu\'un.'); process.exit(1); }

  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const { getAuth } = await import('firebase-admin/auth');

  initializeApp({ credential: cert(JSON.parse(brut)) });
  const db = getFirestore();

  // Version de l'application au moment de l'export, lue à la source — le
  // membre, lui, peut avoir une version plus ancienne en cache.
  let version = null;
  try {
    version = (readFileSync(path.join(DEPOT, 'js', 'app.js'), 'utf8')
      .match(/const APP_VERSION = '([^']+)'/) || [])[1] || null;
  } catch (_) { /* sans importance */ }

  const { data, targetUid } = await exporterDebugAdmin({
    db, auth: getAuth(), adminUid, uid, email, compte,
    buildDebugExport: chargerFormatClient(),
    // Horodatage serveur : ni l'horloge de la machine qui lance le script,
    // ni celle de qui la règle. Résolu en Timestamp, donc purgeable à un an.
    horodatage: () => FieldValue.serverTimestamp(),
    version,
  });

  const fichier = path.join(sortie, 'debug_' + compte + '_' + targetUid + '.json');
  writeFileSync(fichier, JSON.stringify(data, null, 2), 'utf8');

  console.log('Export écrit : ' + fichier);
  console.log('  membre  : ' + targetUid + '   enveloppe : ' + compte);
  console.log('  contenu : ' + data.portfolio.length + ' lignes, '
    + data.transactions.length + ' écritures, ' + data.versements.length + ' versements');
  console.log('  audit   : auditLog/ — accès enregistré au nom de ' + adminUid);
  console.log('\nÀ analyser avec :');
  console.log('  node scripts/reconcile-pea.cjs "' + fichier + '"');
  console.log('Supprimez-le une fois le diagnostic fait : ce sont les avoirs de quelqu\'un.');
}

// Exécuté directement, et non importé par les tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().catch(e => { console.error('\n' + (e && e.message || e)); process.exit(1); });
}
