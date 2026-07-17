#!/usr/bin/env bash
# Étape de déploiement exécutée sur la VM APRÈS la mise à jour du code
# (le git fetch/reset est fait par le workflow, pas ici — éviter qu'un script
# se réécrive lui-même pendant son exécution).
set -euo pipefail

cd "$HOME/Capital-Board/discord-bot"

# Dépendances (rapide si rien n'a changé).
npm install --no-audit --no-fund

# Synchro des slash commands auprès de Discord (idempotent).
npm run deploy

# Redémarrage du bot.
pm2 restart capitalboard-bot --update-env

echo ">> Déployé : $(git rev-parse HEAD)"
