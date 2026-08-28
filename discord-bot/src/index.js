'use strict';

const { Client, GatewayIntentBits, Partials, Events, MessageFlags, ActivityType, EmbedBuilder } = require('discord.js');
const config = require('./config');
const { loadCommands } = require('./loadCommands');
const tempbans = require('./lib/tempbans');
const statusmonitor = require('./lib/statusmonitor');
const linkcleaner = require('./lib/linkcleaner');
const rolesync = require('./lib/rolesync');
const newsqueue = require('./lib/newsqueue');
const newsweekly = require('./lib/newsweekly');
const leaderboard = require('./lib/leaderboard');
const suggestions = require('./lib/suggestions');
const restartmonitor = require('./lib/restartmonitor');
const signalements = require('./lib/signalements');
const opsAlerts = require('./lib/ops-alerts');
const scanPatches = require('./lib/scan-patches');
const bareme = require('./lib/bareme');
const tickets = require('./lib/tickets');
const ticketstats = require('./lib/ticketstats');
const { checkPub } = require('./lib/automod-pub');
const securitytest = require('./lib/securitytest');
const burpaudit = require('./lib/burp-audit');
const securitypanel = require('./lib/securitypanel');
const vmstatus = require('./lib/vmstatus');

const LOG_CHANNEL   = '1520208505880187042';
const ROLE_VISITEUR = '1512906509078495232';
const ROLE_MEMBRE   = '1512906443085582539';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  // Sans ce partiel, la suppression d'un message absent du cache n'est pas
  // signalée — or c'est justement ce qui arrive au panneau de sécurité quand on
  // vide son salon (voir lib/securitypanel.js).
  partials: [Partials.Message],
});

const commands = loadCommands();
console.log(`[bot] ${commands.size} commande(s) chargee(s) : ${[...commands.keys()].join(', ')}`);

client.once(Events.ClientReady, (c) => {
  console.log(`[bot] Connecte en tant que ${c.user.tag}`);
  c.user.setPresence({
    activities: [{ type: ActivityType.Watching, name: 'https://capitalboard.fr' }],
    status: 'online',
  });
  tempbans.start(c);
  statusmonitor.start(c);
  linkcleaner.start();
  rolesync.start(c);
  newsqueue.startWatch(c);
  newsweekly.start(c);
  leaderboard.start(c);
  ticketstats.start(c);
  signalements.start(c);
  opsAlerts.start(c);
  scanPatches.watch(c);
  bareme.start(c);
  restartmonitor.handleOnReady(c).catch(() => {});
  securitytest.start(c);
  burpaudit.watch(c);
  securitypanel.surveiller(c);
  vmstatus.start(c);
});

// Rafraîchit le compteur de tickets dès qu'un salon est créé/supprimé.
client.on(Events.ChannelCreate, () => ticketstats.push(client));
client.on(Events.ChannelDelete, () => ticketstats.push(client));
// Renommage : le site affiche le nom du salon de tickets, il doit suivre.
client.on(Events.ChannelUpdate, () => ticketstats.push(client));

client.on(Events.GuildMemberAdd, async (member) => {
  try { await member.roles.add(ROLE_VISITEUR); } catch {}

  try {
    await member.user.send(
      `Bienvenue sur le serveur **Capital Board** !\n\nCommencez par lire et accepter le reglement pour acceder au serveur.\n\nRetrouvez toutes vos informations patrimoniales sur https://capitalboard.fr`,
    );
  } catch {}

  try {
    const log = await client.channels.fetch(LOG_CHANNEL);
    const embed = new EmbedBuilder()
      .setColor(0x16a34a)
      .setDescription(`**<@${member.id}> a rejoint le serveur**\n${member.user.tag}`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    await log.send({ embeds: [embed] });
  } catch {}
});

client.on(Events.GuildMemberRemove, async (member) => {
  try {
    const log = await client.channels.fetch(LOG_CHANNEL);
    const embed = new EmbedBuilder()
      .setColor(0xdc2626)
      .setDescription(`**${member.user.tag} a quitte le serveur**`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    await log.send({ embeds: [embed] });
  } catch {}
});

const LINK_EXTRACT_REGEX = /https?:\/\/\S+|discord\.gg\/\S+|www\.\S+/gi;
const LINK_WHITELIST     = /capitalboard\.fr/i;
const FONDATEUR_ROLE_AUTOMOD = '1512905140108001391';

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  if (message.member?.roles.cache.has(FONDATEUR_ROLE_AUTOMOD)) return;

  // ── Filtre liens ──────────────────────────────────────────────
  const links = message.content.match(LINK_EXTRACT_REGEX);
  const hasBlockedLink = links && links.some((l) => !LINK_WHITELIST.test(l));

  if (hasBlockedLink) {
    try {
      await message.delete();
      const warn = await message.channel.send({
        content: `<@${message.author.id}> Les liens ne sont pas autorisés sur ce serveur.`,
      });
      setTimeout(() => warn.delete().catch(() => {}), 5000);
    } catch {}

    try {
      const logChannel = await client.channels.fetch('1512909178694275163');
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('🔗 Lien supprimé')
        .addFields(
          { name: 'Membre', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
          { name: 'Salon', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Lien(s)', value: links.filter((l) => !LINK_WHITELIST.test(l)).join('\n').slice(0, 1024) },
        )
        .setFooter({ text: 'CapitalBoard AutoMod' })
        .setTimestamp();
      await logChannel.send({ embeds: [embed] });
    } catch {}

    return;
  }

  // ── Filtre pub ────────────────────────────────────────────────
  const pubResult = await checkPub(message.content, message.author.id);
  if (!pubResult.blocked) return;

  try {
    await message.delete();
    const warn = await message.channel.send({
      content: `<@${message.author.id}> La publicité n'est pas autorisée sur ce serveur.`,
    });
    setTimeout(() => warn.delete().catch(() => {}), 5000);
  } catch {}

  try {
    const logChannel = await client.channels.fetch('1512909178694275163');
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('📢 Pub détectée')
      .addFields(
        { name: 'Membre', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
        { name: 'Salon', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Méthode', value: pubResult.method, inline: true },
        { name: 'Signaux', value: pubResult.reasons.join(', ') },
        { name: 'Message', value: message.content.slice(0, 1024) },
      )
      .setFooter({ text: 'CapitalBoard AutoMod' })
      .setTimestamp();
    await logChannel.send({ embeds: [embed] });
  } catch {}
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      const command = commands.get(interaction.commandName);
      if (command?.autocomplete) await command.autocomplete(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      if (newsqueue.isNewsTextModal(interaction.customId)) { await newsqueue.handleTextModal(interaction); return; }
      if (suggestions.isSuggestionModal(interaction.customId)) { await suggestions.handleModal(interaction); return; }
      if (interaction.customId === 'ticket_modal') {
        const reason = interaction.fields.getTextInputValue('ticket_reason');
        await tickets.openTicket(interaction, reason);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (securitypanel.isSecurityComponent(interaction.customId)) { await securitypanel.handleComponent(interaction); return; }
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'open_ticket') { await tickets.promptTicketReason(interaction); return; }
      if (interaction.customId === 'close_ticket') { await tickets.closeTicket(interaction); return; }

      if (interaction.customId === 'accept_rules') {
        const member = interaction.member;
        if (member.roles.cache.has(ROLE_MEMBRE)) {
          await interaction.reply({ content: "Vous avez déjà accepté le règlement.", flags: MessageFlags.Ephemeral });
          return;
        }
        await member.roles.add(ROLE_MEMBRE);
        await member.roles.remove(ROLE_VISITEUR).catch(() => {});
        await interaction.reply({ content: "Règlement accepté ! Bienvenue sur Capital Board.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (newsqueue.isNewsButton(interaction.customId)) { await newsqueue.handleButton(interaction); return; }
      if (suggestions.isSuggestionButton(interaction.customId)) { await suggestions.handleButton(interaction); return; }
      if (scanPatches.isScanPatchButton(interaction.customId)) { await scanPatches.handleButton(interaction); return; }
      if (securitypanel.isSecurityComponent(interaction.customId)) { await securitypanel.handleComponent(interaction); return; }

      if (interaction.customId.startsWith('role_')) {
        const roleId = interaction.customId.slice(5);
        const member = interaction.member;
        const hasRole = member.roles.cache.has(roleId);
        if (hasRole) {
          await member.roles.remove(roleId);
          await interaction.reply({ content: "Role retire.", flags: MessageFlags.Ephemeral });
        } else {
          await member.roles.add(roleId);
          await interaction.reply({ content: "Role ajoute.", flags: MessageFlags.Ephemeral });
        }
        return;
      }

      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    await command.execute(interaction);
  } catch (err) {
    console.error('[bot] Erreur interaction :', err);
    const payload = {
      content: 'Une erreur est survenue.',
      flags: MessageFlags.Ephemeral,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(config.token);