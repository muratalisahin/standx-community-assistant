import { base } from "./format.js";

const MUTE_KEY = "standx-radio-mute";
const MAX_SNAPS = 140;
const OI_WINDOW = 8 * 60 * 1000;
const COOL_MS = 3.5 * 60 * 1000;
const BOARD = ["BTC", "ETH", "BNB", "SOL", "HYPE", "XAU", "XAG", "CL", "TSLA", "SPCX", "MU"];

export function loadRadioMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveRadioMuted(on) {
  try {
    localStorage.setItem(MUTE_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function takeSnapshot(overview, book, selected) {
  const markets = {};
  for (const s of overview?.symbols || []) {
    if (!s?.symbol) continue;
    markets[s.symbol] = {
      mark: Number(s.mark) || 0,
      oi: Number(s.oi) || 0,
      volume: Number(s.volume) || 0,
      funding: Number(s.funding) || 0,
      change: Number(s.change) || 0,
    };
  }
  const summed = Object.values(markets).reduce((n, m) => n + (m.volume || 0), 0);
  return {
    t: Date.now(),
    selected: selected || null,
    volume24h: Number(overview?.volume24h) || summed,
    book:
      book && selected
        ? { symbol: selected, spreadBps: Number(book.spreadBps) || 0, imbalance: Number(book.imbalance) || 0 }
        : null,
    markets,
  };
}

export function pushSnapshot(history, snap) {
  if (!snap?.markets || !Object.keys(snap.markets).length) return history;
  history.push(snap);
  if (history.length > MAX_SNAPS) history.splice(0, history.length - MAX_SNAPS);
  return history;
}

function lookback(history, ms) {
  if (history.length < 3) return null;
  const now = history[history.length - 1];
  const target = now.t - ms;
  let best = history[0];
  for (const s of history) {
    if (s.t <= target) best = s;
    else break;
  }
  if (now.t - best.t < ms * 0.45) return null;
  return best;
}

function signOf(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return 0;
  return v > 0 ? 1 : -1;
}

function cooled(spoken, kind, symbol, now) {
  return spoken.some((s) => s.kind === kind && s.symbol === symbol && now - s.t < COOL_MS);
}

function num(lang, v, digits = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const d = abs >= 10 ? 0 : digits;
  const s = abs.toFixed(d).replace(/\.0$/, "");
  return lang === "fr" || lang === "tr" ? s.replace(".", ",") : s;
}

function ticker(symbol) {
  return base(symbol) || symbol || "—";
}

function boardOrder(symbols) {
  return [...symbols].sort((a, b) => {
    const ia = BOARD.indexOf(ticker(a));
    const ib = BOARD.indexOf(ticker(b));
    if (ia < 0 && ib < 0) return a.localeCompare(b);
    if (ia < 0) return 1;
    if (ib < 0) return -1;
    return ia - ib;
  });
}

function moneySpeak(lang, n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) {
    return { tr: "bilinmiyor", en: "unknown", fr: "inconnu", zh: "未知", ja: "不明" }[lang] || "unknown";
  }
  let amount;
  let unit;
  if (v >= 1e9) {
    amount = num(lang, v / 1e9, 2);
    unit = { tr: "milyar dolar", en: "billion dollars", fr: "milliards de dollars", zh: "亿美元", ja: "億ドル" };
  } else if (v >= 1e6) {
    amount = num(lang, v / 1e6, 2);
    unit = { tr: "milyon dolar", en: "million dollars", fr: "millions de dollars", zh: "万美元", ja: "百万ドル" };
  } else if (v >= 1e3) {
    amount = num(lang, v / 1e3, 1);
    unit = { tr: "bin dolar", en: "thousand dollars", fr: "mille dollars", zh: "美元", ja: "千ドル" };
  } else {
    amount = num(lang, v, 0);
    unit = { tr: "dolar", en: "dollars", fr: "dollars", zh: "美元", ja: "ドル" };
  }
  if (lang === "zh" && v >= 1e6 && v < 1e9) return `${num(lang, v / 1e4, 0)} 万美元`;
  if (lang === "zh" && v >= 1e9) return `${num(lang, v / 1e8, 2)} 亿美元`;
  return `${amount} ${unit[lang] || unit.en}`;
}

function priceSpeak(lang, n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "—";
  const locale = { tr: "tr-TR", en: "en-US", fr: "fr-FR", zh: "zh-CN", ja: "ja-JP" }[lang] || "en-US";
  const digits = v >= 1000 ? 0 : v >= 1 ? 2 : 4;
  const formatted = v.toLocaleString(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  const unit = { tr: "dolar", en: "dollars", fr: "dollars", zh: "美元", ja: "ドル" }[lang] || "dollars";
  return `${formatted} ${unit}`;
}

function moveSpeak(lang, change) {
  const n = Number(change);
  const amt = num(lang, n, 2);
  if (lang === "tr") return n >= 0 ? `artı yüzde ${amt}` : `eksi yüzde ${amt}`;
  if (lang === "en") return n >= 0 ? `up ${amt} percent` : `down ${amt} percent`;
  if (lang === "fr") return n >= 0 ? `plus ${amt} pour cent` : `moins ${amt} pour cent`;
  if (lang === "zh") return n >= 0 ? `涨百分之 ${amt}` : `跌百分之 ${amt}`;
  return n >= 0 ? `プラス ${amt} パーセント` : `マイナス ${amt} パーセント`;
}

const LINES = {
  desk: {
    tr: (c) =>
      `StandX'te bugün ${c.count} piyasa açık. Toplam 24 saat hacim ${moneySpeak("tr", c.volume)}.`,
    en: (c) =>
      `StandX has ${c.count} live markets today. Combined 24-hour volume is ${moneySpeak("en", c.volume)}.`,
    fr: (c) =>
      `StandX a ${c.count} marchés en direct aujourd'hui. Volume 24 heures : ${moneySpeak("fr", c.volume)}.`,
    zh: (c) => `StandX 今日 ${c.count} 个市场在线。24 小时总成交 ${moneySpeak("zh", c.volume)}。`,
    ja: (c) => `StandX は本日 ${c.count} 市場が稼働。24時間合計出来高は ${moneySpeak("ja", c.volume)}。`,
  },
  status: {
    tr: (c) =>
      `${ticker(c.symbol)} ${priceSpeak("tr", c.mark)}. Günlük hareket ${moveSpeak("tr", c.change)}. StandX 24 saat hacmi ${moneySpeak("tr", c.volume)}.`,
    en: (c) =>
      `${ticker(c.symbol)} is at ${priceSpeak("en", c.mark)}. Daily move ${moveSpeak("en", c.change)}. StandX 24-hour volume ${moneySpeak("en", c.volume)}.`,
    fr: (c) =>
      `${ticker(c.symbol)} vaut ${priceSpeak("fr", c.mark)}. Mouvement du jour : ${moveSpeak("fr", c.change)}. Volume StandX 24h : ${moneySpeak("fr", c.volume)}.`,
    zh: (c) =>
      `${ticker(c.symbol)} 现价 ${priceSpeak("zh", c.mark)}。今日${moveSpeak("zh", c.change)}。StandX 24 小时成交 ${moneySpeak("zh", c.volume)}。`,
    ja: (c) =>
      `${ticker(c.symbol)} は ${priceSpeak("ja", c.mark)}。本日の動きは ${moveSpeak("ja", c.change)}。StandX の24時間出来高は ${moneySpeak("ja", c.volume)}。`,
  },
  fundingFlip: {
    tr: (c) => `${ticker(c.symbol)} funding ${c.to > 0 ? "artıya" : "eksiye"} döndü.`,
    en: (c) => `${ticker(c.symbol)} funding flipped ${c.to > 0 ? "positive" : "negative"}.`,
    fr: (c) => `Le funding de ${ticker(c.symbol)} est passé ${c.to > 0 ? "positif" : "négatif"}.`,
    zh: (c) => `${ticker(c.symbol)} 资金费转为${c.to > 0 ? "正" : "负"}。`,
    ja: (c) => `${ticker(c.symbol)} のファンディングが${c.to > 0 ? "プラス" : "マイナス"}に転じた。`,
  },
  oi: {
    tr: (c) =>
      `${ticker(c.symbol)} açık faiz son ${c.minutes} dakikada yüzde ${num("tr", c.pct)} ${c.pct >= 0 ? "arttı" : "azaldı"}.`,
    en: (c) =>
      `${ticker(c.symbol)} open interest ${c.pct >= 0 ? "rose" : "fell"} ${num("en", c.pct)} percent over ${c.minutes} minutes.`,
    fr: (c) =>
      `L'open interest de ${ticker(c.symbol)} a ${c.pct >= 0 ? "monté" : "baissé"} de ${num("fr", c.pct)} pour cent en ${c.minutes} minutes.`,
    zh: (c) => `${ticker(c.symbol)} 未平仓近 ${c.minutes} 分钟${c.pct >= 0 ? "升" : "降"}了百分之 ${num("zh", c.pct)}。`,
    ja: (c) =>
      `${ticker(c.symbol)} の建玉は直近 ${c.minutes} 分で ${num("ja", c.pct)} パーセント${c.pct >= 0 ? "増" : "減"}。`,
  },
};

export function formatCall(call, lang) {
  if (!call) return "";
  const pack = LINES[call.kind];
  const fn = pack?.[lang] || pack?.en;
  return fn ? fn(call) : "";
}

function statusCall(symbol, row) {
  return {
    kind: "status",
    symbol,
    mark: row.mark,
    change: row.change,
    volume: row.volume,
  };
}

export function pickCall(history, spoken, roster) {
  if (!history.length) return null;
  const now = history[history.length - 1];
  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const old = lookback(history, OI_WINDOW);
  const t = now.t;
  const hits = [];

  for (const symbol of Object.keys(now.markets)) {
    const a = now.markets[symbol];
    const b = prev?.markets[symbol];
    if (b && signOf(a.funding) !== signOf(b.funding) && (a.funding !== 0 || b.funding !== 0)) {
      hits.push({ kind: "fundingFlip", symbol, score: 92, to: a.funding, from: b.funding });
    }
    if (old?.markets[symbol]?.oi > 0 && a.oi > 0) {
      const pctCh = ((a.oi - old.markets[symbol].oi) / old.markets[symbol].oi) * 100;
      const minutes = Math.max(1, Math.round((now.t - old.t) / 60000));
      if (Math.abs(pctCh) >= 2.4) {
        hits.push({ kind: "oi", symbol, score: 68 + Math.min(22, Math.abs(pctCh)), pct: pctCh, minutes });
      }
    }
  }

  hits.sort((a, b) => b.score - a.score);
  const breaking = hits.find((h) => h.score >= 68 && !cooled(spoken, h.kind, h.symbol, t));
  if (breaking) return breaking;

  const symbols = boardOrder(Object.keys(now.markets));
  if (!symbols.length) return null;
  const slots = ["desk", ...symbols];
  const i = Math.abs(roster.i || 0) % slots.length;
  roster.i = i + 1;
  const slot = slots[i];
  if (slot === "desk") {
    return { kind: "desk", symbol: "STANDX", volume: now.volume24h, count: symbols.length };
  }
  return statusCall(slot, now.markets[slot]);
}

export function rememberSpoken(spoken, call) {
  if (!call) return spoken;
  spoken.push({ kind: call.kind, symbol: call.symbol, t: Date.now() });
  if (spoken.length > 24) spoken.splice(0, spoken.length - 24);
  return spoken;
}
