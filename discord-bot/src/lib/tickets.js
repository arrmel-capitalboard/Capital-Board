'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  PermissionFlagsBits, ChannelType,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  AttachmentBuilder, EmbedBuilder,
} = require('discord.js');
const E = require('./emojis');

const FILE               = path.join(__dirname, '..', '..', 'data', 'tickets.json');
const TICKET_CATEGORY    = '1520204780751028385';
const TRANSCRIPT_CHANNEL = '1520205100839207003';
const MOD_ROLE           = '1512905140108001391';

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}
function save(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function isTicketChannel(channelId) {
  const tickets = load();
  return Object.values(tickets).includes(channelId);
}

function getOwnerId(channelId) {
  const tickets = load();
  return Object.keys(tickets).find((uid) => tickets[uid] === channelId) || null;
}

async function openTicket(interaction) {
  const { guild, user } = interaction;
  const tickets = load();

  if (tickets[user.id]) {
    const existing = guild.channels.cache.get(tickets[user.id]);
    if (existing) {
      await interaction.reply({ content: `Vous avez deja un ticket ouvert : <#${existing.id}>`, ephemeral: true });
      return;
    }
    delete tickets[user.id];
    save(tickets);
  }

  await interaction.deferReply({ ephemeral: true });

  const channel = await guild.channels.create({
    name: `ticket-${user.username}`,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: MOD_ROLE,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      },
    ],
  });

  tickets[user.id] = channel.id;
  save(tickets);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );

  await channel.send({
    content: `<@${user.id}>`,
    embeds: [
      new EmbedBuilder()
        .setColor(0x2563eb)
        .setTitle(`${E.ARROW}  Ticket de support`)
        .setDescription(
          "Decrivez votre demande ci-dessous.\nUn membre de l'equipe vous repondra des que possible.\n\nCliquez sur **Fermer le ticket** une fois votre demande traitee.",
        )
        .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' }),
    ],
    components: [row],
  });

  await interaction.editReply({ content: `Votre ticket a ete cree : <#${channel.id}>` });
}

async function closeTicket(interaction) {
  const { guild, channel, user } = interaction;
  const tickets = load();

  await interaction.deferReply();

  const messages = [];
  let lastId;
  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, ...(lastId ? { before: lastId } : {}) });
    if (fetched.size === 0) break;
    messages.push(...fetched.values());
    lastId = fetched.last().id;
    if (fetched.size < 100) break;
  }
  messages.reverse();

  const lines = messages.map((m) => {
    const time = new Date(m.createdTimestamp).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    const content = m.content || (m.embeds.length ? '[embed]' : '[piece jointe]');
    return `[${time}] ${m.author.tag} : ${content}`;
  });

  const transcriptText = `Ticket : ${channel.name}\nFerme par : ${user.tag}\n${'─'.repeat(40)}\n${lines.join('\n')}`;

  const ownerId = Object.keys(tickets).find((uid) => tickets[uid] === channel.id);

  if (ownerId) {
    try {
      const owner = await guild.members.fetch(ownerId);
      await owner.user.send({
        content: `${E.CHECK}  Votre ticket **${channel.name}** a ete ferme. Voici la transcription :`,
        files: [new AttachmentBuilder(Buffer.from(transcriptText, 'utf8'), { name: `transcript-${channel.name}.txt` })],
      });
    } catch {}
    delete tickets[ownerId];
    save(tickets);
  }

  try {
    const logChannel = await guild.channels.fetch(TRANSCRIPT_CHANNEL);
    await logChannel.send({
      content: `${E.CHECK}  Ticket **${channel.name}** ferme par <@${user.id}>${ownerId ? ` · Ouvert par <@${ownerId}>` : ''}`,
      files: [new AttachmentBuilder(Buffer.from(transcriptText, 'utf8'), { name: `transcript-${channel.name}.txt` })],
    });
  } catch {}

  await interaction.editReply(`${E.LOCK}  Fermeture du ticket...`);
  await new Promise((r) => setTimeout(r, 2000));
  await channel.delete();
}

module.exports = { openTicket, closeTicket, isTicketChannel, getOwnerId };
