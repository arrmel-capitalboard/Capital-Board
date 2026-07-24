#!/usr/bin/env node
// Fabrique les deux secrets nécessaires aux Contenus favoris via Graph API :
// IG_GRAPH_TOKEN (jeton de Page, qui n'expire pas) et IG_USER_ID (compte
// Instagram pro lié à la Page). Enchaîne les trois appels de la procédure Meta :
//   1. jeton utilisateur court (1 h) → jeton utilisateur long (60 j)
//   2. /me/accounts avec le jeton long → jeton de Page non expirant
//   3. /<page-id>?fields=instagram_business_account → id du compte Instagram
//
//   $env:FB_APP_ID="..."; $env:FB_APP_SECRET="..."; $env:FB_SHORT_TOKEN="..."
//   node scripts/ig-token.mjs
//
// Le jeton court se génère dans l'Explorateur de l'API Graph. Rien n'est écrit
// sur disque : les valeurs s'affichent, à poser ensuite en `wrangler secret put`.

const VERSION = 'v25.0';
const { FB_APP_ID, FB_APP_SECRET, FB_SHORT_TOKEN } = process.env;

if (!FB_APP_ID || !FB_APP_SECRET || !FB_SHORT_TOKEN) {
  console.error('Définir FB_APP_ID, FB_APP_SECRET et FB_SHORT_TOKEN dans l\'environnement.');
  process.exit(1);
}

async function graph(path, params) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`https://graph.facebook.com/${VERSION}/${path}?${qs}`);
  const data = await r.json();
  if (data.error) {
    const e = data.error;
    throw new Error(`${e.message} (code ${e.code}${e.error_subcode ? '/' + e.error_subcode : ''})`);
  }
  return data;
}

try {
  // 1. Le jeton de l'Explorateur meurt en 1 h ; l'échange donne 60 jours.
  const long = await graph('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: FB_APP_ID,
    client_secret: FB_APP_SECRET,
    fb_exchange_token: FB_SHORT_TOKEN,
  });

  // 2. Un jeton de Page dérivé d'un jeton utilisateur long n'expire pas.
  const accounts = await graph('me/accounts', {
    fields: 'name,id,access_token',
    access_token: long.access_token,
  });
  const pages = accounts.data || [];
  if (!pages.length) {
    console.error('Aucune Page renvoyée. Le compte doit être admin d\'une Page, '
      + 'et la Page doit avoir été cochée à l\'écran d\'autorisation.');
    process.exit(1);
  }

  for (const page of pages) {
    const info = await graph(page.id, {
      fields: 'instagram_business_account{id,username}',
      access_token: page.access_token,
    }).catch(e => ({ _err: e.message }));

    const ig = info.instagram_business_account;
    console.log(`\nPage « ${page.name} » (${page.id})`);
    if (ig) {
      console.log(`  Compte Instagram lié : @${ig.username}`);
      console.log(`  IG_USER_ID     = ${ig.id}`);
      console.log(`  IG_GRAPH_TOKEN = ${page.access_token}`);
    } else {
      console.log(`  Aucun compte Instagram pro lié${info._err ? ' — ' + info._err : ''}.`);
    }
  }

  console.log('\nPoser les secrets (depuis capital-board-worker/) :');
  console.log('  npx wrangler secret put IG_USER_ID');
  console.log('  npx wrangler secret put IG_GRAPH_TOKEN');
} catch (e) {
  console.error('Échec :', e.message);
  process.exit(1);
}
