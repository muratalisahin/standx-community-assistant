const LOCAL = import.meta.env.DEV;

/** Dev goes through the Vite proxy; production goes through the serverless proxy in /api. */
function root(path) {
  return LOCAL ? `/standx-api${path}` : `/api/proxy?path=${encodeURIComponent(path)}`;
}

export function marketUrl(symbol) {
  return root(symbol ? `/api/query_symbol_market?symbol=${encodeURIComponent(symbol)}` : "/api/query_market_overview");
}

export function depthUrl(symbol) {
  return root(`/api/query_depth_book?symbol=${encodeURIComponent(symbol)}&limit=40`);
}

export function klineUrl(symbol, resolution, from, to) {
  return root(
    `/api/kline/history?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}`
  );
}

export async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Request failed: ${r.status}`);
  return r.json();
}

export function parseOverview(raw) {
  const list = raw?.data?.symbols || raw?.symbols || raw?.data || [];
  const symbols = (Array.isArray(list) ? list : []).map((s) => ({
    symbol: s.symbol,
    mark: Number(s.mark_price ?? s.last_price ?? 0),
    last: Number(s.last_price ?? s.mark_price ?? 0),
    change: Number(s.price_change_pct ?? s.change_pct ?? 0),
    volume: Number(s.volume_quote_24h ?? s.quote_volume_24h ?? 0),
    oi: Number(s.open_interest_notional ?? s.open_interest ?? 0),
    funding: Number(s.funding_rate ?? 0),
  }));
  const summary = raw?.data?.summary || raw?.summary || null;
  const total = symbols.reduce(
    (acc, s) => ({ volume: acc.volume + s.volume, oi: acc.oi + s.oi }),
    { volume: 0, oi: 0 }
  );
  return {
    symbols: symbols.filter((s) => s.symbol),
    volume24h: Number(summary?.volume_quote_24h ?? total.volume),
    openInterest: Number(summary?.open_interest_notional ?? total.oi),
  };
}

export function parseDepth(raw) {
  const d = raw?.data || raw || {};
  const norm = (rows) =>
    (Array.isArray(rows) ? rows : [])
      .map((r) => (Array.isArray(r) ? { price: Number(r[0]), qty: Number(r[1]) } : { price: Number(r.price), qty: Number(r.qty ?? r.size) }))
      .filter((r) => Number.isFinite(r.price) && Number.isFinite(r.qty) && r.qty > 0);
  const bids = norm(d.bids).sort((a, b) => b.price - a.price).slice(0, 24);
  const asks = norm(d.asks).sort((a, b) => a.price - b.price).slice(0, 24);
  if (!bids.length || !asks.length) return null;
  const bidSum = bids.reduce((n, r) => n + r.qty, 0);
  const askSum = asks.reduce((n, r) => n + r.qty, 0);
  const mid = (bids[0].price + asks[0].price) / 2;
  return {
    bids,
    asks,
    mid,
    spreadBps: ((asks[0].price - bids[0].price) / mid) * 10000,
    imbalance: (bidSum - askSum) / (bidSum + askSum || 1),
  };
}

export function parseKlines(raw) {
  const d = raw?.data || raw || {};
  if (!Array.isArray(d.c)) return [];
  return d.c.map((c, i) => ({ t: Number(d.t?.[i]) || i, c: Number(c) })).filter((b) => Number.isFinite(b.c));
}
