# À faire — Capital Board

Dernière mise à jour : 15 août 2026.

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
> **Sécurité** : la séance du 24/08 et ce qu'il reste à faire sont dans
> [`afaire-securite.md`](afaire-securite.md) — connexion Google en PWA à
> réparer en priorité, boutons de validation Discord à activer.
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

### Durcissement navigateur — posé, complété le 15/08

Posé le 30/07 sur `app.html`, `index.html` et la page communauté :
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, plus une sortie de
cadre en JavaScript contre le clickjacking. GitHub Pages ne permettant pas
d'en-tête HTTP, tout passe par une balise `meta`.

`script-src` et `connect-src` complétés le 15/08, testés en local puis en
prod (une violation trouvée et corrigée : `content-firebaseappcheck.
googleapis.com` manquait). `script-src` garde `'unsafe-inline'` — l'app utilise
des `onclick=""` inline partout, les retirer serait une refonte à part ; la
protection réelle contre l'exfiltration vient de `connect-src`, qui limite les
hôtes atteignables même par un script injecté. `worker-src 'self'` posé au
passage (pdf.js décode dans un worker).

Note : `frame-ancestors` et `report-only` restent ignorés dans une balise
`meta`, seul un en-tête HTTP les accepte — non posés, `X-Frame-Options` reste
géré par la sortie de cadre JavaScript existante.

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

### Cloudflare devant le site — fait le 15/08

Le domaine était déjà sur les nameservers Cloudflare (c'est comme ça
qu'`api.capitalboard.fr` marche pour le Worker), mais l'apex et `www`
n'étaient pas proxifiés. Basculés en "Proxied" — confirmé par l'en-tête
`Server: cloudflare` et un `CF-RAY` présent sur les deux. Aucun changement de
DNS ni de nameservers, juste le nuage gris → orange sur les enregistrements
existants.

### Sauvegardes Firestore — fait et activé le 15/08

`scripts/backup-firestore.mjs` exporte tout Firestore (parcours récursif) vers
un bucket R2 privé chaque lundi 04h UTC
(`.github/workflows/backup-firestore.yml`) — jamais en artifact GitHub
Actions, le dépôt est public. Rétention 90 jours (règle de cycle de vie R2,
préfixe `firestore/`). Premier run testé manuellement : 17 collections,
0.44 Mo, succès.

### Faille "jeton avant 2FA" fermée — fait le 15/08

`signInWithEmailAndPassword`/`signInWithPopup` étaient appelés directement
depuis le navigateur : Firebase délivrait un jeton valide dès l'identifiant
bon, avant toute vérification d'appareil/2FA (gates côté client, après coup).
Un jeton volé (XSS, extension malveillante) contournait donc tout le 2FA.

Le Worker vérifie désormais l'identité lui-même — mot de passe (REST Identity
Toolkit) ou jeton Google (Google Identity Services, plus le SDK Firebase
direct) — et ne délivre un jeton ("custom token" signé service account) qu'après
appareil de confiance + 2FA validés. `POST /login`, `/login-verify`,
`/login-google`. Vaut pour email+mot de passe et Google Sign-In en contexte
popup normal ; **iOS/PWA standalone reste sur l'ancien flux** (`signInWithRedirect`),
GIS n'ayant pas d'équivalent fiable à une vraie navigation complète — gap
connu, non testable ici faute d'appareil iOS.

**TOTP optionnel** ajouté en 2ᵉ facteur, en plus de l'OTP email (Profil →
Sécurité). Implémentation maison (RFC 6238, testée contre les vecteurs
officiels) plutôt que Firebase MFA natif, qui demande le palier payant
Identity Platform. Secret chiffré au repos (AES-GCM, clé Worker
`TOTP_ENCRYPTION_KEY` — à poser côté Cloudflare pour activer, sinon échec
propre). 8 codes de secours à usage unique.

**Piège découvert en route, à retenir** : App Check est appliqué sur l'API
d'authentification Firebase — tout appel REST `identitytoolkit` fait depuis
le Worker (et pas depuis le SDK client) doit porter un jeton App Check
(`X-Firebase-AppCheck`), sinon rejet 401 quel que soit le mot de passe. A
cassé la prod une dizaine de minutes avant d'être corrigé.

### Rappels de conception à ne pas casser

- **Le PIN, la 2FA et désormais le login lui-même sont arbitrés par le Worker.**
  Ne jamais redonner au client la génération d'un code, le calcul d'un
  condensat, l'écriture de `users/{uid}/data/trustedDevices`, ou l'appel direct
  à `signInWithEmailAndPassword`/`signInWithPopup` — le jeton ne doit exister
  côté client qu'après `/login`, `/login-verify` ou `/login-google` (sauf
  iOS/PWA, encore sur l'ancien flux, gap documenté).
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
