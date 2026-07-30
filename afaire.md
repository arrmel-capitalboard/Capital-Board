# À faire — Capital Board

Dernière mise à jour : 30 juillet 2026.

Priorité par ordre décroissant. Les points de sécurité sont en tête : ils passent
avant toute nouvelle fonctionnalité.

---

## Sécurité

### 1. Passer `firebase-admin` en v14 sur le bot

**État** : 8 alertes `npm audit` restantes, toutes le même avis — `uuid`, bornes de
buffer manquantes en v3/v5/v6 quand l'appelant fournit un `buf`.

**Pourquoi ce n'est pas urgent** : le code concerné n'est jamais appelé de cette façon
par les librairies Google qui l'embarquent. Aucun chemin exploitable identifié sur ce
projet.

**Pourquoi le faire quand même** : rester sur des dépendances à jour évite qu'une
alerte réellement exploitable se noie dans le bruit des alertes ignorées.

**Comment** : version majeure, donc à traiter à froid. `npm i firebase-admin@14` dans
`discord-bot/`, puis vérifier les trois usages réels — Firestore (lecture des
portefeuilles, file des nouveautés), Auth (résolution d'emails), et les scripts
GitHub Actions qui importent la même librairie. Le corpus `npm test` ne couvre que
l'automod : la vérification se fait en lançant le bot.

### 2. Surveiller la CI qui exécute du code de PR forkée

`checks.yml` se déclenche sur `pull_request` et lance `npm test`. Le code d'une pull
request venue d'un fork s'exécute donc sur le runner GitHub.

**Aujourd'hui sans impact** : aucun secret n'est exposé à ce workflow et le
`GITHUB_TOKEN` d'une PR forkée est en lecture seule. L'abus se limiterait à l'usage du
runner.

**Règle à tenir** : ne jamais ajouter de secret à ce workflow, et ne jamais basculer
sur `pull_request_target`, qui exécuterait le code du fork avec les droits du dépôt.

### 3. Zones encore jamais auditées

À passer au crible lors d'une prochaine session :

- les scripts planifiés (`daily-recap`, `price-alerts`, `dividendes`, `earnings`) et
  leur usage des secrets
- le cache KV du Worker : possibilité d'empoisonnement, données mises en cache
- ce que le navigateur conserve en `localStorage`, sur un poste partagé
- la couverture des règles Firestore collection par collection, pour repérer une
  collection écrite par le client sans règle correspondante

### 4. Rappels de conception à ne pas casser

- **Le code PIN et la 2FA sont arbitrés par le Worker.** Ne jamais redonner au client
  la génération d'un code, le calcul d'un condensat, ou l'écriture de
  `users/{uid}/data/trustedDevices`.
- **Tout ce qui vient d'un utilisateur et finit dans du HTML doit être échappé** :
  `_escapeHtmlChat` pour du texte entre balises, `_attr` à l'intérieur d'un attribut,
  `_safeUrl` pour un `href` ou un `src`.
- **`storage.rules` n'est pas déployé** (voir plus bas). Si Storage est activé un jour,
  le déployer avant d'ouvrir le moindre envoi de fichier.
- **Déploiement des règles Firestore** : aucun workflow ne le fait. API `firebaserules`
  avec la clé de service, en comparant toujours au ruleset en production avant.

---

## Fonctionnalités

### 5. Pièces jointes dans les tickets de support

**État** : retiré le 30/07. Le bouton tentait un envoi vers Firebase Storage, que le
projet n'a jamais provisionné — l'envoi échouait à chaque fois. Storage exige
désormais le plan Blaze, donc un compte de facturation.

**Deux voies** :

- **Cloudinary** (déjà utilisé sur Au P'tit Paradis, gratuit). Montage sûr : le
  navigateur envoie l'image au Worker, le Worker la pousse sur Cloudinary avec la clé
  qui reste côté serveur, et renvoie l'URL. La clé n'apparaît jamais dans le code
  public, et le Worker impose les limites — images seules, 5 Mo, plafond par
  utilisateur. Nécessite `CLOUDINARY_CLOUD_NAME`, `API_KEY`, `API_SECRET` en secrets
  Cloudflare, jamais dans le dépôt. Compter 1 h.
- **Plan Blaze + Firebase Storage**. `storage.rules` est déjà écrit et commité :
  lecture réservée à l'auteur du ticket et à l'admin, images seules, 5 Mo, reste du
  bucket fermé. Il ne reste qu'à le déployer via l'API `firebaserules`, release
  `firebase.storage/<bucket>`.

Ne rien faire est acceptable : un support en texte seul se tient très bien au
démarrage.

### 6. Mur à idées — suites écartées

Signalement d'une idée déjà publiée, et commentaires sous les idées. Écartés le 30/07 :
à reconsidérer seulement quand le volume de membres le justifiera.

---

## Dettes techniques

- **URLs des réseaux sociaux dupliquées dans 4 fichiers** (`communaute/index.html`,
  `pages/index.html`, `js/app.js`, `liens.js` du bot). `data/links.json` fait référence
  et `scripts/check-links.mjs` échoue en CI sur toute divergence, donc la dérive est
  bloquée — mais la duplication reste.
- **Mots-clés automod `mp` et `dm`** passés en poids faible le 30/07. Surveiller les
  faux négatifs, c'est-à-dire la pub qui passerait au travers.
- **Défis OTP abandonnés** dans `otpChallenges` : jamais purgés automatiquement. Sans
  conséquence, ils sont inutilisables passé 10 minutes.
