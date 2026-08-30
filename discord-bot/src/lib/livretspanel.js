'use strict';

// Panneau « Livrets » — savoir qui les utilise, et leur poser une question.
//
// Deux besoins, tenus par un seul panneau posté dans le salon de suivi :
//
//   1. « Qui a un livret ? » — la liste des membres ayant au moins un livret
//      enregistré, avec leur nom et leur email, pour pouvoir les contacter.
//   2. « Poser une question » — une question s'affiche à ces membres à
//      l'ouverture de l'application, ils répondent, la réponse revient ici.
//
// Tout se pilote depuis Discord : rien à déployer, rien à écrire à la main
// dans Firestore.
//
// ── Le salon ne garde que le panneau ──
//
// Chaque réponse d'interaction est éphémère, et les réponses des membres ne
// sont plus postées en message : elles s'accumulaient sous le panneau, qui
// finissait hors de vue. Ce qu'on aurait perdu — savoir qu'une réponse est
// arrivée sans aller la chercher — est rendu par le panneau lui-même, qui
// porte le compteur et se réécrit en place à chaque réponse. Un message édité
// ne remonte pas le salon.
//
// ── Le point de conception qui compte : zéro lecture Firestore ajoutée ──
//
// Le forfait Spark plafonne à 50 000 lectures par jour pour tout le projet, et
// une session en coûte environ sept depuis la refonte du 29/08. Une question
// posée à l'ouverture de l'app ne doit donc rien ajouter à ce compte.
//
// D'où le montage en deux morceaux, chacun rangé dans un document que le
// client lit **déjà** au démarrage :
//
//   • le contenu de la question → `config/app.question`, lu une fois par
//     session pour la maintenance, les inscriptions et les drapeaux ;
//   • le ciblage → `users/{uid}/data/annexes.question`, lu une fois par session
//     pour la watchlist, les alertes et les réglages.
//
// Le client montre la question quand les deux concordent. Coût : rien.
//
// Le ciblage ne pouvait pas vivre dans `config/app` : ce document est lisible
// par tout le monde, l'écran de connexion le lit avant authentification. Y
// écrire la liste des membres possédant un livret l'aurait publiée.

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
  StringSelectMenuBuilder,
} = require('discord.js');
const { getDb, getAuth, isConfigured } = require('../firebase');

const SALON = '1537760259203014766';
const FONDATEUR_ROLE = '1512905140108001391';
const DOC_PANNEAU = 'config/panneauLivrets';
const COL_REPONSES = 'questionReponses';

// Discord plafonne un embed à 4096 caractères de description et 25 champs. La
// liste des membres est donc bornée, et le reste résumé plutôt que tronqué au
// milieu d'une adresse.
const MAX_LIGNES = 40;

// Les libellés des types, recopiés de `LIV_BAREME` (`js/app.js`). Les deux
// listes doivent rester d'accord : un type ajouté là-bas et oublié ici
// s'afficherait sous sa clé brute, ce qui se voit mais reste lisible.
const TYPES = {
  livretA: 'Livret A',
  ldds: 'LDDS',
  lep: 'LEP',
  jeune: 'Livret Jeune',
  pel: 'PEL',
  cel: 'CEL',
  bancaire: 'Livret bancaire',
};

const nomType = (k) => TYPES[k] || String(k || '?');

// Un membre n'écrit pas dans Discord, mais son nom vient de Firebase Auth et
// il l'a choisi lui-même : il ne doit pas pouvoir émettre de mention.
const propre = (s) => String(s || '').replace(/@(everyone|here)/gi, '@​$1');

// ── Lecture : qui possède un livret ────────────────────────────────────────

/**
 * Parcourt les membres et retient ceux qui ont au moins un livret.
 *
 * Deux lectures par membre — le document du compte, puis ses livrets. C'est
 * assumé parce que c'est **à la demande** : un clic, quelques dizaines de
 * lectures, contre 50 000 par jour. Ce qui serait interdit, c'est de le faire
 * tourner sur une minuterie.
 *
 * `getAll` plutôt qu'une boucle de `get` : même nombre de lectures facturées,
 * un seul aller-retour réseau.
 */
async function membresAvecLivret() {
  const db = getDb();
  const comptes = await db.collection('users').listDocuments();
  if (!comptes.length) return [];

  const refs = comptes.map((c) => c.collection('data').doc('livrets'));
  const snaps = await db.getAll(...refs);

  const trouves = [];
  snaps.forEach((snap, i) => {
    if (!snap.exists) return;
    const data = snap.data() || {};
    // `items` : c'est la clé qu'écrit `_fsWrite` pour toute collection hors
    // annexes (`js/app.js`). Les deux autres formes sont des filets — un export
    // réimporté, ou un document d'une version antérieure.
    const livrets = Array.isArray(data.items) ? data.items
      : Array.isArray(data.data) ? data.data
      : Array.isArray(data.livrets) ? data.livrets : [];
    if (!livrets.length) return;
    trouves.push({
      uid: comptes[i].id,
      types: [...new Set(livrets.map((l) => l && l.type).filter(Boolean))],
      nb: livrets.length,
    });
  });

  // L'email vient de Firebase Auth : Firestore ne le porte pas. `getUsers` le
  // résout par lots de cent, sans coûter de lecture Firestore.
  const auth = getAuth();
  for (let i = 0; i < trouves.length; i += 100) {
    const lot = trouves.slice(i, i + 100);
    let res;
    try {
      res = await auth.getUsers(lot.map((m) => ({ uid: m.uid })));
    } catch (e) {
      console.warn('[livretspanel] résolution des comptes :', e.message);
      continue; // sans email, l'uid reste affiché
    }
    const par = new Map(res.users.map((u) => [u.uid, u]));
    lot.forEach((m) => {
      const u = par.get(m.uid);
      if (!u) return;
      m.email = u.email || null;
      m.nom = u.displayName || null;   // presque toujours vide, voir ci-dessous
    });
  }

  // Le nom, lui, n'est pas dans Auth : `displayName` n'est jamais renseigné à
  // l'inscription, d'où les « (sans nom) » de la première version. Il vit dans
  // `roles/{uid}` — le pseudo écrit par le Worker, le prénom et le nom saisis
  // par le membre dans son profil.
  //
  // Une lecture de plus par membre, assumée pour la même raison que le reste :
  // c'est à la demande, sur un clic.
  const rolesRefs = trouves.map((m) => db.collection('roles').doc(m.uid));
  if (rolesRefs.length) {
    const rolesSnaps = await db.getAll(...rolesRefs);
    rolesSnaps.forEach((snap, i) => {
      const d = snap.exists ? (snap.data() || {}) : {};
      const civil = [d.firstName, d.lastName].filter(Boolean).join(' ').trim();
      // Le pseudo d'abord : c'est sous ce nom que le membre se présente dans la
      // communauté, et c'est lui qu'on retrouve dans Discord. L'état civil vient
      // en second, l'éventuel displayName d'Auth en dernier.
      trouves[i].nom = d.username || civil || trouves[i].nom || null;
      trouves[i].civil = civil || null;
    });
  }

  return trouves;
}

function embedListe(membres) {
  const embed = new EmbedBuilder()
    .setColor(0xf5b731)
    .setTitle(`Livrets — ${membres.length} membre${membres.length > 1 ? 's' : ''}`)
    .setTimestamp();

  if (!membres.length) {
    embed.setDescription('Personne n\'a encore enregistré de livret.');
    return embed;
  }

  const lignes = membres.slice(0, MAX_LIGNES).map((m) => {
    const qui = propre(m.nom || '(sans nom)');
    // L'état civil n'est répété que s'il apporte quelque chose : « oyoki » seul
    // ne dit pas qui c'est, « Armel CapitalBoard » après « armel.capitalboard »
    // non plus.
    const civil = m.civil && m.civil !== m.nom ? ` *(${propre(m.civil)})*` : '';
    const mail = m.email ? ` — \`${propre(m.email)}\`` : ` — uid \`${m.uid}\``;
    const quoi = m.types.map(nomType).join(', ');
    return `• **${qui}**${civil}${mail}\n  ${quoi}`;
  });
  if (membres.length > MAX_LIGNES) {
    lignes.push(`… et ${membres.length - MAX_LIGNES} autres.`);
  }
  embed.setDescription(lignes.join('\n').slice(0, 4000));

  // Le détail par type dit d'un coup d'œil où porte l'usage réel.
  const parType = {};
  membres.forEach((m) => m.types.forEach((t) => { parType[t] = (parType[t] || 0) + 1; }));
  const repartition = Object.entries(parType)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${nomType(t)} — ${n}`)
    .join('\n');
  if (repartition) embed.addFields({ name: 'Par type', value: repartition.slice(0, 1024) });

  return embed;
}

// ── Écriture : la question posée aux membres ───────────────────────────────

const refConfig = () => getDb().doc('config/app');

async function questionCourante() {
  const snap = await refConfig().get();
  return (snap.data() || {}).question || null;
}

/**
 * Combien de réponses pour cette question.
 *
 * `count()` plutôt que de rapatrier les documents : Firestore facture une
 * lecture par millier compté, contre une par document lu. Le panneau se
 * réécrit à chaque réponse, ce compteur est donc appelé souvent.
 */
async function compterReponses(id) {
  if (!id) return 0;
  const agg = await getDb().collection(COL_REPONSES).where('campagne', '==', id).count().get();
  return agg.data().count || 0;
}

async function etatCourant() {
  const question = await questionCourante();
  return { question, reponses: question ? await compterReponses(question.id) : 0 };
}

/**
 * Enregistre la question et marque les membres visés.
 *
 * L'ordre compte : le ciblage d'abord, la question ensuite. Une marque posée
 * sur un membre alors que la question n'existe pas encore ne montre rien — le
 * client exige que les deux concordent. L'inverse aurait affiché une question
 * à personne, puis à tout le monde d'un coup, sans qu'on sache où en était la
 * pose.
 */
async function lancerQuestion({ texte, choix, membres, par }) {
  const db = getDb();
  const id = 'q' + Date.now().toString(36);

  // 500 écritures par lot, la limite d'un batch Firestore.
  for (let i = 0; i < membres.length; i += 400) {
    const batch = db.batch();
    membres.slice(i, i + 400).forEach((m) => {
      batch.set(db.doc(`users/${m.uid}/data/annexes`), { question: id }, { merge: true });
    });
    await batch.commit();
  }

  await refConfig().set({
    question: { id, texte, choix, lanceeLe: Date.now(), par: par || null, cibles: membres.length },
  }, { merge: true });

  return id;
}

/**
 * Retire la question.
 *
 * Les marques restées sur les membres ne sont pas effacées : sans question
 * dans `config/app`, elles ne montrent rien, et les effacer coûterait une
 * écriture par membre pour un résultat invisible. La marque suivante les
 * écrase.
 */
async function arreterQuestion() {
  const { FieldValue } = require('firebase-admin/firestore');
  await refConfig().set({ question: FieldValue.delete() }, { merge: true });
}

// ── Le panneau ─────────────────────────────────────────────────────────────

function panelPayload(etat) {
  const q = etat && etat.question;
  const nb = (etat && etat.reponses) || 0;

  const embed = new EmbedBuilder()
    .setColor(0xf5b731)
    .setTitle('Livrets & épargne')
    .setDescription(
      'Savoir qui utilise le module, et leur poser une question directement '
      + 'dans l\'application.\n\n'
      + '**Qui a un livret** — la liste des membres concernés, nom et email.\n'
      + '**Poser une question** — choisissez les destinataires, écrivez la '
      + 'question : elle s\'affiche à l\'ouverture de leur application.\n'
      + '**Voir les réponses** — ce qui est revenu, et de qui.\n'
      + '**Arrêter la question** — elle cesse d\'être affichée.\n\n'
      + '*Tout s\'affiche en message privé : le salon ne garde que ce panneau.*',
    );

  // L'état de la question vit dans le panneau, pas dans un message à part : un
  // message édité ne remonte pas le salon, contrairement à un nouveau.
  if (q) {
    embed.addFields({
      name: `❓ Question en cours — ${nb} réponse${nb > 1 ? 's' : ''} sur ${q.cibles || '?'}`,
      value: propre(q.texte).slice(0, 1024),
    });
  } else {
    embed.addFields({ name: '❓ Question en cours', value: 'Aucune.' });
  }
  embed.setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('liv:qui').setLabel('Qui a un livret')
      .setStyle(ButtonStyle.Primary).setEmoji('📒'),
    new ButtonBuilder().setCustomId('liv:demander').setLabel('Poser une question')
      .setStyle(ButtonStyle.Success).setEmoji('❓'),
    new ButtonBuilder().setCustomId('liv:reponses').setLabel('Voir les réponses')
      .setStyle(ButtonStyle.Secondary).setEmoji('📊').setDisabled(!q),
    new ButtonBuilder().setCustomId('liv:stop').setLabel('Arrêter la question')
      .setStyle(ButtonStyle.Secondary).setEmoji('⏹').setDisabled(!q),
  );

  return { embeds: [embed], components: [row] };
}

let poseEnCours = false;

async function assurerPanneau(client) {
  if (!isConfigured()) {
    console.warn('[livretspanel] Firestore non configuré : panneau non posé.');
    return;
  }
  if (poseEnCours) return;
  poseEnCours = true;
  try {
    const ref = getDb().doc(DOC_PANNEAU);
    const connu = (await ref.get()).data() || {};
    const channel = await client.channels.fetch(SALON);
    const etat = await etatCourant();

    if (connu.messageId) {
      try {
        const message = await channel.messages.fetch(connu.messageId);
        await message.edit(panelPayload(etat));
        console.log(`[livretspanel] panneau à jour — message ${message.id}`);
        return;
      } catch (err) {
        console.warn(`[livretspanel] panneau introuvable (${err.message}) — nouveau message.`);
      }
    }

    const message = await channel.send(panelPayload(etat));
    await ref.set({ messageId: message.id, channelId: message.channelId, majLe: Date.now() }, { merge: true });
    console.log(`[livretspanel] panneau posé — message ${message.id}`);
  } finally {
    poseEnCours = false;
  }
}

// ── Les réponses qui remontent ─────────────────────────────────────────────

/**
 * Réécrit le panneau en place — c'est lui qui porte le compteur de réponses.
 *
 * Un message édité ne remonte pas le salon : le compteur se met à jour sans
 * rien ajouter sous les yeux de personne.
 */
async function rafraichirPanneau(client) {
  const ref = getDb().doc(DOC_PANNEAU);
  const connu = (await ref.get()).data() || {};
  if (!connu.messageId) return assurerPanneau(client);
  try {
    const channel = await client.channels.fetch(SALON);
    const message = await channel.messages.fetch(connu.messageId);
    await message.edit(panelPayload(await etatCourant()));
  } catch (err) {
    // Panneau supprimé entre-temps : on en repose un plutôt que d'abandonner.
    console.warn(`[livretspanel] rafraîchissement impossible (${err.message}) — repose.`);
    await assurerPanneau(client);
  }
}

/**
 * Écoute les réponses des membres.
 *
 * Elles ne sont plus postées en message : elles s'empilaient sous le panneau,
 * qui finissait hors de vue. Seul le compteur du panneau bouge, et « Voir les
 * réponses » les rend en entier, en privé.
 *
 * Pas de `where` sur un champ que le client n'écrit pas : Firestore n'indexe
 * pas l'absence, la requête ne rendrait jamais rien. Le tri se fait ici, sur un
 * flux qui reste court.
 */
function start(client) {
  if (!isConfigured()) {
    console.warn('[livretspanel] Firestore non configuré : réponses non écoutées.');
    return;
  }
  let premier = true;
  getDb().collection(COL_REPONSES).onSnapshot(
    (snap) => {
      // Le premier instantané rejoue tout l'existant : sans cette garde, le
      // panneau serait réécrit une fois par réponse déjà connue au démarrage.
      const nouvelles = snap.docChanges().filter((c) => c.type === 'added').length;
      if (premier) { premier = false; return; }
      if (!nouvelles) return;
      rafraichirPanneau(client)
        .catch((e) => console.error('[livretspanel] panneau non rafraîchi :', e.message));
    },
    (err) => console.error('[livretspanel] écoute des réponses :', err.message),
  );
}

// ── Routage ────────────────────────────────────────────────────────────────

// Les listes de destinataires vivent en mémoire, pas dans Firestore.
//
// L'identifiant du tirage voyage dans le `customId` du menu puis du modal —
// les uid, eux, n'y tiendraient pas : Discord plafonne un customId à cent
// caractères. Ils ne survivent pas à un redémarrage du bot, et c'est assumé :
// mieux vaut redemander la liste que poser une question à des destinataires
// oubliés. Purge à trente minutes, comme les scénarios d'audit.
const TIRAGES = new Map();
const TIRAGE_TTL = 30 * 60 * 1000;

// Discord plafonne un menu à vingt-cinq options. La première est « tout le
// monde », il en reste vingt-quatre pour désigner quelqu'un nommément.
const MAX_OPTIONS_NOMMEES = 24;

function purgerTirages() {
  const limite = Date.now() - TIRAGE_TTL;
  for (const [id, t] of TIRAGES) if (t.at < limite) TIRAGES.delete(id);
}

const etiquette = (m) => (m.nom || m.email || m.uid).slice(0, 100);

async function demanderCibles(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  purgerTirages();

  const membres = await membresAvecLivret();
  if (!membres.length) {
    await interaction.editReply('Personne n\'a de livret enregistré : la question n\'aurait aucun destinataire.');
    return;
  }

  const id = Date.now().toString(36);
  TIRAGES.set(id, { membres, at: Date.now(), choix: null });

  const nommes = membres.slice(0, MAX_OPTIONS_NOMMEES);
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`liv:cibles:${id}`)
    .setPlaceholder('À qui poser la question ?')
    .setMinValues(1)
    .setMaxValues(nommes.length + 1)
    .addOptions([
      {
        label: `Tout le monde (${membres.length})`,
        value: '*',
        description: 'Tous les membres ayant au moins un livret',
        emoji: '📒',
      },
      ...nommes.map((m) => ({
        label: etiquette(m),
        value: m.uid,
        // L'ordre suit ce qui identifie le mieux : l'état civil, puis l'email,
        // puis ce qu'il détient. Tronqué à cent caractères par Discord.
        description: [m.civil, m.email, m.types.map(nomType).join(', ')]
          .filter(Boolean).join(' · '),
      })).map((o) => ({ ...o, description: o.description.slice(0, 100) })),
    ]);

  const reste = membres.length - nommes.length;
  const embed = new EmbedBuilder()
    .setColor(0xf5b731)
    .setTitle('À qui poser la question ?')
    .setDescription(
      `${membres.length} membre${membres.length > 1 ? 's ont' : ' a'} au moins un livret.`
      + '\n\nChoisissez un ou plusieurs destinataires, ou « Tout le monde ». '
      + 'La question s\'écrit à l\'étape suivante.'
      + (reste > 0
        ? `\n\n*${reste} membre${reste > 1 ? 's ne sont' : ' n\'est'} pas listé${reste > 1 ? 's' : ''} `
          + 'nommément (Discord plafonne un menu à 25 entrées) — « Tout le monde » '
          + 'les inclut.*'
        : ''),
    );

  await interaction.editReply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

async function ouvrirFormulaire(interaction) {
  // Rien de distant avant un `showModal` : il doit être la première réponse à
  // l'interaction, et Discord invalide le jeton au bout de trois secondes. La
  // sélection se range en mémoire, ce qui ne coûte rien.
  const id = interaction.customId.split(':')[2];
  const tirage = TIRAGES.get(id);
  if (!tirage) {
    await interaction.reply({
      content: 'Cette sélection a expiré (le bot a redémarré, ou plus de trente minutes '
        + 'ont passé). Relancez « Poser une question ».',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  tirage.choix = interaction.values;

  const modal = new ModalBuilder().setCustomId(`liv:modal:${id}`).setTitle('Question aux membres');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('texte').setLabel('La question')
        .setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(true)
        .setPlaceholder('Votre banque propose-t-elle un compartiment au-delà du plafond ?'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('choix').setLabel('Réponses possibles — une par ligne, 2 à 4')
        .setStyle(TextInputStyle.Paragraph).setMaxLength(200).setRequired(true)
        .setPlaceholder('Oui\nNon\nJe ne sais pas'),
    ),
  );
  await interaction.showModal(modal);
}

async function enregistrerQuestion(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const id = interaction.customId.split(':')[2];
  const tirage = TIRAGES.get(id);
  if (!tirage || !tirage.choix) {
    await interaction.editReply('Cette sélection a expiré. Relancez « Poser une question ».');
    return;
  }
  // « Tout le monde » l'emporte sur une sélection nominative faite en même
  // temps : c'est le sens de la case, et l'inverse aurait exclu des membres
  // qu'on venait de cocher.
  const destinataires = tirage.choix.includes('*')
    ? tirage.membres
    : tirage.membres.filter((m) => tirage.choix.includes(m.uid));

  const texte = interaction.fields.getTextInputValue('texte').trim();
  const choix = interaction.fields.getTextInputValue('choix')
    .split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 4);

  if (choix.length < 2) {
    await interaction.editReply('Il faut au moins deux réponses possibles, une par ligne.');
    return;
  }
  // Le client rend chaque choix dans un bouton : au-delà, l'écran déborde sur
  // un téléphone, et un libellé coupé ne veut plus rien dire.
  const trop = choix.find((c) => c.length > 60);
  if (trop) {
    await interaction.editReply(`Cette réponse est trop longue pour un bouton (60 caractères max) : « ${trop.slice(0, 80)} »`);
    return;
  }

  if (!destinataires.length) {
    await interaction.editReply('Aucun destinataire retenu — la sélection était vide.');
    return;
  }

  const campagne = await lancerQuestion({
    texte, choix, membres: destinataires, par: interaction.user.tag,
  });
  TIRAGES.delete(id);
  // Le panneau porte l'état : il doit le refléter tout de suite, sinon il
  // annonce encore « aucune question » alors qu'elle vient de partir.
  await rafraichirPanneau(interaction.client).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(0x22d98a)
    .setTitle('Question posée')
    .setDescription(propre(texte).slice(0, 2000))
    .addFields(
      { name: 'Réponses proposées', value: choix.map((c) => `• ${propre(c)}`).join('\n').slice(0, 1024) },
      { name: 'Destinataires', value: destinataires.length === tirage.membres.length
          ? `Tous les membres ayant un livret (${destinataires.length})`
          : propre(destinataires.map(etiquette).join(', ')).slice(0, 1024), inline: false },
      { name: 'Référence', value: `\`${campagne}\``, inline: true },
    )
    .setFooter({ text: 'Elle s\'affiche à leur prochaine ouverture de l\'application.' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

/**
 * Les réponses reçues, en privé.
 *
 * Les documents sont rapatriés en entier ici, et seulement ici : c'est le geste
 * qui les demande. Le compteur du panneau, lui, passe par `count()`.
 */
async function listerReponses(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const q = await questionCourante();
  if (!q) {
    await interaction.editReply('Aucune question n\'est posée en ce moment.');
    return;
  }

  const snap = await getDb().collection(COL_REPONSES)
    .where('campagne', '==', q.id).get();

  const embed = new EmbedBuilder()
    .setColor(0x22d98a)
    .setTitle(`Réponses — ${snap.size} sur ${q.cibles || '?'}`)
    .setDescription(propre(q.texte).slice(0, 2000))
    .setTimestamp();

  if (!snap.size) {
    embed.addFields({ name: 'Rien encore', value:
      'La question s\'affiche à la prochaine ouverture de l\'application de chaque membre.' });
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // La répartition d'abord : c'est ce qu'on vient chercher. Le détail ensuite.
  const parChoix = {};
  snap.forEach((d) => {
    const c = (d.data() || {}).choix || '(vide)';
    parChoix[c] = (parChoix[c] || 0) + 1;
  });
  embed.addFields({
    name: 'Répartition',
    value: Object.entries(parChoix).sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `**${propre(c)}** — ${n}`).join('\n').slice(0, 1024),
  });

  // Discord plafonne à 25 champs, en-tête compris. On en garde vingt.
  const docs = snap.docs.slice(0, 20);
  for (const d of docs) {
    const r = d.data() || {};
    const qui = propre(r.nom || r.email || r.uid).slice(0, 200);
    const val = `**${propre(r.choix || '?')}**`
      + (r.commentaire ? `\n${propre(r.commentaire)}` : '')
      + (r.email && r.nom ? `\n\`${propre(r.email)}\`` : '');
    embed.addFields({ name: qui, value: val.slice(0, 1024) });
  }
  if (snap.size > docs.length) {
    embed.setFooter({ text: `… et ${snap.size - docs.length} autres réponses.` });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function listerMembres(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const membres = await membresAvecLivret();
  await interaction.editReply({ embeds: [embedListe(membres)] });
}

async function stopper(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const en_cours = await questionCourante();
  if (!en_cours) {
    await interaction.editReply('Aucune question n\'est posée en ce moment.');
    return;
  }
  await arreterQuestion();
  await rafraichirPanneau(interaction.client).catch(() => {});
  await interaction.editReply(`Question retirée — elle ne s'affichera plus. (\`${en_cours.id}\`)`);
}

async function handleComponent(interaction) {
  if (!interaction.member?.roles.cache.has(FONDATEUR_ROLE)) {
    await interaction.reply({ content: 'Réservé au rôle fondateur.', flags: MessageFlags.Ephemeral });
    return;
  }
  const [, geste] = interaction.customId.split(':');
  try {
    if (geste === 'qui') { await listerMembres(interaction); return; }
    if (geste === 'demander') { await demanderCibles(interaction); return; }
    if (geste === 'cibles') { await ouvrirFormulaire(interaction); return; }
    if (geste === 'reponses') { await listerReponses(interaction); return; }
    if (geste === 'modal') { await enregistrerQuestion(interaction); return; }
    if (geste === 'stop') { await stopper(interaction); return; }
  } catch (e) {
    console.error('[livretspanel] interaction :', e.message);
    const dire = { content: `Échec : ${e.message}` };
    // Éphémère comme le reste : une erreur qui reste dans le salon oblige à
    // faire le ménage à la main.
    if (interaction.deferred || interaction.replied) await interaction.editReply(dire).catch(() => {});
    else await interaction.reply({ ...dire, flags: MessageFlags.Ephemeral }).catch(() => {});
  }
}

const isLivretsComponent = (customId) => customId.startsWith('liv:');

module.exports = {
  panelPayload, assurerPanneau, rafraichirPanneau, start, handleComponent,
  isLivretsComponent, membresAvecLivret, SALON,
};
