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

const GECKO = {
  btc: "bitcoin",
  bitcoin: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  sol: "solana",
  solana: "solana",
  bnb: "binancecoin",
  xrp: "ripple",
  doge: "dogecoin",
  ada: "cardano",
  avax: "avalanche-2",
  link: "chainlink",
  sui: "sui",
};

const STANDX_RE =
  /\b(dusd|standx|sip-?\d|perps|funding|likidasyon|liquidation|maker|taker|redeem|mint|vault|holder|trader puan|points page|cash wallet|block trade)\b/i;

const SPORT_RE =
  /\b(futbol|football|soccer|basket|nba|nfl|ucl|şampiyon|sampiyon|messi|ronaldo|haaland|mbappe|galatasaray|fenerbah|beşiktaş|besiktas|trabzonspor|trabzon|dünya kupası|world cup|olimpiyat|olympic|formula|f1|tenis|tennis|maç|match|gol|lig|spor|sport|transfer|offside|hakem|premier|la liga|serie a|bundesliga|super lig|süper lig|derbi|lakers|celtics)\b/i;

const LIVE_SCORE_RE = /\b(skor|score|dün|tonight|bu gece|kim kazandı|who won|canlı maç|live score)\b/i;

const STOP = {
  tr: new Set(["nedir", "ne", "nasıl", "kim", "kimdir", "neden", "hangi", "kaç", "bana", "anlat", "hakkında", "nedir", "mi", "mı", "mu", "mü"]),
  en: new Set(["what", "is", "who", "how", "does", "the", "a", "an", "tell", "me", "about", "please"]),
  fr: new Set(["quoi", "qu", "est", "ce", "que", "qui", "comment", "le", "la", "les", "un", "une", "de"]),
  zh: new Set(["什么", "是", "谁", "怎么", "如何", "的"]),
  ja: new Set(["何", "なに", "誰", "どう", "とは", "です", "か"]),
};

const cache = new Map();
let marketsAt = 0;
let markets = [];

function clip(text, max = 420) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const dot = cut.lastIndexOf(". ");
  return (dot > 120 ? cut.slice(0, dot + 1) : cut).trim();
}

function searchKey(q, lang) {
  const stop = STOP[lang] || STOP.en;
  return String(q || "")
    .replace(/[?？!！.。]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !stop.has(w.toLowerCase()))
    .join(" ")
    .trim() || String(q || "").trim();
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
    return base.length >= 3 && (n.includes(base) || n.includes(m.symbol.toLowerCase()));
  });
}

function geckoId(q) {
  const n = String(q || "").toLowerCase();
  for (const [k, id] of Object.entries(GECKO)) {
    if (new RegExp(`\\b${k}\\b`, "i").test(n)) return id;
  }
  return null;
}

async function wikiLookup(question, lang) {
  const host = WIKI[lang] || WIKI.en;
  const query = searchKey(question, lang);
  if (!query) return null;
  const key = `wiki:${lang}:${query.toLowerCase()}`;
  return cached(key, 120000, async () => {
    try {
      const searchUrl = `${host}/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=4&namespace=0&format=json&origin=*`;
      const pack = await (await fetch(searchUrl)).json();
      const titles = Array.isArray(pack?.[1]) ? pack[1] : [];
      for (const title of titles) {
        const sumUrl = `${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const sum = await (await fetch(sumUrl, { headers: { accept: "application/json" } })).json();
        if (!sum?.extract || sum.type === "disambiguation") continue;
        return {
          title: sum.title || title,
          text: clip(sum.extract),
          url: sum.content_urls?.desktop?.page || `${host}/wiki/${encodeURIComponent(title)}`,
        };
      }
    } catch {
      return null;
    }
    return null;
  });
}

async function geckoPrice(id) {
  const key = `cg:${id}`;
  return cached(key, 20000, async () => {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`;
      const raw = await (await fetch(url)).json();
      const row = raw?.[id];
      if (!row?.usd) return null;
      return { usd: row.usd, change: row.usd_24h_change };
    } catch {
      return null;
    }
  });
}

function line(lang, parts) {
  return parts[lang] || parts.en;
}

function withVoice(lang, extract, kind) {
  if (kind === "sports") {
    return line(lang, {
      tr: `Net söyleyeyim: ${extract}`,
      en: `Straight: ${extract}`,
      fr: `Direct : ${extract}`,
      zh: `直接说：${extract}`,
      ja: `はっきり言うと：${extract}`,
    });
  }
  return extract;
}

function liveLine(lang, m) {
  const change = pct(m.change);
  return line(lang, {
    tr: `StandX canlı: ${m.symbol} şu an ${px(m.mark)}, 24s ${change}, hacim ${money(m.volume)}. Yatırım tavsiyesi değil.`,
    en: `Live on StandX: ${m.symbol} is ${px(m.mark)}, 24h ${change}, volume ${money(m.volume)}. Not investment advice.`,
    fr: `Live StandX : ${m.symbol} à ${px(m.mark)}, 24h ${change}, volume ${money(m.volume)}. Pas un conseil d’investissement.`,
    zh: `StandX 实时：${m.symbol} 现价 ${px(m.mark)}，24小时 ${change}，成交 ${money(m.volume)}。非投资建议。`,
    ja: `StandX ライブ：${m.symbol} は ${px(m.mark)}、24時間 ${change}、出来高 ${money(m.volume)}。投資助言ではありません。`,
  });
}

function scoreNote(lang) {
  return line(lang, {
    tr: "Canlı skoru buradan çekmiyorum — uydurmam. Takımın kendisi şöyle:",
    en: "I will not invent a live score. Here is the side itself:",
    fr: "Je n’invente pas le score en direct. Voici l’équipe :",
    zh: "我不会编造即时比分。先说这支队伍：",
    ja: "ライブスコアはでっち上げません。チームはこうです：",
  });
}

export async function reply(question, lang = "en") {
  const q = String(question || "").trim();
  if (!q) return null;

  const sports = SPORT_RE.test(q);
  const protocol = STANDX_RE.test(q);

  if (protocol) {
    const docs = askDocs(q, lang);
    if (docs) return { ...docs, kind: "docs" };
  }

  const list = await loadMarkets();
  const live = findLive(q, list);
  const cg = geckoId(q);
  const wiki = await wikiLookup(q, lang);

  if (live && !sports) {
    const extra = wiki ? ` ${wiki.text}` : "";
    return {
      kind: "crypto",
      text: `${liveLine(lang, live)}${extra}`,
      source: wiki ? wiki.title : "StandX live",
      url: wiki?.url || "https://perps.standx.com",
    };
  }

  if (cg && !sports) {
    const price = await geckoPrice(cg);
    const extra = wiki ? ` ${wiki.text}` : "";
    if (price) {
      const head = line(lang, {
        tr: `${cg} ≈ $${price.usd.toLocaleString("en-US")} (24s ${price.change?.toFixed?.(2) ?? "—"}%). Yatırım tavsiyesi değil.`,
        en: `${cg} ≈ $${price.usd.toLocaleString("en-US")} (24h ${price.change?.toFixed?.(2) ?? "—"}%). Not investment advice.`,
        fr: `${cg} ≈ $${price.usd.toLocaleString("en-US")} (24h ${price.change?.toFixed?.(2) ?? "—"} %). Pas un conseil.`,
        zh: `${cg} ≈ $${price.usd.toLocaleString("en-US")}（24小时 ${price.change?.toFixed?.(2) ?? "—"}%）。非投资建议。`,
        ja: `${cg} ≈ $${price.usd.toLocaleString("en-US")}（24時間 ${price.change?.toFixed?.(2) ?? "—"}%）。投資助言ではありません。`,
      });
      return { kind: "crypto", text: `${head}${extra}`, source: wiki?.title || "CoinGecko", url: wiki?.url };
    }
  }

  if (wiki) {
    const lead = sports && LIVE_SCORE_RE.test(q) ? `${scoreNote(lang)} ` : "";
    return {
      kind: sports ? "sports" : "wiki",
      text: `${lead}${withVoice(lang, wiki.text, sports ? "sports" : "wiki")}`,
      source: wiki.title,
      url: wiki.url,
    };
  }

  const docs = askDocs(q, lang);
  if (docs) return { ...docs, kind: "docs" };
  return null;
}
