# Importer un relevé plutôt que tout retaper

Note de conception, 12 août 2026.

**État au 13 août 2026 : les trois voies sont livrées**, branchées sur les
livrets. Le socle vit dans `js/import.js`, la suite de tests dans
`scripts/t-import.cjs` (76 cas, en CI). Ce qui reste à faire est en fin de
document.

| Voie | État | Où |
|---|---|---|
| Relevé saisi | livré avant | fiche du livret, bloc « Relevé de la banque » |
| **CSV** | **livré** | `CBImport.csv` |
| **PDF** | **livré** | `CBImport.pdf`, pdf.js 6.2.108 hébergé chez nous |
| **Captures (OCR)** | **livré** | `CBImport.ocr`, tesseract.js + dictionnaire fr |
| Capture → modèle de vision | écarté | fait sortir le relevé de l'appareil |
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

### 3. Les captures d'écran, lues en local

`tesseract.js` fait de l'OCR dans le navigateur. Il faut embarquer le moteur et
le dictionnaire français — une dizaine de mégaoctets, chargés à la demande, une
seule fois.

Sur une capture de téléphone, propre et bien contrastée, la reconnaissance du
texte est correcte. **Sur les chiffres, elle ne l'est pas assez.** Un `8` lu `3`
ou un séparateur décimal manqué fausse un solde sans rien signaler.

Utilisable donc, mais **jamais sans écran de validation ligne à ligne**, avec
les montants pré-remplis et corrigeables. C'est-à-dire : on remplace la saisie
par de la relecture. Gain réel, mais moitié moindre qu'avec le PDF.

### 4. Capture envoyée à un modèle de vision

Un modèle multimodal lit une capture de relevé bien mieux qu'un OCR classique :
il comprend la structure du tableau, distingue débit et crédit, rattache une
opération à sa date même quand elle est portée par un en-tête de groupe.

Le Worker existe déjà et porterait l'appel, la clé restant côté serveur.

**Mais l'image part chez un tiers.** Ce n'est plus un détail technique : c'est un
relevé bancaire nominatif qui sort de l'appareil du membre. Cela impose un
consentement explicite et spécifique, une mention dans la politique de
confidentialité, un accord de sous-traitance, et une position claire sur la
non-conservation des images.

Le coût par image est faible. Le coût réel est réglementaire.

À réserver, si on y vient, au repli des formats non reconnus — et jamais par
défaut.

### 5. L'agrégation bancaire

Traitée dans [`afaire-depenses.md`](afaire-depenses.md), section 6. Le
raisonnement ne change pas : c'est la seule voie où le membre ne fait rien après
le premier branchement, et la seule qui soit payante et réglementée.

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

4. **Le relevé annuel donne-t-il le solde au 31 décembre ?** Toujours ouvert —
   à vérifier sur un vrai relevé annuel. C'est la ligne de report, celle qui
   manque le plus, et l'obtenir automatiquement supprimerait le dernier calcul
   à la main.

5. **Quelles banques d'abord ?** Il faut savoir où sont les comptes des
   membres. Une question dans le questionnaire d'accueil suffirait à trancher.

6. **`worker-src 'self'`** quand le CSP sera complété (`afaire.md`, point B) :
   pdf.js décode dans un worker, et tesseract.js aussi.
