# Capital Board — Bot Discord

Bot Discord du projet [Capital Board](https://capitalboard.fr). Slash commands sur connexion gateway persistante, hébergé 24/7 sur **Google Cloud Compute Engine** (instance `e2-micro`, tier Always Free).

> ⚠️ **Repo public.** Aucun secret (token Discord, clé service account Firebase) ne doit jamais y figurer, ni en clair ni dans l'historique git. Les secrets vivent uniquement sur la VM (`.env` + `.json`, `chmod 600`).

## Stack

- [discord.js](https://discord.js.org) v14 (gateway)
- [firebase-admin](https://firebase.google.com/docs/admin/setup) — accès Firestore
- Node.js ≥ 18, PM2, GCP e2-micro Always Free

---

## Commandes

### Finance & Portefeuille

| Commande | Description |
|----------|-------------|
| `/portefeuille` | Affiche le portefeuille lié au compte Capital Board |
| `/watchlist` | Affiche la watchlist |
| `/dividendes` | Prochains dividendes du portefeuille |
| `/link <code>` | Lie le compte Discord au compte Capital Board |
| `/price <ticker>` | Cours en temps réel (autocomplete 20 tickers) |

### Embeds & Contenu (fondateur only)

| Commande | Description |
|----------|-------------|
| `/presentation` | Embed de présentation Capital Board |
| `/announce <titre> <description> [image] [ping]` | Annonce dans le salon dédié, réaction ✅ auto |
| `/embed-nouveautes <version> <titre> <contenu> [image]` | Changelog Capital Board |
| `/embed <description> [titre] [couleur] [salon]` | Embed libre ponctuel |
| `/liens` | Tous les liens Capital Board (site, TikTok, Instagram, YouTube) |

### Embeds permanents (sans slash command)

Les embeds structurels du serveur (règlement, rôles, ticket, suggestions,
qui-sommes-nous) ne changent quasiment jamais : ils n'ont plus de commande
Discord. Contenu **et** salon de destination vivent dans `src/lib/embeds.js`,
et la publication se fait depuis le poste de dev.

```bash
npm run embed -- --list          # liste les embeds et leur salon
npm run embed -- reglement       # publie dans son salon
npm run embed -- --dry reglement # construit sans envoyer
```

| Clé | Salon de destination |
|-----|----------------------|
| `reglement` | `#📜・règlement` |
| `qui-sommes-nous` | `#ℹ️・qui-sommes-nous` |
| `ticket` | `#🎫・support-ticket` |
| `suggestion` | `#💡・suggestions` |
| `role` | `#📢・roles` |

Chaque publication envoie un **nouveau** message : supprimer l'ancien à la main.

### Tickets

| Commande | Description |
|----------|-------------|
| `/close-ticket` | Ferme le ticket depuis l'intérieur du salon |
| `/add-user <@membre>` | Ajoute un membre au ticket en cours |

### Modération

| Commande | Description |
|----------|-------------|
| `/warn <@user> <raison>` | Avertissement (log Firestore) |
| `/tempban <@user> <durée> <raison>` | Ban temporaire |
| `/kick <@user> <raison>` | Expulsion |

### Utilitaires

| Commande | Description |
|----------|-------------|
| `/help` | Liste des commandes |
| `/status` | État des services capitalboard.fr (fondateur) |
| `/restart` | Redémarre le bot (fondateur) |

---

## Automatismes

| Événement | Action |
|-----------|--------|
| Membre rejoint | Rôle visiteur auto + DM de bienvenue |
| Bouton "Accepter le règlement" | Rôle membre + retrait rôle visiteur |
| Bouton "Ouvrir un ticket" | Crée salon ticket (max 1/user) |
| Bouton "Fermer le ticket" | Transcript .txt → DM user + log salon |
| Bouton toggle rôle | Ajoute ou retire le rôle |
| Toutes les 15 min | Nettoyage Firestore `discordLinkRequests` expirées |
| Toutes les minutes | Rafraîchissement embed `/status` |

---

## Configuration

1. Créer l'application sur le [Discord Developer Portal](https://discord.com/developers/applications) → onglet **Bot** → activer **Server Members Intent** + copier le token.
2. Copier `.env.example` vers `.env` et renseigner :
   - `DISCORD_TOKEN`
   - `CLIENT_ID` (Application ID)
   - `GUILD_ID` (serveur de dev — optionnel, déploiement instantané)

## Lancement local

```bash
npm install
npm run deploy   # enregistre les slash commands
npm start
```

## Déploiement GCP (VM `bot-capitalboard`, e2-micro Always Free)

Le CI/CD (GitHub Actions `deploy-bot.yml`) déploie automatiquement sur push touchant `discord-bot/**`.

Déploiement manuel : **GitHub Actions → Déploiement bot Discord → Run workflow**.

### Première installation sur la VM

```bash
git clone https://github.com/arrmel-capitalboard/Capital-Board.git
cd Capital-Board/discord-bot
npm install
cp .env.example .env && nano .env   # renseigner les secrets
chmod 600 .env
npm run deploy
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

### Contraintes Always Free

- Une seule instance `e2-micro`, zone `us-central1`.
- Disque ≤ 30 Go, alerte budget à 1 €.

## Ajouter une commande

Créer `src/commands/moncommande.js` exportant `{ data, execute }`. Le loader le détecte automatiquement. Le deploy script (`npm run deploy`) tourne à chaque déploiement CI/CD.