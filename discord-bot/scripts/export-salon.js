'use strict';

// Exporte tout l'historique d'un salon Discord, du plus ancien au plus récent.
//
//   node scripts/export-salon.js --salon <id> [--sortie fichier.json] [--md fichier.md]
//
// Sert à relire à froid ce qui s'est accumulé dans un salon — les suggestions,
// par exemple — pour en tirer une décision. L'API ne rend que 100 messages par
// appel : on remonte par pages avec `before`, jusqu'à épuisement.
//
// La sortie n'a pas sa place dans le dépôt : elle contient les messages des
// membres. Écrire dans un dossier temporaire, pas ici.

require('dotenv').config();

const { writeFileSync } = require('fs');

const args = process.argv.slice(2);
const opt = (nom) => {
  const i = args.indexOf('--' + nom);
  return i === -1 || i === args.length - 1 ? null : args[i + 1];
};

const salon = opt('salon');
const token = process.env.DISCORD_TOKEN;
if (!salon) { console.error('Préciser --salon <id>.'); process.exit(1); }
if (!token) { console.error('DISCORD_TOKEN manquant.'); process.exit(1); }

const api = async (chemin) => {
  const res = await fetch(`https://discord.com/api/v10${chemin}`, {
    headers: { Authorization: `Bot ${token}` },
  });
  // 429 : l'API demande d'attendre. Elle dit combien de temps, on obéit.
  if (res.status === 429) {
    const { retry_after: attente } = await res.json();
    await new Promise((r) => setTimeout(r, (attente + 0.5) * 1000));
    return api(chemin);
  }
  if (!res.ok) throw new Error(`Discord ${res.status} : ${(await res.text()).slice(0, 200)}`);
  return res.json();
};

(async () => {
  const infos = await api(`/channels/${salon}`);
  const messages = [];
  let avant = null;

  for (;;) {
    const page = await api(`/channels/${salon}/messages?limit=100${avant ? `&before=${avant}` : ''}`);
    if (!page.length) break;
    messages.push(...page);
    avant = page[page.length - 1].id;
    process.stderr.write(`\r${messages.length} messages…`);
    if (page.length < 100) break;
  }
  process.stderr.write('\n');

  messages.reverse(); // l'API rend du plus récent au plus ancien

  const propre = messages.map((m) => ({
    id: m.id,
    date: m.timestamp,
    auteur: m.author?.global_name || m.author?.username,
    bot: Boolean(m.author?.bot),
    contenu: m.content,
    embeds: (m.embeds || []).map((e) => ({
      titre: e.title || null,
      description: e.description || null,
      champs: (e.fields || []).map((f) => `${f.name} : ${f.value}`),
    })),
    pieces: (m.attachments || []).map((p) => p.filename),
    reactions: (m.reactions || []).map((r) => `${r.emoji.name} ×${r.count}`),
  }));

  const sortieJson = opt('sortie');
  if (sortieJson) {
    writeFileSync(sortieJson, JSON.stringify({ salon: infos.name, messages: propre }, null, 2), 'utf8');
    console.log(`${sortieJson} écrit.`);
  }

  const sortieMd = opt('md');
  if (sortieMd) {
    const lignes = [`# ${infos.name}`, '', `${propre.length} messages, export du ${new Date().toISOString().slice(0, 10)}.`, ''];
    for (const m of propre) {
      lignes.push(`## ${m.date.slice(0, 16).replace('T', ' ')} — ${m.auteur}${m.bot ? ' (bot)' : ''}`, '');
      if (m.contenu) lignes.push(m.contenu, '');
      for (const e of m.embeds) {
        if (e.titre) lignes.push(`**${e.titre}**`, '');
        if (e.description) lignes.push(e.description, '');
        for (const c of e.champs) lignes.push(`- ${c}`);
        if (e.champs.length) lignes.push('');
      }
      if (m.pieces.length) lignes.push(`Pièces jointes : ${m.pieces.join(', ')}`, '');
      if (m.reactions.length) lignes.push(`Réactions : ${m.reactions.join(' ')}`, '');
    }
    writeFileSync(sortieMd, lignes.join('\n'), 'utf8');
    console.log(`${sortieMd} écrit.`);
  }

  if (!sortieJson && !sortieMd) console.log(JSON.stringify(propre, null, 2));
})().catch((e) => { console.error(e.message); process.exit(1); });
