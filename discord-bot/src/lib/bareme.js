'use strict';

// Mise à jour automatique des taux de l'épargne réglementée.
//
// Les taux du Livret A, du LDDS, du LEP et du CEL sont révisés au 1er février
// et au 1er août. Ils vivaient en dur dans `LIV_BAREME` (js/app.js), ce qui
// voulait dire qu'au 1er février personne ne les changeait et que l'app
// annonçait pendant des semaines un taux périmé — avec, sous la liste, une
// note « applicables jusqu'au 31 janvier » qui le disait elle-même.
//
// Ce module va les chercher et écrit `config/app.bareme` dans Firestore, que
// le client fusionne avec son barème par défaut au démarrage. Aucun
// déploiement n'est nécessaire.
//
// LA SOURCE. service-public.fr, une fiche par produit. Elles portent toutes la
// même phrase — « Le taux d'intérêt du LEP est de 2,50 % » — ce qui donne une
// ancre nette : on ne ramasse pas un taux d'une autre section, ni un taux
// historique, ni le prélèvement forfaitaire de 12,8 % qui traîne sur la page
// du CEL.
//
// CE QUI N'EST PAS FAIT, ET POURQUOI. Les plafonds ne sont pas relus : ils ne
// bougent qu'à quelques années d'intervalle, et leur extraction serait plus
// fragile que ce qu'elle rapporterait. Le PEL n'est pas relu non plus, son
// taux étant figé au contrat de chaque plan.
//
// RIEN N'EST APPLIQUÉ EN SILENCE. Un taux qui échoue un contrôle n'écrase
// jamais celui en place : il déclenche une alerte dans le salon de suivi. Une
// page qui change de formulation doit se voir, pas se traduire par un chiffre
// faux sur le patrimoine de quelqu'un.

// `discord.js` et Firestore ne sont chargés qu'au moment de s'en servir : la
// lecture d'un taux et ses contrôles sont du texte et de l'arithmétique, et ils
// doivent pouvoir se tester sans installer les dépendances du bot — c'est ce
// que fait la CI du dépôt, qui lance `npm test` sans `npm ci`.
const discord = () => require('discord.js');
const firebase = () => require('../firebase');

const CHANNEL = '1537760259203014766';
const CHECK_INTERVAL = 6 * 3600 * 1000;   // les révisions sont semestrielles
const UA = 'Mozilla/5.0 (compatible; CapitalBoardBot/1.0; +https://capitalboard.fr)';

// Fiches sources. `cle` est celle du barème côté client.
const FICHES = [
  { cle: 'livretA', label: 'Livret A', page: 'F2365',  sigle: 'livret A' },
  { cle: 'ldds',    label: 'LDDS',     page: 'F2368',  sigle: 'LDDS' },
  { cle: 'lep',     label: 'LEP',      page: 'F2367',  sigle: 'LEP' },
  { cle: 'cel',     label: 'CEL',      page: 'F16136', sigle: 'CEL' },
];

// Valeurs de repli, alignées sur LIV_BAREME. Elles ne servent qu'à mesurer
// l'écart d'une lecture quand Firestore ne porte encore aucune surcharge.
const DEFAUT = { livretA: 1.7, ldds: 1.7, lep: 2.5, cel: 1.25 };

// Un taux d'épargne réglementée tient dans ces bornes. Au-delà, c'est autre
// chose qui a été lu.
const TAUX_MIN = 0.1;
const TAUX_MAX = 8;
// Une révision semestrielle se compte en dixièmes de point. Un saut de plus de
// deux points est une erreur de lecture, pas une décision de l'État.
const SAUT_MAX = 2;

/**
 * Extrait un taux de la fiche, par la phrase qui l'annonce.
 *
 * Exporté pour les tests : c'est la seule partie qui peut se tromper en
 * silence, et elle se vérifie sans réseau.
 */
function extraireTaux(html, sigle) {
  const texte = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ');

  // Deux ancres, et les deux sont nécessaires.
  //
  // La première est la QUESTION qui ouvre la section, « Quel est le taux de
  // rémunération du LDDS ? ». Elle seule nomme le produit : la phrase qui suit
  // ne le fait pas toujours — le Livret A écrit « Le taux d'intérêt annuel du
  // livret A est de 1,7 % » quand le LDDS se contente de « Le taux d'intérêt
  // annuel est de 1,7 % ».
  const s = sigle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // La formulation varie d'une fiche à l'autre — « Quel est le taux de
  // rémunération du livret A ? », « Quelle est la rémunération du LEP ? »,
  // « Quel est le taux d'intérêt du CEL ? ». Le point commun est le nom du
  // produit, précédé de l'un ou l'autre.
  const question = new RegExp(
    '(?:rémunération|taux d[\'’]intérêts?) (?:du|de la|de l[\'’]) ?' + s + '\\s*\\?', 'i');
  const q = question.exec(texte);
  if (!q) return null;

  // La seconde est « est de », dans ce qui suit immédiatement. Sans elle, on
  // ramasserait le premier pourcentage venu — la page du LEP fait suivre sa
  // question d'un onglet « Anciens taux », celle du CEL parle du prélèvement
  // forfaitaire de 12,8 % un peu plus bas.
  const suite = texte.slice(q.index + q[0].length, q.index + q[0].length + 400);
  const m = /est de (\d{1,2})[,.](\d{1,2}) ?%/.exec(suite);
  if (!m) return null;
  const v = Number(m[1] + '.' + m[2]);
  return Number.isFinite(v) ? v : null;
}

async function lireFiche(f) {
  const url = 'https://www.service-public.fr/particuliers/vosdroits/' + f.page;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const taux = extraireTaux(await res.text(), f.sigle);
  if (taux === null) throw new Error('taux introuvable sur la fiche');
  return taux;
}

/**
 * Contrôles de vraisemblance. Rend la liste des refus, vide si tout passe.
 *
 * `courants` porte ce qui est en vigueur dans l'app : c'est par rapport à lui
 * qu'un saut se mesure.
 */
function verifier(lus, courants) {
  const refus = [];
  Object.keys(lus).forEach(k => {
    const v = lus[k];
    if (!(v >= TAUX_MIN && v <= TAUX_MAX)) {
      refus.push(k + ' : ' + v + ' % hors des bornes plausibles');
      return;
    }
    const ref = courants[k];
    if (Number.isFinite(ref) && Math.abs(v - ref) > SAUT_MAX) {
      refus.push(k + ' : ' + ref + ' % → ' + v + ' %, saut trop grand pour une révision');
    }
  });
  // Deux règles de droit, qui valent contrôle croisé : le LDDS est aligné sur
  // le Livret A, et le LEP lui est supérieur. Une lecture qui les viole est
  // fausse, même si chaque chiffre pris seul semble plausible.
  if (lus.livretA && lus.ldds && lus.livretA !== lus.ldds) {
    refus.push('LDDS (' + lus.ldds + ' %) désaligné du Livret A (' + lus.livretA + ' %)');
  }
  if (lus.livretA && lus.lep && lus.lep < lus.livretA) {
    refus.push('LEP (' + lus.lep + ' %) sous le Livret A (' + lus.livretA + ' %)');
  }
  return refus;
}

/**
 * Fenêtre de validité en cours.
 *
 * Les taux sont révisés au 1er février et au 1er août : la fenêtre courante se
 * déduit de la date, sans rien avoir à lire. C'est ce qui s'affiche sous la
 * liste des livrets, et qui devenait faux dès la révision passée.
 */
function fenetre(maintenant) {
  const d = maintenant || new Date();
  const an = d.getFullYear(), mois = d.getMonth();   // 0 = janvier
  if (mois >= 1 && mois <= 6) return { effet: '1er février ' + an, jusqu: '31 juillet ' + an };
  if (mois >= 7) return { effet: '1er août ' + an, jusqu: '31 janvier ' + (an + 1) };
  // Janvier : la fenêtre ouverte le 1er août précédent court encore.
  return { effet: '1er août ' + (an - 1), jusqu: '31 janvier ' + an };
}

async function lireConfig() {
  const snap = await firebase().getDb().collection('config').doc('app').get();
  return (snap.exists ? snap.data() : {}) || {};
}

async function verifierUneFois(client) {
  const cfg = await lireConfig();
  const bareme = cfg.bareme || {};
  const types = bareme.types || {};
  // Ce qui fait foi aujourd'hui : la surcharge si elle existe, le barème livré
  // avec l'application sinon.
  const courants = {};
  FICHES.forEach(f => {
    const v = Number(types[f.cle] && types[f.cle].taux);
    courants[f.cle] = Number.isFinite(v) ? v : DEFAUT[f.cle];
  });

  const lus = {}, echecs = [];
  for (const f of FICHES) {
    try { lus[f.cle] = await lireFiche(f); }
    catch (e) { echecs.push(f.label + ' — ' + e.message); }
  }
  if (!Object.keys(lus).length) {
    // Aucune fiche lue : une panne de réseau ne mérite pas d'alerte. Le
    // prochain passage réessaiera.
    console.warn('[bareme] aucune fiche lue :', echecs.join(' ; '));
    return;
  }

  const changes = Object.keys(lus).filter(k => lus[k] !== courants[k]);
  const fen = fenetre();
  const fenetreAJour = bareme.effet === fen.effet && bareme.jusqu === fen.jusqu;
  if (!changes.length && fenetreAJour && !echecs.length) return;   // rien à dire

  const refus = verifier(lus, courants);
  if (refus.length) {
    await alerter(client, refus, echecs);
    return;
  }

  // Écriture fusionnée : `config/app` porte aussi les drapeaux de sections et
  // l'organisation du menu, qu'on ne doit pas effacer en passant.
  const patch = { effet: fen.effet, jusqu: fen.jusqu, types: {}, majLe: Date.now() };
  Object.keys(lus).forEach(k => { patch.types[k] = { taux: lus[k] }; });
  await firebase().getDb().collection('config').doc('app').set({ bareme: patch }, { merge: true });

  if (changes.length || echecs.length) await annoncer(client, lus, courants, changes, echecs);
  console.log('[bareme] barème à jour', JSON.stringify(lus));
}

function nomDe(cle) {
  const f = FICHES.find(x => x.cle === cle);
  return f ? f.label : cle;
}
const pct = (v) => String(v).replace('.', ',') + ' %';

async function envoyer(client, payload) {
  const channel = await client.channels.fetch(CHANNEL);
  await channel.send(payload);
}

async function annoncer(client, lus, courants, changes, echecs) {
  const embed = new (discord().EmbedBuilder)()
    .setColor(0x00e09e)
    .setTitle('Taux de l’épargne réglementée mis à jour')
    .setDescription(changes.length
      ? changes.map(k => '**' + nomDe(k) + '** : ' + pct(courants[k]) + ' → **' + pct(lus[k]) + '**').join('\n')
      : 'Aucun taux modifié — seule la période de validité a été rafraîchie.')
    .setFooter({ text: 'Source : service-public.fr · appliqué à tous les membres sans déploiement' })
    .setTimestamp();
  if (echecs.length) embed.addFields({ name: 'Fiches non lues', value: echecs.join('\n').slice(0, 900) });
  await envoyer(client, { embeds: [embed] });
}

async function alerter(client, refus, echecs) {
  const embed = new (discord().EmbedBuilder)()
    .setColor(0xf5b731)
    .setTitle('Taux lus mais NON appliqués')
    .setDescription('Une lecture a échoué aux contrôles de vraisemblance. Le barème en place n’a pas été touché — ' +
      'la page a probablement changé de formulation, et il faut la relire à la main.')
    .addFields({ name: 'Refus', value: refus.join('\n').slice(0, 900) })
    .setTimestamp();
  if (echecs.length) embed.addFields({ name: 'Fiches non lues', value: echecs.join('\n').slice(0, 900) });
  await envoyer(client, { embeds: [embed] });
}

function start(client) {
  if (!firebase().isConfigured()) {
    console.warn('[bareme] Firestore non configuré : mise à jour des taux désactivée.');
    return;
  }
  const run = () => verifierUneFois(client)
    .catch((e) => console.error('[bareme] vérification :', e.message));
  // Au démarrage, puis toutes les six heures. Une révision semestrielle n'a
  // pas besoin de plus, et la fenêtre de validité se corrige du même coup.
  run();
  setInterval(run, CHECK_INTERVAL);
}

module.exports = { start, extraireTaux, verifier, fenetre };
