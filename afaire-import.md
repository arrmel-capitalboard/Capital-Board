# Importer un relevé plutôt que tout retaper

Note de conception, 12 août 2026.

**État au 13 août 2026 : les trois voies sont livrées**, branchées sur les
livrets. Le socle vit dans `js/import.js`, la suite de tests dans
`scripts/t-import.cjs` (163 cas, en CI). Ce qui reste à faire est en fin de
document.

> **Séance du 13 août** — la lecture d'image ne dépend plus des libellés d'une
> banque : voir « Reconnaître une fiche sans connaître la banque » plus bas.
> Deux bugs trouvés sur une vraie fiche de Livret A y sont consignés.

| Voie | État | Où |
|---|---|---|
| Relevé saisi | livré avant | fiche du livret, bloc « Relevé de la banque » |
| **CSV** | **livré** | `CBImport.csv` |
| **PDF** | **livré** | `CBImport.pdf`, pdf.js 6.2.108 hébergé chez nous |
| **Captures → modèle de vision** | **livré** | `CBImport.ocr` + `POST /lire-releve`, Workers AI |
| ~~Captures (OCR local)~~ | remplacé | tesseract.js, 6,5 Mo, trop faible sur les chiffres |
| Agrégation bancaire | ailleurs | `afaire-depenses.md`, section 6 |

---

## Le problème, en un chiffre

Pour que les intérêts d'un seul Livret Jeune tombent juste, il faut saisir :

- le solde au 31 décembre de l'année précédente — 1 ligne
- les opérations de l'année — **47 lignes** sur le cas réel testé
- les révisions de taux — 2 lignes, au 1er février et au 1er août

Cinquante lignes pour un livret. Multiplié par un Livret A, un LDDS et un PEL,
personne ne le fera. Le calcul est juste depuis `c2a26c0` ; ce qui coûte, c'est
de le nourrir.

Le même mur attend le module Dépenses, où le volume est mensuel et non annuel.

---

## Ce qu'il faut vraiment

Moins qu'il n'y paraît. Les intérêts d'un livret ne dépendent que du **capital
présent à chaque quinzaine**, soit 24 valeurs par an au maximum — et en pratique
le solde ne bouge que quelques fois. Une liste d'opérations n'est qu'un moyen
d'y arriver, pas une fin.

Pour les dépenses, c'est l'inverse : chaque ligne compte pour elle-même, et le
volume est irréductible.

---

## Les cinq voies

| Voie | Effort membre | Exactitude | Coût | Données sortent ? |
|---|---|---|---|---|
| **Relevé saisi** *(fait)* | 30 s | exacte | 0 € | non |
| **PDF du relevé** | déposer un fichier | exacte | 0 € | non |
| **Captures d'écran** | photographier | à vérifier | 0 € | non |
| **Capture + modèle de vision** | photographier | bonne | par image | **oui** |
| **Agrégation bancaire** | une fois, puis rien | exacte | mensuel | oui |

### 1. Le relevé saisi — déjà en place

Deux champs et une date : les intérêts acquis et prévisionnels lus dans l'appli
de la banque. Exact par construction, aucun historique nécessaire.

C'est la réponse pragmatique et elle est livrée. Sa limite : elle donne le
résultat, pas la matière. Aucun graphique, aucune analyse, rien à recouper.

### 2. Le PDF du relevé — la meilleure piste

Toutes les banques françaises produisent un relevé mensuel et un relevé annuel
en PDF. Ce sont des PDF **texte**, pas des images : le contenu est déjà là, il
suffit de le lire.

`pdf.js` (Mozilla, MIT) tourne entièrement dans le navigateur et donne, via
`getTextContent()`, chaque fragment de texte avec sa position. Un relevé bancaire
est un tableau régulier : date, libellé, débit, crédit. Un jeu de motifs par
banque suffit, et la position en X distingue une colonne débit d'une colonne
crédit sans ambiguïté.

- **Le fichier ne quitte jamais le navigateur.** Rien n'est téléversé.
- **Zéro coût, zéro dépendance externe** une fois la bibliothèque embarquée.
- **Le relevé annuel donne le solde au 31 décembre** — exactement la ligne de
  report qui manque aujourd'hui.

Le travail réel : un adaptateur par banque, et un écran de validation.
Commencer par les trois ou quatre banques les plus représentées chez les
membres, avec un repli générique qui propose le rapprochement des colonnes à la
main quand le format n'est pas reconnu.

Angle mort : les relevés scannés, qui existent encore chez quelques réseaux. Ils
relèvent alors de la voie 3.

### 3. Les captures d'écran, lues en local — essayée, puis retirée

`tesseract.js` fait de l'OCR dans le navigateur. Livré le 13 août 2026, retiré
le jour même.

Sur une capture de téléphone, propre et bien contrastée, la reconnaissance du
texte est correcte. **Sur les chiffres, elle ne l'est pas assez.** Un `8` lu `3`
ou un séparateur décimal manqué fausse un solde sans rien signaler. Le moteur et
le dictionnaire français pesaient 6,5 Mo dans le dépôt, pour un résultat qu'il
fallait de toute façon relire ligne à ligne.

Le code reste dans l'historique (`e7c3a11`) si le besoin d'un mode entièrement
hors-ligne réapparaît.

### 4. Capture envoyée à un modèle de vision — c'est la voie retenue

Un modèle multimodal lit une capture de relevé bien mieux qu'un OCR classique.

**Cette note affirmait que « l'image part chez un tiers », et c'était faux dans
notre cas.** Le raisonnement visait un fournisseur externe — accord de
sous-traitance à négocier, nouveau destinataire à déclarer. Or le Worker tourne
déjà sur Cloudflare, avec le KV, R2 et l'assistant d'aide : **Workers AI n'ajoute
aucun sous-traitant.** Et sa
[documentation](https://developers.cloudflare.com/workers-ai/platform/data-usage/)
est explicite — les entrées ne servent ni à entraîner ses modèles ni à améliorer
ses services.

Ce qui restait dû a été fait : consentement explicite avant le premier envoi,
mention dans la politique de confidentialité, non-conservation garantie côté
Worker (ni R2, ni KV, ni Firestore, ni journal — le message d'erreur du modèle
n'est même pas propagé, il pourrait contenir un fragment de l'image).

**Le modèle ne rend que du texte.** La structuration — dates héritées d'un
en-tête de groupe, signes, montants — reste dans `analyserTexte()`, qui est
testée. Demander un JSON à un modèle reviendrait à le laisser inventer des
montants ; lui demander de lire des pixels, c'est ce qu'il fait le mieux.

Coût : palier gratuit de 10 000 Neurons par jour, puis 0,011 $ les 1 000. Une
capture pèse ~1 500 jetons d'entrée, soit de l'ordre de 0,0005 € l'image.

Reste par défaut le dernier recours : une image ne se lit bien que faute de
fichier.

### 5. L'agrégation bancaire

Traitée dans [`afaire-depenses.md`](afaire-depenses.md), section 6. Le
raisonnement ne change pas : c'est la seule voie où le membre ne fait rien après
le premier branchement, et la seule qui soit payante et réglementée.

---

## Reconnaître une fiche sans connaître la banque

Fait le 13 août 2026. C'était le vrai sujet : que **n'importe quelle banque**
marche, et non que le modèle marche.

### Le mur

La fiche d'un livret était reconnue par ses libellés, recopiés du CIC :
« Intérêts à ce jour », « Date de fin de validité ». Ailleurs, la même chose
s'appelle « intérêts courus », « rémunération servie », « échéance ». La liste
n'a pas de fin, et une banque absente échouait **en silence** : `analyserFiche`
rendait `null`, le texte partait dans `analyserTexte` qui n'y voyait rien, et
l'import avait l'air d'avoir marché.

Allonger la liste ne règle rien. Demander un JSON au modèle non plus : c'est
exactement ce que la note écarte plus haut, et pour de bonnes raisons.

### Ce qui a été fait — le modèle désigne, il ne produit pas

Trois étages, du moins cher au plus cher :

1. **Les libellés**, élargis aux formulations courantes. Gratuit, instantané,
   couvre le CIC et les banques qui parlent comme lui.
2. **Une deuxième passe**, seulement si la première n'a rien donné *et* que
   moins de trois opérations ont été trouvées. Le texte **déjà transcrit**
   repart au Worker — pas l'image, c'est dix fois moins cher — avec pour
   consigne de **recopier** les valeurs demandées, pas de les calculer.
   `POST /lire-releve`, en-tête `X-Etape: champs`.
3. **Le contrôle**, dans `ficheDepuisChamps()` : chaque valeur rendue est
   cherchée **mot pour mot** dans la transcription. Absente, elle est jetée.

Le troisième étage est le seul qui compte. Une valeur inventée n'est, par
définition, pas dans le texte transcrit — le cas llava du 13/08, « +225,65 € »
sur une image qui n'en portait aucun, est couvert par un test nommé. La seule
liberté qui reste au modèle est de désigner la mauvaise valeur, ce qui se voit
à l'écran de validation, contrairement à une valeur inventée.

La conversion en nombres n'a pas bougé : ce sont les mêmes regex que la voie
par libellés. **L'IA lit les pixels et pointe, le code fait les chiffres** —
la règle de `afaire-livrets.md`, section 5, tient toujours.

### Ce que la première vraie fiche a révélé

Deux captures d'un Livret A au CIC, le 13/08. Les deux bugs étaient invisibles
sans elles :

- **Le renvoi de note se collait au montant.** « Intérêts prévisionnels³ »
  revient aplati en `previsionnels3`, et ce 3 se recollait à la valeur
  suivante : `3 0,00 EUR` se lisait **30,00 €** là où la fiche affiche 0. Sur
  un livret qui rapporte vraiment, le chiffre aurait été faux et crédible.
- **Le taux lu écrasait le barème.** Le recopier en faisait un taux figé, qui
  n'aurait plus suivi les révisions du 1<sup>er</sup> février et du
  1<sup>er</sup> août. Pire : la deuxième capture montrait le **compartiment de
  dépassement** du Livret A, à 0,30 % — elle aurait rémunéré le livret à ce
  taux sans rien signaler. Le taux n'est désormais repris que là où le barème
  ne sait pas : PEL, CEL, livret bancaire, Livret Jeune.

Au passage, la valeur est découpée sur la ligne **normalisée** et non sur la
brute : `_norm` réduit les suites d'espaces, donc un index calculé sur l'une ne
vaut pas sur l'autre, et un tableau largement espacé coupait au milieu du
montant.

### La banque est devenue obligatoire

Dans la fiche du livret, elle passe **avant** le bouton d'import et n'est plus
facultative. Elle ne sert à rien aujourd'hui dans le parseur — la deuxième
passe se débrouille sans — mais elle est le préalable de tout adaptateur par
banque, et elle coûte trois secondes au membre.

### Et si rien n'est trouvé

Un échec n'est plus un cul-de-sac :

- lecture **partielle** — les deux montants que rien ne remplace (acquis,
  prévisionnel) sont **nommés quand ils manquent**, avec l'endroit où les
  recopier. Sans cela, une lecture partielle passe pour une lecture complète ;
- lecture **vide** — un bouton « Saisir à la main » referme l'import et rend le
  formulaire, intact. La seule issue visible était « Annuler », qui donne
  l'impression de perdre sa saisie.

---

## Recommandation, et ce qui a été fait

La note recommandait « le PDF, et rien d'autre pour commencer ». Trois voies ont
finalement été livrées ensemble, le 13 août 2026, dans cet ordre :

1. **Socle commun** — dépôt de fichier, extraction en lignes
   `{ d, m, label }`, écran de validation ligne à ligne. `js/import.js`.
2. **CSV** — la voie la plus simple, ajoutée en cours de route.
3. **Livrets** — sortie branchée sur les mouvements, bouton dans la fiche.
4. **PDF** — `pdf.js`, colonnes reconnues par leur position en X.
5. **OCR local** — `tesseract.js`, pour les banques qui n'exposent leur relevé
   que dans leur application mobile.

Reste : **Dépenses**, qui n'a qu'à fournir un `onValider` — mais dont la
catégorisation et la détection d'abonnements sont à reprendre de SpendBoard.

Le choix de l'endroit est tranché : **un bouton dans chaque module**, pas un
écran commun. Le socle est partagé, l'entrée ne l'est pas — « Importer un
relevé » à côté de « Versement » et « Retrait » se comprend sans explication.

---

## Le point qui ne se négocie pas

Un relevé bancaire est plus intime qu'une ligne d'ETF.

- **Le fichier est lu dans le navigateur et n'est jamais téléversé.** Ni sur le
  Worker, ni sur Firestore, ni ailleurs.
- **Seules les lignes validées par le membre sont écrites.** Le reste est
  oublié à la fermeture de l'onglet.
- **Le fichier d'origine n'est jamais conservé.** Aucune copie, aucun cache.
- Ces trois points sont **écrits sur l'écran d'import**, pas seulement dans les
  CGU. C'est ce qui fait accepter le dépôt d'un relevé.

La voie 4 rompt le premier point. C'est pour cela qu'elle est classée en dernier
et réservée au repli.

---

## Ce qui reste à faire

1. **Le CSV a été ajouté aux cinq voies.** Il n'était pas dans la première
   version de cette note, et il aurait dû l'être : il est plus simple que le
   PDF — aucune bibliothèque, un découpage et deux motifs — et toutes les
   banques françaises l'exportent depuis leur espace web. Il est désormais la
   voie recommandée, le PDF venant en second.

2. **Brancher la même sortie sur les Dépenses.** L'import rend
   `[{ d, m, label }]` et ne sait rien de sa destination : le module Dépenses
   n'a qu'à fournir un `onValider`. C'est le même travail fait une fois, comme
   annoncé — mais la catégorisation et la détection d'abonnements restent à
   écrire côté Dépenses.

3. **Adaptateurs PDF par banque.** L'analyse générique repère les colonnes
   Débit / Crédit / Montant / Solde par leur position en X, ce qui couvre la
   forme habituelle d'un relevé. Aucun adaptateur nommé n'est écrit : à faire
   quand un vrai PDF résiste, banque par banque, pas avant.

   **Prochaine séance.** Trois hypothèses de la voie image restent celles de
   l'application mobile du CIC, et ne valent que pour l'écran des **opérations**
   — la fiche, elle, est traitée. Dans `analyserTexte()` :

   - `RE_MONTANT` exige `€` ou `EUR` sur chaque montant. Une banque qui ne
     répète pas le symbole donne **zéro opération** ;
   - la date est attendue en **en-tête de groupe**, sur une ligne seule. Un
     relevé en tableau, date en début de ligne, date tout au jour même ;
   - le signe `+` / `-` est **obligatoire** pour connaître le sens. Deux
     colonnes Débit / Crédit, et tout devient versement.

   Moins urgent que la fiche : les opérations existent aussi en CSV, qui est
   déjà générique.

   **Ce qui manque vraiment : une capture d'une autre banque.** Tout a été
   éprouvé sur le CIC. Les deux bugs du 13/08 étaient invisibles avant qu'une
   vraie fiche n'arrive — il n'y a pas de raison que ce soit différent
   ailleurs.

4. ~~**Le relevé annuel donne-t-il le solde au 31 décembre ?**~~ **Résolu, et
   sans relevé annuel.** La colonne `Solde` d'un export ordinaire porte l'état
   après chaque opération : sur la ligne la plus ancienne,
   `solde − montant` donne ce qu'il y avait avant que le fichier commence.

   Le report n'est proposé que s'il se vérifie de bout en bout — en repartant
   de lui et en rejouant toutes les opérations, on doit retomber sur le solde
   de la ligne la plus récente. Un seul contrôle valide alors tout l'import :
   la colonne a été comprise, le sens des débits est le bon, aucune ligne n'a
   été perdue. Sur l'export CIC de test : 108 opérations + 10,00 € de report
   = 850,00 €, le solde affiché par la banque.

5. **Quelles banques d'abord ?** Il faut savoir où sont les comptes des
   membres. Une question dans le questionnaire d'accueil suffirait à trancher.

6. **`worker-src 'self'`** quand le CSP sera complété (`afaire.md`, point B) :
   pdf.js décode dans un worker, et tesseract.js aussi.
