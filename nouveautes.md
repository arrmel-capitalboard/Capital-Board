# Nouveautés — comment elles sont écrites et publiées

À lire avant de toucher au sujet d'un commit, au script du matin ou au salon de
validation. Les règles ci-dessous valent aussi pour toute rédaction manuelle
(`/nouveaute`) : le lecteur est le même.

---

## Qui lit, et ce qu'il sait

Un membre du serveur. Il utilise l'application, il n'a jamais vu le code, il ne
sait pas ce qu'est un module, un anneau, un découpage ou une barre du bas — il
voit un graphique, un menu, une page. Il ne connaît pas les noms internes des
écrans, seulement ceux qui sont écrits à l'écran.

C'est la seule chose à garder en tête. Tout le reste en découle.

---

## Ce qui ne va pas dans un sujet de commit

Les sujets de ce dépôt sont écrits pour la personne qui code, et bien écrits
pour elle. Recopiés tels quels dans le salon, ils ne veulent rien dire :

| Sujet du commit | Ce que le membre comprend |
|---|---|
| Un anneau étiqueté, et des enveloppes qu'on peut sortir du total | rien — quel anneau, quelles enveloppes, quel total |
| La courbe se déplie aussi sous une position | rien — quelle courbe, dépliée par quoi |
| Le menu d'ordinateur se range à part de la barre du bas | rien — « se range » où, et pourquoi c'est mieux |
| Rétablir les vingt-sept fonctions emportées par le découpage | c'est un aveu de panne, pas une nouvelle |

Réécrits pour lui :

- Sur **Patrimoine**, le graphique nomme chaque enveloppe et vous pouvez en
  exclure du total
- Sur **Crypto**, la courbe d'une position se déplie d'un appui, comme sur le
  portefeuille
- Vous choisissez les quatre onglets du bas et la page qui s'ouvre au démarrage

---

## Les règles

1. **Dire OÙ et QUOI.** L'écran concerné, puis ce qui change pour la personne.
   Les écrans portent leur nom d'interface : Patrimoine, Mon PEA, Activité,
   Dividendes, Avantages, Watchlist, Benchmark, Projections, Calendrier des
   résultats, Récap du jour, Crypto, CTO, Assurance-vie, PER, Livrets,
   Immobilier, Or, Dépenses, Fiscalité, Actualités, Idées, Favoris, Support,
   Communauté, Notifications, Paramètres, Connexion.
2. **Vouvoiement**, français courant, une seule phrase, 60 à 140 caractères,
   sans point final, sans guillemets, sans emoji.
3. **Aucun jargon** : ni « commit », ni « CSS », ni « refactor », ni nom de
   fichier, ni nom de variable, ni anglais non traduit.
4. **Regrouper.** Cinq commits sur le même écran font une nouveauté, pas cinq.
5. **Quatre par jour au maximum.** Au-delà, ce n'est plus une nouvelle, c'est un
   journal de bord — et plus personne ne le lit.
6. **Ne jamais annoncer une panne réparée** que les membres n'ont pas connue.
   Un correctif ne devient une nouveauté que si le défaut était visible.

## Ce qui ne sort jamais du dépôt

Filtré par le script **avant** l'appel au modèle : ce qui n'est pas envoyé ne
peut pas ressortir dans une reformulation.

- **Chemins internes** : `discord-bot/`, `scripts/`, `.github/`,
  `firestore-tests/`, `firestore.rules`, `firestore.indexes.json`,
  `storage.rules`, `mockups/`, et les fichiers de racine (README, LICENSE,
  robots.txt, sitemap.xml, CNAME, ce fichier).
- **Portées internes**, quel que soit le fichier touché : `sécu`, `securite`,
  `admin`, `panel`, `rules`, `bot`, `ci`, `deps`, `infra`, `ops`, `test`,
  `scripts`.
- **Types sans effet visible** : `chore`, `docs`, `refactor`, `test`, `build`,
  `ci`, `revert`. Seuls `feat`, `fix`, `perf` et `style` sont lus.

Rien du panneau d'administration, rien de la sécurité, rien des outils
internes. Ce n'est pas une question de confidentialité seulement : un membre
n'a rien à faire d'une règle Firestore.

---

## Le circuit

```
   commits de la veille
        │
        │  tous les matins, 08h00 UTC (10h Paris l'été, 9h l'hiver)
        │  .github/workflows/nouveautes.yml
        ▼
   scripts/news-daily.mjs
        │  1. lit la journée entière (minuit → minuit, heure de Paris)
        │  2. écarte chemins, portées et types internes
        │  3. un seul appel au modèle pour toute la journée → regroupement
        │  4. écrit des entrées « pending » dans Firestore (newsQueue)
        ▼
   salon de validation (1528790209150324807)
        │  le bot poste un message par proposition
        │  Valider · Rejeter · Modifier le texte  (rôle fondateur)
        ▼
   lundi 18h — discord-bot/src/lib/newsweekly.js
        │  récap groupé des validées non envoyées
        ▼
   salon communautaire (1512909014990586047)
```

**Le texte reste modifiable** jusqu'à la publication du lundi : le bouton
« Modifier le texte » ouvre le texte proposé dans un champ, et le message de
validation se met à jour. Le sujet technique d'origine est affiché sous la
proposition pour juger la reformulation ; il n'est jamais envoyé aux membres.

Rejeter n'efface rien : l'entrée reste en base avec `status: 'rejected'` et
peut être revalidée tant qu'elle n'est pas partie.

---

## Rattraper une journée

Le workflow accepte une date : onglet Actions → *Nouveautés du jour* → *Run
workflow* → champ `jour` au format `AAAA-MM-JJ`. Les commits déjà en file sont
ignorés (contrôle sur le `sha`), donc une relance ne crée pas de doublon.

En local, pour voir ce qui serait retenu sans rien écrire :

```bash
cd scripts && JOUR_CIBLE=2026-09-01 node news-daily.mjs
```

(il faut `FIREBASE_SERVICE_ACCOUNT` et `MISTRAL_API_KEY` dans l'environnement
pour aller jusqu'à l'écriture ; sans `MISTRAL_API_KEY`, le script s'arrête après
le filtrage plutôt que de recopier des sujets de commit).

---

## Écrire un sujet de commit qui aide

Le script fait mieux quand le commit lui donne de quoi travailler. Le sujet
reste écrit pour l'équipe — ce n'est pas la peine de le rendre grand public —
mais le **corps** du commit est lu par le modèle : une phrase disant ce que la
personne voit change tout.

```
feat(patrimoine): un anneau étiqueté, et des enveloppes qu'on peut sortir du total

L'anneau porte le nom de chaque enveloppe au lieu d'une légende à côté, et une
enveloppe peut être décochée pour sortir du total affiché — utile quand on veut
voir son patrimoine hors immobilier.
```

Un commit qui ne doit rien produire : mettre sa portée dans la liste interne
(`fix(admin): …`), ou son type dans les types ignorés (`refactor: …`).
