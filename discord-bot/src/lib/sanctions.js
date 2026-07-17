'use strict';

const { EmbedBuilder } = require('discord.js');

// Salon où transcrire les sanctions (mod-log).
const LOG_CHANNEL_ID = '1512909178694275163';

const LABELS = { ban: 'banni(e)', kick: 'expulsé(e)', mute: 'rendu(e) muet(te)' };

/** Envoie un embed en MP. Retourne true si délivré. */
async function sendDM(user, embed) {
  try {
    await user.send({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
}

/** Poste un embed dans le salon mod-log. */
async function sendLog(guild, embed) {
  const channel =
    guild.channels.cache.get(LOG_CHANNEL_ID) ??
    (await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null));
  if (!channel) return;
  await channel.send({ embeds: [embed] }).catch(() => {});
}

/** Tente d'envoyer un MP au membre sanctionné. Retourne true si délivré. */
async function dmUser(user, { action, guildName, reason, durationText }) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0xdc2626)
      .setTitle(`Sanction — ${guildName}`)
      .setDescription(`Vous avez été **${LABELS[action]}**.`)
      .addFields(
        { name: 'Raison', value: reason },
        { name: 'Durée', value: durationText ?? 'Définitif' },
      )
      .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
      .setTimestamp();
    await user.send({ embeds: [embed] });
    return true;
  } catch {
    return false; // MP fermés / bot bloqué / utilisateur absent.
  }
}

/** Transcrit la sanction dans le salon mod-log. */
async function logSanction(guild, { action, targetUser, moderator, reason, durationText, dmSent }) {
  const channel =
    guild.channels.cache.get(LOG_CHANNEL_ID) ??
    (await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null));
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xdc2626)
    .setTitle(`Sanction : ${action.toUpperCase()}`)
    .addFields(
      { name: 'Membre', value: `${targetUser.tag} (${targetUser.id})` },
      { name: 'Modérateur', value: `${moderator.tag}`, inline: true },
      { name: 'Durée', value: durationText ?? 'Définitif', inline: true },
      { name: 'Raison', value: reason },
      { name: 'MP envoyé', value: dmSent ? 'Oui' : 'Non', inline: true },
    )
    .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { dmUser, logSanction, sendDM, sendLog, LOG_CHANNEL_ID };
