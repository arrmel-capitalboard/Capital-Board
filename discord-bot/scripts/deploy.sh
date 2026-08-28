#!/usr/bin/env bash
# Étape de déploiement exécutée sur la VM APRÈS la mise à jour du code
# (le git fetch/reset est fait par le workflow, pas ici — éviter qu'un script
# se réécrive lui-même pendant son exécution).
set -euo pipefail

# Dépôt privé de sécurité : le parcours d'audit y vit, et le bot le lance depuis
# ce clone. Sans cette étape, un correctif du parcours n'arrivait sur la VM que
# si quelqu'un pensait à s'y connecter pour le tirer à la main.
#
# Non bloquant : la chaîne de sécurité ne doit pas retenir le déploiement du bot.
# Un clone absent ou une clé SSH muette se signalent, et on continue.
SECURITE="$HOME/capitalboard-securite"
if [ -d "$SECURITE/.git" ]; then
  if git -C "$SECURITE" fetch --quiet origin main 2>/dev/null \
     && git -C "$SECURITE" reset --hard --quiet origin/main; then
    echo ">> Sécurité : $(git -C "$SECURITE" rev-parse --short HEAD)"
    # Ses dépendances lui sont propres (Playwright), et ne bougent presque jamais.
    [ -d "$SECURITE/scripts/node_modules" ] || (cd "$SECURITE/scripts" && npm install --no-audit --no-fund)
  else
    echo ">> Sécurité : mise à jour impossible, le clone reste en l'état." >&2
  fi
else
  echo ">> Sécurité : pas de clone dans $SECURITE, parcours d'audit indisponible." >&2
fi

cd "$HOME/Capital-Board/discord-bot"

# Dépendances (rapide si rien n'a changé).
npm install --no-audit --no-fund

# Synchro des slash commands auprès de Discord (idempotent).
npm run deploy

# Redémarrage du bot.
#
# Service utilisateur systemd : `systemctl --user` a besoin de savoir à quel bus
# s'adresser, et une session SSH non interactive ne le pose pas. Sans cette
# ligne, le déploiement échouerait sur « Failed to connect to bus ».
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user restart capitalboard-bot

echo ">> Déployé : $(git rev-parse HEAD)"
