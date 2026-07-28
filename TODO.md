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

---

*7.7 App Check : terminé le 2026-07-29, voir RECAP.md.*
