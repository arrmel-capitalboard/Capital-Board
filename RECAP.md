# Recap — Capital Board (sessions 26-29/06/2026)

Point d'etape pour reprendre. Tout est code, deploye et fonctionnel sauf mention contraire.

---

## Infrastructure bot

- **Hebergement** : GCP Compute Engine, VM `bot-capitalboard`, `e2-micro` (Always Free), zone `us-central1-a`. IP : `34.30.14.175` (ephemere — ne pas Stop/Start).
- **Process** : PM2 (`ecosystem.config.js`), `pm2 startup` + `pm2 save`.
- **CI/CD** : push touchant `discord-bot/**` → GitHub Actions (`deploy-bot.yml`) → SSH → `deploy.sh` (git reset, npm install, `npm run deploy`, pm2 restart). Declenchement manuel : Actions → Run workflow.
- **Secrets GitHub** : `VM_HOST`, `VM_USER` (admin_capitalboard), `VM_SSH_KEY` (cle ed25519 dans GCP Console metadata, PAS authorized_keys direct).
- **Secrets VM** : `.env` + `firebase-key.json`, chmod 600, jamais commites.
- PM2 Plus : limite 10 notifs email lifetime atteinte.

---

## Commandes bot (toutes deployees)

### Finance / Portefeuille
| Commande | Description |
|----------|-------------|
| `/link <code>` | Lie compte Discord → Capital Board |
| `/portefeuille` | Portefeuille + cours + P/L |
| `/watchlist` | Valeurs suivies + variation |
| `/dividendes [annee]` | Dividendes par titre |
| `/price <ticker>` | Cours temps reel (autocomplete 20 tickers) |

### Embeds contenu (fondateur `1512905140108001391` only)
| Commande | Salon cible | Description |
|----------|-------------|-------------|
| `/embed-ticket` | salon courant | Embed ouverture ticket |
| `/embed-role` | `1520211949806420133` | Embed selection roles |
| `/embed-reglement` | `1512908986482032832` | Reglement + bouton accepter |
| `/embed-qui-sommes-nous` | `1512915746982990005` | Presentation equipe |
| `/embed-nouveautes <version> <titre> <contenu> [image]` | `1512909014990586047` | Changelog |
| `/presentation` | salon courant | Embed presentation Capital Board |
| `/announce <titre> <description> [image] [ping] [mention]` | `1512908999878639616` | Annonce jaune + reaction checkmark |

### Tickets
| Commande | Description |
|----------|-------------|
| `/close-ticket` | Ferme le ticket (slash cmd) |
| `/add-user <@membre>` | Ajoute membre au ticket (owner ou mod) |

### Moderation
| Commande | Description |
|----------|-------------|
| `/warn /warnings /clearwarns` | Avertissements |
| `/kick /ban /unban /tempban` | Sanctions |
| `/mute /unmute` | Timeout Discord natif |
| `/clear <n>` | Supprime messages |
| `/lock /unlock` | Verrouille salon |

### Utilitaires
| Commande | Description |
|----------|-------------|
| `/help` | Liste commandes |
| `/liens` | Tous les liens Capital Board |
| `/status` | Etat services (fondateur, auto-refresh 1min) |
| `/restart` | Redemarrage bot avec progression (fondateur) |
| `/show-logging` | Liste tous les evenements logges (fondateur, ephemere) |

### AutoMod (passif, pas de commande)
| Filtre | Declencheur | Action |
|--------|------------|--------|
| Liens | URL non-`capitalboard.fr` | Suppression + warn 5s + log |
| Pub score ≥ 8 | Keywords/caps/emojis/mentions/repetition | Suppression + warn 5s + log |
| Pub score 2-7 | Score partiel → Mistral confirme | Suppression + warn 5s + log si "oui" |

Exemptions : role fondateur `1512905140108001391` bypasse tout.

Mistral model : `mistral-small-latest`. Cle : `MISTRAL_API_KEY` dans `.env` VM.

---

## Automatismes

| Evenement | Action |
|-----------|--------|
| Membre rejoint | Role visiteur `1512906509078495232` + DM bienvenue |
| Clic "Accepter le reglement" | Role membre `1512906443085582539` + retire visiteur |
| Clic "Ouvrir un ticket" | Salon ticket cree (max 1/user) |
| Clic "Fermer ticket" | Transcript .txt → DM user + log `#1520205100839207003` |
| Clic bouton role | Toggle role (ajoute/retire) |
| Toutes les 15 min | Sweep `discordLinkRequests` Firestore expirees |
| Toutes les minutes | Refresh embed `/status` |
| Depart membre | Log dans `#1520208505880187042` |
| Message avec lien non-whitelist | Suppression + warn 5s + log `#1512909178694275163` |
| Message pub/spam detecte | Suppression + warn 5s + log `#1512909178694275163` |

---

## Systeme de tickets

- Categorie : `1520204780751028385`
- Salon transcriptions : `1520205100839207003`
- Etat persiste dans `data/tickets.json` (userId → channelId)
- Permissions salon : user + role fondateur seulement

---

## Systeme reglement

- Role visiteur (avant acceptation) : `1512906509078495232`
- Role membre (apres acceptation) : `1512906443085582539`
- Roles auto-assignables : `1512906574127956078`, `1512906632743354378`

---

## Emojis animes — `src/lib/emojis.js`

Fonctionnent dans descriptions/valeurs de fields. PAS dans titres/noms de fields.

| Cle | ID |
|-----|----|
| CHECK | 1520171580292989139 |
| CROSS | 1520172222772285731 |
| LOADING | 1520171506087362701 |
| ONLINE | 1520171479285895281 |
| OFFLINE | 1520171458985328680 |
| WARN | 1520171562345566259 |
| LOCK | 1520171531651514438 |
| ARROW | 1520177073816211627 |

---

## Assets discord-bot/assets/

- `online.gif`, `offline.gif` → embed /status
- `tickets.gif` → embed /embed-ticket
- `role.gif` → embed /embed-role
- `annonce.gif` → /announce (defaut si pas d'image uploadee)

---

## Site capitalboard.fr

- **GitHub Pages**, deploye via `deploy.yml` (copie pages/*.html a la racine)
- **PageSpeed** : Performance 98, SEO 100, Accessibilite 93, Bonnes pratiques 100
- **Fix performance** : Fontshare charge en async (preload trick) → FCP 4.7s → 1.7s
- **SEO** : schema Organization + sameAs reseaux sociaux sur homepage
- **Page communaute** : `capitalboard.fr/communaute/` (Discord, Instagram, YouTube, TikTok, GitHub)
- **Discord** : `https://discord.gg/p73QMm4xDm` (partout — footer, schema, page communaute)
- **Guides** : 4 guides PEA existants + a creer (prevu prochaine session)

### IDs salons importants
| Salon | ID |
|-------|----|
| Logs mod | `1512909178694275163` |
| Transcriptions tickets | `1520205100839207003` |
| Logs arrivee/depart | `1520208505880187042` |
| Annonces | `1512908999878639616` |
| Nouveautes | `1512909014990586047` |
| Reglement | `1512908986482032832` |
| Qui sommes-nous | `1512915746982990005` |
| Choix des roles | `1520211949806420133` |
| Tickets (categorie) | `1520204780751028385` |

---

## Rappels techniques

- Strings JS avec apostrophes francaises → double quotes `"` obligatoires (sinon SyntaxError)
- Editer `index.js` → toujours via PowerShell here-string (evite smart quotes)
- Le bot a besoin de **Server Members Intent** active sur le Discord Developer Portal (join/leave events)
- PM2 Plus : 10 notifs email lifetime atteintes → plus d'alertes email
- Commits vides (`--allow-empty`) ne declenchent pas le workflow bot (path filter `discord-bot/**`)
- Permissions bot requises : Bannir, Expulser, Timeout, Gerer roles, Gerer messages, Gerer salons
- Role fondateur haut dans la hierarchie des roles Discord

---

## Rappels automod

- Logs debug `[automod-pub]` toujours actifs dans PM2 (score + mistral) — retirer quand stable
- `\bmp\b` et `\bdm\b` patterns larges → surveiller faux positifs
- `src/lib/automod-pub.js` : HIGH_SCORE=8 (auto-delete), MID_SCORE=2 (→ Mistral)

---

## Session 29/06/2026

- [x] Retire console.log debug de automod-pub.js
- [x] Contenu "Qui sommes-nous" unifie entre landing et embed Discord (meme 3 piliers : origine/mission/engagement)
- [x] Landing `#about` : layout 2 colonnes, glow border purple, avatar ring, badges pills (Open source / 100% gratuit / Donnees en Europe / Zero publicite)
- [x] Highlights `.hl` purple bold sur termes cles dans tout le contenu landing (hero, stats, features, about)

## A faire prochaine session

- [ ] Nouveaux guides SEO (investir ETF, dividendes PEA, fiscalite PEA)
- [ ] Vrais liens reseaux sociaux (Instagram, YouTube, TikTok) quand disponibles