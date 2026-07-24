#!/usr/bin/env node
// Vérifie, avant de les mettre dans FAVORIS_IG_HANDLES, quels comptes Instagram
// sont lisibles par `business_discovery`. Un compte perso ou age-gated ne sort
// rien : ce script le dit en une requête par handle, sans rien déployer.
//
//   node scripts/check-ig-handles.mjs zonebourse seqo.oia ...
//
// Variables d'environnement attendues :
//   IG_USER_ID      id du compte Instagram pro lié à notre Page Facebook
//   IG_GRAPH_TOKEN  jeton de Page (celui qui n'expire pas)

const VERSION = 'v25.0';
const { IG_USER_ID, IG_GRAPH_TOKEN } = process.env;
const handles = process.argv.slice(2).map(h => h.trim().replace(/^@/, '')).filter(Boolean);

if (!IG_USER_ID || !IG_GRAPH_TOKEN) {
  console.error('IG_USER_ID et IG_GRAPH_TOKEN doivent être définis dans l\'environnement.');
  process.exit(1);
}
if (!handles.length) {
  console.error('Usage : node scripts/check-ig-handles.mjs <handle> [handle...]');
  process.exit(1);
}

const ok = [];

for (const handle of handles) {
  const fields = `business_discovery.username(${handle})`
    + '{username,followers_count,media_count,media.limit(3){permalink,media_type,timestamp}}';
  const url = `https://graph.facebook.com/${VERSION}/${encodeURIComponent(IG_USER_ID)}`
    + `?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(IG_GRAPH_TOKEN)}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    const bd = data.business_discovery;
    if (bd) {
      const last = bd.media?.data?.[0];
      console.log(`OK    @${bd.username} — ${bd.media_count} publications, `
        + `${bd.followers_count} abonnés, dernière ${last ? last.timestamp : 'inconnue'}`);
      ok.push(handle);
    } else {
      const e = data.error || {};
      console.log(`KO    @${handle} — ${e.message || 'réponse vide'}`
        + (e.code ? ` (code ${e.code}${e.error_subcode ? '/' + e.error_subcode : ''})` : ''));
    }
  } catch (e) {
    console.log(`KO    @${handle} — ${e.message}`);
  }
}

console.log('\nÀ coller dans wrangler.toml :');
console.log(`FAVORIS_IG_HANDLES = "${ok.join(',')}"`);
