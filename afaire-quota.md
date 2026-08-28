# Quota Firestore — rester sous le plafond du forfait Spark

Écrit après l'incident du 28 août 2026. À lire avant d'ajouter quoi que ce soit
qui écrive en base de façon répétée.

---

## Ce qui s'est passé

Le 28 août au soir, l'application est devenue inutilisable pendant plusieurs
heures. L'écran de déverrouillage refusait tous les codes :

```
Vérification indisponible — HTTP 500 (étape : compteur)
```

Le code était bon. Ce qui échouait, c'était l'écriture du compteur d'essais.
Firestore refusait **toute** écriture du projet : le quota quotidien du forfait
Spark était épuisé à 99,4 %.

```
8 RESOURCE_EXHAUSTED: Quota exceeded
```

Une jauge du panneau d'administration a donc fermé l'application à tout le
monde, propriétaire compris.

## Pourquoi c'était difficile à voir

Trois choses ont retardé le diagnostic d'une heure.

**Le refus ressemblait à un blocage.** Le client gRPC retente en silence pendant
dix minutes avant d'abandonner. Les journaux montraient
`DEADLINE_EXCEEDED after 340s`, ce qui évoque une machine saturée, pas un quota.
On a d'abord soupçonné la VM, puis le proxy d'interception.

**La lecture fonctionnait encore.** Le quota de lectures (50 000/jour) n'était
qu'à 45 %. Lire les documents répondait instantanément ; seule l'écriture ne
revenait jamais. C'est ce contraste qui a fini par trancher : ni le réseau, ni
la machine, ni les identifiants ne se comportent ainsi.

**L'erreur sortait au mauvais endroit.** Dans `/verify-pin`, la lecture du
secret est enveloppée dans un `try/catch` qui avale l'échec. Le premier appel
qui ne pardonne pas est l'incrément du compteur — d'où une erreur à l'étape
« compteur » alors que rien n'allait déjà plus en amont.

## Les chiffres du forfait Spark

Par jour, pour **tout le projet** :

| Opération | Plafond |
|---|---|
| Écritures | 20 000 |
| Lectures | 50 000 |
| Suppressions | 20 000 |

Remise à zéro à **minuit heure du Pacifique**, soit **9h00 à Paris**. Rien ne
la devance. Dépasser ne coûte pas d'argent : ça coupe le service.

**Le quota est partagé.** Un graphique d'administration, la présence des
membres, un audit automatisé et la connexion puisent au même seau. C'est ce qui
rend l'incident possible : le composant le moins critique peut faire tomber le
plus critique.

## D'où venaient les écritures

| Source | Cadence d'alors | Par jour |
|---|---|---|
| `vmstatus`, panneau ouvert | 1 s | **3 600 par heure** |
| `vmstatus`, au repos | 60 s | 1 440 |
| Présence, **par onglet ouvert** | 30 s | **2 880** |
| `ticketstats` | 60 s | 1 440 |
| Audit automatisé | par à-coups | quelques centaines |
| Classement | 6 h | négligeable |

Quatre heures de panneau d'administration ouvert suffisaient à consommer les
trois quarts du quota. Et la présence, elle, ne dépend d'aucun geste : elle
grandit avec le nombre de membres.

## Ce qui a été corrigé

| Correctif | Effet |
|---|---|
| `b48bad2` | `vmstatus` : 5 s au lieu d'1 s quand on regarde, 2 min au lieu d'1 min au repos |
| `b48bad2` | Un refus de quota fait taire `vmstatus` une demi-heure au lieu d'empiler des appels de dix minutes |
| `fcd43a1` | Présence : un battement toutes les 2 min au lieu de 30 s, fraîcheur portée à 5 min |
| `4684cfc` | Le compteur du code PIN retente une seconde fois avant d'abandonner |
| — | Présence : plus aucun battement quand l'onglet est en arrière-plan |
| — | `ticketstats` : 5 min au lieu d'1 min, soit 288 écritures/jour au lieu de 1 440 |
| — | Sentinelle `quota.js` : alerte Discord au premier refus, et mise en sommeil des écrivains non essentiels |

Coût après correction, à onglet ouvert : 720 écritures/heure pour le panneau
d'administration au lieu de 3 600, et 30 par onglet au lieu de 120.

## La règle à tenir

> **Toute écriture périodique se compte en écritures par jour, multipliée par le
> nombre d'utilisateurs.**

Un battement de 30 secondes paraît anodin. C'est 2 880 écritures par membre et
par jour. Vingt membres actifs, et le quota part sans que personne n'ait rien
demandé.

Avant d'ajouter un `setInterval` qui écrit, poser le calcul :

```
écritures/jour = (86400 / période_en_secondes) × nombre d'instances
```

Et se demander quelle part des 20 000 cela représente.

## Pourquoi on ne passe pas en Blaze

Décision prise le 28/08 : **on reste sur Spark**. Le plafond dur est donc une
contrainte de conception, pas un accident à contourner par la facturation. Tout
ce qui écrit doit tenir dans 20 000 par jour, marge comprise.

## La sentinelle

`discord-bot/src/lib/quota.js`. On ne peut pas lire la consommation réelle
depuis le bot : l'API de métriques demande des droits que la clé de service n'a
pas. La sentinelle travaille donc sur le seul signal fiable et gratuit
disponible — le refus lui-même.

**Signaler.** Le premier `RESOURCE_EXHAUSTED` de la journée part dans le salon
de sécurité, avec la mention du fondateur, l'heure exacte de la remise à zéro
et la marche à suivre. Les suivants sont tus : une coupure en produit des
centaines.

**Économiser.** Une fois le refus constaté, les écrivains non essentiels se
taisent jusqu'à la remise à zéro — `vmstatus` et `ticketstats` pour l'instant.
Insister ne sert à rien, et chaque tentative traîne dix minutes avant
d'abandonner, ce qui sature les journaux et retarde le reste.

Pour brancher un nouvel écrivain, deux lignes :

```js
if (quota.estEpuise()) return;                 // avant d'écrire
if (quota.signaler(client, e, 'monmodule')) return;  // dans le catch
```

## Ce n'est pas que le développeur qui consomme

Question posée le 28/08, et la réponse compte pour la suite : **chaque membre
connecté écrit.** Le client compte 39 endroits qui écrivent, répartis sur
`presence`, `users`, `roles`, `supportThreads`, `ideas`, `earningsSubscribers`
et quelques autres.

La présence est un plancher que personne ne peut éviter : 30 écritures par heure
d'onglet visible. S'y ajoutent les actions — une ligne de portefeuille modifiée,
une watchlist, un ticket, une idée, un vote.

Ordre de grandeur, pour un membre actif deux heures par jour :

| | |
|---|---|
| Présence | ~60 écritures |
| Ses actions | quelques dizaines |
| **Total** | **100 à 200 par jour et par membre** |

**Le plafond réel se situe donc autour de 100 à 200 membres actifs**, avant que
l'application ne se coupe d'elle-même, sans qu'aucun développement ne soit en
cours. À vérifier avant d'ouvrir les inscriptions largement.

Et le quota de **lectures** (50 000/jour) sera vraisemblablement atteint plus
tôt encore : un tableau de bord lit bien plus qu'il n'écrit. Le 28/08 il était
déjà à 45 % avec une poignée de comptes.

## Ce qui reste à faire

- [ ] **Une estimation préventive** : le bot projette la consommation du jour à
      partir des cadences connues et du nombre de comptes en ligne, et prévient
      au-delà de 70 %. La sentinelle est réactive ; ceci serait préventif.
- [ ] **Recompter les écritures du parcours d'audit** : appareils de confiance,
      positions créées puis supprimées, idées en attente. Chaque audit en laisse.
- [ ] **Brancher la sentinelle sur les écrivains restants** : `scan-patches`,
      `opsAlerts`, `burpUploads`, `leaderboard`.
- [ ] **Un écran d'indisponibilité digne de ce nom.** Aujourd'hui, quota épuisé,
      le membre voit « Vérification indisponible — HTTP 500 (étape : compteur) »
      sur le pavé numérique. Un code d'erreur et un nom d'étape interne : il ne
      comprend rien, réessaie, et consomme encore.

      Ce qu'il faut à la place : le client détecte l'échec d'écriture, affiche
      un écran plein — logo, « Capital Board est momentanément indisponible »,
      l'heure de retour, et rien à cliquer qui puisse aggraver la situation.
      Le CSS existe déjà pour la modale de verrou, il y a de quoi partir.

      Trois exigences. Ne pas laisser croire que le code saisi est faux. Ne pas
      inviter à réessayer en boucle. Dire quand ça revient, puisqu'on le sait —
      minuit heure du Pacifique, calculable côté client comme le fait
      `discord-bot/src/lib/quota.js`.

      À faire aussi en mobile : le pavé PIN et la modale ont leurs propres
      règles aux points de rupture, l'écran doit suivre.

## pm2 remplacé par systemd

Décidé le 28/08. pm2 n'écrit rien dans Firestore, il n'a donc aucun rapport avec
le quota — mais `PM2 God` et l'agent `PM2+` occupent une cinquantaine de
mégaoctets sur les 964 de la VM, pour un travail que systemd fait déjà.

L'unité vit dans `discord-bot/scripts/capitalboard-bot.service`. Service
*utilisateur* : pas de sudo au déploiement, et le processus tourne sous le
compte qui possède le clone et le `.env`.

Trois choses qu'elle apporte au passage :

- **`KillMode=mixed`** — SIGTERM au seul processus principal, qui a le temps de
  tuer le groupe de son parcours d'audit, puis SIGKILL au reste. C'est ce qui
  empêche un navigateur orphelin de survivre à un redémarrage, comme c'est
  arrivé quatre fois le 28/08 avec pm2.
- **`MemoryMax=400M`** — un bot qui fuit n'emporte pas la machine.
- **Pas de boucle de redémarrage** : cinq échecs en deux minutes et le service
  reste arrêté, pour qu'une erreur de configuration se voie.

Le journal passe de `~/.pm2/logs/*.log` à `journalctl --user -u
capitalboard-bot`. Les fonctions `audit`, `log`, `suivi` et `nolog` du
`.bashrc` sont à réécrire en conséquence.

## En cas de nouvelle coupure

1. Vérifier : console Firebase → *Usage et facturation* → **Quotas de projet**.
   Si les écritures sont à 100 %, c'est ça.
2. Fermer le panneau d'administration s'il est ouvert.
3. Arrêter les audits — chacun consomme, et chaque écriture refusée traîne dix
   minutes avant d'abandonner.
4. Attendre 9h00, heure de Paris. Rien d'autre ne débloque.
5. L'application n'est pas cassée et aucune donnée n'est perdue : seules les
   écritures sont refusées. La lecture continue de fonctionner.
