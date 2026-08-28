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

const SALON_SECURITE = '1541530997005353030';
const PROJET = 'capitalboard';
const FONDATEUR_ROLE = '1512905140108001391';

// Le quota se remet à zéro à minuit heure du Pacifique. Le décalage avec Paris
// varie selon l'heure d'été : on interroge le fuseau plutôt que de coder 9h00,
// qui serait faux la moitié de l'année.
const FUSEAU_QUOTA = 'America/Los_Angeles';

let epuiseDepuis = null;
let signale = false;

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

module.exports = { signaler, estEpuise, estRefusDeQuota, prochaineRemiseAZero, SALON_SECURITE };
