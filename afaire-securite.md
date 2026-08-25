# Sécurité — reprise

Journal de la séance du 24 août 2026, et ce qui reste à faire. Écrit pour être
repris à froid : chaque tâche dit où cliquer et comment vérifier qu'elle a
marché.

---

## À faire, dans l'ordre

### 1. Réparer la connexion Google en PWA iPhone — à tester sur iPhone

Tout est posé, il ne reste que l'essai sur l'appareil.

**Le problème.** Le login Google ne fonctionnait pas sur iPhone : la page
Google se fermait, on revenait à l'écran de connexion, Turnstile se
réinitialisait, et rien ne se passait. Aucune erreur.

**La cause, vérifiée le 24/08.** `firebaseConfig.authDomain` valait
`capitalboard.firebaseapp.com`, une origine différente de `capitalboard.fr`.
Au retour de `signInWithRedirect`, le SDK avait écrit son état sur
`firebaseapp.com` ; Safari cloisonne le stockage par origine depuis ITP, donc
`capitalboard.fr` ne pouvait pas le relire. `getRedirectResult()` renvoyait
`null`, le SDK concluait qu'il n'y avait pas eu de connexion. Ce n'était pas une
régression : ce chemin n'a probablement jamais marché en PWA. Sur PC, la
connexion Google passe par Google Identity Services et n'utilise pas
`authDomain` du tout — elle n'était pas concernée.

**Le remède, posé le 25/08.** `/__/auth/*` est servi depuis notre propre
origine, par le relais en tête du `fetch` du Worker.

- Route Cloudflare `capitalboard.fr/__/*` → `capital-board-worker`, posée le
  25/08 sur le compte `admin.capitalboard@gmail.com`. Vérifiée : `handler`,
  `handler.js`, `experiments.js`, `iframe` et `iframe.js` répondent tous 200
  avec le vrai helper Firebase, et le reste du site sort toujours de GitHub
  Pages.
- URI de redirection `https://capitalboard.fr/__/auth/handler` autorisée sur le
  client OAuth Google, et `capitalboard.fr` dans les domaines autorisés
  Firebase — les deux étaient déjà en place.
- `authDomain` basculé sur `capitalboard.fr` (`js/app.js`), version bumpée en
  `20260822k`.

L'ancienne URI `capitalboard.firebaseapp.com/__/auth/handler` reste autorisée
côté Google, et `capitalboard.firebaseapp.com` reste dans `frame-src` : à
retirer une fois la bascule éprouvée, pas avant.

Les trois autres fichiers qui portent un `authDomain`
(`firebase-messaging-sw.js`, `pages/auth-action.html`, `pages/index.html`) ne
font aucun `signInWithRedirect` : config inerte, laissée telle quelle.

**Test :** sur iPhone, app fermée puis rouverte, connexion Google. Attendu :
soit l'app s'ouvre, soit un code 2FA est demandé. Si l'écran de connexion
revient, une ligne rouge « Connexion Google dégradée : … » doit apparaître et
donner la raison. Un `redirect_uri_mismatch` dans les minutes qui suivent une
modification côté Google est un délai de propagation : réessayer.

### 2. Activer les boutons de validation Discord

Le scan sait proposer des correctifs et les poster dans le salon sécurité avec
deux boutons, mais le bot ne peut pas encore déclencher leur application.

**a.** Créer un jeton GitHub fine-grained sur `arrmel-capitalboard/Capital-Board` :
Actions **Read and write**, Contents **Read and write**.

**b.** Sur la VM du bot :

```bash
nano ~/Capital-Board/discord-bot/.env
# GITHUB_DISPATCH_TOKEN=github_pat_...
# GITHUB_REPO=arrmel-capitalboard/Capital-Board
pm2 restart capitalboard-bot --update-env
```

`--update-env` est indispensable : sans lui pm2 garde les anciennes variables.

**c.** Déclencher un scan manuel (Actions → Scan de sécurité → Run workflow) et
vérifier qu'une proposition arrive avec ses boutons, et que « Appliquer »
produit bien un commit.

### 3. Tests en attente

- **Remplacement TOTP.** Profil → Sécurité → enrôler un nouvel authentificateur
  alors qu'un existe déjà. Attendu : une fenêtre demande un code de l'actuel.
- **Inscription Google.** Créer un compte avec une adresse jamais utilisée.
  Attendu : un code à 6 chiffres arrive par email avant tout accès. Penser à
  supprimer les comptes de test ensuite.

---

## Fait le 24 août

### Correctifs

| | |
|---|---|
| **Ré-verrouillage PIN** | Redemandé après 5 min d'inactivité, avec un avis expliquant pourquoi. Réglable par appareil. |
| **Second facteur remplaçable** | `/totp-enroll-confirm` écrasait `totpSecrets/{uid}` sans rien demander : une session volée substituait son authentificateur. Un code courant est désormais exigé. |
| **Login Google en redirect** | Livrait une session avant tout contrôle, avec des vérifications côté navigateur donc contournables. Repasse par `/login-google`. |
| **Inscription Google** | Entrait sans preuve de contrôle de la boîte, appareil auto-déclaré de confiance. Passe maintenant par `finishLogin` : code par email avant tout accès. |
| **Questionnaire d'accueil** | `config/onboardingText`, écrit par l'admin, finissait dans de l'`innerHTML` sans échappement. |
| **Documents internes** | `threat-model.md` et `audit-securite-2026-08-22.md` étaient publiés. Retirés du suivi, historique réécrit, `.gitignore` corrigé (l'ancienne règle `SECURITE-AUDIT-*.md` ne correspondait à aucun nom réel). |

### Chaîne de relecture automatisée

- **Mardi–samedi 6h10 UTC** — `security-scan.yml`, diff depuis le dernier scan
  réussi.
- **Dimanche 23h UTC** — `security-weekly-digest.yml` écrit un état des lieux de
  la semaine, rangé dans Firestore (`scanDigests`).
- **Lundi 23h UTC** — `security-weekly-review.yml` reprend ce digest, y ajoute
  les commits du jour, et cherche des problèmes.

Les comptes rendus partent dans le salon Discord `1541530997005353030`, jamais
dans une PR ni une issue : le dépôt est public, et un rapport décrit une faille
avant son correctif. Le rôle `1512905140108001391` est mentionné uniquement
quand une décision est attendue.

---

## Contraintes à ne pas redécouvrir

- **`claude-code-action@v1` refuse l'événement `push`** (« Unsupported event
  type »). D'où le cron.
- **Sans `github_token`, l'action exige l'app GitHub « Claude »**, non installée.
  On passe le jeton du workflow, plus restreint que l'app.
- **Authentification par `CLAUDE_CODE_OAUTH_TOKEN`** (abonnement), pas par clé
  API : rien n'est facturé, ça consomme le quota personnel. C'est aussi pourquoi
  le scan porte sur le diff et pas sur tout le dépôt.
- **Jamais d'artefact GitHub pour un contenu sensible** : sur un dépôt public,
  les artefacts d'un run sont téléchargeables par n'importe qui.
- **`git reset --hard` avant toute étape qui manipule un secret.** La session
  Claude peut écrire dans `scripts/`, et ce code tourne ensuite avec la clé
  d'administration Firebase. Relevé par le scan sur ses propres workflows.
- **Les scans ne poussent rien.** `security-apply.yml` est le seul workflow avec
  `contents: write`, et le seul à ne jamais se déclencher tout seul.
- **Bumper la version, c'est trois fichiers** : `APP_VERSION` dans `js/app.js`,
  le `?v=` de `pages/app.html`, et `data/version.json`. Toujours à partir de la
  valeur existante, jamais de la date du jour.

---

## Points ouverts

- **Le scan produit des faux positifs et en rate.** Il a manqué le trou de
  l'inscription Google, dans un fichier qu'il venait d'examiner. Piste : ajouter
  au prompt « un chemin de création de compte doit vérifier ce que le chemin de
  connexion vérifie ».
- **Impossible de désactiver les forks** sur un dépôt public personnel — réponse
  de l'API GitHub : *« Allow forks setting can only be changed on org-owned
  private repositories »*. Sans objet en pratique : un `git clone` ne demande
  aucune permission.
- **Pas de clé de service `capitalboard` en local** pour diagnostiquer Firestore
  (celle des Téléchargements appartient au projet `dashboard-pea`).
