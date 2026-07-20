# TODO — Capital Board

Prochains chantiers. L'état actuel a été vérifié dans le code, les points marqués
« à décider » attendent un arbitrage produit.

---

## 1. Permissions salon Discord

**État** — Le bot (`discord-bot/`, discord.js v14) a déjà `link.js` / `unlink.js` :
l'utilisateur tape `/link`, un doc `discordLinkRequests/{token}` est créé, la webapp
confirme via le Worker qui écrit `discordLinks/{discordId} = {uid}` (js/app.js:441).
`role.js` et `embed-role.js` existent pour l'attribution de rôles.

**Fait côté bot** — `discord-bot/src/lib/rolesync.js` attribue le rôle défini par
`ROLE_COMPTE_LIE`. Arbitrages retenus :
- Critère : `discordLinks/{discordId}` existe **et** `users/{uid}` existe encore.
- Listener Firestore sur `discordLinks` (attribution immédiate) + sweep de
  réconciliation toutes les 15 min (comptes supprimés, downtime du bot, rôles
  retirés à la main).
- `/unlink` retire le rôle immédiatement.
- Le sweep supprime aussi les `discordLinks` orphelins : `deleteAllUserData()`
  (js/app.js:642) efface `users/{uid}` mais ne peut pas retrouver le lien, indexé
  par discordId.

**Reste à faire — configuration serveur, pas du code :**
- Créer le rôle sur Discord, renseigner `ROLE_COMPTE_LIE` dans le `.env` de la VM.
- Placer le rôle du bot **au-dessus** de ce rôle dans la hiérarchie, sinon Discord
  refuse l'attribution (l'échec est loggé par `[rolesync]`).
- Restreindre les salons voulus à ce rôle.

**Reporté** — un palier premium demandera un second rôle : `rolesync` gère un seul
rôle aujourd'hui, à généraliser le jour où le statut existe.

---

## 2. Mot de passe oublié

**État** — La moitié aval existe déjà : `pages/auth-action.html` gère
`verifyPasswordResetCode` et `confirmPasswordReset` (le clic sur le lien reçu par mail).
Il n'y a **aucun appel à `sendPasswordResetEmail`** dans `js/app.js` — le lien qui
déclenche l'envoi n'existe nulle part.

**À faire** — Lien « Mot de passe oublié ? » sur l'écran de connexion → saisie de
l'email → `sendPasswordResetEmail` → écran de confirmation.

**Points d'attention :**
- Ne jamais révéler si l'email existe (message identique dans les deux cas).
- Comptes Google-only : pas de mot de passe à réinitialiser, prévoir le message.
- Vérifier le template d'email Firebase et que l'URL d'action pointe bien vers
  `auth-action.html`.

Chantier court — la partie compliquée est déjà écrite.

---

## 3. Changement de nom d'utilisateur + délai

**État** — Le username est fixé une seule fois, au setup (`name-setup-modal`,
js/app.js:1475) : regex `^[a-z0-9._-]{3,20}$` + `_isUsernameTaken()`. Aucun moyen
de le changer ensuite.

**À faire** — Permettre le changement depuis le profil, avec un délai entre deux
changements.

**À décider :**
- Durée du cooldown (30 jours ?) et message quand il est actif.
- Garde-t-on un historique des anciens pseudos ? (utile en modération)

**Point technique important** — l'unicité n'est vérifiée que **côté client**, et les
règles Firestore laissent chaque utilisateur écrire son propre `username`. Deux
personnes peuvent donc prendre le même pseudo, ou usurper celui d'un autre. La
correction propre est une collection `usernames/{username}` en création seule, qui
sert aussi à stocker la date du dernier changement pour le cooldown. À traiter en
même temps que ce chantier, sinon on empile de la dette.

---

## 4. Coin actualité

**État** — Rien n'existe.

**À faire** — Une section actualités financières dans l'app.

**À décider :**
- Source : flux RSS, API news (payante au-delà d'un quota), ou rédaction manuelle
  depuis le panel admin ?
- Généraliste, ou filtré sur les tickers du portefeuille de l'utilisateur ?
- Où : nouvelle entrée de menu, ou bloc sur la page Portefeuille ?
- Le cache passe par le Worker (`capital-board-worker/`) pour éviter d'exposer une
  clé d'API côté client et de flinguer le quota.

Le plus flou des six — à cadrer avant de coder quoi que ce soit.

---

## 5. Captures d'écran sur la landing page

**État** — `pages/index.html` n'a pas de visuel de l'app.

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

**Bug à corriger d'abord** — Deux invitations Discord différentes coexistent :
`communaute/index.html` pointe sur `discord.gg/p73QMm4xDm`, `DEFAULT_SOCIAL` dans
`js/app.js:2846` sur `discord.gg/ZN9459TCTQ`. L'une des deux est probablement morte.

### 7.1 Alertes de prix en DM Discord

Quand une alerte se déclenche, envoyer un DM en plus de la notification push.
Même déclencheur que FCM, transport supplémentaire — le Worker connaît déjà l'uid,
il suffit de résoudre l'uid vers le discordId.

- Nécessite l'index inverse `uid → discordId` (aujourd'hui seul `discordId → uid` existe).
- Opt-in, au même endroit que le réglage `pushRecap`.
- Un DM échoue silencieusement si l'utilisateur bloque les DM du serveur : prévoir
  le cas, ne pas retenter en boucle.

Effort faible.

### 7.2 Annonces produit dans un salon

Message automatique dans un salon annonces à chaque déploiement. `announce.js` existe
déjà côté bot, il reste à le déclencher depuis `.github/workflows/deploy.yml`.

- Contenu : reprendre le message de commit, ou un champ dédié pour éviter de publier
  des messages techniques.
- Ne pas poster à chaque bump de version — seulement les changements visibles.

Effort faible.

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

---

## Ordre suggéré

1. **Lien Discord incohérent** (7) — deux invitations différentes en prod, correction
   d'une ligne, à faire tout de suite.
2. **Mot de passe oublié** (2) — court, la moitié est faite, et c'est un manque
   fonctionnel visible pour un utilisateur bloqué.
3. **Annonces produit Discord** (7.2) — court, `announce.js` existe déjà.
4. **Username + délai** (3) — à faire avec la correction d'unicité, sinon la dette grossit.
5. **Screenshots landing** (5) — sans dépendance technique, gain marketing immédiat.
6. **Alertes en DM Discord** (7.1) — demande l'index inverse `uid → discordId`.
7. ~~**Permissions salon Discord** (1)~~ — code fait, reste la config du serveur Discord.
8. **Widget Discord dans l'app** (7.4).
9. **Animations** (6) — cosmétique, à faire quand le reste est stable.
10. **Dividendes communauté** (7.3) — à repousser jusqu'à ce que la base d'utilisateurs
    rende l'agrégat réellement anonyme.
11. **Coin actualité** (4) — gros chantier, seul à impliquer un coût récurrent
    potentiel (API). À cadrer avant de s'engager.
12. **Feature Idées** (7.5) — la plus lourde. En attendant, retirer le bloc `ideas`
    des règles Firestore puisqu'il est ouvert et inutilisé.
