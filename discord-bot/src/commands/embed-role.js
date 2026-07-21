'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const E = require('../lib/emojis');

const FONDATEUR_ROLE = '1512905140108001391';
const ROLE_CHANNEL   = '1520211949806420133';
const ROLE_GIF       = 'https://raw.githubusercontent.com/arrmel-capitalboard/Capital-Board/main/discord-bot/assets/role.gif';
const PINK           = 0xf472b6;

// Découpe un tableau en tranches de n (Discord : max 5 boutons par ligne).
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// role1 obligatoire + role2..role8 optionnels → l'admin choisit les rôles proposés.
function build() {
  const b = new SlashCommandBuilder()
    .setName('embed-role')
    .setDescription('Envoie un embed de sélection de rôles (rôles choisis à la commande).')
    .setDMPermission(false);
  b.addRoleOption((o) => o.setName('role1').setDescription('Rôle proposé nº1').setRequired(true));
  for (let i = 2; i <= 8; i++) {
    b.addRoleOption((o) => o.setName('role' + i).setDescription('Rôle proposé nº' + i));
  }
  return b;
}

module.exports = {
  data: build(),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(FONDATEUR_ROLE)) {
      await interaction.reply({ content: 'Commande réservée au rôle fondateur.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Récupère les rôles fournis (dédupliqués, ordre conservé).
    const seen = new Set();
    const roles = [];
    for (let i = 1; i <= 8; i++) {
      const r = interaction.options.getRole('role' + i);
      if (r && !seen.has(r.id)) { seen.add(r.id); roles.push(r); }
    }
    if (!roles.length) {
      await interaction.reply({ content: 'Aucun rôle fourni.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setColor(PINK)
      .setTitle(`${E.ARROW}  Choisissez vos rôles`)
      .setDescription('Cliquez sur un bouton pour obtenir ou retirer un rôle.')
      .addFields(roles.map((r) => ({ name: r.name, value: `<@&${r.id}>`, inline: true })))
      .setImage(ROLE_GIF)
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' });

    // Boutons en lignes de 5 (max Discord).
    const rows = chunk(roles, 5).map((grp) =>
      new ActionRowBuilder().addComponents(
        grp.map((r) =>
          new ButtonBuilder()
            .setCustomId(`role_${r.id}`)
            .setLabel(r.name)
            .setStyle(ButtonStyle.Secondary),
        ),
      ),
    );

    const target = await interaction.client.channels.fetch(ROLE_CHANNEL);
    await target.send({ embeds: [embed], components: rows });
    await interaction.editReply({ content: `Embed rôles envoyé dans <#${ROLE_CHANNEL}> (${roles.length} rôle(s)).` });
  },
};
