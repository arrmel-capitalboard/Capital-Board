// Chiffrement des captures d'audit, entre la VM et le runner d'analyse.
//
// Le fichier transite par Discord, qui en garde une copie durable et sert un
// lien CDN. Le caviardage (run-automated-audit.mjs) fait déjà en sorte qu'aucun
// identifiant n'y figure ; ceci ajoute une couche pour que cette copie ne soit
// pas lisible du tout par qui accède au salon ou au lien.
//
// Ce que ça protège : le stockage et le transport. Ce que ça ne protège pas :
// l'analyse elle-même, qui doit déchiffrer pour lire. Le chiffrement vient
// par-dessus le caviardage, jamais à sa place.
//
// AES-256-GCM, clé de 32 octets en hexadécimal :
//   BURP_CAPTURE_KEY  sur la VM (.env du bot) et en secret du dépôt GitHub
//   openssl rand -hex 32   pour en fabriquer une
//
// Format : "CBAUDIT1" (8 o) | iv (12 o) | tag (16 o) | chiffré. L'en-tête sert
// à reconnaître un fichier chiffré : un export Burp déposé à la main reste en
// clair et doit continuer de passer.

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const MAGIE = Buffer.from('CBAUDIT1', 'utf8');
const TAILLE_IV = 12;
const TAILLE_TAG = 16;

/** Lit la clé, avec un message clair plutôt qu'une exception de crypto. */
export function lireCle(brute) {
  if (!brute) return null;
  const cle = Buffer.from(String(brute).trim(), 'hex');
  if (cle.length !== 32) {
    throw new Error(`BURP_CAPTURE_KEY doit faire 32 octets en hexadécimal (64 caractères), reçu ${cle.length} octet(s). Fabriquez-la avec : openssl rand -hex 32`);
  }
  return cle;
}

export const estChiffre = (buffer) => Buffer.isBuffer(buffer) && buffer.subarray(0, MAGIE.length).equals(MAGIE);

export function chiffrer(texte, cle) {
  const iv = randomBytes(TAILLE_IV);
  const chiffreur = createCipheriv('aes-256-gcm', cle, iv);
  const corps = Buffer.concat([chiffreur.update(texte, 'utf8'), chiffreur.final()]);
  return Buffer.concat([MAGIE, iv, chiffreur.getAuthTag(), corps]);
}

export function dechiffrer(buffer, cle) {
  if (!estChiffre(buffer)) throw new Error("Ce fichier n'est pas une capture chiffrée.");
  const debut = MAGIE.length;
  const iv = buffer.subarray(debut, debut + TAILLE_IV);
  const tag = buffer.subarray(debut + TAILLE_IV, debut + TAILLE_IV + TAILLE_TAG);
  const corps = buffer.subarray(debut + TAILLE_IV + TAILLE_TAG);
  const dechiffreur = createDecipheriv('aes-256-gcm', cle, iv);
  dechiffreur.setAuthTag(tag);
  // Le tag est vérifié à final() : une clé fausse ou un fichier altéré lève ici.
  return Buffer.concat([dechiffreur.update(corps), dechiffreur.final()]).toString('utf8');
}
