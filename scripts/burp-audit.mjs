// Export d'audit Burp déposé depuis Discord (voir discord-bot/src/lib/burp-audit.js).
//
// Usage :
//   node burp-audit.mjs --get     --id <docId> --sortie /tmp/burp/trafic.xml --digest /tmp/burp/trafic.md
//   node burp-audit.mjs --statut  --id <docId> --valeur traite [--run <url>]
//   node burp-audit.mjs --statut  --id <docId> --valeur erreur --erreur "message"
//   node burp-audit.mjs --redacte export.xml  --sortie /tmp/burp/trafic.xml --digest /tmp/burp/trafic.md
//
// --redacte fait le même travail sur un fichier local, sans toucher à Firestore :
// c'est le mode de test de la redaction, et le moyen de rejouer un export dont
// le lien Discord a expiré.
//
// --get télécharge la pièce jointe Discord, la redacte, et écrit DEUX fichiers :
// l'export redacté complet, et un digest lisible (une entrée par requête, corps
// tronqués, ressources statiques écartées) — c'est le digest que la session
// Claude lit, un export brut de plusieurs Mo n'étant pas exploitable en 40 tours.
//
// Rien n'est écrit dans le dépôt : les fichiers vont hors de l'arbre de travail,
// sinon l'étape « Capture du correctif » les embarquerait dans le patch proposé
// et le trafic partirait dans Discord en pièce jointe.
//
// Aucune valeur sensible n'est affichée : les logs d'Actions sont publics sur un
// dépôt public, et l'URL Discord est une URL-capacité — la connaître suffit à
// télécharger l'export non redacté.

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { dirname } from 'path';

const args = process.argv.slice(2);
const a = (nom) => args.includes('--' + nom);
const opt = (nom) => {
  const i = args.indexOf('--' + nom);
  return i === -1 || i === args.length - 1 ? null : args[i + 1];
};

const COL = 'burpUploads';

// Init paresseuse, comme discord-bot/src/firebase.js : le mode --redacte tourne
// sur un fichier local et n'a pas à exiger la clé de service.
async function doc(id) {
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  return getFirestore().doc(`${COL}/${id}`);
}

// ── Redaction ──────────────────────────────────────────────────────────────
// Un export Burp encode requêtes et réponses en base64 : une regex sur le XML
// brut ne trouverait rien. On décode, on redacte, on ré-encode.
//
// Les jetons Firebase ne vivent pas que dans `Authorization` : ils passent aussi
// par les cookies, les corps JSON de l'API d'identité, et l'en-tête App Check.
// Le dernier filet est la forme même d'un JWT, reconnaissable où qu'il soit.
const REGLES = [
  [/(\bAuthorization:\s*\w+\s+)[^\r\n]+/gi, '$1[REDACTED]'],
  [/(\bX-Firebase-AppCheck:\s*)[^\r\n]+/gi, '$1[REDACTED]'],
  [/(\b(?:Set-)?Cookie:\s*)[^\r\n]+/gi, '$1[REDACTED]'],
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]'],
  [/("(?:idToken|refreshToken|refresh_token|id_token|access_token|oauthAccessToken|sessionCookie|password|pin|code)"\s*:\s*")[^"]*(")/gi, '$1[REDACTED]$2'],
  [/([?&](?:idToken|access_token|refresh_token|token|code)=)[^&"\s]+/gi, '$1[REDACTED]'],
];

let redactions = 0;
function redacte(texte) {
  let out = texte;
  for (const [motif, remplacement] of REGLES) {
    out = out.replace(motif, (...m) => {
      redactions += 1;
      return remplacement.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '');
    });
  }
  return out;
}

const B64 = /^[A-Za-z0-9+/\r\n]+={0,2}$/;

/** Redacte un bloc <request>/<response>, encodé ou non. */
function redacteBloc(ouvrant, contenu, fermant) {
  const encode = /base64="true"/i.test(ouvrant);
  if (!encode) return ouvrant + redacte(contenu) + fermant;
  if (!B64.test(contenu.trim())) return ouvrant + contenu + fermant;
  const clair = Buffer.from(contenu, 'base64').toString('utf8');
  return ouvrant + Buffer.from(redacte(clair), 'utf8').toString('base64') + fermant;
}

const BLOC = /(<(request|response)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi;
// `<url>` vit hors des blocs encodés : un jeton passé en paramètre d'URL y
// survivrait sans cette passe. Relevé par le test de redaction.
const URL_XML = /(<url\b[^>]*>)([\s\S]*?)(<\/url>)/gi;

function redacteExport(brut) {
  if (brut.trimStart().startsWith('<')) {
    return brut
      .replace(BLOC, (_, ouvrant, _nom, contenu, fermant) => redacteBloc(ouvrant, contenu, fermant))
      .replace(URL_XML, (_, ouvrant, contenu, fermant) => ouvrant + redacte(contenu) + fermant);
  }
  // Export JSON (Logger++ et convertisseurs divers) : mêmes règles, à plat.
  return redacte(brut);
}

// ── Digest ─────────────────────────────────────────────────────────────────
const STATIQUE = /\.(css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|map)(\?|$)/i;
const CORPS_MAX = 800;
const ENTREES_MAX = 400;

const champ = (bloc, nom) => {
  const m = bloc.match(new RegExp(`<${nom}\\b[^>]*>([\\s\\S]*?)</${nom}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
};

const decodeBloc = (bloc, nom) => {
  const m = bloc.match(new RegExp(`<${nom}\\b([^>]*)>([\\s\\S]*?)</${nom}>`, 'i'));
  if (!m) return '';
  const contenu = m[2].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
  if (!/base64="true"/i.test(m[1])) return contenu;
  return B64.test(contenu) ? Buffer.from(contenu, 'base64').toString('utf8') : '';
};

/** Une entrée lisible par requête, corps tronqués, statiques écartés. */
function digest(xmlRedacte) {
  const items = xmlRedacte.match(/<item\b[\s\S]*?<\/item>/gi);
  if (!items) return null;

  const lignes = [];
  let ignores = 0;
  for (const item of items) {
    const url = champ(item, 'url');
    if (STATIQUE.test(url) || lignes.length >= ENTREES_MAX) { ignores += 1; continue; }

    const methode = champ(item, 'method') || '?';
    const statut = champ(item, 'status') || '?';
    const req = decodeBloc(item, 'request');
    const res = decodeBloc(item, 'response');
    // Le corps commence après la ligne vide qui suit les en-têtes.
    const enTetesReq = req.split(/\r?\n\r?\n/)[0] || '';
    const corpsReq = req.split(/\r?\n\r?\n/).slice(1).join('\n\n').trim();
    const corpsRes = res.split(/\r?\n\r?\n/).slice(1).join('\n\n').trim();

    lignes.push(
      `### ${methode} ${url} → ${statut}\n`
      + '```\n' + enTetesReq.slice(0, CORPS_MAX) + '\n```\n'
      + (corpsReq ? 'Corps envoyé :\n```\n' + corpsReq.slice(0, CORPS_MAX) + '\n```\n' : '')
      + (corpsRes ? 'Réponse :\n```\n' + corpsRes.slice(0, CORPS_MAX) + '\n```\n' : ''),
    );
  }

  const entete = `# Trafic capturé (redacté)\n\n${lignes.length} requêtes retenues, `
    + `${ignores} écartées (ressources statiques ou au-delà de la limite).\n\n`;
  return { texte: entete + lignes.join('\n'), retenues: lignes.length, ignores };
}

/** Écrit l'export redacté et son digest, et rend un résumé chiffré. */
function ecrire(brut, etiquette) {
  const propre = redacteExport(brut);
  const sortie = opt('sortie') || '/tmp/burp/trafic.xml';
  mkdirSync(dirname(sortie), { recursive: true });
  writeFileSync(sortie, propre, 'utf8');

  const resume = digest(propre);
  const cheminDigest = opt('digest');
  if (cheminDigest && resume) {
    mkdirSync(dirname(cheminDigest), { recursive: true });
    writeFileSync(cheminDigest, resume.texte, 'utf8');
  }

  console.log(`Export « ${etiquette} » : ${brut.length} caractères, ${redactions} valeurs redactées.`);
  if (resume) console.log(`Digest : ${resume.retenues} requêtes retenues, ${resume.ignores} écartées.`);
  else console.log("Digest : format non reconnu comme un export Burp XML, la session lira l'export complet.");
}

// ── Modes ──────────────────────────────────────────────────────────────────
if (a('redacte')) {
  const chemin = opt('redacte');
  if (!chemin) {
    console.error('--redacte attend un chemin de fichier.');
    process.exit(1);
  }
  ecrire(readFileSync(chemin, 'utf8'), chemin);
  process.exit(0);
}

const id = opt('id');
if (!id) {
  console.error('--id manquant.');
  process.exit(1);
}
const ref = await doc(id);

if (a('get')) {
  const snap = await ref.get();
  if (!snap.exists) {
    console.error('Dépôt introuvable.');
    process.exit(2);
  }
  const d = snap.data();
  if (!d.fichierUrl) {
    console.error('Aucune pièce jointe sur ce dépôt (déjà traité ?).');
    process.exit(2);
  }

  const res = await fetch(d.fichierUrl);
  // Ne jamais afficher l'URL : la connaître suffit à récupérer l'export brut,
  // et les logs d'un dépôt public sont lisibles par tous.
  if (!res.ok) {
    console.error(`Téléchargement impossible (HTTP ${res.status}). Le lien Discord expire au bout de ~24 h.`);
    process.exit(3);
  }
  ecrire(await res.text(), d.fichierNom);

} else if (a('statut')) {
  const valeur = opt('valeur');
  const maj = { statut: valeur, majLe: Date.now() };
  if (opt('erreur')) maj.erreur = String(opt('erreur')).slice(0, 500);
  if (opt('run')) maj.runUrl = opt('run');
  // L'analyse terminée, le lien vers l'export brut n'a plus de raison d'être.
  if (valeur === 'traite') maj.fichierUrl = FieldValue.delete();
  await ref.update(maj);
  console.log(`${COL}/${id} → ${valeur}.`);

} else {
  console.error('Préciser --get ou --statut.');
  process.exit(1);
}
