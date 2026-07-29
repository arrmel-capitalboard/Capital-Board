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

- `src/lib/automod-pub.js` : HIGH_SCORE=8 (auto-delete), MID_SCORE=2 (→ Mistral)
- **Deux listes de mots-cles depuis le 30/07** : `PUB_KEYWORDS` (francs, 2 pts) et
  `PUB_WEAK_KEYWORDS` (ambigus, 1 pt). Un terme ambigu seul reste sous MID_SCORE, donc
  n'appelle plus Mistral. Sont passes en ambigu : `mp`, `dm`, `gagne/gagné`, `follow`,
  `x\d+` — tous normaux dans une conversation d'investissement (« x10 sur Nvidia »).
  `mp`/`dm` restent francs uniquement en contexte de sollicitation (« dm moi »,
  « envoie moi un mp », « prix en mp »).
- Logs debug `[automod-pub]` : deja retires le 29/06, plus rien a nettoyer.

---

## Session 29/06/2026

- [x] Retire console.log debug de automod-pub.js
- [x] Contenu "Qui sommes-nous" unifie entre landing et embed Discord (meme 3 piliers : origine/mission/engagement)
- [x] Landing `#about` : layout 2 colonnes, glow border purple, avatar ring, badges pills (Open source / 100% gratuit / Donnees en Europe / Zero publicite)
- [x] Highlights `.hl` purple bold sur termes cles dans tout le contenu landing (hero, stats, features, about)

## Session 29/07/2026 — App Check applique (TODO 7.7 termine)

`Cloud Firestore` et `Authentication` sont en **ENFORCED**. Toute requete sans jeton
App Check valide est rejetee. Teste en production : lecture portefeuille, ecriture,
deconnexion, reconnexion.

Cle reCAPTCHA v3 : `6LcrZwstAAAAAIOKXUFbgxO49SUoVmoQycZf3Ekq` (dans `js/app.js`,
`pages/index.html`, `pages/auth-action.html`).

**Regle** : toute nouvelle page qui appelle Auth, Firestore ou Storage doit initialiser
App Check avant le premier appel, sinon elle est rejetee. Copier le bloc de
`pages/auth-action.html` (import dynamique + `catch`).

**Backends non concernes** — tous en compte de service, ce qui contourne App Check :
bot Discord (`firebase-admin`), Worker Cloudflare (JWT → OAuth → REST), scripts
GitHub Actions (`firebase-admin`). `firebase-messaging-sw.js` ne fait que recevoir FCM.

**Diagnostic** : `await checkAppCheck()` dans la console de l'app → `{ ok: true, ... }`.

**Piloter l'enforcement sans la console Firebase** — API `firebaseappcheck`, avec la cle
service account. Services : `firestore.googleapis.com`, `identitytoolkit.googleapis.com`.

```
GET   https://firebaseappcheck.googleapis.com/v1/projects/capitalboard/services
PATCH https://firebaseappcheck.googleapis.com/v1/projects/capitalboard/services/<id>?updateMask=enforcementMode
      body: {"enforcementMode":"ENFORCED"}   // ou UNENFORCED pour revenir en arriere
```

Retour arriere : effet immediat, aucun deploiement necessaire.

### Aussi corrige ce jour

- Listeners Firestore detaches a la deconnexion (`_detachUserListeners`) — les
  `onSnapshot` survivants provoquaient `permission-denied` apres signOut. Le badge
  support ne gardait aucune reference d unsubscribe.
- Logs `[perf]` coupes en production, derriere le flag localStorage `cb_debug`
  (`toggleDebug()` en console pour rallumer).

### Bruit console a ignorer (Firefox)

`Cambria Math` rejetee, `WebGL warning: getInternalformatParameter`, `WebGL context was
lost`, `Erreur d analyse ... normal:1:6`, `401` sur `challenges.cloudflare.com/.../pat/` :
tout vient de **Turnstile** (fingerprinting anti-bot, et Firefox ne gere pas les Private
Access Tokens). Le projet ne declare aucun `@font-face`. `style.css:76` est un faux
positif deja couvert par `@supports`. Rien a corriger.

## Session 29/07/2026 — Mur a idees (TODO 7.5 livre)

Onglet **Idees** (`showPage('idees')`, page `#page-idees`, rendu `renderIdeasPage`).
Un membre propose → l admin publie ou refuse → la communaute vote pour ou contre.
Tri par score decroissant, pour et contre affiches separement.

### Modele de donnees

| Chemin | Contenu |
|--------|---------|
| `ideas/{id}` | title, body, authorUid, authorName, status, createdAt, up, down, score, rejectReason |
| `users/{uid}/ideaVotes/{ideaId}` | `{ v: 1 \| -1 }` — prive, couvert par la regle `users` |

`status` : `pending` → `published` ou `rejected`.

**Pourquoi le vote est chez l utilisateur** : une seule requete charge tous ses votes
pour colorer le mur, au lieu d une lecture par idee.

**Pourquoi up/down/score sont denormalises** : trier par score sans lire tous les votes.
Les regles n acceptent le nouveau compteur que si le doc de vote de l appelant change
en coherence dans le meme batch (`getAfter`) — personne ne peut gonfler un score sans
voter. C est pourquoi le client utilise `writeBatch` : les deux ecritures doivent etre
atomiques, sinon la regle refuse.

Si un vote concurrent rend le compteur local perime, la regle rejette : le client
recharge et retente une fois (`voteIdea(..., _retried)`).

### Tri fait cote client

`where(status) + orderBy(score)` demanderait un index composite a creer a la main.
Les idees publiees sont donc chargees puis triees en JS. A revoir si le volume grossit.

### Refus → email

Le client ecrit le statut, puis appelle `POST /admin/idea-rejected` sur le Worker
(`idToken`, `uid`, `title`, `reason`). Le Worker verifie `ADMIN_UID`, resout l email via
`accounts:lookup` et envoie par **Resend**. L echec d envoi n annule pas le refus.
Motif optionnel, saisi dans la file de moderation.

### Deploiement des regles Firestore

**Aucun workflow ne deploie `firestore.rules`** et le firebase CLI n est pas installe.
Deploiement fait via l API `firebaserules` avec la cle service account : creation d un
ruleset (Google valide la syntaxe, un fichier invalide ne peut pas passer) puis PATCH de
la release `cloud.firestore`. Toujours comparer au ruleset en prod avant, sinon on
ecrase une divergence.

Ruleset precedent (rollback) : `d3f14c64-dde4-4866-8014-312a23794933`.
Ruleset publie le 29/07 : `3d4ffd28-3547-4bda-b3bf-143f01692350`.

### Note

Le TODO affirmait qu un bloc `ideas` restait dans les regles avec un trou de securite.
C etait obsolete : le bloc avait deja ete retire. Les regles ont ete ecrites de zero.

## Session 30/07/2026 — Guides SEO + avertissement legal

**3 nouveaux guides** (template repris de `guides/pea-vs-cto.html`, CSS inline autonome) :
`guides/fiscalite-pea.html`, `guides/investir-etf-pea.html`, `guides/dividendes-pea.html`.
Chacun porte un schema `Article` **et** un schema `FAQPage` (rich results Google) —
les 4 guides precedents n'avaient que `Article`.

Maillage interne : cartes ajoutees dans la grille `#guides` de `pages/index.html`
(7 cartes au total), bloc « A lire ensuite » dans les nouveaux guides, liens croises
ajoutes dans le footer des 4 anciens. `sitemap.xml` : 3 URLs de plus (priority 0.8).

**Avertissement « pas un conseil en investissement »** : n'existait que dans les mentions
legales, les CGU, les footers de guides et 2 endroits de l'app (analyse IA, idees).
Ajoute la ou l'utilisateur voit des chiffres — footer de la landing (`.foot-disclaimer`),
ecran de connexion de l'app, liens legaux de la sidebar (`.sidebar-legal-note`), tiroir
mobile, section « Informations legales » du modal profil, footer de la page communaute.
`pages/soutien.html` et `404.html` non concernes (aucune donnee financiere).

### Notification de publication d'une idee (30/07)

`POST /admin/idea-published` sur le Worker, pendant exact de `/admin/idea-rejected` :
controle `ADMIN_UID`, email resolu par `accounts:lookup`, template `emailIdeaPublished`,
plus une push FCM si `roles/{uid}.fcmToken` existe (best-effort, un echec de push ne fait
pas echouer le mail). Cote client, `adminPublishIdea` appelle l'endpoint apres l'ecriture
du statut ; pas de mail si l'admin publie sa propre idee.

**Pas de flag « deja notifie » en base** : les regles limitent les updates admin a
`status/rejectReason/moderatedAt`, en ajouter un imposerait un redeploiement du ruleset.
Le risque de double notification est nul en pratique — la publication ne part que de la
file de moderation, que l'idee quitte aussitot.

### Liens reseaux sociaux (30/07)

Vraies URLs posees partout. Piege trouve : `youtube.com/@capitalboard` existe mais
appartient a un tiers (chaine « Motni Vesnal ») — le site, l'app et le bot y envoyaient
les visiteurs. Vrais comptes : YouTube `@CapitalBoardApp`, TikTok `@capital.board`,
Instagram `capitalboard`, Facebook `id=61592639900050`, LinkedIn
`linkedin.com/company/capitalboard/`.

**Ces URLs sont dupliquees dans 4 fichiers** : `communaute/index.html`, `pages/index.html`
(sameAs), `js/app.js` (`DEFAULT_SOCIAL` + `_MAIL_FOOTER_LINKS`), `discord-bot/src/commands/liens.js`.
`config/app.social` (editable depuis l'admin) surcharge seulement l'app — le bot et les
pages statiques ne lisent pas Firestore.

Invitations Discord : trois codes coexistaient, celui de la modale Support (`DpYjWWegR`)
expirait le 2026-08-17. Tout est sur `p73QMm4xDm`, permanent.

Footer des emails de diffusion : `youtube.png`, `facebook.png` et `linkedin.png` generees
le 30/07 (144x144, carre blanc arrondi + glyphe de marque, comme les 5 existantes ;
script PIL jetable, non commite). Les 8 icones sont reparties en rangees de 4 — une seule
ligne ferait 384 px et deborderait sur un ecran de 320 px, un `<tr>` ne se repliant pas.

### Derogation PIN du compte admin (30/07)

Champ `adminOptOut` dans `users/{uid}/data/security`, pose depuis la section Profil
(boutons « Desactiver » / « Reactiver le code PIN »).

**Pourquoi un champ separe de `enabled`** : `enabled:false` signifie « aucun PIN
configure » et declenche l'ecran de configuration forcee. La derogation doit sauter le
PIN, pas en creer un.

Le drapeau n'est honore que si l'uid vaut `ADMIN_UID` : un autre compte qui se
l'ecrirait resterait soumis au PIN. Le code enregistre n'est pas efface — reactiver le
remet en service sans reconfiguration. Le bouton est aussi propose quand aucun PIN
n'est configure, sinon l'admin serait renvoye vers la configuration forcee a chaque
chargement sans echappatoire.

Corrige au passage : le gate PIN d'apres validation 2FA ne consultait pas le
kill-switch global `config/app.pinDisabled`.

### Dettes traitees le 30/07

**Tri des idees.** `_loadPublishedIdeas` tente d'abord `where(status) + orderBy(score desc)
+ limit(200)`, et retombe sur le tri client si Firestore repond `failed-precondition`
(index absent). La voie indexee reprend d'elle-meme des que l'index existe, sans
deploiement. L'index attendu est decrit dans `firestore.indexes.json` (`ideas` :
status ASC, score DESC) et declare dans `firebase.json`.

**Cree le 30/07** en console Firebase (etat READY verifie via l'API Admin). La cle de
service `firebase-adminsdk-fbsvc@capitalboard` peut *lister* les index mais pas les creer
(403) : pour en creer depuis un script, il faudrait lui ajouter `roles/datastore.indexAdmin`.

**Liens dupliques.** `data/links.json` fait desormais reference et
`scripts/check-links.mjs` verifie les 4 copies (28 controles), en echouant sur toute
divergence. La duplication reste voulue : le JSON-LD doit etre dans le HTML, le menu de
l'app charge avant tout fetch, le bot ne lit pas Firestore.

**Automod.** `discord-bot/test/automod-pub.test.js` (corpus de 10 messages legitimes et
7 pubs, `npm test`, aucun reseau). `scoreMessage`, `HIGH_SCORE` et `MID_SCORE` sont
exportes pour ca. Le test verrouille notamment la regression du 30/07 : un terme ambigu
seul doit rester sous MID_SCORE.

**CI.** Nouveau workflow `checks.yml` (liens + corpus + `node --check` sur les 3 fichiers
JS principaux) sur chaque push et PR. `deploy-bot.yml` gagne un job `test` dont depend le
deploiement : une regression du filtre pub n'atteint plus la VM.

## A faire prochaine session

Rien de planifie, aucune dette ouverte.

## Historique des chantiers

Repris de `TODO.md`, supprime le 2026-07-30 (plus aucune tache en attente).

- Mur a idees — signalement d'une idee publiee et commentaires : ecartes le 2026-07-30.
- Guides SEO (ETF, dividendes, fiscalite PEA) : livres le 2026-07-30.
- 7.7 App Check : termine le 2026-07-29.
- 7.6 Presence Discord du bot : abandonne le 2026-07-29.
- 7.5 Feature Idees : livree le 2026-07-29.