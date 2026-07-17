'use strict';

const fs = require('node:fs');
const path = require('node:path');

const COMMANDS_DIR = path.join(__dirname, 'commands');

/**
 * Charge tous les modules de commande du dossier commands/.
 * Chaque fichier doit exporter { data, execute }.
 * @returns {Map<string, {data: object, execute: Function}>}
 */
function loadCommands() {
  const commands = new Map();
  const files = fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(COMMANDS_DIR, file));
    if (!command.data || typeof command.execute !== 'function') {
      console.warn(`[loadCommands] ${file} ignoré (data/execute manquant)`);
      continue;
    }
    commands.set(command.data.name, command);
  }

  return commands;
}

module.exports = { loadCommands };
