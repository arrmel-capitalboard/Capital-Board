'use strict';

// Classement anonyme de la communauté, dans un salon dédié : un seul embed,
// réédité sur place à chaque rafraîchissement plutôt que reposté (le salon
// reste propre et le lien vers le message ne change jamais).
//
// Trois classements dans le même embed :
//   1. plus-values latentes  (portefeuille valorisé au cours du jour)
//   2. dividendes perçus     (toutes les transactions « dividend »)
//   3. ancienneté            (date du premier investissement enregistré)
//
// Périmètre : uniquement les comptes Discord liés (discordLinks). Un membre qui
// n'a pas fait /link n'est jamais classé.
//
// Anonymat : chaque compte est réduit à « Membre #xxxx », dérivé de l'uid par
// hachage — stable dans le temps, non réversible, et affiché à l'intéressé par
// /portefeuille pour qu'il puisse se reconnaître. L'anonymat d'un classement
// tient au nombre de participants : à trois participants, chacun connaît son
// chiffre et déduit les autres par élimination. D'où MIN_PARTICIPANTS, en
// dessous duquel l'embed n'affiche aucun chiffre.

const crypto = require('node:crypto');
const { EmbedBuilder } = require('discord.js');
const { getDb, isConfigured } = require('../firebase');
const { fetchPrice } = require('./prices');
const config = require('../config');

const CHANNEL = '1529424510640455781';
const META = 'botState/leaderboard';
const REFRESH_INTERVAL = 6 * 60 * 60 * 1000;   // 6 h : les cours bougent, pas les classements
const TOP = 10;
const MIN_PARTICIPANTS = 1;   // seuil d'anonymat, voir en-tête (abaissé : classement voulu visible dès le lancement)

const fmtEur = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')} %`;

const RANKS = ['🥇', '🥈', '🥉'];
const rank = (i) => RANKS[i] || `\`${String(i + 1).padStart(2, ' ')}.\``;

/** Identifiant public d'un compte : stable, non réversible, sans lien visible avec l'uid. */
function alias(uid) {
  return `Membre #${crypto.createHash('sha256').update(uid).digest('hex').slice(0, 4)}`;
}

/** Durée écoulée depuis un timestamp, en années et mois (« 3 ans 2 mois »). */
function since(ts) {
  const months = Math.max(0, Math.floor((Date.now() - ts) / (30.44 * 86_400_000)));
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m} mois`;
  if (!m) return `${y} an${y > 1 ? 's' : ''}`;
  return `${y} an${y > 1 ? 's' : ''} ${m} mois`;
}

/** Items d'une sous-collection de données utilisateur. */
async function userItems(uid, col) {
  const snap = await getDb().doc(`users/${uid}/data/${col}`).get();
  return snap.exists ? snap.data().items || [] : [];
}

/** Uids liés à un compte Discord, dédoublonnés (deux comptes Discord peuvent viser le même uid). */
async function linkedUids() {
  const snap = await getDb().collection('discordLinks').get();
  return [...new Set(snap.docs.map((d) => d.data().uid).filter(Boolean))];
}

/**
 * Agrège un compte. Retourne null si le compte n'a rien d'exploitable.
 * `quotes` : Map ticker → cours, résolue en amont pour ne coter chaque
 * valeur qu'une fois pour toute la communauté.
 */
function summarize(uid, portfolio, transactions, quotes) {
  let value = 0;
  let cost = 0;
  let priced = 0;

  for (const it of portfolio) {
    const qty = Number(it.qty) || 0;
    const buy = Number(it.buyPrice) || 0;
    if (qty <= 0 || buy <= 0) continue;
    cost += qty * buy;
    const q = quotes.get(it.ticker);
    if (q) {
      value += qty * q;
      priced++;
    }
  }

  let dividends = 0;
  let firstTs = Infinity;
  for (const t of transactions) {
    if (t.type === 'dividend') {
      dividends += (Number(t.qty) || 0) * (Number(t.price) || 0);
    }
    if (t.type === 'buy') {
      const ts = Date.parse(t.date);
      if (ts && ts < firstTs) firstTs = ts;
    }
  }

  // Repli sur les buyDate du portefeuille : un compte importé peut n'avoir
  // aucune transaction d'achat enregistrée.
  for (const it of portfolio) {
    const ts = Date.parse(it.buyDate);
    if (ts && ts < firstTs) firstTs = ts;
  }

  // Une seule ligne non cotée fausse la plus-value : on ne classe le compte
  // que si tout son portefeuille a un cours.
  const complete = portfolio.length > 0 && priced === portfolio.filter((i) => Number(i.qty) > 0 && Number(i.buyPrice) > 0).length;

  return {
    alias: alias(uid),
    plEur: complete && cost > 0 ? value - cost : null,
    plPct: complete && cost > 0 ? ((value - cost) / cost) * 100 : null,
    dividends,
    firstTs: firstTs !== Infinity && firstTs <= Date.now() ? firstTs : null,
  };
}

/** Collecte et agrège toute la communauté. */
async function collect() {
  const uids = await linkedUids();
  if (!uids.length) return [];

  const data = await Promise.all(
    uids.map(async (uid) => {
      try {
        const [portfolio, transactions] = await Promise.all([
          userItems(uid, 'portfolio'),
          userItems(uid, 'transactions'),
        ]);
        return { uid, portfolio, transactions };
      } catch (e) {
        console.error(`[leaderboard] lecture ${uid} : ${e.message}`);
        return null;
      }
    }),
  );

  const accounts = data.filter(Boolean);

  // Un appel par valeur distincte, pas un par ligne de portefeuille.
  const tickers = [...new Set(accounts.flatMap((a) => a.portfolio.map((i) => i.ticker)).filter(Boolean))];
  const prices = await Promise.all(tickers.map((t) => fetchPrice(t)));
  const quotes = new Map();
  tickers.forEach((t, i) => { if (prices[i]) quotes.set(t, prices[i].price); });

  return accounts.map((a) => summarize(a.uid, a.portfolio, a.transactions, quotes));
}

/** Une ligne de classement par participant, ou un message d'absence. */
function board(rows, format) {
  if (!rows.length) return '_Personne n’est encore classé ici._';
  return rows.slice(0, TOP).map((r, i) => `${rank(i)} ${r.alias} — ${format(r)}`).join('\n');
}

const HOWTO =
  'Créez votre portefeuille sur [capitalboard.fr](https://capitalboard.fr), puis tapez `/link` dans ce salon : ' +
  'le bot vous donne un code à valider sur le site. Une fois lié, vous entrez automatiquement ' +
  'dans le classement — sous un identifiant anonyme, jamais sous votre pseudo. `/unlink` vous en retire.';

function buildEmbed(rows) {
  const embed = new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle('🏆 Classement de la communauté')
    .setFooter({ text: 'CapitalBoard - https://capitalboard.fr' })
    .setTimestamp();

  if (rows.length < MIN_PARTICIPANTS) {
    return embed
      .setDescription(
        `Le classement s’affichera dès **${MIN_PARTICIPANTS} participants** ` +
        `(actuellement ${rows.length}). En dessous, publier les chiffres reviendrait à ` +
        'exposer le portefeuille de chacun : à trois, tout le monde se reconnaît par élimination.',
      )
      .addFields({ name: '🔗 Comment participer', value: HOWTO });
  }

  const pl = rows.filter((r) => r.plPct !== null).sort((a, b) => b.plPct - a.plPct);
  const div = rows.filter((r) => r.dividends > 0).sort((a, b) => b.dividends - a.dividends);
  const old = rows.filter((r) => r.firstTs).sort((a, b) => a.firstTs - b.firstTs);

  return embed
    .setDescription(
      `Classement **anonyme** des membres ayant lié leur compte, mis à jour toutes les 6 h. ` +
      `${rows.length} participants.`,
    )
    .addFields(
      {
        name: '📈 Plus-values latentes',
        value: board(pl, (r) => `**${fmtPct(r.plPct)}** · ${r.plEur >= 0 ? '+' : ''}${fmtEur(r.plEur)}`),
      },
      {
        name: '💰 Dividendes perçus (total)',
        value: board(div, (r) => `**${fmtEur(r.dividends)}**`),
      },
      {
        name: '⏳ Ancienneté — premier investissement',
        value: board(old, (r) => `**${since(r.firstTs)}**`),
      },
      { name: '🔗 Comment y figurer', value: HOWTO },
    );
}

/** Poste l'embed, ou réédite celui déjà en place. */
async function publish(client, embed) {
  const metaRef = getDb().doc(META);
  const meta = await metaRef.get();
  const messageId = meta.exists ? meta.data().messageId : null;

  const channel = await client.channels.fetch(CHANNEL);

  if (messageId) {
    try {
      const msg = await channel.messages.fetch(messageId);
      await msg.edit({ embeds: [embed] });
      return;
    } catch {
      // Message supprimé à la main : on en repose un.
    }
  }

  const msg = await channel.send({ embeds: [embed] });
  await metaRef.set({ messageId: msg.id, channelId: CHANNEL }, { merge: true });
}

/** Recalcule et met à jour l'embed. Retourne le nombre de participants. */
async function refresh(client) {
  const rows = await collect();
  await publish(client, buildEmbed(rows));
  console.log(`[leaderboard] ${rows.length} participant(s)`);
  return rows.length;
}

function start(client) {
  if (!isConfigured()) {
    console.log('[leaderboard] désactivé (Firestore non configuré)');
    return;
  }
  const run = () => refresh(client).catch((e) => console.error('[leaderboard] erreur :', e.message));
  run();
  setInterval(run, REFRESH_INTERVAL);
}

module.exports = { start, refresh, alias };
