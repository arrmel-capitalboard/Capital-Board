# TODO — Capital Board

Prochains chantiers. L'état actuel a été vérifié dans le code, les points marqués
« à décider » attendent un arbitrage produit.

---

## 1. Permissions salon Discord

**État** — Le bot (`discord-bot/`, discord.js v14) a déjà `link.js` / `unlink.js` :
l'utilisateur tape `/link`, un doc `discordLinkRequests/{token}` est créé, la webapp
confirme via le Worker qui écrit `discordLinks/{discordId} = {uid}` (js/app.js:441).
`role.js` et `embed-role.js` existent pour l'attribution de rôles.

**À faire** — Donner automatiquement un rôle Discord selon l'état du compte lié,
et donc l'accès aux salons réservés.

**À décider :**
- Quel critère ouvre quel salon ? (compte lié / email vérifié / futur statut premium)
- Attribution à la liaison seulement, ou re-synchronisation périodique ? Sans resync,
  un compte supprimé garde son rôle Discord.
- Que fait `/unlink` — retrait immédiat du rôle ?

---

## 2. Mot de passe oublié

**État** — La moitié aval existe déjà : `pages/auth-action.html` gère
`verifyPasswordResetCode` et `confirmPasswordReset` (le clic sur le lien reçu par mail).
Il n'y a **aucun appel à `sendPasswordResetEmail`** dans `js/app.js` — le lien qui
déclenche l'envoi n'existe nulle part.

**À faire** — Lien « Mot de passe oublié ? » sur l'écran de connexion → saisie de
l'email → `sendPasswordResetEmail` → écran de confirmation.

**Points d'attention :**
- Ne jamais révéler si l'email existe (message identique dans les deux cas).
- Comptes Google-only : pas de mot de passe à réinitialiser, prévoir le message.
- Vérifier le template d'email Firebase et que l'URL d'action pointe bien vers
  `auth-action.html`.

Chantier court — la partie compliquée est déjà écrite.

---

## 3. Changement de nom d'utilisateur + délai

**État** — Le username est fixé une seule fois, au setup (`name-setup-modal`,
js/app.js:1475) : regex `^[a-z0-9._-]{3,20}$` + `_isUsernameTaken()`. Aucun moyen
de le changer ensuite.

**À faire** — Permettre le changement depuis le profil, avec un délai entre deux
changements.

**À décider :**
- Durée du cooldown (30 jours ?) et message quand il est actif.
- Garde-t-on un historique des anciens pseudos ? (utile en modération)

**Point technique important** — l'unicité n'est vérifiée que **côté client**, et les
règles Firestore laissent chaque utilisateur écrire son propre `username`. Deux
personnes peuvent donc prendre le même pseudo, ou usurper celui d'un autre. La
correction propre est une collection `usernames/{username}` en création seule, qui
sert aussi à stocker la date du dernier changement pour le cooldown. À traiter en
même temps que ce chantier, sinon on empile de la dette.

---

## 4. Coin actualité

**État** — Rien n'existe.

**À faire** — Une section actualités financières dans l'app.

**À décider :**
- Source : flux RSS, API news (payante au-delà d'un quota), ou rédaction manuelle
  depuis le panel admin ?
- Généraliste, ou filtré sur les tickers du portefeuille de l'utilisateur ?
- Où : nouvelle entrée de menu, ou bloc sur la page Portefeuille ?
- Le cache passe par le Worker (`capital-board-worker/`) pour éviter d'exposer une
  clé d'API côté client et de flinguer le quota.

Le plus flou des six — à cadrer avant de coder quoi que ce soit.

---

## 5. Captures d'écran sur la landing page

**État** — `pages/index.html` n'a pas de visuel de l'app.

**À faire** — Screenshots de l'interface réelle sur la landing.

**Points d'attention :**
- Données de démo uniquement, jamais un vrai portefeuille (le mode `IS_DEMO` charge
  `data/demo-portfolio.json` — c'est la bonne source pour les captures).
- Poids des images : WebP + `loading="lazy"`, sinon le LCP mobile s'écroule.
- Prévoir la version mobile des captures, pas seulement le desktop.
- À refaire à chaque refonte visuelle — capturer plutôt 2-3 écrans forts que dix.

---

## 6. Propositions d'animations

**État** — Quelques transitions existent (sidebar, drawer mobile, barres de
projection). `@media (prefers-reduced-motion: reduce)` est déjà respecté à deux
endroits dans `css/style.css`.

**À faire** — Passe d'animations sur l'app.

**À décider** — le périmètre : micro-interactions (hover, états de boutons),
transitions entre pages, ou animations d'entrée des données (compteurs, graphiques) ?

**Points d'attention :**
- Continuer à couvrir `prefers-reduced-motion` sur tout ce qui est ajouté.
- Animer `transform` et `opacity` uniquement — animer `width`/`top`/`left` fait
  ramer les mobiles.
- Ne pas retarder l'affichage des chiffres : une animation de compteur sur des
  données financières rend la lecture plus lente, pas plus agréable.

---

## Ordre suggéré

1. **Mot de passe oublié** — court, la moitié est faite, et c'est un manque
   fonctionnel visible pour un utilisateur bloqué.
2. **Username + délai** — à faire avec la correction d'unicité, sinon la dette grossit.
3. **Screenshots landing** — sans dépendance technique, gain marketing immédiat.
4. **Permissions Discord** — dépend surtout de décisions produit.
5. **Animations** — cosmétique, à faire quand le reste est stable.
6. **Coin actualité** — le plus gros, et le seul à impliquer un coût récurrent
   potentiel (API). À cadrer avant de s'engager.
