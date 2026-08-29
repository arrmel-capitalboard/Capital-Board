'use strict';

// Sentinelle du quota Firestore.
//
// Le projet vit sur le forfait Spark : 20 000 écritures par jour pour TOUT le
// projet, remise à zéro à minuit heure du Pacifique. Dépasser ne coûte rien,
// ça coupe le service — et le quota étant partagé, le composant le moins
// critique peut faire tomber le plus critique. Le 28/08, une jauge du panneau
// d'administration a épuisé le quota, le compteur du code PIN n'a plus pu
// s'incrémenter, et l'application s'est fermée à tout le monde.
//
// On ne peut pas lire la consommation réelle depuis ici : l'API de métriques
// demande des droits que la clé de service n'a pas. Cette sentinelle travaille
// donc sur le seul signal fiable et gratuit dont on dispose — le refus
// lui-même — et sur une estimation des cadences connues.
//
// Deux rôles :
//
//   1. Signaler. Le premier `RESOURCE_EXHAUSTED` de la journée part dans le
//      salon de sécurité, avec ce qu'il faut pour agir. Les suivants sont tus :
//      une coupure de quota en produit des centaines.
//   2. Économiser. Une fois le refus constaté, les écrivains non essentiels se
//      taisent jusqu'à la remise à zéro. Rien ne sert d'insister — et chaque
//      tentative traîne dix minutes avant d'abandonner, ce qui sature les
//      journaux et retarde le reste.

// Plafond quotidien du forfait Spark, pour tout le projet.
const PLAFOND_ECRITURES = 20000;
// Au-delà, on prévient. 70 % laisse le temps de fermer un panneau ou de
// repousser un lot d'audits ; 90 % arriverait trop tard pour agir.
const SEUIL_ALERTE = 0.70;
// La présence n'est plus un battement mais un bail de 30 min (voir
// PRESENCE_BAIL_MS dans js/app.js) : l'onglet annonce jusqu'à quand il est là et
// ne réécrit qu'en approchant du terme. Trois écritures par heure, contre douze
// quand c'était un battement de cinq minutes. À tenir aligné sur le client :
// c'est lui qui écrit, le bot ne fait qu'en compter le coût.
const PRESENCE_PAR_HEURE = 3;
// Repli pour les documents antérieurs au bail, sans `expiresAt` : on juge alors
// sur la fraîcheur, comme le client le fait de son côté.
const PRESENCE_FRAICHEUR_MS = 12.5 * 60_000;
// Contrôle horaire : l'estimation bouge en heures, pas en minutes.
const CADENCE_ESTIMATION_MS = 60 * 60_000;

const SALON_SECURITE = '1541530997005353030';
const PROJET = 'capitalboard';
const FONDATEUR_ROLE = '1512905140108001391';

// Le quota se remet à zéro à minuit heure du Pacifique. Le décalage avec Paris
// varie selon l'heure d'été : on interroge le fuseau plutôt que de coder 9h00,
// qui serait faux la moitié de l'année.
const FUSEAU_QUOTA = 'America/Los_Angeles';

let epuiseDepuis = null;
let signale = false;
// Postes déclarés, et jour où l'alerte préventive est déjà partie.
const postes = new Map();
let previenuLe = null;

/**
 * Déclare un écrivain périodique et son coût quotidien.
 *
 * `parJour` peut être un nombre, ou une fonction quand la cadence change en
 * cours de route — `vmstatus` passe de 120 s à 5 s dès qu'un panneau
 * d'administration s'ouvre, et c'est justement ce cas-là qui a vidé le quota
 * le 28/08. Une constante ne l'aurait pas vu venir.
 */
function declarer(nom, parJour) {
  postes.set(nom, parJour);
}

/**
 * Compteur d'écritures sur une heure glissante, à déclarer tel quel.
 *
 * Une cadence instantanée ment sur les écrivains qui changent de rythme : le
 * panneau d'administration fait passer les relevés VM de 2 min à 5 s, soit
 * 17 280 par jour projetés — alors qu'un panneau ouvert dix minutes n'en coûte
 * que cent vingt. Extrapoler ce qui a réellement été écrit dans la dernière
 * heure donne la bonne réponse dans les deux cas, et ne prévient que si le
 * rythme dure.
 */
function compteurHoraire() {
  let quand = [];
  return {
    enregistrer() { quand.push(Date.now()); },
    parJour() {
      const limite = Date.now() - 3_600_000;
      quand = quand.filter((t) => t >= limite);
      return quand.length * 24;
    },
  };
}

/**
 * Projection de la journée aux conditions actuelles.
 *
 * Ce n'est pas une mesure : l'API de métriques Firestore demande des droits que
 * la clé de service n'a pas. C'est la somme des cadences déclarées, plus la
 * part des membres connectés — « si tout restait en l'état pendant 24 h ». Une
 * pointe passagère la fait donc monter puis redescendre, et c'est voulu : c'est
 * exactement ce qu'on veut voir venir.
 */
function estimation(sessions = 0) {
  const detail = [];
  let total = 0;
  for (const [nom, valeur] of postes) {
    let n = 0;
    try {
      n = Math.round(Number(typeof valeur === 'function' ? valeur() : valeur) || 0);
    } catch (_) { n = 0; }
    if (n > 0) { total += n; detail.push({ nom, parJour: n }); }
  }
  if (sessions > 0) {
    const n = sessions * PRESENCE_PAR_HEURE * 24;
    total += n;
    detail.push({ nom: `présence (${sessions} session(s))`, parJour: n });
  }
  detail.sort((a, b) => b.parJour - a.parJour);
  return { total, part: total / PLAFOND_ECRITURES, detail };
}

/** Nombre d'onglets qui écrivent en ce moment, lu dans `presence`. */
async function sessionsActives(db) {
  const snap = await db.collection('presence').where('online', '==', true).get();
  const maintenant = Date.now();
  let n = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    // Le bail fait foi quand il existe : un onglet fermé brutalement laisse
    // `online: true` derrière lui, c'est l'échéance qui le fait disparaître.
    const bail = Number(d.expiresAt) || 0;
    if (bail) { if (bail > maintenant) n++; continue; }
    const vu = d.lastSeen;
    const ms = vu?.toMillis ? vu.toMillis() : Number(vu) || 0;
    if (ms >= maintenant - PRESENCE_FRAICHEUR_MS) n++;
  }
  return n;
}

/**
 * Contrôle horaire, et alerte préventive une fois par jour au-delà du seuil.
 *
 * La sentinelle réactive (`signaler`) ne parle qu'une fois le quota épuisé,
 * c'est-à-dire une fois l'application fermée. Celle-ci parle avant, tant qu'il
 * reste quelque chose à faire — fermer un panneau, repousser un lot d'audits.
 */
function surveiller(client, db) {
  const controler = async () => {
    if (estEpuise()) return;   // trop tard pour prévenir, `signaler` a parlé
    let sessions = 0;
    try {
      sessions = await sessionsActives(db);
    } catch (e) {
      // Une lecture refusée n'est pas un motif d'alarme : on estime sans elle.
      if (!estRefusDeQuota(e)) console.error('[quota] présence illisible :', e.message);
    }
    const { total, part, detail } = estimation(sessions);
    const jour = new Date().toISOString().slice(0, 10);
    if (part < SEUIL_ALERTE || previenuLe === jour) return;
    previenuLe = jour;

    const remise = prochaineRemiseAZero();
    const lignes = detail.map((d) => `• ${d.nom} — ~${d.parJour.toLocaleString('fr-FR')}`);
    const texte = [
      `<@&${FONDATEUR_ROLE}>`,
      `🟠 **Quota Firestore : ~${Math.round(part * 100)} % de la journée projetés**`,
      '',
      `Projection à cadence constante : **~${total.toLocaleString('fr-FR')}** écritures sur ${PLAFOND_ECRITURES.toLocaleString('fr-FR')}.`,
      'Rien n\'est encore refusé — c\'est le moment d\'agir, pas après.',
      '',
      '**D\'où ça vient**',
      ...lignes,
      '',
      '**Ce qui fait baisser la projection tout de suite**',
      '• Fermer le panneau d\'administration : il fait passer les relevés de 2 min à 5 s',
      '• Repousser un lot d\'audits à demain',
      '• Fermer les onglets de l\'application restés ouverts',
      '',
      remise ? `Remise à zéro : <t:${Math.round(remise.getTime() / 1000)}:t> (<t:${Math.round(remise.getTime() / 1000)}:R>).` : '',
      'Détail et méthode de calcul : `afaire-quota.md`.',
    ].filter(Boolean).join('\n');

    client.channels.fetch(SALON_SECURITE)
      .then((salon) => salon.send({ content: texte, allowedMentions: { roles: [FONDATEUR_ROLE], parse: [] } }))
      .catch((e) => console.error(`[quota] alerte préventive non postée : ${e.message}`));
  };

  controler().catch(() => {});
  setInterval(() => { controler().catch(() => {}); }, CADENCE_ESTIMATION_MS).unref();
}

/** Vrai si le message d'erreur décrit un refus de quota. */
function estRefusDeQuota(err) {
  const texte = String(err?.message || err || '');
  return /RESOURCE_EXHAUSTED|Quota exceeded/i.test(texte);
}

/** Date de la prochaine remise à zéro, en heure locale de qui lit. */
function prochaineRemiseAZero() {
  const maintenant = new Date();
  // Minuit là-bas, exprimé ici : on avance jour par jour jusqu'à trouver la
  // première minuit du Pacifique encore devant nous.
  for (let jour = 0; jour <= 1; jour++) {
    const cible = new Date(maintenant.getTime() + jour * 86400000);
    const laBas = new Date(cible.toLocaleString('en-US', { timeZone: FUSEAU_QUOTA }));
    const minuitLaBas = new Date(laBas);
    minuitLaBas.setHours(24, 0, 0, 0);
    const decalage = cible.getTime() - laBas.getTime();
    const instant = new Date(minuitLaBas.getTime() + decalage);
    if (instant > maintenant) return instant;
  }
  return null;
}

/** Vrai tant que le quota est considéré épuisé. */
function estEpuise() {
  if (!epuiseDepuis) return false;
  const remise = prochaineRemiseAZero();
  // La remise à zéro est passée depuis qu'on a constaté le refus : on repart.
  if (remise && epuiseDepuis < remise.getTime() - 86400000) {
    epuiseDepuis = null;
    signale = false;
    return false;
  }
  return true;
}

/**
 * À appeler dans le `catch` de toute écriture Firestore.
 *
 * @returns {boolean} vrai s'il s'agissait d'un refus de quota — l'appelant peut
 *   alors renoncer plutôt que réessayer.
 */
function signaler(client, err, origine = 'inconnue') {
  if (!estRefusDeQuota(err)) return false;

  const premier = !epuiseDepuis;
  if (premier) epuiseDepuis = Date.now();
  if (signale) return true;
  signale = true;

  console.error(`[quota] Firestore épuisé — constaté depuis « ${origine} ». Écrivains non essentiels suspendus.`);

  const remise = prochaineRemiseAZero();
  const quand = remise
    ? `<t:${Math.round(remise.getTime() / 1000)}:t>` + ` (<t:${Math.round(remise.getTime() / 1000)}:R>)`
    : 'minuit heure du Pacifique';

  const texte = [
    `<@&${FONDATEUR_ROLE}>`,
    '🔴 **Quota Firestore épuisé — écritures refusées**',
    '',
    `Constaté sur : \`${origine}\`.`,
    "L'application ne peut plus rien écrire : connexion par code PIN comprise.",
    '',
    `**Retour à la normale** : ${quand}. Rien ne l'avance.`,
    '',
    '**À faire tout de suite**',
    '• Fermer le panneau d\'administration s\'il est ouvert',
    '• Ne lancer aucun audit',
    `• Vérifier : <https://console.firebase.google.com/project/${PROJET}/usage>`,
    '',
    'Les relevés non essentiels sont suspendus jusqu\'à la remise à zéro.',
    'Détail et prévention : `afaire-quota.md`.',
  ].join('\n');

  client.channels.fetch(SALON_SECURITE)
    .then((salon) => salon.send({ content: texte, allowedMentions: { roles: [FONDATEUR_ROLE], parse: [] } }))
    .catch((e) => console.error(`[quota] alerte non postée : ${e.message}`));

  return true;
}

module.exports = {
  signaler, estEpuise, estRefusDeQuota, prochaineRemiseAZero,
  declarer, estimation, surveiller, compteurHoraire,
  SALON_SECURITE, PLAFOND_ECRITURES, SEUIL_ALERTE,
};
