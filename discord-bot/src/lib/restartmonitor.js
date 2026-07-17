'use strict';

const fs = require('node:fs');
const path = require('node:path');
const E = require('./emojis');

const FILE = path.join(__dirname, '..', '..', 'data', 'restart-pending.json');
const LOG_CHANNEL = '1512909178694275163';

function save(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data));
}

async function handleOnReady(client) {
  if (!fs.existsSync(FILE)) return;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    fs.unlinkSync(FILE);
  } catch {
    return;
  }

  try {
    const channel = await client.channels.fetch(data.channelId);
    const msg = await channel.messages.fetch(data.messageId);
    await msg.edit(`${E.CHECK}  Redémarré !`);
    setTimeout(() => msg.delete().catch(() => {}), 5000);
  } catch (err) {
    console.error('[restart] édition message échouée :', err.message);
  }

  try {
    const logChannel = await client.channels.fetch(LOG_CHANNEL);
    await logChannel.send(
      `${E.CHECK}  Bot redémarré avec \`/restart\` dans <#${data.channelId}> par <@${data.userId}>`,
    );
  } catch (err) {
    console.error('[restart] log échoué :', err.message);
  }
}

module.exports = { save, handleOnReady };
