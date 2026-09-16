// Suite de tests de scripts/admin-export-debug.mjs — l'export de diagnostic
// du compte d'un membre, déclenché par l'administrateur.
//
// Firestore et Auth sont doublés : le cœur du script les reçoit en paramètre,
// justement pour que le contrôle d'accès et la trace d'audit se vérifient sans
// émulateur ni clé de service.
import { exporterDebugAdmin, chargerFormatClient, verifierDestination } from './admin-export-debug.mjs';
import path from 'path';
import os   from 'os';

const ADMIN  = 'A6nZQ8PcxdURytSesA17xK81I9T2';
const MEMBRE = 'uid-du-membre';

// ── Double de Firestore ─────────────────────────────────────────────────────
// Un dictionnaire de documents, et une collection d'audit qui retient ce qu'on
// lui écrit. `panne` fait échouer l'écriture d'audit, pour vérifier qu'un
// export non traçable n'a pas lieu.
function faireDb({ roleAdmin = 'superadmin', docs = {}, panneAudit = false } = {}) {
  const audit = [];
  return {
    audit,
    doc(chemin) {
      const table = {
        ['roles/' + ADMIN]: roleAdmin ? { role: roleAdmin } : null,
        ...docs,
      };
      const d = table[chemin];
      return { get: async () => ({ exists: d != null, data: () => d }) };
    },
    collection(nom) {
      return { add: async (o) => {
        if (panneAudit) throw new Error('écriture d\'audit refusée');
        audit.push({ collection: nom, ...o });
        return { id: 'a' + audit.length };
      } };
    },
  };
}

const PORTEFEUILLE = [{ ticker: 'AI.PA', qty: 2, buyPrice: 161.02, currentPrice: 166.42 }];
const JOURNAL      = [{ id: 1, type: 'buy', ticker: 'AI.PA', qty: 2, price: 161.02, date: '2026-01-15' }];
const VERSEMENTS   = [{ id: 9, amount: 500, date: '2026-01-10' }];

const docsPea = {
  ['users/' + MEMBRE + '/data/portfolio']:    { items: PORTEFEUILLE },
  ['users/' + MEMBRE + '/data/transactions']: { items: JOURNAL },
  ['users/' + MEMBRE + '/data/versements']:   { items: VERSEMENTS },
};
const docsCto = {
  ['users/' + MEMBRE + '/data/portfolioCto']:    { items: [{ ticker: 'AAPL', qty: 1, buyPrice: 200 }] },
  ['users/' + MEMBRE + '/data/transactionsCto']: { items: [] },
  ['users/' + MEMBRE + '/data/versementsCto']:   { items: [] },
};

const auth = { getUserByEmail: async (e) => (e === 'membre@exemple.fr' ? { uid: MEMBRE } : null) };
const buildDebugExport = chargerFormatClient();
const QUAND = new Date('2026-09-16T12:00:00.000Z');
const base = { auth, buildDebugExport, horodatage: () => QUAND, version: '20260916e' };

const t = [];
const chk = (l, ok, extra) => t.push((ok ? 'ok  ' : 'FAIL') + '  ' + l + (ok ? '' : '\n        ' + (extra || '')));
const rate = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };

// ── Contrôle d'accès ────────────────────────────────────────────────────────
{
  // Sans le rôle, rien ne sort — même en tenant la clé de service.
  const db = faireDb({ roleAdmin: 'user', docs: docsPea });
  const msg = await rate(() => exporterDebugAdmin({ ...base, db, adminUid: ADMIN, uid: MEMBRE }));
  chk('refus si le compte ne porte pas superadmin', /accès refusé/.test(msg || ''), 'obtenu : ' + msg);
  chk('le refus est journalisé', db.audit.length === 1 && db.audit[0].resultat === 'refus',
      JSON.stringify(db.audit));
  chk('le refus est lisible dans details', /REFUSÉ/.test((db.audit[0] || {}).details || ''),
      (db.audit[0] || {}).details);
  chk('le motif du refus est consigné', /superadmin/.test((db.audit[0] || {}).motif || ''),
      JSON.stringify(db.audit[0]));

  // Aucun document `roles` du tout.
  const db2 = faireDb({ roleAdmin: null, docs: docsPea });
  const msg2 = await rate(() => exporterDebugAdmin({ ...base, db: db2, adminUid: ADMIN, uid: MEMBRE }));
  chk('refus si le document de rôle est absent', /accès refusé/.test(msg2 || ''), 'obtenu : ' + msg2);

  // Un autre compte, fût-il connecté, n'est pas administrateur.
  const db3 = faireDb({ roleAdmin: 'superadmin', docs: docsPea });
  const msg3 = await rate(() => exporterDebugAdmin({ ...base, db: db3, adminUid: 'un-autre-uid', uid: MEMBRE }));
  chk('refus pour un UID qui n’est pas l’administrateur', /accès refusé/.test(msg3 || ''), 'obtenu : ' + msg3);
  chk('la tentative d’un tiers est journalisée sous son nom',
      db3.audit.length === 1 && db3.audit[0].by === 'un-autre-uid', JSON.stringify(db3.audit));

  // Sans ADMIN_UID, l'accès ne serait imputable à personne.
  const msg4 = await rate(() => exporterDebugAdmin({ ...base, db: faireDb(), adminUid: '', uid: MEMBRE }));
  chk('refus si l’accès n’est imputable à personne', /ADMIN_UID/.test(msg4 || ''), 'obtenu : ' + msg4);
}

// ── Format de sortie ────────────────────────────────────────────────────────
{
  const db = faireDb({ docs: docsPea });
  const { data, targetUid } = await exporterDebugAdmin({ ...base, db, adminUid: ADMIN, uid: MEMBRE });

  chk('le membre visé est rendu', targetUid === MEMBRE, targetUid);
  // Le format vient de js/app.js : mêmes clés, dans le même ordre, que le
  // fichier téléchargé par un membre depuis son navigateur.
  const attendu = buildDebugExport({
    compte: 'pea', version: '20260916e', source: 'client',
    portfolio: PORTEFEUILLE, transactions: JOURNAL, versements: VERSEMENTS,
  });
  chk('mêmes clés, dans le même ordre, que l’export client',
      JSON.stringify(Object.keys(data)) === JSON.stringify(Object.keys(attendu)),
      Object.keys(data).join(',') + '  ≠  ' + Object.keys(attendu).join(','));
  chk('enveloppe reportée',      data.compte === 'pea', data.compte);
  chk('version reportée',        data.version === '20260916e', data.version);
  chk('portefeuille intégral',   JSON.stringify(data.portfolio) === JSON.stringify(PORTEFEUILLE));
  chk('journal intégral',        JSON.stringify(data.transactions) === JSON.stringify(JOURNAL));
  chk('versements intégraux',    JSON.stringify(data.versements) === JSON.stringify(VERSEMENTS));
  // Seule différence voulue avec l'export client : la provenance. Un fichier
  // qui porte les avoirs d'un tiers doit dire qui l'a produit.
  chk('la provenance nomme l’administrateur', data.source === 'admin:' + ADMIN, data.source);
  chk('un export client reste marqué « client »', attendu.source === 'client', attendu.source);
  // Le champ est additif : reconcile-pea.cjs ignore ce qu'il ne connaît pas.
  chk('aucune clé retirée du format existant',
      ['compte', 'exporte', 'version', 'portfolio', 'transactions', 'versements'].every(k => k in data));
}

// ── Compte-titres ───────────────────────────────────────────────────────────
{
  const db = faireDb({ docs: { ...docsPea, ...docsCto } });
  const { data } = await exporterDebugAdmin({ ...base, db, adminUid: ADMIN, uid: MEMBRE, compte: 'cto' });
  chk('le CTO lit les documents suffixés', data.portfolio[0] && data.portfolio[0].ticker === 'AAPL',
      JSON.stringify(data.portfolio));
  chk('le CTO ne ramène pas les écritures du PEA', data.transactions.length === 0,
      JSON.stringify(data.transactions));

  const msg = await rate(() => exporterDebugAdmin({ ...base, db: faireDb(), adminUid: ADMIN, uid: MEMBRE, compte: 'per' }));
  chk('enveloppe inconnue refusée', /compte inconnu/.test(msg || ''), 'obtenu : ' + msg);
}

// ── Documents absents ───────────────────────────────────────────────────────
{
  // Un membre sans CTO n'est pas une erreur : trois listes vides.
  const db = faireDb({ docs: {} });
  const { data } = await exporterDebugAdmin({ ...base, db, adminUid: ADMIN, uid: MEMBRE });
  chk('un compte vide rend des listes vides, pas une panne',
      data.portfolio.length === 0 && data.transactions.length === 0 && data.versements.length === 0);
  chk('l’export d’un compte vide est tout de même journalisé',
      db.audit.length === 1 && db.audit[0].resultat === 'ok', JSON.stringify(db.audit));
}

// ── Désignation par email ───────────────────────────────────────────────────
{
  const db = faireDb({ docs: docsPea });
  const { targetUid } = await exporterDebugAdmin({ ...base, db, adminUid: ADMIN, email: 'membre@exemple.fr' });
  chk('un membre se désigne par son email', targetUid === MEMBRE, targetUid);
  chk('l’audit retient l’UID résolu, pas seulement l’email',
      db.audit[0].targetUid === MEMBRE && db.audit[0].cible.email === 'membre@exemple.fr',
      JSON.stringify(db.audit[0]));

  const db2 = faireDb({ docs: docsPea });
  const msg = await rate(() => exporterDebugAdmin({ ...base, db: db2, adminUid: ADMIN, email: 'inconnu@exemple.fr' }));
  chk('email inconnu refusé', /aucun compte/.test(msg || ''), 'obtenu : ' + msg);
  chk('la recherche infructueuse est journalisée', db2.audit.length === 1 && db2.audit[0].resultat === 'refus');

  const msg2 = await rate(() => exporterDebugAdmin({ ...base, db: faireDb(), adminUid: ADMIN }));
  chk('sans membre désigné, rien ne part', /--uid ou --email/.test(msg2 || ''), 'obtenu : ' + msg2);
}

// ── La trace d'audit ────────────────────────────────────────────────────────
{
  const db = faireDb({ docs: docsPea });
  await exporterDebugAdmin({ ...base, db, adminUid: ADMIN, uid: MEMBRE });
  const e = db.audit[0];
  chk('une seule entrée par export', db.audit.length === 1, String(db.audit.length));
  // Dans auditLog, avec le Worker — pas dans une collection parallèle qu'on
  // oublierait de regarder et qui échapperait à la purge annuelle.
  chk('écrite dans auditLog',        e.collection === 'auditLog', e.collection);
  chk('qui : l’administrateur',      e.by === ADMIN, e.by);
  chk('sur qui : le membre',         e.targetUid === MEMBRE, e.targetUid);
  chk('quoi : l’action nommée',      e.action === 'adminExportDebug', e.action);
  chk('d’où : le script nommé',      e.source === 'script:admin-export-debug', e.source);
  chk('quelle enveloppe',            e.compte === 'pea', e.compte);
  // Un horodatage Firestore, pas une chaîne : la purge à un an filtre dessus.
  chk('quand, en horodatage purgeable', e.at instanceof Date, String(e.at));
  chk('résumé lisible dans details', /export debug pea du membre/.test(e.details || ''), e.details);
  chk('ce qui est sorti est chiffré',
      e.volume && e.volume.lignes === 1 && e.volume.transactions === 1 && e.volume.versements === 1,
      JSON.stringify(e.volume));

  // Le point qui compte : pas de trace, pas d'export. Une panne d'audit doit
  // faire échouer l'opération, pas la laisser passer en silence.
  const dbPanne = faireDb({ docs: docsPea, panneAudit: true });
  const msg = await rate(() => exporterDebugAdmin({ ...base, db: dbPanne, adminUid: ADMIN, uid: MEMBRE }));
  chk('un export qui ne peut être tracé n’a pas lieu', /audit/.test(msg || ''), 'obtenu : ' + msg);
}

// ── Garde-fou de destination ────────────────────────────────────────────────
{
  const depot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
  const dedans = (p) => { try { verifierDestination(p, depot); return null; } catch (e) { return e.message; } };
  chk('la racine du dépôt est refusée',   /destination refusée/.test(dedans(depot) || ''), dedans(depot));
  chk('un sous-dossier du dépôt aussi',   /destination refusée/.test(dedans(path.join(depot, 'scripts')) || ''));
  chk('un dossier hors dépôt est accepté', dedans(os.tmpdir()) === null, dedans(os.tmpdir()));
}

// ── Sortie ──────────────────────────────────────────────────────────────────
console.log(t.join('\n'));
const ko = t.filter(l => l.startsWith('FAIL')).length;
console.log('\n' + (t.length - ko) + '/' + t.length + ' tests passés.');
process.exit(ko ? 1 : 0);
