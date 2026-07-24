// Capital Board — Cloudflare Worker
// Endpoints : POST /verify-pin | POST /send-otp | GET /yahoo | GET /news | POST /chat

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
const FAV_TTL = 1800;   // KV : 30 min (ces comptes publient bien moins souvent)
const FAV_MAX = 120;    // plafond global de la page
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
    `{username,media.limit(${FAV_PER_ACCOUNT})` +
    `{caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_url,thumbnail_url}}}`;
  const url = `https://graph.facebook.com/${IG_GRAPH_VERSION}/${encodeURIComponent(env.IG_USER_ID)}`
    + `?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(env.IG_GRAPH_TOKEN)}`;

  const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
  const data = await r.json().catch(() => null);
  const bd = data && data.business_discovery;
  if (!r.ok || !bd) return [];   // compte non pro, handle inconnu, ou jeton mort

  const source = '@' + (bd.username || handle);
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
  if (!payload.sub)                throw new Error('Token sub manquant');

  const jwks = await getGoogleJwks();
  const jwk  = jwks.keys?.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('Clé publique introuvable');

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const sigInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const sig      = b64urlDecode(parts[2]);
  const valid    = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, sigInput);
  if (!valid) throw new Error('Signature invalide');

  return { localId: payload.sub, email: payload.email };
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
    (data.userInfo || []).forEach(u => { if (u.localId) users.push({ localId: u.localId, email: u.email || '' }); });
    nextPageToken = data.nextPageToken || '';
  } while (nextPageToken);
  return users;
}

// Emails des comptes Auth (pour les diffusions).
async function listAuthEmails(env) {
  return (await listAuthUsers(env)).map(u => u.email).filter(Boolean);
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

function emailDelete(code) {
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

// Earnings d'un symbole avec cache KV 24h (clé earn:SYM).
async function getSymbolEarningsCached(sym, env) {
  const key = 'earn5:' + sym.toUpperCase();
  const cached = await env.EARNINGS.get(key);
  if (cached !== null) return JSON.parse(cached);
  let items = null;
  try { items = await fetchSymbolEarnings(sym, env); }
  catch (e) { console.error('earnings', sym, e.message); }
  // TTL adaptatif : succès avec date = 24h ; vide = 1h (re-check) ; erreur = 10min.
  if (items === null) { await env.EARNINGS.put(key, '[]', { expirationTtl: 600 }); return []; }
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
        const doc  = await firestoreGet(`users/${user.localId}/data/security`, env);
        const pinHash = fsStr(doc, 'pinHash');
        const pinSalt = fsStr(doc, 'pinSalt');
        if (!pinHash || !pinSalt) return json({ valid: false });

        const computed = await sha256(pinSalt + pin);
        return json({ valid: computed === pinHash });
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
        } catch (e) { return json({ error: e.message }, 500); }
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

      // ── POST /admin/broadcast-push ──────────────────────────────────────
      if (url.pathname === '/admin/broadcast-push' && request.method === 'POST') {
        const { idToken, title, body } = await request.json();
        const user = await verifyIdToken(idToken, env);
        if (!user || user.localId !== env.ADMIN_UID) return json({ error: 'forbidden' }, 403);
        if (!title || !body) return json({ error: 'Titre et message requis' }, 400);
        const roles = await firestoreList('roles', env);
        const tokens = roles.map(d => fsStr(d, 'fcmToken')).filter(Boolean);
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

      // ── POST /send-otp ──────────────────────────────────────────────────
      if (url.pathname === '/send-otp' && request.method === 'POST') {
        const { idToken, type, code, deviceLabel, location, turnstileToken } = await request.json();
        if (!idToken || !code || !['delete', '2fa'].includes(type)) {
          return json({ ok: false, error: 'Paramètres invalides' }, 400);
        }
        // Turnstile requis pour suppression (hors session), optionnel pour 2FA (user déjà authentifié au login)
        if (type === 'delete') {
          const humanVerified = await verifyTurnstile(turnstileToken, env);
          if (!humanVerified) return json({ ok: false, error: 'Vérification humaine échouée' }, 403);
        }

        const user = await verifyIdToken(idToken, env);
        if (!user.email) return json({ ok: false, error: 'Email introuvable' }, 400);

        const [subject, html] = type === 'delete'
          ? ['Confirmation suppression de compte — Capital Board', emailDelete(code)]
          : ['Code de vérification — nouvel appareil Capital Board', email2fa(code, deviceLabel, location)];

        await sendEmail(user.email, subject, html, env);
        return json({ ok: true });
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
        const syms = [...new Set(symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))].slice(0, 130);
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

        const data = await buildFavoris(env);
        if (data.unconfigured) return json(data);   // rien à mettre en cache
        if (data.items.length) {
          const body = JSON.stringify(data);
          await env.EARNINGS.put('fav:v1', body, { expirationTtl: FAV_TTL });
          await env.EARNINGS.put('fav:last', body);
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
        const symbols = [...new Set(rawSyms.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 60);

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
        if (!symbol) return json({ error: 'symbol manquant' }, 400);
        const key = 'earndet1:' + symbol;
        const cached = await env.EARNINGS.get(key);
        if (cached !== null) {
          return new Response(cached, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders } });
        }
        let detail = null;
        try { detail = await fetchSymbolEarningsDetail(symbol, env); }
        catch (e) { console.error('earnings-detail', symbol, e.message); }
        const payload = JSON.stringify(detail || { error: 'indisponible' });
        await env.EARNINGS.put(key, payload, { expirationTtl: detail ? EARN_TTL : 600 });
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
      console.error(e.message);
      return json({ error: e.message }, 500);
    }
  },

  // Cron : envoie les diffusions email programmées arrivées à échéance.
  async scheduled(event, env, ctx) {
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
  },
};
