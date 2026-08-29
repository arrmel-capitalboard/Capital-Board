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

Les quatre points ouverts ont été traités le 29/08. Ce qui suit dit ce qui a
été posé et ce qu'il faut savoir avant d'y toucher.

- [x] **Une estimation préventive** — `2d96e18`.
- [x] **Recompter les écritures du parcours d'audit** — mesuré, voir plus bas.
- [x] **Brancher la sentinelle sur les écrivains restants** — `e5fad94`.
- [x] **Un écran d'indisponibilité digne de ce nom** — `f53d7c6`.

---

# Fait le 29 août

## L'estimation préventive

La sentinelle ne parlait qu'une fois le quota épuisé, c'est-à-dire une fois
l'application fermée à tout le monde. Elle projette maintenant la journée
**chaque heure**, et prévient au-delà de **70 %** — une seule fois par jour,
dans le salon de sécurité, avec le détail par poste et ce qui fait baisser la
projection tout de suite.

Ce n'est pas une mesure : l'API de métriques Firestore demande des droits que la
clé de service n'a pas. C'est la somme de ce que chaque écrivain **déclare**,
plus la part des sessions lues dans `presence`.

```js
quota.declarer('compteur de tickets', 288);            // cadence fixe
quota.declarer('relevés VM', () => ecrites.parJour()); // cadence variable
```

### Le piège évité : la cadence instantanée ment

Projeter `86 400 000 / cadence` donnait 17 280 écritures dès qu'un panneau
d'administration s'ouvrait — alors qu'un panneau ouvert dix minutes n'en coûte
que cent vingt. Une alerte à chaque ouverture, donc plus aucune alerte lue.

`vmstatus` déclare donc **ce qu'il a réellement écrit dans la dernière heure**,
extrapolé sur vingt-quatre (`quota.compteurHoraire()`, réutilisable par tout
écrivain irrégulier). Vérifié :

| Situation | Projection | Alerte |
|---|---|---|
| Au repos, aucune session | 1 008 (5 %) | non |
| Panneau ouvert 10 min, 3 sessions | 5 328 (27 %) | non |
| Panneau ouvert 1 h pleine, 3 sessions | 19 728 (99 %) | **oui** |

L'alerte ne part que si le rythme dure. C'est la propriété qu'on cherchait.

### Ce qu'un nouvel écrivain doit faire

Trois lignes, dans cet ordre :

```js
if (quota.estEpuise()) return;                        // avant d'écrire, si non essentiel
quota.declarer('mon poste', 86_400_000 / CADENCE_MS); // au démarrage
if (quota.signaler(client, e, 'monmodule')) return;   // dans le catch
```

## La sentinelle branchée sur les écrivains restants

`scan-patches`, `opsAlerts`, `burpUploads` et `leaderboard` partaient dans le
vide une fois le quota épuisé, chaque tentative traînant dix minutes.

**La garde `estEpuise()` n'est posée que sur le classement.** C'est le seul qui
n'est essentiel à personne, et son calcul lit en plus le portefeuille de chaque
membre. Les autres gardent leurs écritures :

- `opsAlerts` et `burpUploads` : c'est `posteLe` / `messageId` qui empêche de
  reposter la même alerte au démarrage suivant. Se taire ferait **doublonner**,
  pas économiser.
- `scan-patches` : une décision du fondateur ne se rejoue pas plus tard.
  L'écriture est toujours tentée, et un échec se dit maintenant à l'écran avec
  l'heure de retour — sans quoi le bouton changeait d'état pendant que le
  document restait en attente.

**La règle qui s'en dégage** : `estEpuise()` en garde seulement pour ce qui ne
porte aucune décision. Partout ailleurs, `signaler()` dans le catch, et dire à
l'utilisateur que ça n'a pas été enregistré.

## L'écran d'indisponibilité

Le Worker distingue désormais un refus de quota d'une panne — Firestore répond
**429 `RESOURCE_EXHAUSTED`** — et `/verify-pin` renvoie `503` avec
`{ indisponible: 'quota' }` au lieu d'un `500` portant un nom d'étape interne.

Le client bascule alors sur `#unavailable-view`, qui tient les trois exigences
tirées de l'incident :

- **Le code saisi n'est pas mis en cause** — l'écran le dit explicitement.
- **Rien n'invite à réessayer.** Le bouton « Réessayer » reste caché tant que
  l'heure de remise à zéro n'est pas passée.
- **L'heure de retour est affichée**, avec un compte à rebours à la minute.

L'heure est **calculée, pas écrite en dur** : minuit heure du Pacifique, lu
depuis le fuseau `America/Los_Angeles`. Coder 9h00 serait faux la moitié de
l'année. Même logique que `discord-bot/src/lib/quota.js`, volontairement.

Habillage sobre, sans rouge d'alerte : rien n'est cassé et rien n'est perdu,
seules les écritures sont refusées. Règles mobiles posées en même temps que les
règles desktop, la carte se rétrécissant à 92vw sous 768 px.

**Reste non couvert** : seule la route `/verify-pin` distingue le quota. Les
autres routes du Worker renvoient toujours un 500 générique. C'est le bon ordre
de priorité — `/verify-pin` est celle qui ferme l'application — mais un membre
déjà entré qui tente d'écrire verra encore une erreur brute.

## Le parcours d'audit, recompté

Demandé après l'incident. Verdict : **ce n'est pas un poste de consommation.**

| Étape | Qui écrit | Écritures |
|---|---|---|
| Appareil de confiance semé | orchestrateur (VM) | 1 |
| `users/{uid}` — email au chargement de l'app | navigateur | 1 |
| Présence : ping initial, battements, `beforeunload` | navigateur | 3-4 |
| Gestes du scénario (watchlist, récap…) | navigateur | 0-4 |
| `burpUploads` créé | orchestrateur (VM) | 1 |
| `burpUploads` → `messageId` | bot | 1 |
| `burpUploads` → `encours` | workflow | 1 |
| `opsAlerts` ou `scanPatches` créé | workflow | 1 |
| Alerte → `posteLe` / `messageId` | bot | 1 |
| `burpUploads` → `traite` | workflow | 1 |
| Pièce jointe détachée | bot | 1 |

**Un run coûte 11 à 16 écritures.** Le cron quotidien d'un scénario : ~13 par
jour, soit 0,07 % du quota. Un lot de dix depuis le panneau : ~150, soit 0,8 %.

Les six parcours ajoutés le 29/08 (Benchmark, Projections, Patrimoine, Activité,
Actualités, page Admin) sont **tous en lecture**, précisément pour que cette
ligne ne bouge pas.

Ce qui coûte reste le panneau d'administration ouvert : 900 écritures par heure,
tout compris. C'est le seul poste capable de vider le quota à lui seul.

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
