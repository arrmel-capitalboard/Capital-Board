# Livrets & épargne — état des lieux et reprise

Dernière mise à jour : 14 août 2026.

> **Le Livret A est traité.** Le modèle à deux compartiments est en place :
> le plafond est devenu une frontière de taux, le calcul par quinzaines répartit
> chaque euro entre les deux tranches, et la fiscalité suit la tranche et non
> plus le type de livret. Détail et reste à faire en section 6.1.
>
> Ce qui manque désormais, et que le code ne peut pas se donner tout seul :
> **un vrai export de Livret A d'une autre banque que le CIC**, et le parcours
> exercé dans un navigateur (section 3).

---

## 1. Ce qui est livré

Le module est **public** depuis le 16/08 : il est sorti de `BETA_CAPABLE`, le
cran *Bêta* a disparu de l'éditeur de menu, il ne reste que l'interrupteur
masqué / visible. `config/app.features` et `config/app.beta` sont vides en
base : rien à changer côté Firestore, l'ouverture a pris effet au déploiement.

Ce n'est plus la section qui est retenue mais **les types de livrets** : seuls
le **Livret A** et le **Livret Jeune** sont ouverts, les autres restent
affichés dans le formulaire avec une pastille « Bientôt », inertes
(`bientot: true` dans `LIV_BAREME`, `_livTypeOuvert`). Ouvrir un type = retirer
son drapeau, dans le code ou depuis `config/app.bareme`. Un livret déjà
enregistré d'un type fermé reste modifiable, sinon il deviendrait intouchable.

L'entrée de menu porte une pastille **« New »** jusqu'à la première ouverture
de la page (`NEW_SECTIONS`, `cb_sections_vues` en localStorage). C'est la
visite qui l'éteint, pas un délai : un badge qui expire au bout de quelques
jours n'est jamais vu par qui revient moins souvent.

La **visite guidée part toute seule au premier passage** sur la page
(`CBOnboarding.tourLivretsAuto`, drapeau `cb_tour_livrets_done`). Le drapeau
n'est posé qu'au lancement réel : le module est aussi rendu page masquée, et la
visite aurait été consommée sans être vue. Elle dit maintenant ce que devient
un fichier déposé — CSV et PDF lus sur l'appareil, capture d'écran envoyée à
une IA sur notre serveur, accord demandé avant, validation ligne à ligne.

### Rapporter une erreur

Un bouton dans l'en-tête ouvre une modale — texte obligatoire, capture
facultative. Le chemin :

```
client → doc dans `signalements` (Firestore)
       → capture déposée dans R2 via POST /support-upload (URL signée)
bot    → écoute la collection, poste l'embed dans le salon 1537760259203014766
       → marque le doc `posteLe` pour ne pas le reposter au redémarrage
```

Le Worker n'est pas sur le chemin : rien à déployer de ce côté, il ne fait que
ranger l'image, ce qu'il savait déjà faire pour le support. Firestore ne stocke
pas d'octets, d'où le détour par R2 — et Discord sait afficher une image par son
adresse.

Règles Firestore : `create` seul, par un membre vérifié, sous son propre uid.
Aucune lecture, pas même par l'auteur — une collection lisible deviendrait
l'annuaire des emails de tous ceux qui ont signalé quelque chose. Le bot passe
par le SDK admin, qui ignore ces règles.

> ⚠️ **Deux déploiements en attente** :
> - `firebase deploy --only firestore:rules` — sans ça, l'écriture est refusée
>   et le bouton affiche « Envoi impossible ».
> - le **bot** (`src/lib/signalements.js` + son démarrage dans `src/index.js`)
>   doit repartir sur la VM, sinon les signalements s'empilent sans être postés.
>   Rien n'est perdu : au redémarrage, le listener rattrape tous les docs sans
>   `posteLe`.

### Le calcul

Les intérêts d'un livret réglementé se comptent **par quinzaines**, pas au jour
le jour :

- un **versement** ne rapporte qu'à compter du 1<sup>er</sup> ou du 16 qui suit ;
- un **retrait** cesse de rapporter dès le 1<sup>er</sup> ou le 16 qui précède.

Le modèle a été confirmé par les **dates de valeur** du vrai export CIC : un
versement du 3 mars y prend valeur au 16 mars, un retrait du 27 février au
16 février. Notre `_livDebutQuinzaine` rend exactement les mêmes.

Le solde ne se saisit pas, il se déduit des mouvements. C'est ce qui permet de
placer chaque euro dans sa quinzaine.

### Les deux chiffres de la banque

`Intérêts à ce jour` et `Intérêts prévisionnels` sont **repris tels quels**
quand le membre les fournit, et l'affichage porte alors la mention *banque*.

Aucun modèle ne les reproduit au centime, et la preuve tient en une ligne :
`19,94 − 6,58 = 13,36`, alors que le plafond théorique est
`850 × 3,75 % × 10/24 = 13,28`. Le CIC dépasse sa propre borne, parce que ses
deux lignes ne reposent pas sur la même base — sa note d'écran le dit.

Ce que le code fait de ces deux chiffres :

| | Comportement |
|---|---|
| Acquis | Prolongé sur le capital réel de chaque quinzaine, chacune à son propre taux |
| Prévisionnel | Prolongé par la contribution des mouvements datés du relevé ou après |
| Relevé de l'an dernier | **Ignoré** — les intérêts ont été crédités le 31 décembre |

Les intérêts étant linéaires en le capital, un mouvement postérieur **s'ajoute**
au chiffre de la banque au lieu de l'invalider. Le membre n'a donc pas à
recopier son relevé à chaque versement : **une fois par an, en janvier**, suffit.

### L'import

Détaillé dans [`afaire-import.md`](afaire-import.md). En résumé : CSV, PDF et
captures d'écran, plusieurs fichiers à la fois, avec écran de validation ligne
à ligne. Le solde d'ouverture et les révisions de taux sont déduits du fichier.

Depuis le 13/08, **la fiche d'un livret est reconnue quelle que soit la
banque** : les libellés élargis d'abord, puis le modèle qui désigne les valeurs
dans sa propre transcription, et un contrôle mot pour mot qui jette ce qui n'y
figure pas. Un échec renvoie à la saisie manuelle au lieu d'un mur.

La **banque** est passée avant le bouton d'import dans la fiche, et n'est plus
facultative.

### Les tests

- `scripts/t-livrets.cjs` — 71 cas sur le calcul (quinzaines, taux, relevé,
  deux compartiments)
- `scripts/t-import.cjs` — 176 cas sur les trois voies d'import, dont la fiche
  réelle du Livret A, ses deux compartiments, et le rejet des valeurs inventées
  par le modèle

Les deux tournent en CI (`.github/workflows/checks.yml`).

---

## 2. Ce qui a été vérifié sur un vrai compte

Export CIC réel, 110 lignes :

```
108 opérations + 2 révisions de taux
solde d'ouverture déduit : 10,00 €
report + opérations = 850,00 €   ← le solde affiché par la banque
```

Le total sert de **contrôle**, pas d'addition : s'il tombe sur le solde de la
banque, c'est que les colonnes ont été comprises, que le sens des débits est le
bon et qu'aucune ligne n'a été perdue.

---

## 3. Ce qui n'a jamais été exercé

**Le parcours dans un navigateur, avec une vraie session.** Tout est couvert par
des tests sur les fonctions de calcul et de lecture, mais l'enchaînement des
écrans — fiche, import, rattrapage des colonnes, validation, consentement — n'a
été vérifié que par recoupement des identifiants HTML.

À faire avant d'ouvrir aux membres.

---

## 4. Le barème

`LIV_BAREME` dans `js/app.js`. Taux et plafonds en vigueur depuis le
1<sup>er</sup> août 2026, applicables jusqu'au 31 janvier 2027 :

| Livret | Plafond | Taux | Fiscalité | Unique |
|---|---|---|---|---|
| Livret A | 22 950 € | 1,70 % | exonéré | oui |
| LDDS | 12 000 € | 1,70 % | exonéré | oui |
| LEP\*\* | 10 000 € | 2,50 % | exonéré | oui |
| Livret Jeune | 1 600 € | 3,75 %\* | exonéré | oui |
| PEL | 61 200 € | au contrat | imposé | non |
| CEL | 15 300 € | au contrat | imposé | non |
| Livret bancaire | aucun | au contrat | imposé | non |

\* Le taux du Livret Jeune est fixé librement par chaque banque, avec pour seul
plancher légal celui du Livret A — `min: 'livretA'` refuse une saisie en
dessous. Les livrets à taux `null` exigent que le membre saisisse le sien.

\*\* Le LEP est soumis à une condition de revenu, vérifiée chaque année par la
banque : 23 028 € de revenu fiscal de référence pour une personne seule,
35 328 € pour un couple. Elle ne change rien au calcul, et se lit sous le champ
(`condition` dans le barème). Taux et plafond vérifiés le 14/08/2026.

Le plafond du barème est celui des **versements**. Le solde peut le dépasser,
par capitalisation ou par le compartiment de dépassement de la banque — voir
6.1.

**Le barème est surchargeable depuis Firestore** (`config/app.bareme`), sans
redéploiement — utile au 1<sup>er</sup> février et au 1<sup>er</sup> août, quand
les taux changent.

---

## 5. Décisions prises, et pourquoi

- **Le relevé prime sur le calcul.** Modéliser les conventions de chaque banque
  est une impasse ; les demander au membre coûte trois champs.
- **Le calcul reste, malgré tout.** Sans relevé, l'estimation doit tenir seule,
  et c'est elle qui reprend la main quand le relevé devient caduc.
- **Un mouvement daté du jour du relevé compte** dans le prévisionnel. Le cas
  est ambigu — la banque l'avait peut-être déjà — mais un chiffre figé ne
  signale rien, alors qu'un chiffre trop haut se voit et se corrige.
- **La fiscalité appartient à la tranche, pas au livret.** Un chiffre venu de
  la banque étant global, on lui applique la proportion imposée que le calcul
  sait établir : sans compartiment de dépassement, elle vaut 0 ou 1 et l'on
  retombe exactement sur le comportement d'avant.
- **L'IA lit les pixels, le code fait les chiffres.** Un modèle ne rend que du
  texte ; dates, signes et montants sont reconstruits par du code testé. Mesuré
  le 13/08 : `llava-1.5` a inventé « +225,65 € » sur une image qui n'en
  contenait aucun.

---

## 6. Ce qu'il reste à faire

### 6.1 Le Livret A — traité le 14/08

Le module n'avait jamais tourné que sur un Livret Jeune.

**Traité le 13/08**, sur une vraie fiche de Livret A au CIC : le renvoi de
note en exposant qui se collait au montant (« Intérêts prévisionnels³ 0,00 EUR »
se lisait 30,00 €), et le taux lu qui écrasait le barème — une capture du
compartiment de dépassement affiche 0,30 % et aurait rémunéré le livret à ce
taux. Détail dans [`afaire-import.md`](afaire-import.md).

**Traité le 14/08** — les sept points ci-dessous, sauf le n° 5 qui demande une
donnée qu'on n'a pas. Ce qui a changé :

| | |
|---|---|
| `surTaux` / `surPlafond` | saisis sur le livret, pas dans `LIV_BAREME` — le second étage est propre à chaque banque |
| `_livSur`, `_livTranches` | répartissent le capital entre les deux tranches |
| `_livInteretsQ2` | somme quinzaine par quinzaine, chaque tranche à son taux |
| `_livPartImposee` | fraction imposée des intérêts, appliquée aux chiffres de la banque, qu'on ne peut pas décomposer |
| `_livProjeteApres` | devenu une **différence de deux projections** : la rémunération dépend désormais de la tranche, un calcul mouvement par mouvement ne pouvait plus la donner |
| `livSave` | ne refuse plus un solde au-delà du plafond ; il valide le compartiment quand il est déclaré |
| `_livJaugeDuo` | jauge à deux tranches, le surplus sur sa propre échelle |
| `analyserFiche` | rend des **blocs**, un par compartiment, et `_livFicheEstSur` dit lequel est le réglementé |

Tests : 71 cas sur le calcul, 176 sur l'import.

#### Le point qui change le modèle : un Livret A a deux étages

Tout est écrit sur les deux captures du 13/08, renvois de notes compris. Un
Livret A au CIC est **un produit à deux compartiments** :

| Compartiment | Assiette | Taux | Fiscalité |
|---|---|---|---|
| LIVRET A SUP | jusqu'à 22 950 € | 1,70 % (réglementé) | exonéré |
| LIVRET SUP | de 22 950 € à 77 050 € | **0,30 %** (au contrat) | **imposé** |

22 950 + 77 050 = 100 000 € : le vrai plafond du produit.

Les trois renvois de notes de la fiche disent le reste, et deux d'entre eux
confirment des choix déjà faits ici :

> ¹ Livret réglementé, non fiscalisé **dans la limite du plafond
> réglementaire**. Au-delà, intérêts soumis à fiscalité selon la réglementation
> applicable.
>
> ² Pour les livrets réglementés, les intérêts sont exonérés de l'impôt sur le
> revenu et des prélèvements sociaux […]. **Le calcul des intérêts est effectué
> par quinzaines.**
>
> ³ **Calculés au 31/12 selon les caractéristiques actuelles du livret. Seront
> recalculés en cas d'apport, de retrait ou de changement de taux.**

La note ² confirme le calcul par quinzaines, déjà en place et vérifié sur les
dates de valeur. La note ³ confirme la façon dont le prévisionnel de la banque
est prolongé (section 1, « Les deux chiffres de la banque ») : il vaut pour un
livret qui ne bouge plus, et un mouvement postérieur s'y **ajoute** au lieu de
l'invalider. La banque le dit dans les mêmes termes.

Reste la note ¹, qui est celle qui coûte : la fiscalité n'est pas un attribut
du livret mais de la **tranche**.

Trois conséquences, et aucune n'est cosmétique :

- **Le plafond n'est pas un mur, c'est une frontière de taux.** Le solde le
  dépasse légitimement, et le surplus rapporte — moins, et imposé.
- **Un livret porte deux taux en même temps**, sur deux tranches de capital.
  C'est le calcul par quinzaines qu'il fallait ouvrir, pas seulement l'écran.
- **La fiscalité est partielle.** `fisc: false` sur le Livret A vaut jusqu'à
  22 950 € et cesse au-delà. Elle n'est plus un booléen par type mais une
  proportion, `_livPartImposee`.

**Tout le monde n'a pas ce second étage.** Ce n'est pas la loi, c'est un produit
maison : le CIC et le Crédit Mutuel logent le dépassement dans un « LIVRET SUP »
adossé au Livret A, d'autres banques refusent simplement le versement une fois
le plafond atteint. Ce qui est universel, en revanche, c'est le **dépassement
par capitalisation** : les intérêts crédités le 31 décembre passent au-dessus du
plafond chez tout le monde, sans qu'aucun compartiment n'existe. D'où deux
comportements distincts — sans `surTaux`, le surplus reste rémunéré au taux du
livret.

Le second étage est **propre à chaque banque** — son taux, son plafond, son
existence même. Il n'a donc pas sa place dans `LIV_BAREME`, qui porte la loi :
c'est un couple `surTaux` / `surPlafond` saisi sur le livret, sous « Au-delà du
plafond », et lu sur la fiche quand l'import la trouve.

Un surplus qui excéderait `surPlafond` reste rémunéré au taux du contrat, sans
écrêtage : une saisie trop haute donne un chiffre trop haut, qui se voit,
plutôt que des euros qui ne rapportent rien en silence.

Ce que la capitalisation impose par ailleurs reste vrai : un Livret A au
plafond continue de produire des intérêts, et leur versement au 31 décembre
porte le solde au-dessus de 22 950 € même sans compartiment de dépassement.

Points à reprendre :

1. ✅ **`livSave()` refusait un solde supérieur au plafond.** Le contrôle est
   supprimé : le plafond est une frontière de taux, pas un mur, et un Livret A
   plein le franchit dès le versement des intérêts du 31 décembre. Le
   dépassement est désormais affiché et expliqué, pas rejeté. Seul reste refusé
   ce qui dépasse le **plafond total** quand les deux sont connus.
2. ✅ **La jauge** montre les deux tranches : le réglementé plein en doré, puis
   le surplus sur l'échelle du compartiment quand son plafond est connu, sur
   celle du plafond réglementé sinon.
3. ✅ **Le « reste à verser »** porte sur le plafond du produit entier, et ne
   descend jamais sous zéro.
4. ✅ **Le calcul à deux taux** : à chaque quinzaine, la part sous 22 950 € au
   taux réglementé, le reste au taux du contrat, et le prélèvement forfaitaire
   sur la seule seconde part. Un chiffre venu de la banque, lui, est global : on
   lui applique la part imposée que le calcul établit.
5. ❌ **Un vrai export de Livret A** — idéalement d'une autre banque que le CIC,
   pour éprouver le parseur sur un second format. **C'est ce qui manque le
   plus, et rien dans le code ne peut y suppléer** : les deux bugs du 13/08
   étaient invisibles avant qu'une vraie fiche n'arrive.
6. ✅ **Le LEP** : barème vérifié le 14/08 — 2,50 % net du 1<sup>er</sup> août
   2026 au 31 janvier 2027, plafond de versement 10 000 €. La condition de
   revenu (23 028 € de RFR pour une personne seule, 35 328 € pour un couple)
   est désormais dite dans le formulaire, sous le champ.
7. ✅ **Deux compartiments sur une même capture.** `analyserFiche` découpe le
   texte en blocs — la coupure se fait sur une clé qui revient *avec une autre
   valeur* — et rend le second dans `fiche.sur`. Deux captures séparées sont
   recollées de même. Lequel est le réglementé se décide sur le barème
   (`_livFicheEstSur`) : d'abord le plafond, qui ne trompe pas, le taux
   seulement en repli et seulement de loin, jamais sur un livret à taux libre.

### 6.2 Ensuite

- ✅ **Ouvrir le module aux membres** — fait le 16/08. Le parcours navigateur
  (section 3) n'a toujours pas été exercé : c'est désormais un risque en
  production, et le bouton « Rapporter une erreur » est là pour ça.
- **Ouvrir les autres types** au fur et à mesure qu'un vrai relevé les éprouve :
  retirer leur `bientot`, un par un.
- **Brancher l'import sur les Dépenses** — le socle est prêt, le module n'a qu'à
  fournir un `onValider`. Voir `afaire-import.md`, point 2.
- **`worker-src 'self'`** quand le CSP sera complété (`afaire.md`, point B) :
  pdf.js décode dans un worker.

---

## 7. Où vivent les choses

| | |
|---|---|
| Calcul et affichage | `js/app.js`, section « LIVRETS & ÉPARGNE » |
| Signalement d'erreur | `livBug*` dans `js/app.js`, `discord-bot/src/lib/signalements.js` |
| Types ouverts | `bientot` dans `LIV_BAREME` + `_livTypeOuvert` (`js/app.js`) |
| Pastille « New » | `NEW_SECTIONS` + `_applyBetaBadges` (`js/app.js`) |
| Barème | `LIV_BAREME` dans `js/app.js`, surchargeable par `config/app.bareme` |
| Import (socle et trois voies) | `js/import.js` |
| Lecture des images | `POST /lire-releve` dans `capital-board-worker/src/index.js` |
| Écrans | `pages/app.html`, blocs `#livrets-teaser`, `#livrets-app`, `#liv-modal`, `#imp-modal` |
| Styles | `css/style.css`, sections livrets et import |
| Visite guidée | `STEPS_LIVRETS` dans `js/onboarding.js` |
| Tests | `scripts/t-livrets.cjs`, `scripts/t-import.cjs` |
