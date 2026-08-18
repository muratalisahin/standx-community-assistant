import { fetchJson, marketUrl, parseOverview } from "./api.js";
import { money, pct, px } from "./format.js";
import { ask as askDocs } from "./assistant.js";

const WIKI = {
  tr: "https://tr.wikipedia.org",
  en: "https://en.wikipedia.org",
  fr: "https://fr.wikipedia.org",
  zh: "https://zh.wikipedia.org",
  ja: "https://ja.wikipedia.org",
};

/** Common tickers → CoinGecko ids. Search API covers everything else. */
const GECKO = {
  btc: "bitcoin",
  bitcoin: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  sol: "solana",
  solana: "solana",
  bnb: "binancecoin",
  xrp: "ripple",
  ripple: "ripple",
  doge: "dogecoin",
  dogecoin: "dogecoin",
  ada: "cardano",
  cardano: "cardano",
  avax: "avalanche-2",
  avalanche: "avalanche-2",
  link: "chainlink",
  chainlink: "chainlink",
  sui: "sui",
  hype: "hyperliquid",
  hyperliquid: "hyperliquid",
  pepe: "pepe",
  wif: "dogwifcoin",
  near: "near",
  apt: "aptos",
  aptos: "aptos",
  arb: "arbitrum",
  arbitrum: "arbitrum",
  op: "optimism",
  optimism: "optimism",
  matic: "matic-network",
  pol: "polygon-ecosystem-token",
  polygon: "matic-network",
  ton: "the-open-network",
  trx: "tron",
  tron: "tron",
  ltc: "litecoin",
  litecoin: "litecoin",
  atom: "cosmos",
  cosmos: "cosmos",
  uni: "uniswap",
  uniswap: "uniswap",
  aave: "aave",
  shib: "shiba-inu",
  dot: "polkadot",
  polkadot: "polkadot",
  sei: "sei-network",
  inj: "injective-protocol",
  tia: "celestia",
  jup: "jupiter-exchange-solana",
  pyth: "pyth-network",
  wld: "worldcoin-wld",
  ondo: "ondo-finance",
  ena: "ethena",
  tao: "bittensor",
  render: "render-token",
  fet: "fetch-ai",
  fil: "filecoin",
  icp: "internet-computer",
  usdt: "tether",
  tether: "tether",
  usdc: "usd-coin",
};

const LISTED_WIKI = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB",
  SOL: "Solana",
  HYPE: "Hyperliquid",
  XAU: "Gold",
  XAG: "Silver",
  CL: "Petroleum",
  TSLA: "Tesla, Inc.",
  SPCX: "SpaceX",
  MU: "Micron Technology",
};

const STANDX_RE =
  /\b(dusd|standx|stander|sip-?\d|perps?|perpetual|likidasyon|liquidation|maker|taker|redeem|mint|vault|holder|cash wallet|cüzdan|block trade|adl|marj|margin|kaldıra[cç]|leverage|oracle|slp|greenlist|mainnet|teminat|collateral|funding)\b/i;

const SPORT_RE =
  /\b(futbol|football|soccer|basketbol|basketball|nba|nfl|ucl|şampiyonlar ligi|messi|ronaldo|haaland|mbappe|galatasaray|fenerbah|beşiktaş|besiktas|trabzonspor|dünya kupası|world cup|olimpiyat|olympic|formula ?1|tenis|tennis|premier league|la liga|serie a|bundesliga|süper lig|super lig|derbi|lakers|celtics|fifa|uefa)\b/i;

const STOP = {
  tr: new Set(["nedir", "ne", "nasıl", "kim", "kimdir", "neden", "hangi", "kaç", "bana", "anlat", "hakkında", "mi", "mı", "mu", "mü", "fiyatı", "fiyat"]),
  en: new Set(["what", "is", "who", "how", "does", "the", "a", "an", "tell", "me", "about", "please", "price", "now"]),
  fr: new Set(["quoi", "qu", "est", "ce", "que", "qui", "comment", "le", "la", "les", "un", "une", "de", "prix"]),
  zh: new Set(["什么", "是", "谁", "怎么", "如何", "的", "价格"]),
  ja: new Set(["何", "なに", "誰", "どう", "とは", "です", "か", "いくら"]),
};

const cache = new Map();
let marketsAt = 0;
let markets = [];

function clip(text, max = 420) {
  const clean = String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const dot = cut.lastIndexOf(". ");
  return (dot > 120 ? cut.slice(0, dot + 1) : cut).trim();
}

function searchKey(q, lang) {
  const stop = STOP[lang] || STOP.en;
  return (
    String(q || "")
      .replace(/[?？!！.。]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !stop.has(w.toLowerCase()))
      .join(" ")
      .trim() || String(q || "").trim()
  );
}

async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}

async function loadMarkets() {
  if (Date.now() - marketsAt < 8000 && markets.length) return markets;
  try {
    markets = parseOverview(await fetchJson(marketUrl())).symbols || [];
    marketsAt = Date.now();
  } catch {
    /* keep last */
  }
  return markets;
}

function findLive(q, list) {
  const n = String(q || "").toLowerCase();
  return list.find((m) => {
    const base = m.symbol.split("-")[0].toLowerCase();
    if (!base) return false;
    try {
      return new RegExp(`\\b${base}\\b`, "i").test(n) || n.includes(m.symbol.toLowerCase());
    } catch {
      return n.includes(base);
    }
  });
}

function geckoIdFromText(q) {
  const n = String(q || "").toLowerCase();
  for (const [k, id] of Object.entries(GECKO)) {
    if (new RegExp(`\\b${k}\\b`, "i").test(n)) return id;
  }
  return null;
}

async function wikiLookup(query, lang) {
  const host = WIKI[lang] || WIKI.en;
  const q = String(query || "").trim();
  if (!q) return null;
  const key = `wiki:${lang}:${q.toLowerCase()}`;
  return cached(key, 180000, async () => {
    try {
      const searchUrl = `${host}/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=3&namespace=0&format=json&origin=*`;
      const pack = await (await fetch(searchUrl)).json();
      const titles = Array.isArray(pack?.[1]) ? pack[1] : [];
      for (const title of titles) {
        const sumUrl = `${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const sum = await (await fetch(sumUrl, { headers: { accept: "application/json" } })).json();
        if (!sum?.extract || sum.type === "disambiguation") continue;
        return {
          title: sum.title || title,
          text: clip(sum.extract, 360),
          url: sum.content_urls?.desktop?.page || `${host}/wiki/${encodeURIComponent(title)}`,
        };
      }
    } catch {
      return null;
    }
    return null;
  });
}

async function geckoSearch(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return null;
  const key = `cgs:${q.toLowerCase()}`;
  return cached(key, 180000, async () => {
    try {
      const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`;
      const raw = await (await fetch(url)).json();
      const coins = Array.isArray(raw?.coins) ? raw.coins : [];
      const n = q.toLowerCase();
      const exactSym = coins.find((c) => String(c.symbol || "").toLowerCase() === n);
      const exactName = coins.find((c) => String(c.name || "").toLowerCase() === n);
      const contains = coins.find((c) => {
        const sym = String(c.symbol || "").toLowerCase();
        const name = String(c.name || "").toLowerCase();
        return (sym.length >= 2 && (n === sym || new RegExp(`\\b${sym}\\b`, "i").test(n))) || n.includes(name);
      });
      return exactSym || exactName || contains || null;
    } catch {
      return null;
    }
  });
}

async function geckoCoin(id, lang) {
  const key = `cgd:${id}:${lang}`;
  return cached(key, 60000, async () => {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=true&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
      const raw = await (await fetch(url)).json();
      if (!raw?.id) return null;
      const md = raw.market_data || {};
      const descMap = raw.description || {};
      const desc = descMap[lang] || descMap.en || "";
      return {
        id: raw.id,
        name: raw.name,
        symbol: String(raw.symbol || "").toUpperCase(),
        usd: md.current_price?.usd,
        change: md.price_change_percentage_24h,
        cap: md.market_cap?.usd,
        vol: md.total_volume?.usd,
        rank: raw.market_cap_rank,
        text: clip(desc, 380),
        url: `https://www.coingecko.com/en/coins/${raw.id}`,
      };
    } catch {
      return null;
    }
  });
}

function line(lang, parts) {
  return parts[lang] || parts.en;
}

function sportsNo(lang) {
  return line(lang, {
    tr: "Spor yok — Stander yalnızca StandX ve kripto konuşur. DUSD, perps, SIP’ler veya bir coin sor.",
    en: "No sports — Stander only talks StandX and crypto. Ask about DUSD, perps, the SIPs, or a coin.",
    fr: "Pas de sport — Stander ne parle que de StandX et de crypto. Demande DUSD, perps, SIP, ou une coin.",
    zh: "不谈体育 — Stander 只讲 StandX 和加密。问 DUSD、永续、SIP 或某个币。",
    ja: "スポーツは扱いません。Stander は StandX と暗号資産だけです。DUSD、パープス、SIP、コインを聞いてください。",
  });
}

function liveLine(lang, m) {
  const change = pct(m.change);
  return line(lang, {
    tr: `StandX canlı: ${m.symbol} mark ${px(m.mark)}, 24s ${change}, hacim ${money(m.volume)}, açık faiz ${money(m.oi)}. Yatırım tavsiyesi değil.`,
    en: `Live on StandX: ${m.symbol} mark ${px(m.mark)}, 24h ${change}, volume ${money(m.volume)}, OI ${money(m.oi)}. Not investment advice.`,
    fr: `Live StandX : ${m.symbol} mark ${px(m.mark)}, 24h ${change}, volume ${money(m.volume)}, OI ${money(m.oi)}. Pas un conseil d’investissement.`,
    zh: `StandX 实时：${m.symbol} 标记价 ${px(m.mark)}，24小时 ${change}，成交 ${money(m.volume)}，未平仓 ${money(m.oi)}。非投资建议。`,
    ja: `StandX ライブ：${m.symbol} マーク ${px(m.mark)}、24時間 ${change}、出来高 ${money(m.volume)}、建玉 ${money(m.oi)}。投資助言ではありません。`,
  });
}

function geckoLine(lang, coin) {
  const ch = Number.isFinite(coin.change) ? `${coin.change >= 0 ? "+" : ""}${coin.change.toFixed(2)}%` : "—";
  const price = Number.isFinite(coin.usd) ? `$${Number(coin.usd).toLocaleString("en-US")}` : "—";
  const cap = coin.cap ? money(coin.cap) : "—";
  const rank = coin.rank ? `#${coin.rank}` : "—";
  return line(lang, {
    tr: `${coin.name} (${coin.symbol}) ≈ ${price} (24s ${ch}). Piyasa değeri ${cap}, sıra ${rank}. Yatırım tavsiyesi değil.`,
    en: `${coin.name} (${coin.symbol}) ≈ ${price} (24h ${ch}). Market cap ${cap}, rank ${rank}. Not investment advice.`,
    fr: `${coin.name} (${coin.symbol}) ≈ ${price} (24h ${ch}). Market cap ${cap}, rang ${rank}. Pas un conseil d’investissement.`,
    zh: `${coin.name}（${coin.symbol}）≈ ${price}（24小时 ${ch}）。市值 ${cap}，排名 ${rank}。非投资建议。`,
    ja: `${coin.name}（${coin.symbol}）≈ ${price}（24時間 ${ch}）。時価総額 ${cap}、順位 ${rank}。投資助言ではありません。`,
  });
}

async function cryptoBundle(question, lang, list) {
  const live = findLive(question, list);
  const mapped = geckoIdFromText(question);
  const query = searchKey(question, lang);
  const searched = mapped ? { id: mapped } : await geckoSearch(query);
  const id = searched?.id || mapped;
  const coin = id ? await geckoCoin(id, lang) : null;
  const wikiQ = live ? LISTED_WIKI[live.symbol.split("-")[0]] || coin?.name : coin?.name;
  const wiki = !coin?.text && wikiQ ? await wikiLookup(wikiQ, lang) : null;

  if (!live && !coin) return null;

  const bits = [];
  if (live) bits.push(liveLine(lang, live));
  if (coin) bits.push(geckoLine(lang, coin));
  if (coin?.text) bits.push(coin.text);
  else if (wiki?.text) bits.push(wiki.text);

  return {
    kind: "crypto",
    text: bits.join(" "),
    source: live ? "StandX live" : coin?.name || wiki?.title || "CoinGecko",
    url: live ? "https://standx.com/perps" : coin?.url || wiki?.url,
  };
}

export async function reply(question, lang = "en") {
  const q = String(question || "").trim();
  if (!q) return null;

  if (SPORT_RE.test(q) && !STANDX_RE.test(q)) {
    return { kind: "refuse", text: sportsNo(lang) };
  }

  const list = await loadMarkets();
  const protocol = STANDX_RE.test(q);
  const docs = askDocs(q, lang);
  const crypto = await cryptoBundle(q, lang, list);

  if (crypto && protocol && docs) {
    return {
      kind: "crypto",
      text: `${crypto.text} ${docs.text}`,
      source: crypto.source,
      url: crypto.url,
    };
  }
  if (crypto) return crypto;
  if (docs) return { ...docs, kind: "docs" };
  return null;
}

export async function coinProfile(ticker, lang = "en") {
  const q = String(ticker || "").trim();
  if (!q) return null;
  const mapped = geckoIdFromText(q);
  const searched = mapped ? { id: mapped } : await geckoSearch(q);
  const id = searched?.id || mapped;
  return id ? geckoCoin(id, lang) : null;
}
