'use strict';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

// In-memory repetition tracker: userId → [{ content, at }]
const recentMessages = new Map();
const REPEAT_WINDOW = 5 * 60 * 1000;

const PUB_KEYWORDS = [
  /\brejoins?\b/i,
  /\brejoignez\b/i,
  /\bserveur\s+discord\b/i,
  /\bmon\s+serveur\b/i,
  /\bcode\s+promo\b/i,
  /\bcode\s+de\s+r[eé]duction\b/i,
  /\bpromo\s+code\b/i,
  /\b\d+\s*%\s*de\s*r[eé]duction\b/i,
  /\b\d+\s*%\s*off\b/i,
  /\bgagnez?\b/i,
  /\b(?:en\s+)?mp\b/i,
  /\b(?:en\s+)?dm\b/i,
  /\bmessage\s+priv[eé]\b/i,
  /\bje\s+(?:te\s+)?vends?\b/i,
  /\blien\s+en\s+bio\b/i,
  /\blink\s+in\s+bio\b/i,
  /\bclique(?:z)?\s+ici\b/i,
  /\bclick\s+here\b/i,
  /\boffre\s+limit[eé]e?\b/i,
  /\blimited\s+offer\b/i,
  /\babonnez?-vous\b/i,
  /\bsubscribe\b/i,
  /\bfollow(?:ez|s)?\b/i,
  /\btelegram\b/i,
  /\bwhatsapp\b/i,
  /\bearn\s+money\b/i,
  /\bmake\s+money\b/i,
  /\bairdrop\b/i,
  /\bcrypto\s+pump\b/i,
  /\bx\d+\b/i,
];

function wordSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function scoreMessage(content, userId) {
  let score = 0;
  const reasons = [];

  // 1. Mots-clés pub
  const hits = PUB_KEYWORDS.filter((r) => r.test(content));
  if (hits.length > 0) {
    score += hits.length * 2;
    reasons.push(`mots-clés pub (×${hits.length})`);
  }

  // 2. Majuscules abusives (>60%, min 15 lettres)
  const letters = content.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (letters.length >= 15) {
    const capRatio = content.replace(/[^A-ZÀ-Ÿ]/g, '').length / letters.length;
    if (capRatio > 0.6) {
      score += 3;
      reasons.push('majuscules excessives');
    }
  }

  // 3. Emojis spam (>6)
  const emojiCount = [...content.matchAll(/\p{Emoji}/gu)].length;
  if (emojiCount > 6) {
    score += 2;
    reasons.push(`emojis excessifs (${emojiCount})`);
  }

  // 4. Mentions de masse (>2)
  const mentions = (content.match(/<@!?\d+>/g) || []).length;
  if (mentions > 2) {
    score += 3;
    reasons.push(`mentions excessives (${mentions})`);
  }

  // 5. Points d'exclamation spam (>3)
  const excl = (content.match(/!/g) || []).length;
  if (excl > 3) {
    score += 1;
    reasons.push(`exclamations excessives (${excl})`);
  }

  // 6. Répétition (message similaire dans les 5 dernières minutes)
  const now = Date.now();
  const prev = (recentMessages.get(userId) || []).filter((m) => now - m.at < REPEAT_WINDOW);
  const isRepeat = prev.some((m) => wordSimilarity(m.content, content) > 0.7);
  if (isRepeat) {
    score += 5;
    reasons.push('message répété');
  }
  recentMessages.set(userId, [...prev, { content, at: now }].slice(-10));

  return { score, reasons };
}

async function classifyWithMistral(content) {
  if (!MISTRAL_API_KEY) return false;
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{
          role: 'user',
          content: `Tu es modérateur strict sur un serveur Discord de finance et investissement. Le règlement interdit toute publicité, vente, promotion, sollicitation commerciale ou invitation vers une plateforme externe. Ce message enfreint-il cette règle ? Réponds uniquement par "oui" ou "non".\n\nMessage : ${content.slice(0, 500)}`,
        }],
        temperature: 0,
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    return (json?.choices?.[0]?.message?.content || '').trim().toLowerCase().startsWith('oui');
  } catch {
    return false;
  }
}

const HIGH_SCORE = 8;
const MID_SCORE  = 2;

async function checkPub(content, userId) {
  const { score, reasons } = scoreMessage(content, userId);
  if (score < MID_SCORE) return { blocked: false };
  if (score >= HIGH_SCORE) return { blocked: true, reasons, method: 'score' };
  const isPub = await classifyWithMistral(content);
  if (isPub) return { blocked: true, reasons: [...reasons, 'confirmé Mistral'], method: 'mistral' };
  return { blocked: false };
}

module.exports = { checkPub };
