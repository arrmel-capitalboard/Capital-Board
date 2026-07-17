'use strict';

// Cours via Yahoo Finance (endpoint chart public, pas de clé).
async function fetchPrice(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose || price;
    const changePct =
      meta.regularMarketChangePercent !== undefined
        ? meta.regularMarketChangePercent
        : prev ? ((price - prev) / prev) * 100 : 0;
    return {
      price,
      prev,
      changePct,
      currency: meta.currency || 'EUR',
      name: meta.shortName || meta.longName || ticker,
    };
  } catch {
    return null;
  }
}

module.exports = { fetchPrice };
