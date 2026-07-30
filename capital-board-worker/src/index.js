// Capital Board — Cloudflare Worker
// Endpoints : POST /verify-pin | POST /request-otp | POST /verify-otp | GET /yahoo
//             | GET /news | POST /chat

import { KB } from './kb.js';

// ── Chatbot d'aide (POST /chat) ───────────────────────────────────────────
// Moteur : Cloudflare Workers AI (Llama, gratuit sous quota). Répond à partir
// de la base de connaissance KB (contenu public du site, généré par
// scripts/build-kb.mjs). Ne donne PAS de conseil financier personnalisé.
const CHAT_MODEL     = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const CHAT_MAX_CHARS = 1000;  // longueur max d'une question
const CHAT_RL_MAX    = 15;    // requêtes max par IP et par fenêtre
const CHAT_RL_WINDOW = 60;    // fenêtre rate-limit (s)

const CHAT_SYSTEM = `Tu es l'assistant d'aide de Capital Board, une application web française de suivi de portefeuille PEA.

RÈGLES STRICTES :
- Réponds UNIQUEMENT à partir des informations de la BASE DE CONNAISSANCE ci-dessous.
- Si l'information ne s'y trouve pas, N'INVENTE JAMAIS. Dis clairement que tu n'as pas la réponse, puis invite l'utilisateur à contacter l'équipe Capital Board par l'un de ces canaux : la page « Support » dans l'application, le serveur Discord (https://discord.gg/p73QMm4xDm), ou par e-mail à contact@capitalboard.fr. Formule-le poliment, par exemple : « Je n'ai pas cette information. Pour une réponse fiable, il est préférable de poser votre question à l'équipe via la page Support de l'application, sur notre Discord, ou par e-mail à contact@capitalboard.fr. »
- Vouvoie toujours l'utilisateur (vous, votre).
- Réponds en français, de façon concise et claire.
- Tu NE donnes JAMAIS de conseil en investissement personnalisé (quel titre acheter/vendre, allocation perso). Pour ces questions, rappelle : « Je fournis des informations éducatives, pas un conseil personnalisé. »
- Reste sur le sujet Capital Board, le PEA et l'investissement en bourse. Refuse poliment le hors-sujet.

BASE DE CONNAISSANCE :
${KB}`;

const CORS = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Hôtes Yahoo Finance autorisés pour /yahoo (évite l'open proxy).
const YAHOO_HOSTS = new Set([
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
]);

// ── Actualités marchés (RSS) ──────────────────────────────────────────────
// Flux fixes, agrégés côté serveur : pas de clé d'API, pas de quota, et le
// client ne parle jamais aux éditeurs. Liste volontairement centrée marchés —
// les rubriques « économie » généralistes noient la bourse sous du hors-sujet.
// Testés le 2026-07-21 ; Les Échos / Boursorama / ABC Bourse / Zonebourse
// répondent 403 ou 404 aux robots, inutile de les réessayer.
const NEWS_FEEDS = [
  { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EFCHI&region=FR&lang=fr-FR',     source: 'Yahoo Finance' },
  { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=FR&lang=fr-FR',     source: 'Yahoo Finance' },
  { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5ESTOXX50E&region=FR&lang=fr-FR', source: 'Yahoo Finance' },
  { url: 'https://www.latribune.fr/rss/rubriques/bourse.html',                                  source: 'La Tribune' },
];

const NEWS_TTL   = 900;   // KV : 15 min
const NEWS_MAX   = 30;    // items renvoyés
// Publicités glissées dans les flux Yahoo (InvestingPro & co).
const NEWS_SPAM  = /investingpro|% de r[ée]duction|code promo|offre sp[ée]ciale|profitez de|abonnez-vous|parrainage/i;

const NEWS_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', hellip: '…',
};

function newsDecode(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NEWS_ENTITIES[name.toLowerCase()] ?? m);
}

function newsClean(s) {
  return newsDecode(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function newsTag(block, name) {
  const m = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i'));
  if (!m) return '';
  return m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
}

function newsAttr(block, name, at) {
  const m = block.match(new RegExp('<' + name + '[^>]*\\b' + at + '="([^"]+)"', 'i'));
  return m ? newsDecode(m[1]) : '';
}

function parseNewsFeed(xml, source) {
  const out = [];
  for (const b of xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || []) {
    const title = newsClean(newsTag(b, 'title'));
    const link  = newsClean(newsTag(b, 'link'));
    if (!title || !link || NEWS_SPAM.test(title)) continue;
    const rawDesc = newsTag(b, 'description') + newsTag(b, 'content:encoded');
    let img = newsAttr(b, 'enclosure', 'url') || newsAttr(b, 'media:content', 'url') || newsAttr(b, 'media:thumbnail', 'url');
    // Les passerelles Instagram → RSS mettent la vignette dans le HTML de la
    // description plutôt que dans une balise dédiée.
    if (!img) {
      const m = rawDesc.match(/<img[^>]+src="([^"]+)"/i);
      if (m) img = newsDecode(m[1]);
    }
    if (!/^https:\/\//i.test(img)) img = '';
    let summary = newsClean(rawDesc);
    if (summary.length > 200) summary = summary.slice(0, 197).trimEnd() + '…';
    // dc:creator porte l'auteur réel : sur Instagram, une republication ou une
    // collaboration apparaît dans le flux d'un compte sans être de lui.
    const creator = newsClean(newsTag(b, 'dc:creator'));
    out.push({ title, link, source, creator, ts: Date.parse(newsTag(b, 'pubDate') || '') || 0, img, summary });
  }
  return out;
}

async function buildNews() {
  const lists = await Promise.all(NEWS_FEEDS.map(async f => {
    try {
      const r = await fetch(f.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(7000),
      });
      return r.ok ? parseNewsFeed(await r.text(), f.source) : [];
    } catch {
      return [];   // un flux mort ne doit pas casser la page
    }
  }));

  const seen = new Set();
  const items = lists.flat()
    .filter(i => {
      const k = i.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 70);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => b.ts - a.ts)
    .slice(0, NEWS_MAX);

  return { items, updatedAt: Date.now() };
}

// ── Contenus favoris (comptes suivis) ─────────────────────────────────────
// Instagram n'expose plus les posts d'un compte tiers : l'API Basic Display est
// fermée depuis le 04/12/2024 et le HTML public ne contient plus la grille. On
// consomme donc des flux RSS produits par une passerelle externe (RSS.app,
// FetchRSS…), configurés dans FAVORIS_FEEDS au format « Libellé|url », séparés
// par des virgules. Vide = section annoncée comme non configurée, pas d'erreur.
// KV : 15 min. Tenable seulement parce que le cron réchauffe le cache en fond
// (cf. scheduled()) : sans lui, ce TTL ferait payer les 9 appels Meta à un
// visiteur deux fois plus souvent.
const FAV_TTL = 900;
const FAV_MAX = 240;    // plafond global : doit rester > comptes suivis × FAV_PER_ACCOUNT,
                        // sinon les comptes les moins actifs disparaissent de la page
const FAV_PER_ACCOUNT = 12;   // plafond par compte : un compte bavard n'écrase pas les autres

function parseFavFeeds(raw) {
  return String(raw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const i = entry.indexOf('|');
      return i === -1
        ? { label: '', url: entry }
        : { label: entry.slice(0, i).trim(), url: entry.slice(i + 1).trim() };
    })
    .filter(f => /^https:\/\//i.test(f.url));
}

// Deuxième source : Graph API `business_discovery`. Les passerelles RSS
// gratuites plafonnent à 2 flux ; cet endpoint lit les publications de
// n'importe quel compte Instagram **professionnel** sans limite de nombre de
// comptes. Prérequis : IG_USER_ID (notre compte pro, lié à une Page Facebook)
// et IG_GRAPH_TOKEN (jeton de Page, qui n'expire pas) — tous deux en secrets.
// Un compte visé qui reste perso ou age-gated ne renvoie rien : l'erreur est
// isolée par compte pour ne pas vider la page.
const IG_GRAPH_VERSION = 'v25.0';

function parseFavHandles(raw) {
  return String(raw || '')
    .split(',')
    .map(s => s.trim().replace(/^@/, ''))
    .filter(h => /^[a-zA-Z0-9._]{1,40}$/.test(h));
}

function hasIgGraph(env) {
  return Boolean(env.IG_USER_ID && env.IG_GRAPH_TOKEN && parseFavHandles(env.FAVORIS_IG_HANDLES).length);
}

// Le même post arrive parfois par les deux sources : on déduplique sur le code
// du permalink, les query params des passerelles rendant l'URL brute inutilisable.
function favKey(link) {
  const m = String(link || '').match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : String(link || '');
}

async function fetchIgAccount(env, handle) {
  const fields =
    `business_discovery.username(${handle})` +
    `{username,profile_picture_url,media.limit(${FAV_PER_ACCOUNT})` +
    `{caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_url,thumbnail_url}}}`;
  const url = `https://graph.facebook.com/${IG_GRAPH_VERSION}/${encodeURIComponent(env.IG_USER_ID)}`
    + `?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(env.IG_GRAPH_TOKEN)}`;

  const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
  const data = await r.json().catch(() => null);
  const bd = data && data.business_discovery;
  if (!r.ok || !bd) {
    // Compte non pro, handle inconnu, ou jeton mort. On trace le message de Meta :
    // sans lui, une panne globale (jeton révoqué, version d'API retirée) est
    // indiscernable d'un compte repassé en perso, et la page part en `stale`.
    console.error('[fav] business_discovery KO', handle, r.status, JSON.stringify(data && data.error || null));
    return [];
  }

  const source = '@' + (bd.username || handle);
  // Photo de profil : portée par chaque item plutôt que par une structure à
  // part, pour que le rendu groupé par compte n'ait rien de plus à croiser.
  const avatar = /^https:\/\//i.test(bd.profile_picture_url || '') ? bd.profile_picture_url : '';
  return ((bd.media && bd.media.data) || []).map(m => {
    const caption = String(m.caption || '').replace(/\s+/g, ' ').trim();
    // Un carrousel n'a pas de media_url : la vignette vient du premier enfant.
    const child = (m.children && m.children.data && m.children.data[0]) || null;
    let img = m.media_type === 'VIDEO'
      ? (m.thumbnail_url || '')
      : (m.media_url || (child && (child.media_url || child.thumbnail_url)) || '');
    if (!/^https:\/\//i.test(img)) img = '';
    return {
      title:   caption ? (caption.length > 90 ? caption.slice(0, 87).trimEnd() + '…' : caption) : source,
      link:    m.permalink || '',
      source,
      avatar,
      creator: source,
      ts:      Date.parse(m.timestamp || '') || 0,
      img,
      summary: caption.length > 200 ? caption.slice(0, 197).trimEnd() + '…' : caption,
    };
  }).filter(i => i.link);
}

async function buildFavorisGraph(env) {
  if (!hasIgGraph(env)) return [];
  const lists = await Promise.all(
    parseFavHandles(env.FAVORIS_IG_HANDLES).map(h => fetchIgAccount(env, h).catch(() => []))
  );
  return lists.flat();
}

// Reconstruit les favoris et réécrit le KV. Partagé par la route et le cron :
// une seule définition de « ce qui est mis en cache », sinon les deux chemins
// finissent par diverger. `body` est null quand il n'y a rien à cacher (section
// non configurée, ou collecte vide → l'appelant décide du repli).
async function refreshFavoris(env) {
  const data = await buildFavoris(env);
  if (data.unconfigured || !data.items.length) return { data, body: null };
  const body = JSON.stringify(data);
  await env.EARNINGS.put('fav:v1', body, { expirationTtl: FAV_TTL });
  await env.EARNINGS.put('fav:last', body);
  return { data, body };
}

async function buildFavoris(env) {
  const feeds = parseFavFeeds(env.FAVORIS_FEEDS);
  if (!feeds.length && !hasIgGraph(env)) return { items: [], updatedAt: Date.now(), unconfigured: true };

  const graphP = buildFavorisGraph(env);   // lancé en parallèle des flux RSS

  const lists = await Promise.all(feeds.map(async f => {
    try {
      const r = await fetch(f.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(7000),
      });
      if (!r.ok) return [];
      const xml = await r.text();
      // À défaut de libellé configuré, on prend le <title> du flux.
      const label = f.label || newsClean(newsTag(xml.replace(/<item[\s\S]*$/i, ''), 'title')) || 'Instagram';
      // Chaque publication reste créditée au compte suivi, même quand dc:creator
      // désigne un partenaire : recréditer à l'auteur réel créait des rangées
      // parasites de 2 ou 3 items pour des comptes qu'on n'a pas choisi de suivre.
      // Un compte mérite sa rangée en entrant dans FAVORIS_IG_HANDLES, pas par
      // une collaboration.
      return parseNewsFeed(xml, label);
    } catch {
      return [];
    }
  }));

  // Graph d'abord : ses métadonnées sont propres (auteur, date, type de média),
  // donc c'est sa version qui gagne en cas de doublon avec un flux RSS.
  const graph = await graphP;

  const seen = new Set();
  const perAccount = new Map();
  const items = [...graph, ...lists.flat()]
    .filter(i => { const k = favKey(i.link); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.ts - a.ts)
    .filter(i => {
      const n = perAccount.get(i.source) || 0;
      if (n >= FAV_PER_ACCOUNT) return false;   // sinon un compte bavard mange la page
      perAccount.set(i.source, n + 1);
      return true;
    })
    .slice(0, FAV_MAX);

  return { items, updatedAt: Date.now() };
}

// ── Service account → access token ────────────────────────────────────────

function b64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function pemToBytes(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

async function makeServiceJWT(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/identitytoolkit',
  }));
  const sigInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'pkcs8', pemToBytes(sa.private_key).buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${sigInput}.${sigB64}`;
}

let _accessToken = null, _accessTokenExpiry = 0;

async function getAccessToken(env) {
  const now = Date.now() / 1000;
  if (_accessToken && _accessTokenExpiry > now + 120) return _accessToken;
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const jwt = await makeServiceJWT(sa);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Service account token error: ' + JSON.stringify(data));
  _accessToken = data.access_token;
  _accessTokenExpiry = now + (data.expires_in || 3600);
  return _accessToken;
}

// ── Firebase ID token verification (JWT direct, sans accounts:lookup) ────────

let _jwksCache = null, _jwksCacheAt = 0;

async function getGoogleJwks() {
  if (_jwksCache && Date.now() - _jwksCacheAt < 3600 * 1000) return _jwksCache;
  const res = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  _jwksCache = await res.json();
  _jwksCacheAt = Date.now();
  return _jwksCache;
}

function b64urlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '='));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function verifyIdToken(idToken, env) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Token malformé');

  const header  = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp < now)           throw new Error('Token expiré');
  if (payload.iat > now + 300)     throw new Error('Token émis dans le futur');
  if (payload.aud !== env.FIREBASE_PROJECT_ID) throw new Error('Token audience invalide');
  if (payload.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`) {
    throw new Error('Token émetteur invalide');
  }
  if (!payload.sub)                throw new Error('Token sub manquant');

  const jwks = await getGoogleJwks();
  const jwk  = jwks.keys?.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('Clé publique introuvable');

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const sigInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const sig      = b64urlDecode(parts[2]);
  const valid    = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, sigInput);
  if (!valid) throw new Error('Signature invalide');

  return {
    localId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
  };
}

// ── Firestore REST ─────────────────────────────────────────────────────────

async function firestoreGet(path, env) {
  const token = await getAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
  return res.json();
}

function fsStr(doc, field) {
  return doc.fields?.[field]?.stringValue ?? null;
}

function fsNum(doc, field) {
  const f = doc.fields?.[field];
  if (!f) return null;
  return Number(f.integerValue ?? f.doubleValue ?? NaN);
}

// Écrit (crée/écrase) un document. `fields` au format REST Firestore.
async function firestoreSet(path, fields, env) {
  const token = await getAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore set ${res.status}: ${await res.text()}`);
  return res.json();
}

// Met à jour uniquement les champs de `maskPaths` (updateMask) sans écraser le
// reste du document — contrairement à firestoreSet qui remplace tout.
async function firestoreUpdate(path, fields, maskPaths, env) {
  const token = await getAccessToken(env);
  const mask = (maskPaths || Object.keys(fields)).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}?${mask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore update ${res.status}: ${await res.text()}`);
  return res.json();
}

// Crée un document avec un id imposé. Retourne false si le doc existe déjà
// (HTTP 409) — sert de réservation atomique « création seule ».
async function firestoreCreate(collection, docId, fields, env) {
  const token = await getAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}?documentId=${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (res.status === 409) return false;
  if (!res.ok) throw new Error(`Firestore create ${res.status}: ${await res.text()}`);
  return true;
}

// Renvoie les uid des docs roles portant ce username (couvre les comptes
// existants qui n'ont pas encore de réservation dans usernames/).
async function rolesWithUsername(username, env) {
  const token = await getAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'roles' }],
        where: { fieldFilter: { field: { fieldPath: 'username' }, op: 'EQUAL', value: { stringValue: username } } },
        limit: 5,
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore runQuery ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  return rows.filter((r) => r.document).map((r) => r.document.name.split('/').pop());
}

async function firestoreDelete(path, env) {
  const token = await getAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok && res.status !== 404) throw new Error(`Firestore delete ${res.status}`);
}

// Incrémente un compteur côté serveur et renvoie la NOUVELLE valeur, en une
// seule opération atomique (fieldTransform Firestore).
//
// Indispensable pour compter des tentatives : un `lire puis écrire` laisse
// passer la force brute par requêtes parallèles, puisqu'elles lisent toutes la
// même valeur avant qu'aucune n'ait écrit. Ici chaque requête consomme un essai,
// quel que soit le parallélisme. Le document est créé s'il n'existe pas.
async function firestoreIncrement(path, field, env) {
  const token = await getAccessToken(env);
  const base = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const res = await fetch(`https://firestore.googleapis.com/v1/${base}:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [{
        transform: {
          document: `${base}/${path}`,
          fieldTransforms: [{ fieldPath: field, increment: { integerValue: '1' } }],
        },
      }],
    }),
  });
  if (!res.ok) throw new Error(`Firestore increment ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return Number(data.writeResults?.[0]?.transformResults?.[0]?.integerValue ?? 0);
}

// Déclare un appareil de confiance après vérification du code. Écrit par le
// Worker et non par le client : sinon il suffirait d'écrire soi-même dans
// users/{uid}/data/trustedDevices pour ne jamais voir la 2FA.
async function trustDevice(uid, deviceId, label, ipInfo, env) {
  const path = `users/${uid}/data/trustedDevices`;
  const now = Date.now();

  // Lit les appareils déjà connus, en purgeant les expirés au passage.
  let devices = {};
  try {
    const doc = await firestoreGet(path, env);
    const raw = doc.fields?.devices?.mapValue?.fields || {};
    for (const [id, v] of Object.entries(raw)) {
      const f = v.mapValue?.fields || {};
      const expiresAt = Number(f.expiresAt?.integerValue ?? 0);
      if (expiresAt > now) devices[id] = f;   // conservé au format REST
    }
  } catch (_) { /* document absent : premier appareil */ }

  const prev = devices[deviceId] || {};
  devices[deviceId] = {
    label:       { stringValue: String(label || 'Appareil inconnu').slice(0, 80) },
    firstSeen:   { integerValue: String(Number(prev.firstSeen?.integerValue ?? now)) },
    lastSeen:    { integerValue: String(now) },
    expiresAt:   { integerValue: String(now + DEVICE_TRUST_MS) },
    ip:          { stringValue: String(ipInfo?.ip || prev.ip?.stringValue || '') },
    city:        { stringValue: String(ipInfo?.city || prev.city?.stringValue || '') },
    region:      { stringValue: String(ipInfo?.region || prev.region?.stringValue || '') },
    country:     { stringValue: String(ipInfo?.country || prev.country?.stringValue || '') },
    countryCode: { stringValue: String(ipInfo?.countryCode || prev.countryCode?.stringValue || '') },
  };

  const fields = {};
  for (const [id, f] of Object.entries(devices)) fields[id] = { mapValue: { fields: f } };
  await firestoreUpdate(path, { devices: { mapValue: { fields } } }, ['devices'], env);
}

// Liste tous les documents d'une collection (paginé).
async function firestoreList(collection, env) {
  const token = await getAccessToken(env);
  const base = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}`;
  let docs = [], pageToken = '';
  do {
    const url = base + `?pageSize=300` + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Firestore list ${res.status}`);
    const data = await res.json();
    docs = docs.concat(data.documents || []);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

// Envoie une notif FCM (HTTP v1) à un token.
// IMPORTANT : message DATA-ONLY (pas de champ `notification`). Sur le web, un
// payload `notification` est auto-affiché par le navigateur ET re-affiché par
// le service worker (onBackgroundMessage) → notification en double/quadruple.
// En data-only, seul le service worker affiche → exactement une notification.
async function sendFcm(fcmToken, title, body, env) {
  const at = await getAccessToken(env);
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        data: { title: String(title || ''), body: String(body || ''), type: 'broadcast' },
        webpush: { headers: { Urgency: 'high' } },
      },
    }),
  });
  return res.ok;
}

// Liste tous les comptes Auth (Identity Toolkit, paginé) : { localId, email }.
async function listAuthUsers(env) {
  const at = await getAccessToken(env);
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:query`;
  let users = [], nextPageToken = '';
  do {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnUserInfo: true, limit: '500', nextPageToken: nextPageToken || undefined }),
    });
    if (!res.ok) throw new Error(`identitytoolkit ${res.status}: ${await res.text()}`);
    const data = await res.json();
    (data.userInfo || []).forEach(u => {
      if (!u.localId) return;
      users.push({
        localId:       u.localId,
        email:         u.email || '',
        emailVerified: !!u.emailVerified,
        createdAt:     Number(u.createdAt)   || 0,
        lastLoginAt:   Number(u.lastLoginAt) || 0,
      });
    });
    nextPageToken = data.nextPageToken || '';
  } while (nextPageToken);
  return users;
}

// Emails des comptes Auth (pour les diffusions).
async function listAuthEmails(env) {
  return (await listAuthUsers(env)).map(u => u.email).filter(Boolean);
}

// Supprime un compte Firebase Auth. Irréversible.
async function deleteAuthUser(uid, env) {
  const at = await getAccessToken(env);
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:delete`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: uid }),
  });
  if (!res.ok) throw new Error(`accounts:delete ${res.status}: ${await res.text()}`);
}

// Purge des inscriptions jamais confirmées. Un compte dont l'email n'est
// toujours pas vérifié 7 jours après sa création est supprimé — délai annoncé
// à l'inscription sur l'écran « Vérifiez votre email ». Un compte vérifié n'est
// jamais touché, quelle que soit son ancienneté ou sa dernière connexion.
const UNVERIFIED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function purgeUnverifiedAccounts(env) {
  const users  = await listAuthUsers(env);
  const cutoff = Date.now() - UNVERIFIED_TTL_MS;
  let purged = 0;
  for (const u of users) {
    if (u.emailVerified) continue;                 // vérifié → intouchable
    if (u.localId === env.ADMIN_UID) continue;     // jamais l'admin
    if (!u.createdAt || u.createdAt > cutoff) continue; // date inconnue → on garde
    try {
      await deleteAuthUser(u.localId, env);
      // Best-effort : ces comptes n'ont normalement aucun doc (ils ne sont
      // jamais entrés dans l'app), mais on nettoie au cas où.
      for (const path of [`roles/${u.localId}`, `presence/${u.localId}`, `supportThreads/${u.localId}`]) {
        try { await firestoreDelete(path, env); } catch (_) {}
      }
      purged++;
      console.log(`purge non vérifié: ${u.localId} (${u.email})`);
    } catch (e) {
      console.error(`purge ${u.localId}: ${e.message}`);
    }
  }
  return purged;
}

// Génère un mot de passe temporaire lisible (sans caractères ambigus), avec au
// moins une majuscule, une minuscule et un chiffre. 10 caractères.
function genTempPassword() {
  const U = 'ABCDEFGHJKMNPQRSTUVWXYZ', L = 'abcdefghijkmnpqrstuvwxyz', D = '23456789';
  const all = U + L + D;
  const r = new Uint32Array(16); crypto.getRandomValues(r);
  const pick = (set, i) => set[r[i] % set.length];
  const p = [pick(U, 0), pick(L, 1), pick(D, 2)];
  for (let i = 3; i < 10; i++) p.push(pick(all, i));
  for (let i = p.length - 1; i > 0; i--) { const j = r[10 + i % 6] % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  return p.join('');
}

// Définit le mot de passe d'un compte Auth via l'API Admin Identity Toolkit.
async function setAuthPassword(localId, password, env) {
  const at = await getAccessToken(env);
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:update`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId, password }),
  });
  if (!res.ok) throw new Error(`identitytoolkit update ${res.status}: ${await res.text()}`);
  return res.json();
}

// Envoie `subject`/`html` à tous les comptes Auth. Retourne {sent, failed, total}.
async function broadcastEmailToAll(subject, html, env) {
  const emails = await listAuthEmails(env);
  let sent = 0, failed = 0;
  for (const e of emails) { try { await sendEmail(e, subject, html, env); sent++; } catch (_) { failed++; } }
  return { sent, failed, total: emails.length };
}

// ── SHA-256 ────────────────────────────────────────────────────────────────

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Templates email (HTML) ─────────────────────────────────────────────────

const CSS_BASE = `
  body{font-family:sans-serif;background:#0f0f13;color:#e8eaf0;margin:0;padding:40px 20px}
  .card{max-width:480px;margin:0 auto;background:#1a1a24;border-radius:16px;padding:40px;border:1px solid #2a2a3a}
  .logo{font-size:20px;font-weight:700;color:#7c6df5;margin-bottom:32px}
  h2{margin:0 0 16px;font-size:22px;color:#e8eaf0}
  p{margin:0 0 16px;color:#8892a8;line-height:1.6;font-size:15px}
  .code{font-size:36px;font-weight:700;letter-spacing:12px;color:#7c6df5;text-align:center;
    background:#12121c;border-radius:12px;padding:20px;margin:24px 0;font-family:monospace}
  .info{background:#12121c;border-radius:10px;padding:16px;margin:16px 0;font-size:13px;color:#8892a8}
  .info span{display:block;margin:4px 0}
  .warn{color:#ff4d6a;font-size:13px;margin-top:16px}
  .footer{margin-top:32px;color:#4a5266;font-size:12px;text-align:center}
`;

// escapeHtml sur le code : meme genere par le serveur, on n'interpole jamais
// une valeur brute dans du HTML d'email.
function emailDelete(code) {
  code = escapeHtml(code);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>${CSS_BASE}</style></head><body>
<div class="card">
  <div class="logo">Capital Board</div>
  <h2>Suppression de votre compte</h2>
  <p>Vous avez demandé la suppression définitive de votre compte. Saisissez ce code pour confirmer :</p>
  <div class="code">${code}</div>
  <p>Ce code est valable <strong>10 minutes</strong>.</p>
  <p class="warn">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre compte est en sécurité.</p>
  <div class="footer">Capital Board · Ne pas répondre à cet email.</div>
</div></body></html>`;
}

function email2fa(code, deviceLabel, location) {
  // deviceLabel et location viennent du navigateur : toujours echappes.
  code = escapeHtml(code);
  deviceLabel = escapeHtml(deviceLabel);
  location = escapeHtml(location);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>${CSS_BASE}</style></head><body>
<div class="card">
  <div class="logo">Capital Board</div>
  <h2>Connexion depuis un nouvel appareil</h2>
  <p>Une connexion a été détectée depuis un appareil non reconnu. Saisissez ce code pour valider l'accès :</p>
  <div class="code">${code}</div>
  <div class="info">
    <span>Appareil : <strong style="color:#e8eaf0">${deviceLabel || 'Inconnu'}</strong></span>
    <span>Lieu : <strong style="color:#e8eaf0">${location || 'Inconnu'}</strong></span>
  </div>
  <p>Ce code est valable <strong>10 minutes</strong>.</p>
  <p class="warn">Si vous n'êtes pas à l'origine de cette connexion, changez immédiatement votre mot de passe.</p>
  <div class="footer">Capital Board · Ne pas répondre à cet email.</div>
</div></body></html>`;
}

function emailPasswordReset(link) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>${CSS_BASE}
  .btn{display:inline-block;background:#7c6df5;color:#ffffff !important;text-decoration:none;
    font-weight:700;font-size:15px;padding:15px 30px;border-radius:10px;margin:8px 0 8px}
  .link-fallback{word-break:break-all;font-size:12px;color:#5a6178;margin-top:20px}
  </style></head><body>
<div class="card">
  <div class="logo">Capital Board</div>
  <h2>Réinitialisation de votre mot de passe</h2>
  <p>Vous avez demandé à réinitialiser le mot de passe de votre compte Capital Board. Cliquez sur le bouton ci-dessous pour en définir un nouveau :</p>
  <p style="text-align:center;margin:24px 0"><a class="btn" href="${link}">Choisir un nouveau mot de passe</a></p>
  <p>Ce lien est valable <strong>1 heure</strong> et ne peut être utilisé qu'une seule fois.</p>
  <p class="warn">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.</p>
  <p class="link-fallback">Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br>${link}</p>
  <div class="footer">Capital Board · Ne pas répondre à cet email.</div>
</div></body></html>`;
}

// ── Génération lien de réinitialisation (admin, sans envoi Firebase) ────────
// Utilise l'endpoint admin Identity Toolkit avec returnOobLink : renvoie le
// lien au lieu d'envoyer l'email Firebase par défaut. On extrait le oobCode et
// on reconstruit un lien vers notre page auth-action.html (contrôle total du
// domaine + du template, contourne la config console).
async function generateResetLink(email, env) {
  const token = await getAccessToken(env);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:sendOobCode`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email, returnOobLink: true }),
    }
  );
  if (!res.ok) throw new Error(`sendOobCode ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const oobCode = new URL(data.oobLink).searchParams.get('oobCode');
  const base = env.ALLOWED_ORIGIN || 'https://capitalboard.fr';
  return `${base}/auth-action.html?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;
}

// Email d'un compte Auth depuis son uid (accounts:lookup, API admin).
async function getAuthEmail(localId, env) {
  const at = await getAccessToken(env);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:lookup`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: [localId] }),
    }
  );
  if (!res.ok) throw new Error(`accounts:lookup ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const u = (data.users || [])[0];
  return u && u.email ? u.email : '';
}

// Date de création d'un compte Auth (ms), pour borner /trust-device.
async function getAuthCreatedAt(localId, env) {
  const at = await getAccessToken(env);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:lookup`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: [localId] }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const u = (data.users || [])[0];
  return u && u.createdAt ? Number(u.createdAt) : null;
}

function emailIdeaRejected(title, reason) {
  const motif = reason
    ? `<p><strong>Motif :</strong> ${escapeHtml(reason)}</p>`
    : `<p>Aucun motif particulier n'a été précisé.</p>`;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>${CSS_BASE}
  .quote{background:#f4f5f9;border-left:3px solid #7c6df5;padding:12px 16px;border-radius:6px;margin:16px 0}
  </style></head><body>
<div class="card">
  <div class="logo">Capital Board</div>
  <h2>Votre idée n'a pas été retenue</h2>
  <p>Bonjour,</p>
  <p>Votre proposition n'a pas été publiée sur le mur à idées :</p>
  <div class="quote">${escapeHtml(title)}</div>
  ${motif}
  <p>Vous pouvez la retravailler et en proposer une nouvelle version quand vous le souhaitez.</p>
  <div class="footer">Capital Board · Ne pas répondre à cet email.</div>
</div></body></html>`;
}

// ── Code PIN : secret côté serveur, dérivation lente ───────────────────────
// Le condensat vit dans pinSecrets/{uid}, collection sans règle Firestore, donc
// hors d'atteinte du client. PBKDF2 remplace le SHA-256 simple : sur 10^6
// combinaisons, un simple SHA-256 se force instantanément hors ligne.
const PIN_ITERATIONS = 150000;
const PIN_MAX_TRIES  = 5;
const PIN_LOCK_MS    = 15 * 60 * 1000;

async function pbkdf2Hex(pin, saltHex, iterations) {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function setPinSecret(uid, pin, env) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  await firestoreSet(`pinSecrets/${uid}`, {
    hash:        { stringValue: await pbkdf2Hex(pin, saltHex, PIN_ITERATIONS) },
    salt:        { stringValue: saltHex },
    iters:       { integerValue: String(PIN_ITERATIONS) },
    attempts:    { integerValue: '0' },
    lockedUntil: { integerValue: '0' },
    updatedAt:   { integerValue: String(Date.now()) },
  }, env);
}

// ── OTP : le serveur est seule autorité ────────────────────────────────────
// Le code n'existe que dans otpChallenges/{uid}, une collection sans règle
// Firestore : les règles refusent par défaut, donc aucun client ne peut la lire,
// même avec la session de l'utilisateur. Avant, le code était généré dans le
// navigateur et stocké sous users/{uid}, que son titulaire peut lire : quiconque
// avait le mot de passe lisait le code et passait la 2FA sans la boîte mail.
const OTP_TTL_MS      = 10 * 60 * 1000;  // validité d'un code
const OTP_MAX_TRIES    = 5;              // essais avant invalidation
const OTP_MAX_SENDS    = 5;              // envois par fenêtre
const OTP_SEND_WINDOW  = 30 * 60 * 1000; // fenêtre de comptage des envois
const OTP_RESEND_MS    = 45 * 1000;      // délai minimum entre deux envois
const DEVICE_TRUST_MS  = 90 * 24 * 60 * 60 * 1000;

function otpGenerate() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(a[0] % 1000000).padStart(6, '0');
}

// Comparaison à durée constante : évite de distinguer un code proche par le
// temps de réponse.
function otpEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function emailIdeaPublished(title) {
  const base = 'https://capitalboard.fr';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>${CSS_BASE}
  .quote{background:#12121c;border-left:3px solid #00e09e;padding:12px 16px;border-radius:6px;margin:16px 0;color:#e8eaf0}
  .btn{display:inline-block;background:#7c6df5;color:#fff;text-decoration:none;padding:13px 26px;
    border-radius:10px;font-weight:600;font-size:15px}
  </style></head><body>
<div class="card">
  <div class="logo">Capital Board</div>
  <h2>Votre idée est en ligne 🎉</h2>
  <p>Bonjour,</p>
  <p>Votre proposition vient d'être publiée sur le mur à idées :</p>
  <div class="quote">${escapeHtml(title)}</div>
  <p>Les autres membres peuvent désormais la découvrir et voter pour ou contre.</p>
  <p style="text-align:center;margin:24px 0"><a class="btn" href="${base}/app.html">Voir le mur à idées</a></p>
  <p>Merci d'avoir pris le temps de contribuer : les idées des membres orientent réellement ce qui est développé.</p>
  <div class="footer">Capital Board · Ne pas répondre à cet email.</div>
</div></body></html>`;
}

// Le titre et le motif viennent de saisies libres et atterrissent dans du HTML.
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Nom d'affichage (Firebase Auth, via Admin) ──────────────────────────────
async function setAuthDisplayName(uid, displayName, env) {
  const token = await getAccessToken(env);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:update`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: uid, displayName }),
    },
  );
  if (!res.ok) throw new Error(`accounts:update ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Resend sender ─────────────────────────────────────────────────────────

async function sendEmail(to, subject, html, env) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Capital Board <noreply@capitalboard.fr>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

// ── Turnstile verification ─────────────────────────────────────────────────

async function verifyTurnstile(token, env) {
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token }),
  });
  const data = await res.json();
  return data.success === true;
}

// ── Earnings calendar (Yahoo quoteSummary, fetch PAR SYMBOLE + cache KV 24h) ──
//
// Source = Yahoo Finance calendarEvents : couvre TOUS les marchés (US, EU, Asie…),
// gratuit, cohérent avec le reste de l'app (tickers Yahoo). Nécessite un crumb +
// cookie côté serveur (mis en cache KV 1h). Finnhub free était US-only → abandonné.

const EARN_TTL = 24 * 3600;   // cache earnings par symbole (s)
const YA_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Récupère (et cache) un couple cookie+crumb Yahoo. force=true pour régénérer.
async function getYahooCreds(env, force) {
  if (!force) {
    const c = await env.EARNINGS.get('yahoo:creds');
    if (c) return JSON.parse(c);
  }
  const r1 = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': YA_UA } });
  const setCookies = r1.headers.getSetCookie ? r1.headers.getSetCookie() : [r1.headers.get('set-cookie')].filter(Boolean);
  const cookie = setCookies.map(c => c.split(';')[0]).join('; ');
  const r2 = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': YA_UA, 'Cookie': cookie } });
  const crumb = (await r2.text()).trim();
  if (!crumb || crumb.includes('<') || crumb.length > 40) throw new Error('crumb invalide');
  const creds = { cookie, crumb };
  await env.EARNINGS.put('yahoo:creds', JSON.stringify(creds), { expirationTtl: 3600 });
  return creds;
}

// Appel quoteSummary (calendarEvents + price + assetProfile). 401 = crumb périmé.
async function _qsFetch(sym, creds) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=calendarEvents,price,assetProfile&crumb=${encodeURIComponent(creds.crumb)}`;
  const res = await fetch(url, { headers: { 'User-Agent': YA_UA, 'Cookie': creds.cookie }, signal: AbortSignal.timeout(12000) });
  if (res.status === 401 || res.status === 403) return 401;
  if (!res.ok) throw new Error('Yahoo ' + res.status);
  return res.json();
}

// Earnings d'un seul symbole via Yahoo (prochaine date) + nom + domaine (logo).
async function fetchSymbolEarnings(sym, env) {
  let creds = await getYahooCreds(env, false);
  let data = await _qsFetch(sym, creds);
  if (data === 401) { creds = await getYahooCreds(env, true); data = await _qsFetch(sym, creds); }
  if (data === 401) throw new Error('Yahoo 401 (crumb)');
  const r = data?.quoteSummary?.result?.[0];
  const ev = r?.calendarEvents?.earnings;
  if (!ev) return [];
  const dates = Array.isArray(ev.earningsDate) ? ev.earningsDate : [];
  // earningsDate peut contenir une fourchette (2 timestamps) → on prend la 1re date.
  const first = dates[0];
  const ds = first?.fmt || (first?.raw ? new Date(first.raw * 1000).toISOString().slice(0, 10) : null);
  if (!ds) return [];
  const name = r?.price?.longName || r?.price?.shortName || sym.toUpperCase();
  const domain = (r?.assetProfile?.website || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  return [{
    symbol: sym.toUpperCase(),
    name,
    domain,
    date:   ds,
    hour:   '',                                  // Yahoo ne fournit pas bmo/amc
    estimated: !!ev.isEarningsDateEstimate,
    epsEst: ev.earningsAverage?.raw ?? null,     // estimation consensus BPA
    epsAct: null,                                // pas d'actuel dans calendarEvents
    revEst: ev.revenueAverage?.raw ?? null,      // estimation consensus CA
    revAct: null,
  }];
}

// ── Détail d'un symbole : historique 4 trimestres + prochaine date ──────────
async function _qsFetchDetail(sym, creds) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=earnings,calendarEvents,price,assetProfile&crumb=${encodeURIComponent(creds.crumb)}`;
  const res = await fetch(url, { headers: { 'User-Agent': YA_UA, 'Cookie': creds.cookie }, signal: AbortSignal.timeout(12000) });
  if (res.status === 401 || res.status === 403) return 401;
  if (!res.ok) throw new Error('Yahoo ' + res.status);
  return res.json();
}

async function fetchSymbolEarningsDetail(sym, env) {
  let creds = await getYahooCreds(env, false);
  let data = await _qsFetchDetail(sym, creds);
  if (data === 401) { creds = await getYahooCreds(env, true); data = await _qsFetchDetail(sym, creds); }
  if (data === 401) throw new Error('Yahoo 401 (crumb)');
  const r = data?.quoteSummary?.result?.[0];
  if (!r) return null;
  const name = r?.price?.longName || r?.price?.shortName || sym.toUpperCase();
  const domain = (r?.assetProfile?.website || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

  // Prochaine date (calendarEvents).
  const ev = r?.calendarEvents?.earnings;
  let next = null;
  if (ev) {
    const dates = Array.isArray(ev.earningsDate) ? ev.earningsDate : [];
    const first = dates[0];
    const ds = first?.fmt || (first?.raw ? new Date(first.raw * 1000).toISOString().slice(0, 10) : null);
    next = {
      date: ds,
      estimated: !!ev.isEarningsDateEstimate,
      epsEst: ev.earningsAverage?.raw ?? null,
      revEst: ev.revenueAverage?.raw ?? null,
    };
  }

  // Historique : BPA réel vs estimé (earningsChart) + CA réel (financialsChart).
  const epsQ = Array.isArray(r?.earnings?.earningsChart?.quarterly) ? r.earnings.earningsChart.quarterly : [];
  const finQ = Array.isArray(r?.earnings?.financialsChart?.quarterly) ? r.earnings.financialsChart.quarterly : [];
  const revByLabel = {};
  finQ.forEach(q => { revByLabel[q.date] = q.revenue?.raw ?? null; });
  const history = epsQ.map(q => ({
    label:  q.date,                      // ex "1Q2025"
    epsAct: q.actual?.raw ?? null,
    epsEst: q.estimate?.raw ?? null,
    revAct: revByLabel[q.date] ?? null,
  }));

  return { symbol: sym.toUpperCase(), name, domain, next, history };
}

// Un symbole boursier n'a pas de forme libre. Sans ce filtre, n'importe quelle
// chaine devenait une cle KV : chaque symbole invente ecrivait une entree, et le
// quota d'ecritures journalier du plan gratuit (1000) se vidait en quelques
// requetes, emportant avec lui tous les caches du Worker.
const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.\-^=]{0,14}$/;
function isValidSymbol(s) {
  return SYMBOL_RE.test(String(s || '').trim().toUpperCase());
}

// Earnings d'un symbole avec cache KV 24h (clé earn:SYM).
async function getSymbolEarningsCached(sym, env) {
  const key = 'earn5:' + sym.toUpperCase();
  const cached = await env.EARNINGS.get(key);
  if (cached !== null) return JSON.parse(cached);
  let items = null;
  try { items = await fetchSymbolEarnings(sym, env); }
  catch (e) { console.error('earnings', sym, e.message); }
  // Un echec n'est plus mis en cache : sinon un symbole inexistant coutait une
  // ecriture KV, et le quota journalier devenait trivial a epuiser.
  if (items === null) return [];
  const ttl = items.length ? EARN_TTL : 3600;
  await env.EARNINGS.put(key, JSON.stringify(items), { expirationTtl: ttl });
  return items;
}

// Earnings pour une liste de symboles (concurrence limitée).
async function getEarningsForSymbols(syms, env) {
  const out = [];
  const CHUNK = 6;
  for (let i = 0; i < syms.length; i += CHUNK) {
    const batch = syms.slice(i, i + CHUNK);
    const res = await Promise.all(batch.map(s => getSymbolEarningsCached(s, env)));
    res.forEach(arr => out.push(...arr));
  }
  return out;
}

// ── Main handler ───────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || 'https://capitalboard.fr';
    const corsHeaders = { ...CORS, 'Access-Control-Allow-Origin': origin === allowed ? origin : allowed };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    const url = new URL(request.url);
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

    try {
      // ── POST /chat ──────────────────────────────────────────────────────
      // Chatbot d'aide basé sur la KB (contenu public du site) via Workers AI.
      if (url.pathname === '/chat' && request.method === 'POST') {
        // Rate-limit léger par IP (protège le quota Workers AI).
        const ip = request.headers.get('CF-Connecting-IP') || 'anon';
        const rlKey = `chat:rl:${ip}`;
        const count = parseInt((await env.EARNINGS.get(rlKey)) || '0', 10);
        if (count >= CHAT_RL_MAX) {
          return json({ error: 'Trop de requêtes, réessayez dans une minute.' }, 429);
        }
        await env.EARNINGS.put(rlKey, String(count + 1), { expirationTtl: CHAT_RL_WINDOW });

        let body;
        try { body = await request.json(); } catch { return json({ error: 'JSON invalide' }, 400); }

        const message = String(body?.message || '').trim();
        if (!message) return json({ error: 'Question vide' }, 400);
        if (message.length > CHAT_MAX_CHARS) {
          return json({ error: `Question trop longue (max ${CHAT_MAX_CHARS} caractères).` }, 400);
        }

        // Historique optionnel (derniers échanges), borné pour limiter les tokens.
        const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];
        const cleanHistory = history
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m) => ({ role: m.role, content: String(m.content).slice(0, CHAT_MAX_CHARS) }));

        const messages = [
          { role: 'system', content: CHAT_SYSTEM },
          ...cleanHistory,
          { role: 'user', content: message },
        ];

        try {
          const out = await env.AI.run(CHAT_MODEL, { messages, max_tokens: 512 });
          const reply = String(out?.response || '').trim();
          if (!reply) return json({ error: 'Réponse vide du modèle' }, 502);
          return json({ reply });
        } catch (e) {
          return json({ error: 'Assistant indisponible', detail: e.message }, 502);
        }
      }

      // ── POST /verify-pin ────────────────────────────────────────────────
      if (url.pathname === '/verify-pin' && request.method === 'POST') {
        const { idToken, pin } = await request.json();
        if (!idToken || !/^\d{6}$/.test(pin ?? '')) return json({ valid: false });

        const user = await verifyIdToken(idToken, env);
        const uid = user.localId;
        const secretPath = `pinSecrets/${uid}`;
        const now = Date.now();

        let secret = null;
        try { secret = await firestoreGet(secretPath, env); } catch (_) {}

        // Verrouillage serveur : 6 chiffres se testent en un instant si rien ne
        // limite les essais. Le compteur client (5 tentatives) ne protégeait rien.
        if (secret) {
          const lockedUntil = fsNum(secret, 'lockedUntil') || 0;
          if (lockedUntil > now) {
            return json({ valid: false, locked: true, retryAfterSec: Math.ceil((lockedUntil - now) / 1000) });
          }
        }

        // Essai decompte AVANT toute comparaison, et atomiquement : un
        // `lire puis ecrire` laisse passer la force brute par requetes
        // parallele, qui lisent toutes le meme compteur.
        const attempts = await firestoreIncrement(secretPath, 'attempts', env);
        if (attempts > PIN_MAX_TRIES) {
          await firestoreUpdate(secretPath, {
            attempts:    { integerValue: '0' },
            lockedUntil: { integerValue: String(now + PIN_LOCK_MS) },
          }, ['attempts', 'lockedUntil'], env);
          return json({ valid: false, locked: true, retryAfterSec: Math.ceil(PIN_LOCK_MS / 1000) });
        }

        let ok = false, legacy = false;
        if (secret && fsStr(secret, 'hash')) {
          ok = otpEqual(
            await pbkdf2Hex(pin, fsStr(secret, 'salt'), fsNum(secret, 'iters') || PIN_ITERATIONS),
            fsStr(secret, 'hash'),
          );
        } else {
          // Ancien format : SHA-256(sel + pin) dans users/{uid}/data/security,
          // lisible par le titulaire. Vérifié une dernière fois, puis migré.
          const old = await firestoreGet(`users/${uid}/data/security`, env).catch(() => null);
          const h = old && fsStr(old, 'pinHash');
          const s = old && fsStr(old, 'pinSalt');
          if (!h || !s) return json({ valid: false });
          ok = otpEqual(await sha256(s + pin), h);
          legacy = true;
        }

        if (!ok) {
          const locked = attempts >= PIN_MAX_TRIES;
          if (locked) {
            await firestoreUpdate(secretPath, {
              attempts:    { integerValue: '0' },
              lockedUntil: { integerValue: String(now + PIN_LOCK_MS) },
            }, ['attempts', 'lockedUntil'], env);
          }
          return json({
            valid: false,
            ...(locked ? { locked: true, retryAfterSec: Math.ceil(PIN_LOCK_MS / 1000) }
                       : { left: PIN_MAX_TRIES - attempts }),
          });
        }

        // Succès : compteur remis à zéro, et migration du format ancien.
        if (legacy) {
          await setPinSecret(uid, pin, env);
          await firestoreUpdate(`users/${uid}/data/security`, {},
            ['pinHash', 'pinSalt'], env);
        } else {
          await firestoreUpdate(secretPath,
            { attempts: { integerValue: '0' }, lockedUntil: { integerValue: '0' } },
            ['attempts', 'lockedUntil'], env);
        }
        return json({ valid: true });
      }

      // ── POST /set-pin ───────────────────────────────────────────────────
      // Enregistre ou change le code. Le condensat ne quitte jamais le serveur :
      // avant, le client calculait un SHA-256 et l'écrivait sous users/{uid},
      // qu'il peut relire — un code à 6 chiffres se retrouvait hors ligne en une
      // fraction de seconde.
      if (url.pathname === '/set-pin' && request.method === 'POST') {
        const { idToken, pin } = await request.json();
        if (!idToken || !/^\d{6}$/.test(pin ?? '')) {
          return json({ ok: false, error: 'Le code doit faire exactement 6 chiffres.' }, 400);
        }
        const user = await verifyIdToken(idToken, env);
        if (!user.emailVerified) return json({ ok: false, error: 'Adresse email non vérifiée' }, 403);

        await audit('set_pin', '', user.localId, request, env);
        await setPinSecret(user.localId, pin, env);
        // Le client lit `enabled` pour savoir s'il doit demander le code.
        await firestoreUpdate(`users/${user.localId}/data/security`, {
          enabled:   { booleanValue: true },
          createdAt: { integerValue: String(Date.now()) },
        }, ['enabled', 'createdAt', 'pinHash', 'pinSalt'], env);
        return json({ ok: true });
      }

      // ── POST /admin/health ──────────────────────────────────────────────
      if (url.pathname === '/admin/health' && request.method === 'POST') {
        const { idToken } = await request.json();
        const user = await verifyIdToken(idToken, env);
        if (!user || user.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        const out = {};
        try { await firestoreGet('config/app', env); out.firestore = 'ok'; } catch (_) { out.firestore = 'ko'; }
        try { await getAccessToken(env); out.google = 'ok'; } catch (_) { out.google = 'ko'; }
        out.email = env.RESEND_API_KEY ? 'ok' : 'ko';
        try { await getYahooCreds(env); out.yahoo = 'ok'; } catch (_) { out.yahoo = 'ko'; }
        return json({ ok: true, services: out });
      }

      // ── POST /admin/list-auth-users ─────────────────────────────────────
      // Retourne les comptes réellement présents dans Firebase Auth
      // ({ localId, email }), pour filtrer les docs roles orphelins côté admin.
      if (url.pathname === '/admin/list-auth-users' && request.method === 'POST') {
        const { idToken } = await request.json();
        const admin = await verifyIdToken(idToken, env);
        if (!admin || admin.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        try {
          const users = await listAuthUsers(env);
          return json({ ok: true, users });
        } catch (e) {
          console.error('list-auth-users: ' + e.message);
          return json({ error: 'Erreur serveur' }, 500);
        }
      }

      // ── POST /admin/reset-password ──────────────────────────────────────
      // Définit un mot de passe temporaire pour un utilisateur et marque son
      // compte pour changement obligatoire à la prochaine connexion.
      if (url.pathname === '/admin/reset-password' && request.method === 'POST') {
        const { idToken, uid } = await request.json();
        const admin = await verifyIdToken(idToken, env);
        if (!admin || admin.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        if (!uid) return json({ error: 'uid requis' }, 400);
        if (uid === env.ADMIN_UID) return json({ error: 'Action interdite sur le compte admin' }, 400);
        await audit('reset_password', 'uid=' + uid, admin.localId, request, env);
        const tempPassword = genTempPassword();
        try {
          await setAuthPassword(uid, tempPassword, env);
          await firestoreUpdate(`roles/${uid}`, { mustChangePassword: { booleanValue: true } }, ['mustChangePassword'], env);
        } catch (e) {
          const msg = /USER_NOT_FOUND/.test(e.message)
            ? "Aucun compte de connexion pour cet utilisateur (compte Auth supprimé ou inscription incomplète)."
            : e.message;
          return json({ error: msg }, 400);
        }
        return json({ ok: true, tempPassword });
      }

      // ── POST /admin/idea-rejected ───────────────────────────────────────
      // Prévient l'auteur qu'une idée n'a pas été retenue. Le refus lui-même
      // est déjà écrit dans Firestore par le client (règles admin) : cet
      // endpoint ne fait qu'envoyer le mail, il n'est pas autorité sur le statut.
      if (url.pathname === '/admin/idea-rejected' && request.method === 'POST') {
        const { idToken, uid, title, reason } = await request.json();
        const admin = await verifyIdToken(idToken, env);
        if (!admin || admin.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        if (!uid) return json({ error: 'uid requis' }, 400);
        try {
          const to = await getAuthEmail(uid, env);
          if (!to) return json({ ok: false, error: 'Aucune adresse pour ce compte' }, 404);
          await sendEmail(to, 'Votre idée n\'a pas été retenue — Capital Board',
            emailIdeaRejected(title || '', reason || ''), env);
          return json({ ok: true });
        } catch (e) { return json({ ok: false, error: e.message }, 500); }
      }

      // ── POST /admin/idea-published ──────────────────────────────────────
      // Pendant de /admin/idea-rejected : prévient l'auteur que son idée est
      // en ligne. La publication elle-même est écrite par le client (règles
      // admin) ; cet endpoint n'envoie que le mail et la push éventuelle.
      if (url.pathname === '/admin/idea-published' && request.method === 'POST') {
        const { idToken, uid, title } = await request.json();
        const admin = await verifyIdToken(idToken, env);
        if (!admin || admin.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        if (!uid) return json({ error: 'uid requis' }, 400);
        try {
          const to = await getAuthEmail(uid, env);
          if (!to) return json({ ok: false, error: 'Aucune adresse pour ce compte' }, 404);
          await sendEmail(to, 'Votre idée est publiée — Capital Board',
            emailIdeaPublished(title || ''), env);
          // Push PWA en complément si l'auteur y est abonné. Best-effort :
          // une push ratée ne doit pas faire échouer la notification par mail.
          let pushed = false;
          try {
            const doc = await firestoreGet(`roles/${uid}`, env);
            const fcmToken = fsStr(doc, 'fcmToken');
            if (fcmToken) {
              pushed = await sendFcm(fcmToken, 'Votre idée est publiée 🎉',
                'Les membres peuvent maintenant voter pour votre proposition.', env);
            }
          } catch (_) {}
          return json({ ok: true, pushed });
        } catch (e) { return json({ ok: false, error: e.message }, 500); }
      }

      // ── POST /admin/broadcast-push ──────────────────────────────────────
      if (url.pathname === '/admin/broadcast-push' && request.method === 'POST') {
        const { idToken, title, body } = await request.json();
        const user = await verifyIdToken(idToken, env);
        if (!user || user.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        if (!title || !body) return json({ error: 'Titre et message requis' }, 400);
        const roles = await firestoreList('roles', env);
        const tokens = roles.map(d => fsStr(d, 'fcmToken')).filter(Boolean);
        await audit('broadcast_push', title, user.localId, request, env);
        let sent = 0, failed = 0;
        for (const t of tokens) { (await sendFcm(t, title, body, env)) ? sent++ : failed++; }
        return json({ ok: true, sent, failed, total: tokens.length });
      }

      // ── POST /admin/test-push ───────────────────────────────────────────
      // Envoie une push FCM (PWA) à UN SEUL utilisateur, ciblé par email.
      // Sert à vérifier que la diffusion arrive bien en notification système.
      if (url.pathname === '/admin/test-push' && request.method === 'POST') {
        const { idToken, email, title, body } = await request.json();
        const user = await verifyIdToken(idToken, env);
        if (!user || user.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        const target = (email || '').trim().toLowerCase();
        if (!target) return json({ error: 'email requis' }, 400);

        // email → uid via Firebase Auth
        const authUsers = await listAuthUsers(env);
        const match = authUsers.find(u => (u.email || '').toLowerCase() === target);
        if (!match) return json({ error: 'aucun compte avec cet email' }, 404);

        // uid → fcmToken (doc roles/<uid>)
        const doc = await firestoreGet(`roles/${match.localId}`, env);
        const token = fsStr(doc, 'fcmToken');
        if (!token) return json({ error: 'cet utilisateur n\'est pas abonné au push (pas de token)' }, 404);

        const ok = await sendFcm(token, title || 'Test push Capital Board',
          body || 'Ceci est une notification push PWA de test. ✅', env);
        return json({ ok, sent: ok ? 1 : 0, uid: match.localId, email: match.email });
      }

      // ── POST /admin/broadcast-email ─────────────────────────────────────
      if (url.pathname === '/admin/broadcast-email' && request.method === 'POST') {
        const { idToken, subject, html, testEmail } = await request.json();
        const user = await verifyIdToken(idToken, env);
        if (!user || user.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        if (!subject || !html) return json({ error: 'Sujet et contenu requis' }, 400);
        // Envoi test : une seule adresse, pas de diffusion générale.
        if (testEmail) {
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testEmail)) return json({ error: 'Email de test invalide' }, 400);
          try { await sendEmail(testEmail, subject, html, env); }
          catch (e) { return json({ ok: false, error: 'Échec envoi : ' + e.message }, 500); }
          return json({ ok: true, sent: 1, failed: 0, total: 1, test: true });
        }
        await audit('broadcast_email', subject, user.localId, request, env);
        const r = await broadcastEmailToAll(subject, html, env);
        return json({ ok: true, ...r });
      }

      // ── POST /admin/schedule-email ──────────────────────────────────────
      // Programme une diffusion email pour plus tard (envoyée par le cron).
      if (url.pathname === '/admin/schedule-email' && request.method === 'POST') {
        const { idToken, subject, html, sendAt } = await request.json();
        const user = await verifyIdToken(idToken, env);
        if (!user || user.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        if (!subject || !html) return json({ error: 'Sujet et contenu requis' }, 400);
        const ts = Number(sendAt);
        if (!ts || ts < Date.now() - 60000) return json({ error: 'Date d\'envoi invalide (passée)' }, 400);
        const id = `${ts}-${Math.random().toString(36).slice(2, 8)}`;
        await firestoreSet(`scheduledEmails/${id}`, {
          subject:   { stringValue: subject },
          html:      { stringValue: html },
          sendAt:    { integerValue: String(ts) },
          createdAt: { integerValue: String(Date.now()) },
        }, env);
        return json({ ok: true, id, sendAt: ts });
      }

      // ── POST /admin/schedule-list ───────────────────────────────────────
      if (url.pathname === '/admin/schedule-list' && request.method === 'POST') {
        const { idToken } = await request.json();
        const user = await verifyIdToken(idToken, env);
        if (!user || user.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        let docs = [];
        try { docs = await firestoreList('scheduledEmails', env); } catch (_) {}
        const items = docs.map(d => ({
          id: d.name.split('/').pop(),
          subject: fsStr(d, 'subject'),
          sendAt: fsNum(d, 'sendAt'),
        })).sort((a, b) => a.sendAt - b.sendAt);
        return json({ ok: true, items });
      }

      // ── POST /admin/schedule-cancel ─────────────────────────────────────
      if (url.pathname === '/admin/schedule-cancel' && request.method === 'POST') {
        const { idToken, id } = await request.json();
        const user = await verifyIdToken(idToken, env);
        if (!user || user.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        if (!id || /[^\w.-]/.test(id)) return json({ error: 'id invalide' }, 400);
        await firestoreDelete(`scheduledEmails/${id}`, env);
        return json({ ok: true });
      }

      // ── POST /request-otp ───────────────────────────────────────────────
      // Génère le code, le garde côté serveur, l'envoie par email. Le client ne
      // le voit jamais. Remplace l'ancien /send-otp, où le code était fabriqué
      // par le navigateur et simplement relayé.
      if (url.pathname === '/request-otp' && request.method === 'POST') {
        const { idToken, type, deviceId, deviceLabel, location, ipInfo, turnstileToken } = await request.json();
        if (!idToken || !['delete', '2fa'].includes(type)) {
          return json({ ok: false, error: 'Paramètres invalides' }, 400);
        }
        // Turnstile sur la suppression : action destructrice et hors parcours normal.
        if (type === 'delete') {
          const humanVerified = await verifyTurnstile(turnstileToken, env);
          if (!humanVerified) return json({ ok: false, error: 'Vérification humaine échouée' }, 403);
        }

        const user = await verifyIdToken(idToken, env);
        if (!user.email) return json({ ok: false, error: 'Email introuvable' }, 400);
        // Adresse non vérifiée = adresse non prouvée. Sans ce contrôle, on
        // pouvait créer un compte avec l'email d'un tiers et lui faire envoyer
        // un message signé par notre domaine.
        if (!user.emailVerified) {
          return json({ ok: false, error: 'Adresse email non vérifiée' }, 403);
        }

        const path = `otpChallenges/${user.localId}`;
        const now = Date.now();

        // Anti-abus : délai entre deux envois, et plafond par fenêtre glissante.
        // Le compteur d'envois est incrémenté atomiquement AVANT l'envoi : sinon
        // des demandes parallèles lisent toutes la même valeur et le plafond ne
        // borne plus le nombre d'emails expédiés.
        let windowStart = now;
        try {
          const prev = await firestoreGet(path, env);
          const lastSentAt = fsNum(prev, 'lastSentAt') || 0;
          const prevWindow = fsNum(prev, 'windowStart') || 0;
          if (now - lastSentAt < OTP_RESEND_MS) {
            return json({ ok: false, error: 'Patientez avant de demander un nouveau code' }, 429);
          }
          if (now - prevWindow < OTP_SEND_WINDOW) windowStart = prevWindow;
        } catch (_) { /* aucune demande précédente */ }

        // Fenêtre expirée : on repart de zéro, sinon on consomme un envoi.
        let sends;
        if (windowStart === now) {
          sends = 1;
          await firestoreUpdate(path, { sends: { integerValue: '1' } }, ['sends'], env);
        } else {
          sends = await firestoreIncrement(path, 'sends', env);
          if (sends > OTP_MAX_SENDS) {
            return json({ ok: false, error: 'Trop de codes demandés, réessayez plus tard' }, 429);
          }
        }

        const code = otpGenerate();
        const salt = crypto.randomUUID();
        await firestoreSet(path, {
          type:        { stringValue: type },
          codeHash:    { stringValue: await sha256(salt + code) },
          salt:        { stringValue: salt },
          expiresAt:   { integerValue: String(now + OTP_TTL_MS) },
          attempts:    { integerValue: '0' },
          sends:       { integerValue: String(sends) },
          windowStart: { integerValue: String(windowStart) },
          lastSentAt:  { integerValue: String(now) },
          deviceId:    { stringValue: String(deviceId || '') },
          deviceLabel: { stringValue: String(deviceLabel || '').slice(0, 80) },
          ip:          { stringValue: String(ipInfo?.ip || '') },
          city:        { stringValue: String(ipInfo?.city || '') },
          region:      { stringValue: String(ipInfo?.region || '') },
          country:     { stringValue: String(ipInfo?.country || '') },
          countryCode: { stringValue: String(ipInfo?.countryCode || '') },
        }, env);

        const [subject, html] = type === 'delete'
          ? ['Confirmation suppression de compte — Capital Board', emailDelete(code)]
          : ['Code de vérification — nouvel appareil Capital Board',
             email2fa(code, deviceLabel, location)];
        await sendEmail(user.email, subject, html, env);
        return json({ ok: true, expiresAt: now + OTP_TTL_MS });
      }

      // ── GET /username-available?u=nom ───────────────────────────────────
      // Disponibilité d'un pseudo. Passe par le serveur parce que le client ne
      // peut plus lire la collection roles (elle exposait tous les membres), et
      // parce qu'à l'inscription l'appelant n'est pas encore authentifié : le
      // contrôle échouait alors silencieusement.
      if (url.pathname === '/username-available' && request.method === 'GET') {
        const ip = request.headers.get('CF-Connecting-IP') || 'anon';
        const rlKey = `una:rl:${ip}`;
        const n = parseInt((await env.EARNINGS.get(rlKey)) || '0', 10);
        if (n >= 30) return json({ error: 'Trop de requêtes' }, 429);
        await env.EARNINGS.put(rlKey, String(n + 1), { expirationTtl: 60 });

        const uname = (url.searchParams.get('u') || '').trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,20}$/.test(uname)) {
          return json({ available: false, error: 'format' });
        }
        if (/capitalboard/.test(uname)) return json({ available: false, error: 'reserve' });

        // Réservation explicite, puis comptes existants sans réservation.
        try {
          await firestoreGet(`usernames/${uname}`, env);
          return json({ available: false });
        } catch (_) { /* pas de réservation : on continue */ }
        const holders = await rolesWithUsername(uname, env);
        return json({ available: holders.length === 0 });
      }

      // ── POST /log-session ───────────────────────────────────────────────
      // Journal d'audit ecrit par le serveur. Le client en ecrivait deja un, mais il
// choisissait quoi y mettre : une session admin volee pouvait agir sans laisser
// de trace. Ici l'entree part du Worker, a chaque route privilegiee, et le
// declencheur n'a aucun moyen de l'eviter. Best-effort : un echec d'audit ne doit
// pas empecher l'action demandee d'aboutir.
async function audit(action, details, uid, request, env) {
  try {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await firestoreSet(`auditLog/${id}`, {
      action:  { stringValue: String(action) },
      details: { stringValue: String(details || '').slice(0, 300) },
      by:      { stringValue: String(uid || '') },
      ip:      { stringValue: request.headers.get('CF-Connecting-IP') || '' },
      source:  { stringValue: 'worker' },
      at:      { timestampValue: new Date().toISOString() },
    }, env);
  } catch (e) { console.error('audit ' + action + ': ' + e.message); }
}

// Journal des connexions, écrit par le serveur. Jusqu'ici rien ne permettait
      // à un membre de savoir qu'un tiers s'était connecté à son compte : on avait
      // beaucoup de prévention, aucune détection.
      //
      // Écrit par le Worker et interdit au client dans les règles : un attaquant
      // qui a la session ne doit pas pouvoir effacer ses traces. L'IP et la ville
      // viennent des en-têtes Cloudflare, donc rien à demander à un service tiers.
      if (url.pathname === '/log-session' && request.method === 'POST') {
        const { idToken, deviceLabel } = await request.json();
        const user = await verifyIdToken(idToken, env);
        const path = `users/${user.localId}/data/loginLog`;

        const entry = {
          mapValue: {
            fields: {
              at:      { integerValue: String(Date.now()) },
              ip:      { stringValue: request.headers.get('CF-Connecting-IP') || '' },
              city:    { stringValue: String(request.cf?.city || '') },
              country: { stringValue: String(request.cf?.country || '') },
              device:  { stringValue: String(deviceLabel || '').slice(0, 80) },
            },
          },
        };

        // Lecture puis réécriture bornée : un journal de 30 entrées suffit à
        // repérer une connexion anormale, et borne la taille du document.
        let entries = [];
        try {
          const doc = await firestoreGet(path, env);
          entries = doc.fields?.entries?.arrayValue?.values || [];
        } catch (_) { /* premier enregistrement */ }

        // Sans ce filtre, la route est un amplificateur d'écritures : rechargée
        // en boucle, elle consomme le quota Firestore quotidien et fait échouer
        // toutes les écritures de l'application. Une même IP sur le même appareil
        // ne réécrit donc pas avant 30 minutes ; un contexte différent passe
        // toujours, puisque c'est exactement ce qu'on veut voir apparaître.
        const last = entries[entries.length - 1]?.mapValue?.fields;
        if (last) {
          const memeContexte =
            (last.ip?.stringValue || '') === (entry.mapValue.fields.ip.stringValue) &&
            (last.device?.stringValue || '') === (entry.mapValue.fields.device.stringValue);
          const recent = Date.now() - Number(last.at?.integerValue || 0) < 30 * 60 * 1000;
          if (memeContexte && recent) return json({ ok: true, skipped: true });
        }

        entries.push(entry);
        if (entries.length > 30) entries = entries.slice(-30);

        await firestoreUpdate(path, { entries: { arrayValue: { values: entries } } }, ['entries'], env);
        return json({ ok: true });
      }

      // ── POST /revoke-sessions ───────────────────────────────────────────
      // Invalide TOUS les jetons de rafraîchissement du compte appelant.
      //
      // Nécessaire parce qu'un changement de mot de passe ne suffit pas : les
      // jetons de rafraîchissement Firebase y survivent. Quelqu'un qui détenait
      // déjà une session continuait donc à renouveler son accès indéfiniment,
      // mot de passe changé ou non. Retirer un appareil de confiance ne coupait
      // rien non plus : ça n'agit que sur la 2FA à la prochaine connexion.
      //
      // L'appelant est déconnecté lui aussi : la révocation est par compte, pas
      // par session. C'est le comportement attendu après un changement de mot de
      // passe ou un soupçon de compromission.
      if (url.pathname === '/revoke-sessions' && request.method === 'POST') {
        const { idToken } = await request.json();
        const user = await verifyIdToken(idToken, env);
        const at = await getAccessToken(env);
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:update`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              localId: user.localId,
              validSince: String(Math.floor(Date.now() / 1000)),
            }),
          },
        );
        if (!res.ok) {
          console.error('revoke-sessions: ' + (await res.text()));
          return json({ ok: false, error: 'Révocation impossible' }, 500);
        }
        await audit('revoke_sessions', '', user.localId, request, env);
        // Les appareils de confiance partent avec : sinon la 2FA ne serait pas
        // redemandée à la reconnexion, ce qui viderait la révocation de son sens.
        await firestoreUpdate(`users/${user.localId}/data/trustedDevices`,
          { devices: { mapValue: { fields: {} } } }, ['devices'], env);
        return json({ ok: true });
      }

      // ── POST /revoke-devices ────────────────────────────────────────────
      // Retrait d'appareils de confiance. Passe par le Worker parce que le
      // client n'a plus le droit d'écrire trustedDevices ; retirer n'affaiblit
      // rien, mais l'écriture doit rester d'un seul côté.
      // { deviceId } retire cet appareil ; { keepDeviceId } retire tous les autres.
      if (url.pathname === '/revoke-devices' && request.method === 'POST') {
        const { idToken, deviceId, keepDeviceId } = await request.json();
        const user = await verifyIdToken(idToken, env);
        if (!deviceId && !keepDeviceId) return json({ ok: false, error: 'Paramètres invalides' }, 400);

        const path = `users/${user.localId}/data/trustedDevices`;
        let raw = {};
        try {
          const doc = await firestoreGet(path, env);
          raw = doc.fields?.devices?.mapValue?.fields || {};
        } catch (_) { return json({ ok: true, removed: 0 }); }

        const kept = {};
        let removed = 0;
        for (const [id, v] of Object.entries(raw)) {
          const drop = keepDeviceId ? id !== keepDeviceId : id === deviceId;
          if (drop) removed++; else kept[id] = v;
        }
        await firestoreUpdate(path, { devices: { mapValue: { fields: kept } } }, ['devices'], env);
        return json({ ok: true, removed });
      }

      // ── POST /trust-device ──────────────────────────────────────────────
      // Premier appareil d'un compte fraîchement créé : évite de demander un
      // code par email juste après l'inscription. Trois conditions cumulées,
      // sinon c'est un contournement de la 2FA : email vérifié, compte créé il
      // y a moins de 15 minutes, et aucun appareil de confiance existant.
      if (url.pathname === '/trust-device' && request.method === 'POST') {
        const { idToken, deviceId, deviceLabel, ipInfo } = await request.json();
        const user = await verifyIdToken(idToken, env);
        if (!user.emailVerified) return json({ ok: false, error: 'Adresse email non vérifiée' }, 403);
        if (!deviceId) return json({ ok: false, error: 'deviceId requis' }, 400);

        const createdAt = await getAuthCreatedAt(user.localId, env);
        if (!createdAt || Date.now() - createdAt > 15 * 60 * 1000) {
          return json({ ok: false, error: 'Compte trop ancien pour cette voie' }, 403);
        }

        const now = Date.now();
        try {
          const doc = await firestoreGet(`users/${user.localId}/data/trustedDevices`, env);
          const raw = doc.fields?.devices?.mapValue?.fields || {};
          const active = Object.values(raw).some(v =>
            Number(v.mapValue?.fields?.expiresAt?.integerValue ?? 0) > now);
          if (active) return json({ ok: false, error: 'Un appareil est déjà enregistré' }, 403);
        } catch (_) { /* aucun document : cas attendu */ }

        await trustDevice(user.localId, deviceId, deviceLabel, ipInfo, env);
        return json({ ok: true });
      }

      // ── POST /verify-otp ────────────────────────────────────────────────
      // Compare le code, compte les essais, et pour la 2FA déclare l'appareil
      // de confiance lui-même : le client n'a aucun rôle dans la décision.
      if (url.pathname === '/verify-otp' && request.method === 'POST') {
        const { idToken, type, code } = await request.json();
        if (!idToken || !['delete', '2fa'].includes(type) || !/^\d{6}$/.test(code ?? '')) {
          return json({ valid: false, error: 'Paramètres invalides' }, 400);
        }
        const user = await verifyIdToken(idToken, env);
        const path = `otpChallenges/${user.localId}`;

        let doc;
        try { doc = await firestoreGet(path, env); }
        catch (_) { return json({ valid: false, error: 'expired' }); }

        const now = Date.now();
        if (fsStr(doc, 'type') !== type)        return json({ valid: false, error: 'expired' });
        if ((fsNum(doc, 'expiresAt') || 0) < now) {
          await firestoreDelete(path, env);
          return json({ valid: false, error: 'expired' });
        }
        // L'essai est decompte AVANT la comparaison, et de facon atomique : sinon
        // des requetes parallele lisent toutes le meme compteur et la limite de
        // 5 essais ne borne plus rien face a une force brute concurrente.
        const attempts = await firestoreIncrement(path, 'attempts', env);
        if (attempts > OTP_MAX_TRIES) {
          await firestoreDelete(path, env);
          return json({ valid: false, error: 'locked' });
        }

        const computed = await sha256(fsStr(doc, 'salt') + code);
        if (!otpEqual(computed, fsStr(doc, 'codeHash') || '')) {
          return json({ valid: false, error: 'wrong', left: Math.max(0, OTP_MAX_TRIES - attempts) });
        }

        // Code correct : usage unique, on efface avant toute suite.
        await firestoreDelete(path, env);

        if (type === '2fa') {
          const deviceId = fsStr(doc, 'deviceId');
          if (!deviceId) return json({ valid: false, error: 'device manquant' }, 400);
          await trustDevice(user.localId, deviceId, fsStr(doc, 'deviceLabel'), {
            ip: fsStr(doc, 'ip'), city: fsStr(doc, 'city'), region: fsStr(doc, 'region'),
            country: fsStr(doc, 'country'), countryCode: fsStr(doc, 'countryCode'),
          }, env);
        }
        return json({ valid: true });
      }

      // ── POST /forgot-password ───────────────────────────────────────────
      // Génère un lien de réinitialisation (admin) et l'envoie via Resend
      // depuis noreply@capitalboard.fr. Réponse toujours générique : ne
      // révèle jamais si l'adresse correspond à un compte (anti-énumération).
      if (url.pathname === '/forgot-password' && request.method === 'POST') {
        const { email, turnstileToken } = await request.json();
        const addr = (email || '').trim();
        if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
          return json({ ok: false, error: 'Email invalide' }, 400);
        }
        const humanVerified = await verifyTurnstile(turnstileToken, env);
        if (!humanVerified) return json({ ok: false, error: 'Vérification humaine échouée' }, 403);

        try {
          const link = await generateResetLink(addr, env);
          await sendEmail(addr, 'Réinitialisation de votre mot de passe — Capital Board', emailPasswordReset(link), env);
        } catch (e) {
          // EMAIL_NOT_FOUND ou compte fédéré sans mot de passe : on ne remonte
          // rien au client pour ne pas révéler l'existence du compte.
          console.warn('[forgot-password]', e.message);
        }
        return json({ ok: true });
      }

      // ── POST /change-displayname ────────────────────────────────────────
      // Change le nom d'affichage (Firebase Auth). Autorité serveur : blocklist
      // « capitalboard » (séparateurs retirés) appliquée côté Worker, impossible
      // à contourner via l'UI. L'écriture passe par l'Admin SDK.
      if (url.pathname === '/change-displayname' && request.method === 'POST') {
        const { idToken, name } = await request.json();
        const user = await verifyIdToken(idToken, env);
        const nm = (name || '').trim();
        if (!nm || nm.length > 40) {
          return json({ ok: false, error: 'Nom invalide (1–40 caractères).' }, 400);
        }
        if (/capitalboard/i.test(nm.replace(/[\s._-]/g, ''))) {
          return json({ ok: false, error: "Ce nom d'affichage n'est pas autorisé." }, 400);
        }
        await setAuthDisplayName(user.localId, nm, env);
        return json({ ok: true, name: nm });
      }

      // ── POST /change-username ───────────────────────────────────────────
      // Change le nom d'utilisateur (roles/{uid}.username). Autorité serveur :
      // format + blocklist « capitalboard », unicité (réservation usernames/
      // création seule + balayage des comptes existants), cooldown 30 j. La
      // création initiale ne pose pas usernameChangedAt → 1er changement libre.
      if (url.pathname === '/change-username' && request.method === 'POST') {
        const { idToken, username } = await request.json();
        const user = await verifyIdToken(idToken, env);
        const uid = user.localId;
        const uname = (username || '').trim().toLowerCase();

        if (!/^[a-z0-9._-]{3,20}$/.test(uname)) {
          return json({ ok: false, error: 'Format invalide : 3–20 caractères (lettres, chiffres, . - _).' }, 400);
        }
        if (/capitalboard/.test(uname)) {
          return json({ ok: false, error: "Ce nom d'utilisateur n'est pas autorisé." }, 400);
        }

        let roleDoc = null;
        try { roleDoc = await firestoreGet(`roles/${uid}`, env); } catch (_) {}
        const current = roleDoc ? fsStr(roleDoc, 'username') : null;
        const lastChanged = roleDoc ? fsNum(roleDoc, 'usernameChangedAt') : null;

        if (current === uname) {
          return json({ ok: false, error: "C'est déjà votre nom d'utilisateur." }, 400);
        }

        const COOLDOWN = 30 * 24 * 60 * 60 * 1000;
        if (lastChanged && Date.now() - lastChanged < COOLDOWN) {
          const days = Math.ceil((COOLDOWN - (Date.now() - lastChanged)) / (24 * 60 * 60 * 1000));
          return json({ ok: false, error: `Vous pourrez changer de nom d'utilisateur dans ${days} jour(s).`, cooldownDays: days }, 429);
        }

        // Unicité : comptes existants (roles) + réservation atomique (usernames/)
        const holders = await rolesWithUsername(uname, env);
        if (holders.some((h) => h !== uid)) {
          return json({ ok: false, error: "Ce nom d'utilisateur est déjà pris." }, 409);
        }
        const claimed = await firestoreCreate('usernames', uname, { uid: { stringValue: uid } }, env);
        if (!claimed) {
          return json({ ok: false, error: "Ce nom d'utilisateur est déjà pris." }, 409);
        }

        const now = Date.now();
        await firestoreUpdate(
          `roles/${uid}`,
          { username: { stringValue: uname }, usernameChangedAt: { integerValue: String(now) } },
          ['username', 'usernameChangedAt'],
          env,
        );
        // Libère l'ancienne réservation (best-effort).
        if (current) { try { await firestoreDelete(`usernames/${current}`, env); } catch (_) {} }

        return json({ ok: true, username: uname, changedAt: now });
      }

      // ── GET /earnings?symbols=A,B&from=&to= ─────────────────────────────
      // Earnings des symboles demandés (par-symbole Finnhub, cache KV 24h).
      // `symbols` obligatoire (max 80). Filtre optionnel from/to. Cache CDN 1h.
      if (url.pathname === '/earnings' && request.method === 'GET') {
        const symbolsParam = url.searchParams.get('symbols');
        if (!symbolsParam) return json({ items: [] });
        const syms = [...new Set(symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(isValidSymbol))].slice(0, 130);
        const from = url.searchParams.get('from');
        const to   = url.searchParams.get('to');
        let items = await getEarningsForSymbols(syms, env);
        if (from) items = items.filter(e => e.date >= from);
        if (to)   items = items.filter(e => e.date <= to);
        // Pas de cache CDN/navigateur ici : le cache réel est en KV (24h/symbole).
        // Évite de servir une réponse agrégée périmée (noms/logos manquants).
        return new Response(JSON.stringify({ updatedAt: Date.now(), items }), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders },
        });
      }

      // ── GET /news ───────────────────────────────────────────────────────
      // Actualités marchés agrégées depuis des flux RSS fixes. Cache KV 15 min
      // partagé par tous les utilisateurs (contenu identique pour tout le monde),
      // plus une copie sans TTL servie en secours si tous les flux tombent.
      if (url.pathname === '/news' && request.method === 'GET') {
        const hit = await env.EARNINGS.get('news:v1');
        if (hit !== null) {
          return new Response(hit, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...corsHeaders },
          });
        }

        const data = await buildNews();
        if (data.items.length) {
          const body = JSON.stringify(data);
          await env.EARNINGS.put('news:v1', body, { expirationTtl: NEWS_TTL });
          await env.EARNINGS.put('news:last', body);
          return new Response(body, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...corsHeaders },
          });
        }

        // Tous les flux HS : on ressert la dernière collecte valide plutôt qu'une page vide.
        const stale = await env.EARNINGS.get('news:last');
        if (stale !== null) {
          const parsed = JSON.parse(stale);
          parsed.stale = true;
          return json(parsed);
        }
        return json({ items: [], updatedAt: Date.now(), error: 'flux indisponibles' }, 503);
      }

      // ── GET /favoris ────────────────────────────────────────────────────
      // Derniers contenus des comptes suivis (Graph API + passerelle RSS).
      // Même stratégie de cache que /news : KV 30 min + copie de secours. Le
      // cache navigateur reste court : c'est le KV qui protège de la charge, et
      // 10 min ici retardaient d'autant tout changement de FAVORIS_IG_HANDLES.
      if (url.pathname === '/favoris' && request.method === 'GET') {
        const hit = await env.EARNINGS.get('fav:v1');
        if (hit !== null) {
          return new Response(hit, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', ...corsHeaders },
          });
        }

        // Chemin lent : normalement inatteignable, le cron garde `fav:v1` chaud.
        const { data, body } = await refreshFavoris(env);
        if (data.unconfigured) return json(data);   // rien à mettre en cache
        if (body) {
          return new Response(body, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', ...corsHeaders },
          });
        }

        const stale = await env.EARNINGS.get('fav:last');
        if (stale !== null) {
          const parsed = JSON.parse(stale);
          parsed.stale = true;
          return json(parsed);
        }
        return json({ items: [], updatedAt: Date.now(), error: 'flux indisponibles' }, 503);
      }

      // ── GET /fav-img?url=... ────────────────────────────────────────────
      // Le CDN Meta renvoie Cross-Origin-Resource-Policy sur les vignettes :
      // un <img> pointant dessus depuis capitalboard.fr est bloqué par le
      // navigateur (ERR_BLOCKED_BY_RESPONSE.NotSameOrigin). On les relaie donc,
      // ce qui les rend same-origin côté client. Hôtes whitelistés pour ne pas
      // offrir un proxy d'images ouvert.
      if (url.pathname === '/fav-img' && request.method === 'GET') {
        const target = url.searchParams.get('url');
        if (!target) return json({ error: 'url manquant' }, 400);
        let t;
        try { t = new URL(target); } catch { return json({ error: 'url invalide' }, 400); }
        const okHost = t.protocol === 'https:'
          && /(^|\.)(cdninstagram\.com|fbcdn\.net|rss\.app)$/i.test(t.hostname);
        if (!okHost) return json({ error: 'hôte non autorisé' }, 403);

        try {
          const r = await fetch(t.toString(), {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36' },
            signal: AbortSignal.timeout(8000),
            cf: { cacheTtl: 3600, cacheEverything: true },
          });
          const ct = r.headers.get('Content-Type') || '';
          if (!r.ok || !ct.startsWith('image')) return json({ error: 'image indisponible' }, 404);
          return new Response(r.body, {
            status: 200,
            // Les URL Meta sont signées et expirent : 1 h de cache, pas plus.
            headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=3600', ...corsHeaders },
          });
        } catch {
          return json({ error: 'image indisponible' }, 504);
        }
      }

      // ── GET /yahoo?url=... ──────────────────────────────────────────────
      // Proxy Yahoo Finance côté serveur (pas de CORS, pas de crumb).
      // Remplace les proxies CORS gratuits morts (corsproxy.io / cors.eu.org).
      if (url.pathname === '/yahoo' && request.method === 'GET') {
        const target = url.searchParams.get('url');
        if (!target) return json({ error: 'url manquant' }, 400);
        let t;
        try { t = new URL(target); } catch { return json({ error: 'url invalide' }, 400); }
        if (t.protocol !== 'https:' || !YAHOO_HOSTS.has(t.hostname)) {
          return json({ error: 'hôte non autorisé' }, 403);
        }
        const yres = await fetch(t.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(8000),
          // Cache PARTAGÉ à l'edge Cloudflare : une URL ticker identique n'est
          // fetchée chez Yahoo qu'une fois toutes les 30s, quel que soit le
          // nombre d'utilisateurs. Découple la charge Yahoo du nombre d'users
          // → tient à 10K users simultanés sans faire tomber Yahoo.
          cf: { cacheEverything: true, cacheTtl: 30 },
        });
        const body = await yres.text();
        // Cache CDN Cloudflare 30s pour les requêtes identiques (cours/courbe).
        return new Response(body, {
          status: yres.status,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=30',
            ...corsHeaders,
          },
        });
      }

      // ── GET /quotes?symbols=SYM1,SYM2,... ───────────────────────────────
      // Cours de plusieurs tickers en UNE requête (au lieu d'une par ligne côté
      // client). Chaque ticker est fetché chez Yahoo avec le cache edge partagé
      // 30s (cf. /yahoo) → charge Yahoo indépendante du nombre d'utilisateurs.
      // Tient à des milliers d'users simultanés.
      if (url.pathname === '/quotes' && request.method === 'GET') {
        const rawSyms = (url.searchParams.get('symbols') || '').trim();
        if (!rawSyms) return json({ quotes: {}, updatedAt: Date.now() });
        // Dédup + borne (évite l'abus : max 60 tickers par appel).
        // Meme filtre de format que pour les earnings : evite de relayer chez Yahoo
        // n'importe quelle chaine fournie par l'appelant.
        const symbols = [...new Set(rawSyms.split(',').map((s) => s.trim()).filter(isValidSymbol))].slice(0, 60);

        const quotes = {};
        await Promise.all(symbols.map(async (sym) => {
          try {
            const yurl = 'https://query1.finance.yahoo.com/v8/finance/chart/'
              + encodeURIComponent(sym) + '?interval=1d&range=1d';
            const r = await fetch(yurl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                'Accept': 'application/json',
              },
              signal: AbortSignal.timeout(6000),
              cf: { cacheEverything: true, cacheTtl: 30 },   // cache edge partagé 30s
            });
            const d = JSON.parse(await r.text());
            const res = d.chart && d.chart.result && d.chart.result[0];
            const m = res && res.meta;
            if (m && m.regularMarketPrice != null) {
              const prev = m.chartPreviousClose || m.previousClose || m.regularMarketPrice;
              quotes[sym] = {
                price: m.regularMarketPrice,
                prevClose: prev,
                changePct: prev ? ((m.regularMarketPrice - prev) / prev * 100) : 0,
                currency: m.currency || null,
              };
            }
          } catch (_) { /* ticker HS : simplement absent de la réponse */ }
        }));

        return new Response(JSON.stringify({ quotes, updatedAt: Date.now() }), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30', ...corsHeaders },
        });
      }

      // ── GET /earnings-detail?symbol=... ─────────────────────────────────
      // Historique (4 trimestres) + prochaine date pour un titre. Cache KV 24h.
      if (url.pathname === '/earnings-detail' && request.method === 'GET') {
        const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase();
        if (!isValidSymbol(symbol)) return json({ error: 'symbole invalide' }, 400);
        const key = 'earndet1:' + symbol;
        const cached = await env.EARNINGS.get(key);
        if (cached !== null) {
          return new Response(cached, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders } });
        }
        let detail = null;
        try { detail = await fetchSymbolEarningsDetail(symbol, env); }
        catch (e) { console.error('earnings-detail', symbol, e.message); }
        const payload = JSON.stringify(detail || { error: 'indisponible' });
        // Seuls les succes sont caches, meme raison que ci-dessus.
        if (detail) await env.EARNINGS.put(key, payload, { expirationTtl: EARN_TTL });
        return new Response(payload, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders } });
      }

      // ── GET /logo?domain=... ────────────────────────────────────────────
      // Proxy logo (Clearbit → favicon gstatic) avec en-tête CORS pour
      // permettre l'analyse de transparence côté client (canvas non taché).
      if (url.pathname === '/logo' && request.method === 'GET') {
        const domain = (url.searchParams.get('domain') || '').toLowerCase().replace(/[^a-z0-9.\-]/g, '');
        if (!domain || !domain.includes('.')) return json({ error: 'domaine invalide' }, 400);
        const sources = [
          `https://logo.clearbit.com/${domain}?size=128`,
          `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`,
        ];
        for (const src of sources) {
          try {
            const r = await fetch(src, {
              signal: AbortSignal.timeout(6000),
              cf: { cacheTtl: 86400, cacheEverything: true },
            });
            const ct = r.headers.get('Content-Type') || '';
            if (r.ok && ct.startsWith('image')) {
              return new Response(r.body, {
                status: 200,
                headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=604800', ...corsHeaders },
              });
            }
          } catch {}
        }
        return json({ error: 'logo introuvable' }, 404);
      }

      // ── POST /discord-link ──────────────────────────────────────────────
      // Lie un compte Discord au compte Capital Board. Le bot crée d'abord
      // discordLinkRequests/{token} (il connaît le discordId) ; ici on vérifie
      // l'idToken Firebase (on connaît l'uid) et on écrit le lien. Les deux
      // côtés sont authentifiés serveur — aucune écriture cliente.
      if (url.pathname === '/discord-link' && request.method === 'POST') {
        const { idToken, token } = await request.json();
        if (!idToken || typeof token !== 'string' || !/^[a-f0-9]{16,64}$/.test(token)) {
          return json({ ok: false, error: 'Paramètres invalides' }, 400);
        }

        const user = await verifyIdToken(idToken, env);

        const reqDoc = await firestoreGet(`discordLinkRequests/${token}`, env).catch(() => null);
        const discordId = reqDoc && fsStr(reqDoc, 'discordId');
        if (!discordId) return json({ ok: false, error: 'Lien invalide ou expiré' }, 404);

        const expiresAt = fsNum(reqDoc, 'expiresAt');
        if (expiresAt && expiresAt < Date.now()) {
          await firestoreDelete(`discordLinkRequests/${token}`, env).catch(() => {});
          return json({ ok: false, error: 'Lien expiré' }, 410);
        }

        await firestoreSet(`discordLinks/${discordId}`, {
          uid: { stringValue: user.localId },
          linkedAt: { integerValue: String(Date.now()) },
        }, env);
        await firestoreDelete(`discordLinkRequests/${token}`, env).catch(() => {});

        return json({ ok: true });
      }

      return json({ error: 'Not found' }, 404);

    } catch (e) {
      // Le detail reste dans les logs Cloudflare. Le renvoyer au client exposait
      // des messages internes : codes d'API Google, chemins Firestore, etat du
      // projet. Un jeton refuse est par ailleurs un 401, pas un 500.
      console.error(e.message);
      const authFailed = /Token|Signature|jwk|audience|emetteur|Cle publique/i.test(e.message || '');
      return authFailed
        ? json({ error: 'Authentification invalide' }, 401)
        : json({ error: 'Erreur serveur' }, 500);
    }
  },

  // Cron : diffusions email programmées + entretien du cache des favoris.
  async scheduled(event, env, ctx) {
    // Réchauffage des favoris. Bloc séparé du courrier : une panne Firestore ne
    // doit pas laisser le cache refroidir, ni l'inverse.
    ctx.waitUntil((async () => {
      try {
        // `list` donne la date d'expiration sans relire les 150 ko de valeur.
        const [k] = (await env.EARNINGS.list({ prefix: 'fav:v1' })).keys;
        // On rafraîchit dès qu'il reste moins d'un tour de cron : attendre
        // l'expiration réelle laisserait le KV froid jusqu'à 5 min, et le
        // visiteur qui tombe dans ce trou paie les 9 appels Meta (~2 s) — et
        // hérite de `stale` si Meta est en panne pile à cet instant.
        if (!k || (k.expiration && k.expiration < Date.now() / 1000 + 360)) {
          const { body } = await refreshFavoris(env);
          if (!body) console.error('cron favoris: collecte vide, cache conservé');
        }
      } catch (e) { console.error('cron favoris: ' + e.message); }
    })());

    ctx.waitUntil((async () => {
      let docs;
      try { docs = await firestoreList('scheduledEmails', env); }
      catch (e) { console.error('scheduled list: ' + e.message); return; }
      const now = Date.now();
      for (const d of docs) {
        const sendAt = fsNum(d, 'sendAt');
        if (sendAt == null || sendAt > now) continue;
        const id = d.name.split('/').pop();
        const subject = fsStr(d, 'subject');
        const html = fsStr(d, 'html');
        // Supprime d'abord : évite un double-envoi si deux crons se chevauchent.
        try { await firestoreDelete(`scheduledEmails/${id}`, env); }
        catch (e) { console.error('scheduled delete ' + id + ': ' + e.message); continue; }
        try { await broadcastEmailToAll(subject, html, env); }
        catch (e) { console.error('scheduled send ' + id + ': ' + e.message); }
      }
    })());

    // Purge des comptes jamais vérifiés. Le cron tourne toutes les 5 min mais
    // lister tout Firebase Auth à ce rythme n'a aucun intérêt : on limite à un
    // passage toutes les 6 h via un marqueur KV. Un délai de 7 jours tolère
    // largement quelques heures de retard.
    ctx.waitUntil((async () => {
      const KEY = 'purge:unverified:lastRun';
      try {
        const last = Number(await env.EARNINGS.get(KEY)) || 0;
        if (Date.now() - last < 6 * 60 * 60 * 1000) return;
        await env.EARNINGS.put(KEY, String(Date.now()));
        const n = await purgeUnverifiedAccounts(env);
        if (n) console.log(`purge non vérifiés: ${n} compte(s) supprimé(s)`);
      } catch (e) { console.error('cron purge: ' + e.message); }
    })());
  },
};
