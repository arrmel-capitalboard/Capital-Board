'use strict';

// Registre des embeds permanents du serveur.
//
// Ces embeds ne changent quasiment jamais : ils n'ont donc plus de slash command.
// Le contenu ET le salon de destination vivent ici ; la publication se fait depuis
// le poste de dev avec `npm run embed -- <clé>` (voir src/publish-embed.js).
//
// Republier envoie un NOUVEAU message : supprimer l'ancien à la main avant.
//
// Ajouter un embed = ajouter une entrée { channelId, description, build() }.
// build() renvoie un payload channel.send() : { embeds, components }.

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const E = require('./emojis');
const { panelPayload: suggestionPanel } = require('./suggestions');

const ASSETS = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets';
const FOOTER = { text: 'CapitalBoard - https://capitalboard.fr' };

// Rôles proposés en libre-service par l'embed `role`.
const SELF_ROLES = [
  { id: '1512906574127956078', label: 'Ping Annonces' },
  { id: '1512906632743354378', label: 'Ping nouveautés' },
];

const REGLEMENT = [
  { name: '1. Respect', value: "Soyez respectueux envers tous les membres. Aucune insulte, discrimination ou harcèlement ne sera toléré." },
  { name: '2. Pas de spam', value: "Évitez les messages répétitifs, les majuscules abusives et les floods de messages." },
  { name: '3. Pas de publicité', value: "Aucune publicité non autorisée, lien externe ou invitation Discord sans accord de la modération." },
  { name: '4. Sujets adaptés', value: "Restez dans les thèmes du serveur (finance, investissement, patrimoine). Utilisez les bons salons." },
  { name: '5. Pas de conseils financiers', value: "Les informations partagées sont à titre éducatif uniquement. Ce n'est pas du conseil en investissement." },
  { name: '6. Confidentialité', value: "Ne partagez pas d'informations personnelles (vos données ou celles d'autrui)." },
];

// Découpe un tableau en tranches de n (Discord : max 5 boutons par ligne).
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const EMBEDS = {
  reglement: {
    channelId: '1512908986482032832', // #📜・règlement
    description: "Règlement du serveur + bouton d'acceptation (donne le rôle Membre).",
    build() {
      const embed = new EmbedBuilder()
        .setColor(0x00e09e)
        .setTitle(`${E.ARROW}  Règlement du serveur`)
        .setDescription('En acceptant le règlement, vous obtenez accès au serveur Capital Board.')
        .addFields(REGLEMENT)
        .setImage(`${ASSETS}/reglement.gif`)
        .setFooter(FOOTER);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('accept_rules')
          .setLabel('Accepter le règlement')
          .setStyle(ButtonStyle.Success)
          .setEmoji('1520171580292989139'),
      );

      return { embeds: [embed], components: [row] };
    },
  },

  'qui-sommes-nous': {
    channelId: '1512915746982990005', // #ℹ️・qui-sommes-nous
    description: "Présentation de Capital Board et de l'équipe.",
    build() {
      const embed = new EmbedBuilder()
        .setColor(config.brandColor)
        .setTitle(`${E.ARROW}  Qui sommes-nous ?`)
        .setDescription(
          "**Capital Board** est une plateforme patrimoniale française construite par Armel, passionné d'investissement et de cybersécurité.\n\n" +
          "Aucun outil existant ne réunissait ce dont nous avions besoin : **suivi de PEA** précis, analyse **IA**, **sans publicité**, **sans agrégation bancaire** et **sans abonnement**, totalement **gratuit**. Alors on l'a construit.",
        )
        .addFields(
          {
            name: 'Notre mission',
            value: "Rendre la gestion de patrimoine accessible à tous les particuliers français, sans jargon inutile ni frais cachés. C'est la communauté qui façonne l'évolution du projet — vos retours, idées et contributions déterminent directement les prochaines fonctionnalités.",
          },
          {
            name: 'Ce que vous pouvez faire',
            value:
              '• Suivre votre portefeuille en temps réel\n' +
              '• Analyser vos performances et dividendes\n' +
              '• Recevoir des alertes prix sur mobile\n' +
              '• Obtenir un récap IA quotidien de votre portefeuille',
          },
          {
            name: 'Notre engagement',
            value: "Code 100% open source et auditable. Données hébergées en Europe (RGPD). Aucune publicité, aucune revente de données. Vous êtes l'utilisateur, pas le produit.",
          },
        )
        .setFooter({ text: 'Capital Board — https://capitalboard.fr' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Découvrir Capital Board')
          .setStyle(ButtonStyle.Link)
          .setURL('https://capitalboard.fr')
          .setEmoji('🌐'),
      );

      return { embeds: [embed], components: [row] };
    },
  },

  ticket: {
    channelId: '1512909867709497374', // #🎫・support-ticket
    description: "Panneau d'ouverture de ticket support.",
    build() {
      const embed = new EmbedBuilder()
        .setColor(config.brandColor)
        .setTitle(`${E.ARROW}  Support Capital Board`)
        .setDescription(
          "Besoin d'aide ? Ouvrez un ticket et notre équipe vous répondra rapidement.\n\n> Un seul ticket par membre.",
        )
        .setImage(`${ASSETS}/tickets.gif`)
        .setFooter(FOOTER);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('open_ticket')
          .setLabel('Ouvrir un ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎫'),
      );

      return { embeds: [embed], components: [row] };
    },
  },

  suggestion: {
    channelId: '1512909101942833202', // #💡・suggestions
    description: 'Panneau « Proposez vos suggestions » (le contenu vit dans lib/suggestions.js).',
    build: () => suggestionPanel(),
  },

  role: {
    channelId: '1520211949806420133', // #📢・roles
    description: 'Sélection de rôles en libre-service (voir SELF_ROLES ci-dessus).',
    build(guild) {
      // Le nom affiché vient du serveur quand il est dispo, sinon du label local.
      const roles = SELF_ROLES.map((r) => ({
        id: r.id,
        name: guild?.roles?.cache?.get(r.id)?.name ?? r.label,
      }));

      const embed = new EmbedBuilder()
        .setColor(0xf472b6)
        .setTitle(`${E.ARROW}  Choisissez vos rôles`)
        .setDescription('Cliquez sur un bouton pour obtenir ou retirer un rôle.')
        .addFields(roles.map((r) => ({ name: r.name, value: `<@&${r.id}>`, inline: true })))
        .setImage(`${ASSETS}/role.gif`)
        .setFooter(FOOTER);

      const components = chunk(roles, 5).map((grp) =>
        new ActionRowBuilder().addComponents(
          grp.map((r) =>
            new ButtonBuilder()
              .setCustomId(`role_${r.id}`)
              .setLabel(r.name)
              .setStyle(ButtonStyle.Secondary),
          ),
        ),
      );

      return { embeds: [embed], components };
    },
  },
};

module.exports = { EMBEDS, SELF_ROLES };
