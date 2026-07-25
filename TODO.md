# TODO — Capital Board

Prochains chantiers. L'état actuel a été vérifié dans le code, les points marqués
« à décider » attendent un arbitrage produit.

---

## 1. Permissions salon Discord

**État** — Le bot (`discord-bot/`, discord.js v14) a déjà `link.js` / `unlink.js` :
l'utilisateur tape `/link`, un doc `discordLinkRequests/{token}` est créé, la webapp
confirme via le Worker qui écrit `discordLinks/{discordId} = {uid}` (js/app.js:441).
`role.js` et `embed-role.js` existent pour l'attribution de rôles.

**Fait côté bot** — `discord-bot/src/lib/rolesync.js` attribue le rôle
`1528779341184635121` (`config.roleCompteLie`). Arbitrages retenus :
- Critère : `discordLinks/{discordId}` existe **et** `users/{uid}` existe encore.
- Listener Firestore sur `discordLinks` (attribution immédiate) + sweep de
  réconciliation toutes les 15 min (comptes supprimés, downtime du bot, rôles
  retirés à la main).
- `/unlink` retire le rôle immédiatement.
- Le sweep supprime aussi les `discordLinks` orphelins : `deleteAllUserData()`
  (js/app.js:642) efface `users/{uid}` mais ne peut pas retrouver le lien, indexé
  par discordId.

**Reste à faire — configuration serveur, pas du code :**
- Placer le rôle du bot **au-dessus** du rôle dans la hiérarchie, sinon Discord
  refuse l'attribution (l'échec est loggé par `[rolesync]`).
- Restreindre les salons voulus à ce rôle.

**Reporté** — un palier premium demandera un second rôle : `rolesync` gère un seul
rôle aujourd'hui, à généraliser le jour où le statut existe.

---


## 3. Changement de nom d'utilisateur + délai — FAIT

Section « Nom d'utilisateur » dans le profil → route Worker `/change-username`
(autorité serveur, admin SDK).

- Format `^[a-z0-9._-]{3,20}$` + blocklist « capitalboard ».
- **Unicité serveur** : scan `roles` (comptes existants) + réservation atomique
  `usernames/{nom}` en création seule (409 si concurrent), libère l'ancien.
- **Cooldown 30 j** via `roles/{uid}.usernameChangedAt`. La création initiale ne
  le pose pas → 1er changement libre, ensuite compteur 30 j. Le champ profil se
  verrouille et affiche les jours restants pendant le cooldown.
- Règles Firestore : collection `usernames/{name}` création seule ajoutée
  (déployée en console le 2026-07-21).

**Non retenu** — historique des anciens pseudos (pas jugé utile au lancement ;
à rajouter si besoin modération).

---

## 4. Coin actualité — FAIT

Page « Actualités » sous *Outils*, alimentée par `GET /news` sur le Worker.

**Choix retenus** — flux RSS (pas d'API payante, pas de clé), généraliste marchés
(pas de filtrage par ticker : un petit portefeuille donnerait une page vide),
entrée de menu dédiée.

- **Flux** (`NEWS_FEEDS`, worker `src/index.js`) : Yahoo Finance FR sur `^FCHI`,
  `^GSPC` et `^STOXX50E`, plus la rubrique Bourse de La Tribune (seule à fournir
  des images via `<enclosure>`).
- **Écartés** — Les Échos, Boursorama, ABC Bourse, Zonebourse, Boursier : 403/404
  aux robots (testé le 2026-07-21). Le Figaro / Challenges « économie » : noient
  la bourse sous du hors-sujet. Café de la Bourse : contenu affilié.
- **Cache** — KV `EARNINGS`, clé `news:v1` (TTL 15 min), partagé par tous puisque
  le contenu est identique. Copie `news:last` sans TTL : si tous les flux tombent,
  on ressert la dernière collecte (`stale: true`) au lieu d'une page vide. Cache
  mémoire de 10 min côté client par-dessus.
- **Sécurité** — parsing regex sans DOM, titres et résumés tiers échappés au
  rendu, seuls les liens et images en `https://` sont affichés, filtre anti-pub
  (`NEWS_SPAM`) pour les encarts InvestingPro glissés dans les flux Yahoo.
- Section `FLAGGABLE` : désactivable depuis le panel admin comme les autres.

**Reste possible** — un bloc compact sur la page Portefeuille renvoyant vers la
page, et un filtrage optionnel par ticker détenu.

---

## 5. Captures d'écran sur la landing page

**État** — la landing a désormais un visuel : la section `#demo` (`pages/index.html`)
embarque une iframe `app.html?demo=1`, donc l'app réelle en interactif. Les captures
restent utiles en complément — l'iframe demande de cliquer pour voir Performance ou
Dividendes, et pèse lourd sur mobile.

**À faire** — Screenshots de l'interface réelle sur la landing.

**Points d'attention :**
- Données de démo uniquement, jamais un vrai portefeuille (le mode `IS_DEMO` charge
  `data/demo-portfolio.json` — c'est la bonne source pour les captures).
- Poids des images : WebP + `loading="lazy"`, sinon le LCP mobile s'écroule.
- Prévoir la version mobile des captures, pas seulement le desktop.
- À refaire à chaque refonte visuelle — capturer plutôt 2-3 écrans forts que dix.

---

## 6. Propositions d'animations

**État** — Quelques transitions existent (sidebar, drawer mobile, barres de
projection). `@media (prefers-reduced-motion: reduce)` est déjà respecté à deux
endroits dans `css/style.css`.

**À faire** — Passe d'animations sur l'app.

**À décider** — le périmètre : micro-interactions (hover, états de boutons),
transitions entre pages, ou animations d'entrée des données (compteurs, graphiques) ?

**Points d'attention :**
- Continuer à couvrir `prefers-reduced-motion` sur tout ce qui est ajouté.
- Animer `transform` et `opacity` uniquement — animer `width`/`top`/`left` fait
  ramer les mobiles.
- Ne pas retarder l'affichage des chiffres : une animation de compteur sur des
  données financières rend la lecture plus lente, pas plus agréable.

---

## 7. Intégrations Discord ↔ app

**État commun** — Le bot a déjà un accès admin SDK à Firestore (`discord-bot/src/firebase.js`)
et la liaison de compte fonctionne (`discordLinks/{discordId} = {uid}`). Les commandes
existantes (`/portefeuille`, `/dividendes`, `/watchlist`, `/price`) ne font que **lire**.
Le Worker dispose déjà d'un pipeline de notifications (`sendFcm()`,
`capital-board-worker/src/index.js:184`).

### 7.1 Alertes de prix en DM Discord

Quand une alerte se déclenche, envoyer un DM en plus de la notification push.
Même déclencheur que FCM, transport supplémentaire — le Worker connaît déjà l'uid,
il suffit de résoudre l'uid vers le discordId.

- Nécessite l'index inverse `uid → discordId` (aujourd'hui seul `discordId → uid` existe).
- Opt-in, au même endroit que le réglage `pushRecap`.
- Un DM échoue silencieusement si l'utilisateur bloque les DM du serveur : prévoir
  le cas, ne pas retenter en boucle.

Effort faible.

### 7.2 Annonces produit — FAIT (validation + envoi hebdo)

File de validation avant publication communautaire :
- `.github/workflows/nouveautes.yml` + `scripts/queue-feature.mjs` : à chaque push,
  les commits `feat` deviennent une entrée `newsQueue/{id}` en `pending` (Firestore).
- Bot (`discord-bot/src/lib/newsqueue.js`) : poste chaque entrée dans le salon
  validation `1528790209150324807` avec boutons ✅/❌ (réservés fondateur).
- `/nouveaute texte:…` : ajout manuel à la même file (nouveauté hors commit feat).
- Bot (`discord-bot/src/lib/newsweekly.js`) : chaque lundi 18h (Paris), récap groupé
  des entrées `approved` non envoyées → salon nouveautés `1512909014990586047`.

Config serveur : rôle fondateur `1512905140108001391` doit pouvoir cliquer les boutons.

### 7.3 Dividendes du jour de la communauté

Salon où le bot poste le total agrégé et anonyme des dividendes perçus par l'ensemble
des utilisateurs.

**Réserve importante** — En phase de pré-lancement, avec peu d'utilisateurs actifs,
un « total communauté » peut revenir à publier le portefeuille d'une seule personne.
À ne mettre en place qu'avec un seuil minimum de contributeurs (ex. ne rien poster
en dessous de 10 utilisateurs distincts sur la journée), et sans jamais afficher
de ticker isolé. À revalider quand la base grossit.

Effort moyen.

### 7.4 Widget Discord dans l'app

Bloc dans l'app affichant les dernières annonces du serveur. Aujourd'hui `communaute/`
ne fait que des liens sortants.

- Le bot pousse les annonces dans un doc Firestore que l'app lit, plutôt qu'un appel
  direct à l'API Discord depuis le client (pas de token exposé, pas de rate limit).
- Réutiliser le doc `config/` qui est déjà en lecture publique, ou un doc dédié.

Effort moyen.

### 7.5 Relancer la feature Idées

La collection `ideas` existe dans les règles Firestore mais **aucun code ne l'utilise** :
règle morte aujourd'hui. La brancher pour du partage d'idées d'investissement,
côté app et côté Discord.

**Prérequis sécurité** — les règles actuelles autorisent tout compte vérifié à écrire
et supprimer l'idée de n'importe qui (aucun contrôle de propriété). Si la feature n'est
pas relancée maintenant, retirer le bloc des règles ; si elle l'est, ajouter un
`resource.data.author == request.auth.uid` sur update et delete.

- Modération : quels garde-fous ? Ce sont des idées d'investissement publiées entre
  particuliers, prévoir signalement et une clause de non-conseil.

Effort élevé — c'est une feature produit à part entière, pas une intégration.

### 7.6 Présence Discord du bot

Le bot n'affiche aucun statut : il apparaît simplement « en ligne ». Lui donner une
présence (`client.user.setPresence`, discord.js v14) qui serve de vitrine passive et
de preuve de vie — un bot muet est indistinguable d'un bot planté.

**À décider :**
- Statique (`Regarde capitalboard.fr`) ou tournante (nombre de comptes liés, nombre
  de portefeuilles suivis, un cours du jour) ? La tournante demande une source de
  données rafraîchie, la statique est immédiate.
- Type d'activité : `Watching` / `Playing` / `Listening` / `Custom`.

**Points d'attention :**
- La présence se perd à chaque reconnexion gateway : la reposer sur `ready`, pas
  seulement au démarrage.
- Discord ne fait remonter une mise à jour de présence que toutes les ~15 s ; ne pas
  boucler plus vite si la présence devient dynamique.

Effort faible pour la version statique.

---

## 8. Contenus favoris — quota levé le 2026-07-25 (Graph API en place)

**État** — La page « Contenus favoris » (menu *Outils*, carrousel par compte,
`GET /favoris`) lit désormais Instagram par la **Graph API `business_discovery`**,
gratuite et **sans limite de nombre de comptes**. Elle affiche posts **et** reels :
c'est voulu, voir « filtre par type » plus bas.

**Comptes suivis — FAIT.** `FAVORIS_IG_HANDLES` porte 9 comptes (`zonebourse`,
`seqo.oia`, `laurent.cosmos.finance`, `aktionnaire`, `matthiasbaccino`,
`parlonsfinance`, `pea.fr`, `jeanbenoit_gambet`, `analystecurieux`). Ajouter un
compte = ajouter son handle à la liste, après l'avoir validé avec
`node scripts/check-ig-handles.mjs <handle>`. **Les comptes visés doivent être
professionnels** : un compte perso ou age-gated renvoie une liste vide, et reste à
couvrir par un flux RSS.

**Sortie de RSS.app — FAIT.** `FAVORIS_FEEDS` a été vidé le 2026-07-25, la Graph API
couvre les mêmes comptes sans plafond de 2 flux ni essai qui expire. Rappel des tarifs
relevés le 2026-07-22, pour mémoire : RSS.app Basic 8,32 $/mois, FetchRSS gratuit
5 flux mais refresh 24 h. **Rien n'a été payé.** Conséquence à garder en tête : la
Graph API est désormais **source unique**, il n'y a plus de repli si elle tombe.

### Configuration Meta (faite le 2026-07-25, à ne pas refaire)

- App Meta « Capital Board », id `1051953543940846`, en mode **Développement** — la
  publication et le statut Fournisseur de technologies sont inutiles : `business_discovery`
  ne demande d'accès qu'à *notre* compte, les comptes tiers sont lus au travers.
- Cas d'utilisation « Gérer les messages et les contenus sur Instagram », permissions
  `instagram_basic`, `pages_show_list`, `pages_read_engagement` **et surtout
  `instagram_manage_insights`** : sans cette dernière, `business_discovery` répond
  `(#10) Application does not have permission for this action`. C'est le piège.
- Page Facebook « CapitalBoard » (`1272106095977234`) liée au compte pro `@capitalboard`
  (`IG_USER_ID = 17841443425190755`).
- Secrets Worker : `IG_USER_ID`, `IG_GRAPH_TOKEN`. Le second **doit** être un jeton de
  Page (`type: PAGE`, `expires_at: 0` au [Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)).
  `scripts/ig-token.mjs` le refabrique (échange 60 j → jeton de Page). Passer
  `FB_PAGE_ID` : avec Facebook Login for Business, `/me/accounts` revient **vide** alors
  que la Page est bien autorisée — interroger `/{FB_PAGE_ID}?fields=access_token`
  directement, le `granular_scopes` du token donne l'id de la Page.
- **Panne du 2026-07-25 (22 h de `stale`)** : le secret contenait en fait un jeton
  *utilisateur* 60 j, pas un jeton de Page. Il est mort le 24-07 à 18:00 PDT →
  `OAuthException 190 / subcode 463` sur les 9 comptes, et comme `FAVORIS_FEEDS` venait
  d'être vidé, plus aucune source. Remplacé par un vrai jeton de Page. **Vérifier au
  Debugger après chaque régénération** : `Type: User` = mauvais jeton, ça repètera dans
  60 jours.
- Réserve : même un jeton de Page porte un `data_access_expires_at` (90 j, ici
  2026-10-24). En pratique l'accès aux données de sa propre Page survit, mais si la
  panne revient à cette date, c'est la piste.
- Le cache KV `fav:v1` tient 15 min et le cron (`scheduled()`, toutes les 5 min)
  le réchauffe en fond via `refreshFavoris()` dès qu'il reste moins d'un tour :
  aucun visiteur ne déclenche plus d'appel Meta. Purger avec
  purger avec
  `wrangler kv key delete --namespace-id 994d84c5a364477e869b4fb12605a57d "fav:v1" --remote`
  pour voir un changement de config tout de suite.

**Écarté — héberger un scraper (RSS-Bridge, RSSHub) sur la VM GCP.** Instagram sans
compte connecté est mort : testé le 2026-07-22 depuis une IP résidentielle, la page
d'un post comme `/embed/captioned/` renvoient ~602 Ko de coquille vide. Il faudrait un
cookie de session d'un compte jetable, à renouveler à la main, avec risque de ban.

### Filtre par type (posts / reels) — abandonné

Codé puis annulé le 2026-07-22 (commits `22e2c3c` puis `9dc3310`) : décision produit,
les reels sont voulus dans la page. La méthode est conservée ici si le besoin revient.

La passerelle n'expose aucun type : vérifié les 2026-07-21 et 2026-07-22, zéro
occurrence de `reel`, `video` ou `mp4`, les 39 médias tous en `medium="image"`, toutes
les URLs en `/p/` jamais `/reel/`. Seul signal exploitable : **le format de la
vignette**. Instagram plafonne une publication de fil à 4:5 (ratio 1,33) alors qu'une
couverture de reel est en 9:16 (1,78), et l'en-tête JPEG suffit à le lire — 1 Ko de
`Range: bytes=0-1023`. Relevé réel : 13 posts, 14 reels, ratio maxi d'un post 1,33
contre 1,77 mini pour un reel, aucun recouvrement, seuil à 1,6.

Deux effets de bord constatés : les items dont l'URL signée a expiré ne sont plus
mesurables et sortaient de la liste (12 vieux items zonebourse de nov. 2025), et il
faut un garde-fou si le CDN cesse de répondre, sinon la page se vide.

**Note liée** — le flux d'un compte contient aussi ses republications et
collaborations : le flux `zonebourse` porte 20 posts de zonebourse, 4 de
`laurent.cosmos.finance` et 1 de `parlonsfinance`. Le champ `dc:creator` donne l'auteur
réel, et `buildFavoris` s'en sert pour recréditer chaque publication
(`capital-board-worker/src/index.js:157`). Effet de bord favorable : le rendu groupe
par auteur, donc ces comptes apparaissent comme des rangées à part — 4 comptes
affichés pour 2 flux payés.

---

## Ordre suggéré

1. ~~**Mot de passe oublié** (2)~~ — FAIT : lien envoyé par le Worker via Resend
   (email FR brandé, hors spam), voir §2.
2. ~~**Annonces produit Discord** (7.2)~~ — FAIT : file de validation `/nouveaute` +
   envoi hebdo (lundi 18h), voir 7.2.
3. **Username + délai** (3) — à faire avec la correction d'unicité, sinon la dette grossit.
4. **Screenshots landing** (5) — sans dépendance technique, gain marketing immédiat.
5. **Alertes en DM Discord** (7.1) — demande l'index inverse `uid → discordId`.
6. ~~**Permissions salon Discord** (1)~~ — code fait, reste la config du serveur Discord.
7. **Widget Discord dans l'app** (7.4).
8. **Animations** (6) — cosmétique, à faire quand le reste est stable.
9. **Dividendes communauté** (7.3) — à repousser jusqu'à ce que la base d'utilisateurs
   rende l'agrégat réellement anonyme.
10. **Coin actualité** (4) — gros chantier, seul à impliquer un coût récurrent
    potentiel (API). À cadrer avant de s'engager.
11. ~~**Feature Idées — bloc `ideas` à retirer**~~ — sans objet : aucun bloc `ideas`
    dans les règles Firestore actuelles. La feature Idées reste à faire si voulue.
