'use strict';

const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

// Seuls les membres possédant ce rôle peuvent utiliser /role.
const REQUIRED_ROLE_ID = '1512905140108001391';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Ajoute ou retire un rôle à un membre.')
    .addStringOption((o) =>
      o
        .setName('action')
        .setDescription('Ajouter ou retirer le rôle.')
        .setRequired(true)
        .addChoices({ name: 'Ajouter', value: 'add' }, { name: 'Retirer', value: 'remove' }),
    )
    .addRoleOption((o) =>
      o.setName('role').setDescription('Le rôle concerné.').setRequired(true),
    )
    .addUserOption((o) =>
      o.setName('personne').setDescription('Le membre visé.').setRequired(true),
    )
    .setDMPermission(false),

  async execute(interaction) {
    // Réservé aux membres ayant le rôle requis.
    if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
      await interaction.reply({
        content: 'Vous n’avez pas la permission d’utiliser cette commande.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const action = interaction.options.getString('action');
    const role = interaction.options.getRole('role');
    const target = interaction.options.getMember('personne');
    const me = interaction.guild.members.me;

    if (!target) {
      await interaction.reply({ content: 'Membre introuvable sur le serveur.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: 'Le bot n’a pas la permission « Gérer les rôles ».', flags: MessageFlags.Ephemeral });
      return;
    }
    if (role.managed || role.position >= me.roles.highest.position) {
      await interaction.reply({
        content: 'Ce rôle ne peut pas être géré par le bot (rôle géré ou trop haut dans la hiérarchie).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'add') {
      if (target.roles.cache.has(role.id)) {
        await interaction.reply({ content: `${target} a déjà le rôle ${role}.`, flags: MessageFlags.Ephemeral });
        return;
      }
      await target.roles.add(role);
      await interaction.reply({ content: `Rôle ${role} ajouté à ${target}.`, flags: MessageFlags.Ephemeral });
    } else {
      if (!target.roles.cache.has(role.id)) {
        await interaction.reply({ content: `${target} n’a pas le rôle ${role}.`, flags: MessageFlags.Ephemeral });
        return;
      }
      await target.roles.remove(role);
      await interaction.reply({ content: `Rôle ${role} retiré à ${target}.`, flags: MessageFlags.Ephemeral });
    }
  },
};
