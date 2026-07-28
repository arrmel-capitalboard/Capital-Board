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

**5. Appliquer** — seulement une fois l'étape 4 concluante, et pas un jour de lancement :
passer `Cloud Firestore` puis `Authentication` en « Appliqué ».

**Point de vigilance** — le bot Discord et le Worker Cloudflare ne passent pas par
App Check. Vérifier s'ils écrivent dans Firestore avant d'appliquer l'enforcement,
sinon ils seront bloqués (un backend s'authentifie autrement, via compte de service).

---

