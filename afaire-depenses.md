# Dépenses & abonnements — état des lieux et reprise

Dernière mise à jour : 12 août 2026. Version déployée à cette date : `20260814m`.

Ce fichier existe pour reprendre le sujet à froid, sans relire l'historique de
la conversation. Il couvre ce qui est livré, ce qui a été décidé et pourquoi, et
ce qui reste — y compris la piste de l'agrégation bancaire, dont la recherche
est faite et ne demande qu'à être exploitée.

---

## 1. Ce qui est livré

Quatre commits, tous poussés sur `main` :

| Commit | Contenu |
|---|---|
| `c4c3f80` | Module dépenses & abonnements, ouvrable en bêta |
| `808037b` | Logo du marchand et jour de prélèvement |
| `766a32c` | « Abonné depuis » et total déjà versé |
| `0fabda6` | Confirmation de suppression, avec la résiliation en sortie |

### Le module

Une seule liste pour deux natures : les opérations ponctuelles (un plein
d'essence) et les récurrentes (Netflix, le salaire). Revenus et dépenses dans la
même liste, distingués par `type`.

Écrans :

- **Bento de trois chiffres** — Reste à vivre en grande tuile (vert ou rouge,
  avec le taux d'épargne et la barre entrées/sorties), Revenus et Dépenses à côté
- **Abonnements & récurrents** — triés par coût mensuel lissé décroissant, avec
  le total sur douze mois ; les résiliés sont repliés sous « Résiliés (n) »
- **Opérations du mois** — filtrables par poste
- **Répartition** — barres par catégorie
- Navigation mois par mois ; le libellé passe en doré hors du mois courant

### Le modèle de données

`users/{uid}/data/depenses`, document unique, `{ items: [...] }`.

```js
{
  id,                    // 'd' + base36
  type: 'depense' | 'revenu',
  nom, montant, categorie,
  date,                  // date de l'opération, ou PREMIÈRE ÉCHÉANCE si récurrent
  recurrent: false,
  frequence: null,       // 'mensuel' | 'trimestriel' | 'annuel'
  jour: null,            // '1'..'31' | 'fin' — jour de prélèvement, récurrent seulement
  domaine: null,         // domaine du marchand, pour le logo
  dateFin: null,         // résiliation
  note: null,            // texte libre, 300 caractères max
}
```

**La saisie se fait par quatre onglets — Dépense · Abonnement · Revenu · Aide —
mais le modèle ne connaît que `type`, `recurrent` et `categorie`.** `DEP_TABS`
projette l'onglet dessus : abonnement = dépense récurrente, aide = revenu de
catégorie `aides`. `_depTabOf(e)` fait le chemin inverse à l'ouverture. Aucune
donnée supplémentaire, aucune migration.

La case « ça revient » ne subsiste que côté entrée — un salaire revient et pas
une prime, une APL revient et pas une prime de naissance. Elle est pré-cochée
sur l'onglet Aide, la plupart étant mensuelles. Côté sortie, c'est l'onglet qui
tranche.

**Le principe central : une récurrence est une RÈGLE, stockée une seule fois.**
Elle n'est jamais recopiée d'un mois sur l'autre — c'est l'affichage qui la
reprojette sur le mois consulté (`_depOccursIn`). L'historique est donc juste
sans aucune duplication, et corriger un montant corrige tous les mois d'un coup.

Un abonnement arrêté porte une `dateFin` : il cesse d'être compté après, sans
disparaître des mois qu'il a réellement coûtés. Le mois de la résiliation compte
— résilié le 20 mars, il a bien été prélevé en mars.

Document unique, comme le reste de l'app. Une entrée pèse ~130 octets, la limite
Firestore d'1 Mo laisse plusieurs milliers de lignes. **Si un import de masse
arrive un jour, passer à un document par année.**

### Le catalogue de marchands

109 entrées `{ nom, domaine, catégorie }` dans `DEP_MARCHANDS` (`js/app.js`).
Alimente les suggestions sous l'intitulé et la résolution du logo.

Le logo vient de `WORKER_URL + '/logo?domain='` — endpoint déjà en place sur le
Worker (`capital-board-worker/src/index.js`, cascade Clearbit → favicon gstatic,
CORS, cache 7 jours). **Rien à déployer côté serveur.**

Les 103 domaines uniques ont été testés un par un contre le Worker : tous
rendent une image. Seul `edf.fr` échouait, remplacé par `particulier.edf.fr`.

> **Choix délibéré :** le domaine n'est jamais deviné à partir d'un intitulé
> libre. « Plein d'essence » produirait `pleindessence.com` et une requête pour
> rien à chaque affichage.

### Le catalogue des aides

`DEP_AIDES` — 33 aides et prestations françaises `{ nom, domaine, organisme }`,
sur 11 domaines. Le logo est celui de **l'organisme qui verse** : une APL n'a pas
de marque propre, elle vient de la CAF. L'organisme est affiché dans la liste de
suggestions (« APL · CAF »), ce qui distingue mieux que la catégorie.

Le catalogue interrogé dépend de l'onglet (`_depCatalogue`) — proposer Netflix
sous « Aide » n'aurait aucun sens. Mais `_depMarchand()` cherche dans les deux :
une ligne « APL » saisie hors de l'onglet Aide retrouve quand même son logo.

Les 11 domaines ont été vérifiés contre le Worker. Deux échouaient :
`maprimerenov.gouv.fr` et `anah.fr`, remplacés par `france-renov.gouv.fr`.

### Les icônes de concept

`DEP_ICONES` (`js/app.js`) — 32 motifs `{ regex, paths SVG }` pour ce qui n'est
pas une marque : loyer, essence, électricité, assurance, crèche, péage, salaire…
Un loyer n'a pas de logo et n'en aura jamais ; deux initiales ne disaient rien.

La pastille suit donc trois niveaux, dans cet ordre : **logo du marchand** si le
catalogue le connaît, **icône de concept** si l'intitulé en évoque une, **initiales**
sinon. L'icône prend la couleur du poste.

L'ordre des motifs compte — le premier qui tombe gagne, donc les cas précis
passent avant les génériques : « assurance auto » doit donner un bouclier, pas
une voiture. `_depMots()` garde les espaces (contrairement à `_depNorm()`) pour
que les limites de mot `\b` des motifs veuillent dire quelque chose.

### Le total versé

`_depVersements(e)` renvoie `{ count, total }` : le nombre d'échéances réellement
passées et le cumul. Calculé, jamais stocké.

Le mois en cours ne compte que si le jour de prélèvement est passé — sinon on
annoncerait un versement qui n'a pas eu lieu. Une résiliation borne le décompte
à son propre mois.

Affiché dans la modale (bandeau doré, recalculé à chaque frappe) et sur chaque
ligne d'abonnement.

---

## 2. Le drapeau bêta

Troisième état ajouté aux feature flags, entre « masqué » et « ouvert à tous ».

**Bêta** = la section reste visible dans le menu pour tout le monde, mais seul
l'admin voit le module ; les membres continuent de voir le teaser « Bientôt ».

### Pour l'activer

Admin → éditeur d'organisation du menu → ligne **Dépenses & abonnements**.
L'interrupteur y est remplacé par trois crans : **Masqué · Bêta · Ouvert**.

### Comment c'est câblé

- État stocké dans `config/app.beta` = `{ depenses: true }`, **séparé de
  `features`** pour que couper une section n'efface pas son réglage bêta
- `BETA_CAPABLE = ['depenses']` — seules les pages portant réellement deux vues
  acceptent l'état bêta ; ailleurs il ne voudrait rien dire
- `_isModuleLive(key)` tranche : module si la section est ouverte, ou si elle est
  en bêta et que `isAdmin()`
- `#page-depenses` contient `#depenses-teaser` et `#depenses-app` ;
  `renderDepenses()` en montre un et cache l'autre
- `_applyBetaBadges()` réécrit le badge du menu : « Bêta » en doré pour l'admin,
  « Bientôt » sinon, masqué quand la section est publiée

> **Limite à connaître :** c'est un garde-fou d'affichage, pas une serrure. Un
> membre curieux peut atteindre le module depuis la console. Ses données restent
> les siennes (les règles Firestore n'ont pas bougé), mais ne comptez pas dessus
> pour cacher quoi que ce soit de confidentiel.

---

## 3. Où vivent les choses

| | Fichier |
|---|---|
| Module (données, rendu, saisie) | `js/app.js`, section « DÉPENSES & ABONNEMENTS », vers la fin |
| Drapeaux et bêta | `js/app.js`, section « Feature flags » (`FLAGGABLE`, `BETA_CAPABLE`) |
| Contrôle admin à trois crans | `js/app.js`, `adminSetFeatureState` / `_featureStateCtrl` |
| Teaser + module + modales | `pages/app.html`, `#page-depenses`, et les modales `#dep-confirm` / `#dep-modal` |
| Styles | `css/style.css`, bloc « DÉPENSES & ABONNEMENTS » en fin de fichier |
| Endpoint logo | `capital-board-worker/src/index.js`, `GET /logo` |

Rappel du **bump de version** : `APP_VERSION` dans `js/app.js`, les deux `?v=`
dans `pages/app.html` (JS **et** CSS), et `data/version.json`. Toujours repartir
de la valeur existante, jamais de la date du jour — le dépôt peut être daté en
avance, et le gate compare lexicographiquement.

---

## 4. Décisions prises, et pourquoi

**Une seule liste, deux natures.** Séparer dépenses et abonnements en deux
écrans obligeait à saisir au même endroit deux fois. La case « ça revient »
suffit à les distinguer.

**La récurrence est une règle, pas des occurrences.** Voir plus haut. C'est ce
qui rend l'historique juste et la correction globale.

**Résilier plutôt que supprimer.** Un récurrent supprimé disparaît aussi des mois
passés, ce qui n'est presque jamais voulu. La confirmation de suppression montre
ce qui se perd (« 19 mois, 256,31 € ») et propose la résiliation **comme une
action** : un bouton coche la récurrence, pré-remplit la date du jour et amène
sur le champ. Rien n'est écrit sans validation.

**Le taux d'épargne n'apparaît pas sans revenu saisi.** Un « 0 % » serait
trompeur ; on affiche l'invitation à saisir un revenu.

**Le coût est lissé au mois** pour les fréquences non mensuelles. Un annuel à
89 € pèse 7,42 €/mois — sans ça, il n'est comparable à rien.

**Les abonnements sont triés par coût annuel, pas mensuel.** C'est là qu'on
découvre que l'assurance à 89 €/an pèse moins que le café hebdomadaire.

---

## 5. Le sujet ouvert : arrêter la saisie manuelle

C'est la raison d'être de la suite. La saisie à la main est trop longue.

### 5.1 Ce qui existe déjà : SpendBoard

`C:\Users\Armel\Documents\SpendBoard` — dépôt privé `armelpltr/spendboard`.

Projet personnel qui fait **exactement** ce dont Capital Board a besoin, mais
pour un seul utilisateur :

```
Revolut ──(PSD2/AIS)──> Enable Banking ──> sync.mjs ──> Firestore
                                              ▲            │
                                       GitHub Actions      ▼
                                        (cron 06:00)   Cloudflare Pages
```

JWT RS256 signé maison, certificat déposé au Control Panel, repli CSV qui
produit le même schéma. Coût : 0 €. Dépôt propre — aucun secret dans
l'historique, vérifié sur toutes les branches.

**Le cœur est directement réutilisable** — du JS pur, sans dépendance à Node,
il tourne dans un Worker sans modification :

| Fichier | Ce qu'il apporte |
|---|---|
| `scripts/lib/normalize.mjs` | Schéma stable, id de dédoublonnage, signe explicite |
| `scripts/lib/categories.mjs` | Catégorisation MCC + libellé + règles apprises |
| `public/js/app.js`, `recurringGroups()` | **Détection d'abonnements par stabilité du montant** |
| `scripts/import-csv.mjs` | Ingestion d'un relevé, même schéma |

### 5.2 Les enseignements payés en vrai

Ces points ne se devinent pas, ils viennent de données réelles :

- **Revolut ne transmet aucun MCC.** Zéro sur 142 transactions. Le MCC ne peut
  pas être le socle de la catégorisation ; l'apprentissage par marchand doit
  l'être.
- **PSD2 sépare l'accès surveillé du non surveillé.** Le cron est plafonné à
  90 jours glissants ; l'historique long ne se capture que dans les minutes qui
  suivent l'authentification forte. D'où `out/raw.json`, seule copie de ce qui
  dépasse.
- **Les transactions `PEND` bougent** (pourboire, caution à la pompe). D'où une
  relecture de 30 jours à chaque sync, gratuite grâce au dédoublonnage par id.
- **`TOPUP` classé en revenu gonflait les totaux de 32 transactions.**
- **La récurrence se détecte sur la stabilité du montant, pas la répétition.**
  Amazon trois mois avec 180 % d'écart : des achats. Anthropic deux fois à
  21,60 € pile : une charge. Médiane + écart ≤ 25 %.
- **`merchantKey`** retire chiffres et ponctuation et garde trois mots :
  « Indigo0140017 » et « Indigo0298114 » sont le même parking.
- **Ne jamais laisser un secret atteindre un message d'erreur** — Node met le
  texte fautif dans `SyntaxError`, ce qui publierait la clé de service dans les
  logs GitHub, conservés.

### 5.3 État de la catégorisation

Sur les 108 transactions de `out/transactions.json` (15 mai → 6 août) :

| Source | Nombre |
|---|---|
| `rule` (libellé) | 41 |
| `type` | 37 |
| `default` → « autre » | **30** |
| `learned` / `manual` | **0** |

**La boucle d'apprentissage n'a jamais tourné.** Aucune correction manuelle n'a
été faite. Le README annonce que ~30 corrections suffisent à classer un an. C'est
une soirée de travail, et c'est le prochain geste évident sur SpendBoard.

### 5.4 Le mur : mono-utilisateur

SpendBoard est mono-utilisateur par construction — un `SPENDBOARD_UID`, une
session dans les secrets GitHub, un cron.

Et surtout : **Enable Banking « Restricted Production » ne couvre que les comptes
qu'on relie soi-même.** L'ouvrir aux membres demande la Production complète.

---

## 6. Recherche agrégation bancaire (faite le 12 août 2026)

### 6.1 Le paysage

| Fournisseur | Coût | Sert vos membres | Statut |
|---|---|---|---|
| **Import CSV** | 0 € | **Oui** | Disponible, rien à demander |
| Enable Banking, restricted | 0 € | **Non** — vous seul | En place sur SpendBoard |
| open-banking.io | 3 €/mois | **Non** — white-label interdit | Écarté |
| Enable Banking, production | à négocier | Oui | À demander |
| GoCardless Bank Account Data | — | — | **Fermé aux nouvelles inscriptions depuis juillet 2025** |

### 6.2 Les conclusions

**GoCardless (ex-Nordigen) est mort.** Fermé aux nouvelles inscriptions depuis
juillet 2025, en extinction, doc développeur fermée le 24 août 2026. C'était le
seul palier vraiment gratuit permettant de servir des tiers. Ne pas y revenir.

**Enable Banking est devenu la référence en libre-service en Europe.** Actual
Budget — l'app de budget open source — a ouvert une issue pour remplacer
GoCardless et conclut « Enable Banking, la seule option gratuite ». Le choix
initial était le bon.

**Il n'y a pas de gratuit, pour une raison structurelle :** le certificat
eIDAS / QWAC obligatoire coûte 3 000 à 8 000 € par an. Tout « gratuit » signifie
que quelqu'un d'autre le porte et se rattrape ailleurs — c'était le modèle
Nordigen, il vient de s'éteindre.

**open-banking.io est écarté, mais il apprend quelque chose.** C'est Tatic ApS,
société danoise (CVR 42532940), et leurs CGU disent que la connectivité est
fournie par **Enable Banking Oy**. C'est une surcouche, à 3 €/mois. Écarté parce
que leurs CGU interdisent explicitement de revendre ou de faire du white-label
sans accord écrit — exactement ce que Capital Board ferait.

> **Mais c'est la découverte utile :** une micro-société danoise sert des
> utilisateurs finaux sous la licence AISP d'Enable Banking, et revend à
> 3 €/mois. Donc (a) le modèle « servir vos membres sous leur licence » existe et
> est accessible à une très petite structure, et (b) le coût de gros ne peut pas
> être énorme — personne ne revend à 3 € ce qu'il paie 300 €. Le plancher de
> « 150–500 £/mois » cité ailleurs est probablement une grille entreprise, pas le
> seul tarif.

**Conséquence sur l'approche :** ne pas demander un devis entreprise à Enable
Banking, mais **un accord de partenariat pour servir des utilisateurs finaux sous
leur licence**, en sachant qu'ils le font déjà pour des structures de cette
taille.

### 6.3 Sources

- [GoCardless Bank Account Data — doc](https://developer.gocardless.com/bank-account-data/overview/)
- [Actual Budget #5505 — remplacer GoCardless par Enable Banking](https://github.com/actualbudget/actual/issues/5505)
- [Free & Indie Open Banking APIs 2026](https://www.openbankingtracker.com/guides/free-open-banking-apis)
- [Cheapest Open Banking APIs for Indie Builders 2026](https://dev.to/johnfrandsen/the-cheapest-open-banking-apis-for-small-businesses-and-indie-builders-in-2026-5cab)
- [CGU open-banking.io](https://open-banking.io/en/terms) · [banques couvertes](https://open-banking.io/en/banks)
- [Enable Banking sur G2](https://www.g2.com/products/enable-banking/pricing)

---

## 7. Ce qu'il reste à faire

### 7.1 Papiers

1. **Mail à Enable Banking.** Demander un partenariat pour servir des
   utilisateurs finaux sous leur licence AISP. Questions à poser :
   - Le modèle agent / TPP-as-a-service est-il ouvert à une petite structure ?
   - Tarif à faible volume — cible : moins de 50 comptes connectés la première année
   - **Qui porte l'enregistrement réglementaire ?** Nous enregistrez-vous comme
     agent auprès de la FIN-FSA avec passeportage vers la France, ou devons-nous
     une démarche propre auprès de l'ACPR ? *(Hypothèse à confirmer : Enable
     Banking étant finlandais, le passeport européen devrait couvrir la France
     sans dépôt direct à l'ACPR. À faire écrire noir sur blanc.)*
   - **Contractez-vous avec une entreprise individuelle** (micro-entreprise), ou
     exigez-vous une société ?
   - Délai entre signature et accès production

2. **Structure juridique.** AP Code, micro-entreprise, existe déjà. Deux réserves
   à lever : l'acceptation d'une EI par Enable Banking (question ci-dessus), et
   le plafond du régime micro (~77 700 € en prestations de services), qui peut
   arriver plus vite que prévu avec des membres payants.

3. **Documents à produire** — pendant que le contrat avance :
   - Écran de consentement explicite, granulaire, révocable
   - Politique de confidentialité réécrite : données, finalité, durée, et la
     liste des sous-traitants (Enable Banking, Google/Firebase, Cloudflare)
   - DPA signé avec Enable Banking
   - CGU mises à jour
   - Registre des traitements (RGPD art. 30)
   - AIPD — traitement à grande échelle de données bancaires, très probablement
     obligatoire
   - Parcours de suppression qui supprime vraiment, chez nous et chez eux

4. **RC professionnelle** — souvent exigée d'un agent.

### 7.2 Code

À faire **sans attendre le contrat** : architecture multi-membres, avec un seul
membre — vous — en Restricted Production. Légal, gratuit, et le jour de la
signature l'ouverture devient un changement de configuration, pas une réécriture.

1. **Déplacer l'autorisation sur le Worker.** Aujourd'hui : CLI +
   `https://localhost:8787/callback` + certificat auto-signé accepté à la main,
   impossible à demander à un membre. Demain : redirect hébergée
   `https://api.capitalboard.fr/bank/callback`, déclarée au Control Panel.

2. **Porter la signature JWT en Web Crypto.** `createSign('RSA-SHA256')` de
   `node:crypto` n'existe pas dans un Worker. Il faut
   `crypto.subtle.importKey('pkcs8', …)` puis `sign('RSASSA-PKCS1-v1_5')`. Une
   trentaine de lignes, sans piège.

3. **Stocker les sessions bancaires côté serveur.** Un `session_id`, ses
   `account_ids` et son `valid_until` par membre.

   > **Point de sécurité :** ces jetons lisent un compte en banque. Ils ne
   > doivent jamais être atteignables par le client. Firestore avec
   > `allow read: if false` fonctionne, mais les mettre en **KV ou D1 côté
   > Worker** est meilleur : les données lisibles par le membre et les clés de sa
   > banque ne partagent alors pas le même magasin, et une règle Firestore qui
   > déraperait un jour n'emporterait pas les accès bancaires. La clé privée
   > Enable Banking reste un secret du Worker, jamais dans le navigateur.

4. **Capturer l'historique dans le callback, en synchrone** — l'accès surveillé
   ne dure que quelques minutes après l'authentification forte. `auth.mjs` de
   SpendBoard le fait déjà correctement, c'est ce code qui migre.

5. **Cron par membre.** GitHub Actions itérant sur les membres depuis Firestore
   tient jusqu'à quelques centaines. Gratuit. Ne rien changer tant que ça suffit.

6. **Renouvellement à 90 jours.** Suivi d'échéance par membre, relance push ou
   email à J-14, parcours de re-consentement. SpendBoard a l'affichage J-14 ; il
   manque la relance et le parcours.

7. **Porter le cœur SpendBoard** — `normalize`, `categories`, détection de
   récurrence, dédoublonnage, PEND→BOOK, protection de
   `categorySource: 'manual'`.

8. **Consentement, révocation, suppression** côté interface. Se branche sur les
   documents du point 7.1.3.

### 7.3 Ordre

| Quand | Quoi | Bloque |
|---|---|---|
| Semaine 1 | Mail Enable Banking | Tout le volet papiers |
| Semaines 1-4 | Code, points 1 à 7, avec un seul membre | Rien |
| En attente | Contrat, DPA, enregistrement agent | L'ouverture aux membres |
| Après signature | Point 8, bascule en Production | — |

---

## 8. Désaccord consigné

Position de l'assistant, pour mémoire — la décision de passer outre a été prise
en connaissance de cause.

L'import CSV du relevé a été écarté. Il aurait réglé le même problème — plus de
saisie manuelle — pour 0 €, sans licence, sans contrat, sans secret bancaire
stocké, et pour **tous** les membres immédiatement. Et 90 % de son travail
(parsing, dédoublonnage, catégorisation, détection d'abonnements, écran de
validation) aurait servi tel quel derrière une agrégation ultérieure.

L'agrégation bancaire est la partie la plus chère, la plus réglementée et la plus
risquée du produit, et Capital Board est pré-lancement avec zéro membre sur ce
module.

L'architecture à un seul tenant (point 7.2) réduit fortement ce risque : elle
avance sans engager d'argent ni d'exposition juridique. Si le sujet est repris et
que l'attente devient longue, l'import CSV reste disponible à tout moment — le
code de SpendBoard (`scripts/import-csv.mjs`) est déjà écrit.

---

## 9. Questions en suspens

1. **Les catégories.** 7 côté Capital Board, 17 côté SpendBoard, deux listes qui
   divergeront. Il en faut une seule. Recommandation : celle de SpendBoard, plus
   fine et éprouvée sur des données réelles.
2. **Le catalogue de marchands en double.** 109 entrées côté Capital Board
   (nom → domaine), une liste fermée de regex côté SpendBoard. Même problème.
3. **Le chiffrement.** Le portefeuille est en clair dans Firestore. Un historique
   bancaire complet est plus intime qu'une ligne d'ETF. Même régime, ou
   chiffrement client sur ce module ?
4. **Capital Board devient-il un outil de budget**, ou reste-t-il un tracker de
   patrimoine avec une vue sur ce qui part ? Les deux se défendent, mais le
   premier est un second produit dans le premier.
5. **`a lire$.txt`** traîne à la racine de SpendBoard, vide et non suivi.
