# À faire — Capital Board

Dernière mise à jour : 30 juillet 2026 (fin du balayage de sécurité).

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

### 3. Zones auditées le 30/07 — soldé

Toutes passées au crible, résultats :

- **Couverture des règles Firestore** : `earningsSubscribers` n'avait aucune règle.
  Les abonnements aux résultats étaient refusés en silence — corrigé, plus réinjection
  des abonnements existants dans l'index.
- **Cache KV du Worker** : aucun contrôle de format sur les symboles, chaque chaîne
  inventée écrivait une clé. Huit requêtes suffisaient à épuiser le quota journalier et
  faire tomber tous les caches. Corrigé (`isValidSymbol`, plus d'échecs mis en cache).
- **Scripts planifiés** : `dividendes.yml` échouait chaque semaine depuis le 29/06
  (droit d'écriture manquant) — corrigé, un mois rattrapé. Les autres tournent et font
  réellement leur travail : vérifié dans les logs, `daily-recap` envoie bien ses push,
  `price-alerts` lit les bonnes clés. Les chemins Firestore et les clés de réglages
  concordent entre app et scripts.
- **Permissions des workflows** : bloc `permissions` explicite sur les 9, au strict
  minimum.
- **`localStorage`** : rien de sensible — pas de jeton, pas de code PIN. Seuls
  l'identifiant d'appareil et le cache de la courbe. Ce dernier reste en clair sur le
  poste : sur un ordinateur partagé, les valeurs du portefeuille sont lisibles sans le
  code PIN. Assumé, le chiffrer n'aurait pas de sens puisque la clé serait au même
  endroit.

### 4. Compléter le CSP (demande une session de test navigateur)

Posé le 30/07 sur `app.html`, `index.html` et la page communauté :
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, plus une sortie de
cadre en JavaScript contre le clickjacking. GitHub Pages ne permettant pas
d'en-tête HTTP, tout passe par une balise `meta`.

Ce qui manque, et qui limiterait vraiment les dégâts d'une XSS future :
`script-src` et `connect-src`. Les poser demande d'autoriser une vingtaine
d'hôtes — Firebase (gstatic, firestore, identitytoolkit, securetoken,
fcmregistrations), Turnstile, reCAPTCHA, jsdelivr, les proxys CORS de secours,
Yahoo, ipapi — et une erreur casse l'app en silence. À faire en gardant
l'onglet ouvert sur la console, avec un `git revert` prêt.

Note : `frame-ancestors` et `report-only` sont ignorés dans une balise `meta`,
seul un en-tête HTTP les accepte. Un jour derrière Cloudflare devant le site,
ce serait faisable proprement.

### 5. Rappels de conception à ne pas casser

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

### 6. Pièces jointes dans les tickets de support

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

### 7. Mur à idées — suites écartées

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
