# Livrets & épargne — état des lieux et reprise

Dernière mise à jour : 13 août 2026.

> **Prochaine séance : le Livret A.** Tout ce qui suit a été construit et
> vérifié sur un **Livret Jeune au CIC**. Le Livret A est le cas le plus
> répandu, et celui par lequel la plupart des membres entreront. Détail à
> vérifier en priorité en tête de la section 6.

---

## 1. Ce qui est livré

Le module est **en bêta** : visible par l'admin seul, les membres voient encore
la page « Bientôt ». Pour l'ouvrir : Admin → éditeur de menu → *Livrets &
épargne* → cran **Ouvert**.

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

- `scripts/t-livrets.cjs` — 46 cas sur le calcul (quinzaines, taux, relevé)
- `scripts/t-import.cjs` — 163 cas sur les trois voies d'import, dont la fiche
  réelle du Livret A et le rejet des valeurs inventées par le modèle

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
| LEP | 10 000 € | 2,50 % | exonéré | oui |
| Livret Jeune | 1 600 € | 3,75 %\* | exonéré | oui |
| PEL | 61 200 € | au contrat | imposé | non |
| CEL | 15 300 € | au contrat | imposé | non |
| Livret bancaire | aucun | au contrat | imposé | non |

\* Le taux du Livret Jeune est fixé librement par chaque banque, avec pour seul
plancher légal celui du Livret A — `min: 'livretA'` refuse une saisie en
dessous. Les livrets à taux `null` exigent que le membre saisisse le sien.

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
- **L'IA lit les pixels, le code fait les chiffres.** Un modèle ne rend que du
  texte ; dates, signes et montants sont reconstruits par du code testé. Mesuré
  le 13/08 : `llava-1.5` a inventé « +225,65 € » sur une image qui n'en
  contenait aucun.

---

## 6. Ce qu'il reste à faire

### 6.1 Le Livret A — prochaine séance

Le module n'a jamais tourné que sur un Livret Jeune.

**Déjà traité le 13/08**, sur une vraie fiche de Livret A au CIC : le renvoi de
note en exposant qui se collait au montant (« Intérêts prévisionnels³ 0,00 EUR »
se lisait 30,00 €), et le taux lu qui écrasait le barème — une capture du
compartiment de dépassement affiche 0,30 % et aurait rémunéré le livret à ce
taux. Détail dans [`afaire-import.md`](afaire-import.md).

Points à reprendre :

1. **Le plafond et les intérêts capitalisés.** Un Livret A au plafond continue
   de produire des intérêts, et leur versement au 31 décembre peut porter le
   solde **au-dessus** de 22 950 €. C'est légal et fréquent. Or `livSave()`
   refuse un solde supérieur au plafond : sur un livret rempli, l'écriture du
   1<sup>er</sup> janvier sera **rejetée**. À corriger avant l'ouverture.
2. **La jauge de remplissage** affichera plus de 100 % dans ce cas. Décider
   quoi montrer : un dépassement assumé, ou un plafonnement visuel.
3. **Le « reste à verser »** doit devenir zéro, pas un nombre négatif.
4. **Un vrai export de Livret A** — idéalement d'une autre banque que le CIC,
   pour éprouver le parseur sur un second format. **C'est ce qui manque le
   plus** : les deux bugs du 13/08 étaient invisibles avant qu'une vraie fiche
   n'arrive.
5. **Le LEP** a une condition de revenu et un taux distinct ; vérifier que son
   barème est juste avant de le proposer.
6. **Deux livrets sur une même capture.** L'écran du CIC affiche le Livret A
   puis son compartiment de dépassement, chacun avec son solde, son taux et son
   plafond. Le premier bloc rencontré l'emporte, ce qui est juste quand les
   captures arrivent dans l'ordre — et faux si le membre n'envoie que la
   seconde. Aucun garde-fou aujourd'hui.

### 6.2 Ensuite

- **Ouvrir le module aux membres**, une fois 6.1 traité et le parcours exercé
  dans un navigateur.
- **Brancher l'import sur les Dépenses** — le socle est prêt, le module n'a qu'à
  fournir un `onValider`. Voir `afaire-import.md`, point 2.
- **`worker-src 'self'`** quand le CSP sera complété (`afaire.md`, point B) :
  pdf.js décode dans un worker.

---

## 7. Où vivent les choses

| | |
|---|---|
| Calcul et affichage | `js/app.js`, section « LIVRETS & ÉPARGNE » |
| Barème | `LIV_BAREME` dans `js/app.js`, surchargeable par `config/app.bareme` |
| Import (socle et trois voies) | `js/import.js` |
| Lecture des images | `POST /lire-releve` dans `capital-board-worker/src/index.js` |
| Écrans | `pages/app.html`, blocs `#livrets-teaser`, `#livrets-app`, `#liv-modal`, `#imp-modal` |
| Styles | `css/style.css`, sections livrets et import |
| Visite guidée | `STEPS_LIVRETS` dans `js/onboarding.js` |
| Tests | `scripts/t-livrets.cjs`, `scripts/t-import.cjs` |
