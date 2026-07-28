# TODO — Capital Board

Prochains chantiers. L'état actuel a été vérifié dans le code, les points marqués
« à décider » attendent un arbitrage produit.

---




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

### 7.7 Terminer la configuration d'App Check

`initializeAppCheck()` tourne dans `js/app.js` avec la clé reCAPTCHA v3
`6LcrZwstAAAAAIOKXUFbgxO49SUoVmoQycZf3Ekq`, mais l'échange de token est refusé par
Google (`403`) : la console affiche `appCheck/throttled` et Firebase attend 24 h avant
de réessayer. La protection ne s'applique donc à rien aujourd'hui — l'app fonctionne
uniquement parce que l'enforcement est désactivé.

Enjeu : sans App Check, n'importe qui peut appeler Firestore avec la clé web publique,
depuis un script, hors du navigateur. À régler avant le lancement.

**1. Domaines de la clé reCAPTCHA** — https://www.google.com/recaptcha/admin
Sélectionner la clé `6LcrZwstAAAA…` → ⚙️ → **Domaines** doit contenir `capitalboard.fr`
et `localhost`. Vérifier que le type est bien reCAPTCHA **v3**.
Si la clé n'apparaît pas dans la liste, elle appartient à un autre compte Google : en
générer une nouvelle et remplacer la valeur dans `js/app.js`.

**2. Déclarer l'app** — https://console.firebase.google.com/project/capitalboard/appcheck
Onglet **Applications** → la web app → **reCAPTCHA v3** → coller la **clé secrète**
(pas la clé publique du code, qui est déjà en place) → enregistrer.

**3. Laisser l'enforcement désactivé** à ce stade. Onglet **APIs** : `Cloud Firestore`
et `Authentication` restent en « Non appliqué ». Les passer en « Appliqué » avant que
les tokens fonctionnent rejetterait toutes les requêtes des utilisateurs.

**4. Vérifier** — attendre l'expiration du blocage de 24 h (ou tester en fenêtre privée,
le compteur est local), recharger l'app : `appCheck/throttled` doit disparaître et le
compteur de requêtes vérifiées monter dans l'onglet **Applications**.

Depuis la console de l'app (`window.checkAppCheck`, posé dans `js/app.js`) :

```js
await checkAppCheck()
// OK  → { ok: true, jeton: "eyJhbGciOi…", longueur: 812 }
// KO  → { ok: false, code: "appCheck/…", raison: "…" }
```

`checkAppCheck is not defined` signifie que la page tourne sur une version antérieure :
vérifier avec `APP_VERSION`. `_appCheck === undefined` signifie que l'initialisation a
échoué au chargement — chercher une ligne `[appcheck]` dans la console.

État au 2026-07-29 : étapes 1 à 4 faites. `checkAppCheck()` renvoie
`{ ok: true, longueur: 944 }` sur capitalboard.fr — le jeton est délivré,
`appCheck/throttled` a disparu. Reste l'étape 5.

**5. Appliquer** — seulement une fois l'étape 4 concluante, et pas un jour de lancement :
passer `Cloud Firestore` puis `Authentication` en « Appliqué ».

Ne pas appliquer le jour même de l'étape 4 : les visiteurs qui tournent encore sur une
version en cache antérieure au 2026-07-29 n'envoient pas de jeton et seraient bloqués.
Attendre que l'onglet **APIs** de la console App Check montre des requêtes vérifiées et
plus de requêtes « non vérifiées » ni « clients obsolètes » sur 24 h glissantes.
Appliquer `Cloud Firestore` d'abord, vérifier que l'app fonctionne, puis `Authentication`
— jamais les deux d'un coup, sinon on ne sait pas lequel a cassé quoi.
Retour arrière : repasser en « Non appliqué », effet immédiat.

**Point de vigilance backend — levé le 2026-07-29.** Vérifié : tous les accès Firestore
hors navigateur passent par un compte de service, qui contourne App Check et les règles.
Rien à faire avant d'appliquer l'enforcement.

| Composant | Authentification |
|---|---|
| Bot Discord (`discord-bot/src/firebase.js`) | `firebase-admin` + compte de service |
| Worker Cloudflare (`capital-board-worker/src/index.js`) | JWT compte de service → OAuth → REST Firestore |
| Scripts (`daily-recap`, `price-alerts`, `earnings-notify`, `queue-feature`) | `firebase-admin` + compte de service |
| `firebase-messaging-sw.js` | réception FCM seule, ni Auth ni Firestore |

**Pages front — corrigé le 2026-07-29.** `pages/auth-action.html` et `pages/index.html`
initialisaient Firebase Auth sans App Check : appliquer l'enforcement `Authentication`
aurait cassé la vérification d'email et la réinitialisation de mot de passe
(`applyActionCode`, `verifyPasswordResetCode` sont des appels Identity Toolkit, rejetés
sans jeton). Les deux pages initialisent maintenant App Check avec la même clé que
`js/app.js`, en import dynamique + `catch` pour qu'un module bloqué ne casse pas la page.

Toute nouvelle page qui appelle Auth, Firestore ou Storage doit initialiser App Check
avant le premier appel, sinon elle cassera dès l'enforcement actif.

---

