# À faire — Capital Board

Dernière mise à jour : 14 août 2026.

Priorité par ordre décroissant. Les points de sécurité sont en tête : ils passent
avant toute nouvelle fonctionnalité.

> **Import de relevés** — la piste pour arrêter la saisie manuelle, PDF ou
> captures d'écran, sans agrégation bancaire : [`afaire-import.md`](afaire-import.md).
>
> **Livrets & épargne** a son propre fichier : [`afaire-livrets.md`](afaire-livrets.md).
> Module public depuis le 16/08, sept types de livrets ouverts. Livret A
> traité le 14/08 (double compartiment, fiscalité par tranche). Reste : le
> parcours navigateur jamais testé en vrai, et un export d'une autre banque
> que le CIC pour éprouver le parseur.
>
> **Dépenses & abonnements** a son propre fichier : [`afaire-depenses.md`](afaire-depenses.md).
> Module livré et ouvrable en bêta depuis le 12 août 2026 ; la suite du sujet —
> arrêter la saisie manuelle, agrégation bancaire via Enable Banking — y est
> détaillée avec la recherche déjà faite et les démarches à engager.

---

## Sécurité — pistes de renforcement

Classées par rapport valeur / effort. Rien ici n'est une faille connue : ce sont
des couches supplémentaires. L'état actuel est sain, ces points le rendraient plus
difficile à casser ou plus rapide à diagnostiquer.

### A. Mettre Cloudflare devant capitalboard.fr — le plus gros gain

Aujourd'hui le site est servi directement par GitHub Pages, qui ne permet aucun
en-tête HTTP. Passer le domaine derrière Cloudflare (gratuit) débloque d'un coup :

- **un vrai CSP**, en mode « rapport seulement » d'abord, ce qui permet enfin de
  poser `script-src` et `connect-src` sans risquer de casser l'app en aveugle
  (voir point B, qui devient facile)
- `X-Frame-Options` / `frame-ancestors`, qui remplacerait la sortie de cadre en
  JavaScript, contournable
- `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`
- limitation de débit et WAF au bord, donc **avant** d'atteindre le Worker
- purge de cache maîtrisée, utile au passage pour le gate de version

Effort : une soirée, dont l'essentiel est du DNS. Aucun changement de code.

### B. Compléter le CSP (`script-src`, `connect-src`)

Posé le 30/07 : `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
Manquent les deux directives qui limiteraient réellement une XSS. Elles demandent
d'autoriser une douzaine d'hôtes (Firebase, Turnstile, reCAPTCHA, Yahoo, ipapi)
et une omission casse l'app en silence.

À faire après le point A, en mode rapport seulement. Sinon, en direct avec la
console ouverte et un `git revert` prêt.

### D. MFA Firebase native (TOTP) à la place de la 2FA maison

La 2FA actuelle est désormais arbitrée par le Worker et solide, mais elle reste une
mécanique maison : le gate vit dans le client, et c'est notre code qui décide. La
MFA Firebase bloque au niveau de l'émission du jeton — aucun contournement client
n'est possible, par construction. Gain net de robustesse, coût : refonte du parcours
de connexion, et l'enrôlement TOTP à expliquer aux membres.

### J. Sauvegardes Firestore — code fait, activation en attente

`scripts/backup-firestore.mjs` exporte tout Firestore (parcours récursif,
aucune liste de collections à maintenir) et l'envoie sur R2 chaque lundi
(`.github/workflows/backup-firestore.yml`). Le repo est **public** : jamais
en artifact GitHub Actions, jamais commité — R2 est un bucket à part.

**Reste à faire, côté toi (Cloudflare, pas du code) :** créer le bucket R2,
un token API limité à ce bucket, poser les 4 secrets GitHub
(`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`), et
une règle de rétention (ex. 90 jours) dans les réglages du bucket. Sans ces
secrets, le run échoue proprement (message explicite, pas d'échec silencieux).

### L. Surveiller la CI qui exécute du code de PR forkée

`checks.yml` se déclenche sur `pull_request` et lance `npm test`. Sans impact
aujourd'hui : aucun secret n'y est exposé et le `GITHUB_TOKEN` d'une PR forkée est
en lecture seule. Règle à tenir : **jamais** de secret dans ce workflow, et jamais
de `pull_request_target`.

---

## Sécurité — ce qui a été fait le 30/07

### Zones auditées — soldé

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

### Durcissement navigateur — posé

Posé le 30/07 sur `app.html`, `index.html` et la page communauté :
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, plus une sortie de
cadre en JavaScript contre le clickjacking. GitHub Pages ne permettant pas
d'en-tête HTTP, tout passe par une balise `meta`.

Ce qui manque, et qui limiterait vraiment les dégâts d'une XSS future :
`script-src` et `connect-src`. Les poser demande d'autoriser une douzaine
d'hôtes — Firebase (gstatic, firestore, identitytoolkit, securetoken,
fcmregistrations), Turnstile, reCAPTCHA, Yahoo, ipapi — et une erreur casse
l'app en silence. À faire en gardant l'onglet ouvert sur la console, avec un
`git revert` prêt.

Note : `frame-ancestors` et `report-only` sont ignorés dans une balise `meta`,
seul un en-tête HTTP les accepte. Un jour derrière Cloudflare devant le site,
ce serait faisable proprement.

### Chart.js hébergé chez nous — fait le 30/07

Chargé depuis `cdn.jsdelivr.net` sans contrôle d'intégrité : un CDN compromis ou un
paquet détourné aurait injecté du JavaScript arbitraire dans l'app de tous les
utilisateurs, ce qui vaut prise de contrôle de n'importe quel compte.

Le fichier vient désormais du paquet npm officiel (`chart.js@4.4.0`,
`dist/chart.umd.js`, intégrité vérifiée par npm au téléchargement) et vit dans
`assets/vendor/`, version figée dans le nom. Plus aucune dépendance tierce à
l'exécution, et un `script-src 'self'` deviendra d'autant plus simple à poser.

Reste chargé depuis l'extérieur, sans alternative : Turnstile et reCAPTCHA
(chargeurs mutables, l'intégrité n'y est pas applicable) et le SDK Firebase depuis
`gstatic.com`.

### Rappels de conception à ne pas casser

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

### Pièces jointes dans les tickets de support

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

### Mur à idées — suites écartées

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
