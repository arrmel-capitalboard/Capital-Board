# Capital Board

Suivi de patrimoine pour épargnants français : PEA, livrets réglementés,
dépenses et abonnements, dans un seul tableau. Application web installable
(PWA), hébergée sur [capitalboard.fr](https://capitalboard.fr).

Dépôt public. Aucun secret n'y figure : les clés vivent dans les secrets
GitHub, les variables Cloudflare et le `.env` de la VM du bot.

## Comment c'est fait

| | |
|---|---|
| Interface | HTML, CSS et JavaScript sans framework, servis par GitHub Pages |
| Données | Firestore, règles de sécurité dans `firestore.rules` |
| Serveur | un Cloudflare Worker (`capital-board-worker/`) qui détient les secrets et arbitre l'authentification, le code PIN et la 2FA |
| Cours | Yahoo Finance, en lecture, avec cache côté Worker |
| Bot | Discord.js sur une VM GCP (`discord-bot/`) |

Le client n'est jamais un point de confiance : tout ce qu'il envoie est
revérifié par le Worker, et les règles Firestore forment la seconde ligne.

## Où sont les choses

```
pages/      les pages du site (index, app, pages d'authentification)
js/         l'application (app.js), l'import de relevés, l'accueil
css/        une feuille unique
data/       barèmes, contenus éditoriaux, version publiée
guides/     articles publics
legal/      CGU, mentions légales, confidentialité, sécurité
capital-board-worker/   le Worker Cloudflare
discord-bot/            le bot de la communauté
scripts/    tâches planifiées (dividendes, alertes, sauvegardes, récaps)
firestore-tests/        tests des règles Firestore contre l'émulateur
```

Les notes de conception vivent à la racine, en `afaire*.md` : elles disent
pourquoi les choix ont été faits, pas seulement ce que fait le code. Les
documents qui décrivent des faiblesses non corrigées ou des procédures d'accès
restent hors du dépôt, en local.

## Publier

Chaque poussée sur `main` déclenche le déploiement. Le site n'emporte que ce
dont il a besoin — les sources du Worker, du bot, les scripts et les notes ne
sont pas servis par le domaine.

Une modification de l'application demande de **bumper la version** :

```bash
node scripts/bump-version.mjs
```

Trois marqueurs doivent bouger ensemble (`APP_VERSION`, `data/version.json`, les
`?v=` de `pages/app.html`), sinon le contrôle de version côté client boucle sur
son écran de mise à jour. Le script s'en charge et refuse de reculer.

## Vérifications automatiques

`npm test` dans `discord-bot/`, les tests de règles Firestore, une relecture de
sécurité quotidienne et un cycle hebdomadaire. Leurs comptes rendus partent sur
un canal privé : sur un dépôt public, un rapport décrit une faille avant son
correctif.

## Licence

GNU AGPL v3 — voir [`LICENSE`](LICENSE).
