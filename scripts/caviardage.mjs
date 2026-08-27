// Caviardage des captures d'audit : efface les identifiants d'un message HTTP
// avant qu'il ne soit ecrit, chiffre ou envoye ou que ce soit.
//
// Module a part pour deux raisons. Il est importe par run-automated-audit.mjs,
// qui lance son parcours des qu'on l'importe — impossible a tester depuis un
// fichier de test. Et ces regles sont la seule chose qui separe une capture
// d'une fuite d'identifiants : elles meritent leur test, qui tourne a chaque
// push (scripts/caviardage.test.mjs, appele par checks.yml).
//
// Ecrit apres le 27/08/2026, ou un premier run reel a expedie vers Discord le
// code PIN du compte de test en clair, un refreshToken et quatorze JWT : la
// redaction existait, mais dans le workflow, donc APRES la sortie de la VM.

// Le caviardage laisse la forme intacte (nom d'en-tête, clé JSON, longueur
// annoncée) : l'audit doit continuer à voir QUE le jeton circule et où, sans
// jamais en recevoir la valeur.
export const CAVIARDE = '[caviardé]';

const REGLES = [
  // En-têtes porteurs de secret : on garde le nom, on efface la valeur.
  [/^(authorization|cookie|set-cookie|x-goog-api-key|x-firebase-appcheck|x-firebase-client|proxy-authorization):[ \t]*.*$/gim,
    (m, nom) => `${nom}: ${CAVIARDE}`],
  // Jetons JWT, où qu'ils se trouvent — corps, URL, en-tête non listé.
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g, '[jwt caviardé]'],
  // Champs JSON sensibles, guillemets conservés pour rester du JSON valide.
  [/"(idToken|refreshToken|refresh_token|access_token|id_token|customToken|appCheckToken|turnstileToken|attestationToken|pin|password|newPassword|secret|totpSecret)"\s*:\s*"[^"]*"/g,
    (m, cle) => `"${cle}":"${CAVIARDE}"`],
  // Mêmes champs en formulaire encodé.
  [/\b(idToken|refreshToken|refresh_token|access_token|id_token|pin|password)=[^&\s"]+/g,
    (m, cle) => `${cle}=${CAVIARDE}`],
];

/** Efface les valeurs sensibles d'un message HTTP, sans toucher sa structure. */
export function caviarder(texte) {
  let sortie = texte;
  for (const [motif, remplacement] of REGLES) sortie = sortie.replace(motif, remplacement);
  return sortie;
}

/** Filet de sécurité : compte ce qui ressemble encore à un secret. */
export function resteDesSecrets(xml) {
  // `(?!\[caviard)` écarte la marque posée juste avant : elle fait dix
  // caractères, donc sans cette exclusion le filet se signalerait lui-même à
  // chaque champ qu'il vient de nettoyer.
  const suspects = [
    [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./g, 'JWT'],
    [/"(?:refreshToken|refresh_token|idToken|access_token|customToken)"\s*:\s*"(?!\[caviard)[^"]{10,}"/g, 'jeton de session'],
    [/"(?:pin|password|newPassword)"\s*:\s*"(?!\[caviard)[^"]+"/g, 'code ou mot de passe'],
    [/^(?:authorization|cookie):[ \t]*(?!\[caviard)\S+/gim, "en-tête d'authentification"],
  ];
  const trouves = [];
  for (const [motif, nom] of suspects) {
    const n = (xml.match(motif) || []).length;
    if (n) trouves.push(`${nom} (${n})`);
  }
  return trouves;
}
