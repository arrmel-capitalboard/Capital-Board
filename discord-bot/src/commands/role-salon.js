'use strict';

// Applique un préréglage de permissions sur un salon :
//   - ROLE_HIDDEN  : ne voit pas le salon (ViewChannel refusé).
//   - ROLE_LIMITED : voit le salon, crée une invitation, voit l'historique.
//                    TOUT le reste est explicitement REFUSÉ (pas neutre).
//
// Les permissions non listées pour ROLE_LIMITED sont posées à `false` (deny)
// et non `null` (neutre), conformément à la demande.

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

const ROLE_HIDDEN  = '1512904737228591346';
const ROLE_LIMITED = '1512906443085582539';

// Permissions autorisées pour le rôle limité (tout le reste = refusé).
const LIMITED_ALLOW = new Set(['ViewChannel', 'CreateInstantInvite', 'ReadMessageHistory']);

// Construit l'objet { PermName: true|false } couvrant TOUTES les permissions :
// true pour les autorisées, false (refus explicite) pour toutes les autres.
function buildLimitedOverwrite() {
  const perms = {};
  for (const name of Object.keys(PermissionFlagsBits)) {
    perms[name] = LIMITED_ALLOW.has(name);
  }
  return perms;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-salon')
    .setDescription('Applique les permissions prédéfinies des rôles sur un salon.')
    .addChannelOption((o) =>
      o.setName('salon').setDescription('Salon à configurer (par défaut : le salon courant).'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),

  async execute(interaction) {
    const channel = interaction.options.getChannel('salon') ?? interaction.channel;

    if (!channel || !channel.permissionOverwrites) {
      await interaction.reply({
        content: 'Ce type de salon ne supporte pas les permissions.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Rôle masqué : ne voit pas le salon.
      await channel.permissionOverwrites.edit(
        ROLE_HIDDEN,
        { ViewChannel: false },
        { reason: 'role-salon : rôle masqué' },
      );

      // Rôle limité : voir + invitation + historique ; tout le reste refusé.
      await channel.permissionOverwrites.edit(
        ROLE_LIMITED,
        buildLimitedOverwrite(),
        { reason: 'role-salon : rôle limité' },
      );

      await interaction.editReply(
        `✅ Permissions appliquées sur <#${channel.id}>.\n`
        + `• <@&${ROLE_HIDDEN}> : salon masqué (ne voit pas le salon)\n`
        + `• <@&${ROLE_LIMITED}> : voir le salon, créer une invitation, voir l'historique — tout le reste refusé.`,
      );
    } catch (e) {
      console.error('[role-salon]', e);
      await interaction.editReply(
        `❌ Échec : ${e.message}\n`
        + 'Vérifiez que le rôle du bot est **au-dessus** des rôles ciblés et qu\'il a la permission « Gérer les rôles ».',
      );
    }
  },
};
