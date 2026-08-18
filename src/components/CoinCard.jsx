import React, { useEffect, useState } from "react";
import { MARK, WORDMARK_LIGHT } from "./Stander.jsx";
import { useLang } from "../lib/Lang.jsx";
import { coinProfile } from "../lib/brain.js";
import { base, funding, money, pct, px } from "../lib/format.js";
import { LINKS } from "../lib/content.js";

const FALLBACK = {
  BTC: {
    tr: "Bitcoin, StandX Perps’te DUSD teminatlı işlem görür. Maks kaldıraç 40x.",
    en: "Bitcoin trades on StandX Perps with DUSD margin. Max leverage 40x.",
    fr: "Bitcoin se trade sur StandX Perps, marge en DUSD. Levier max 40x.",
    zh: "比特币在 StandX Perps 以 DUSD 保证金交易。最高杠杆 40 倍。",
    ja: "Bitcoin は StandX Perps で DUSD 証拠金。最大レバレッジ 40 倍。",
  },
  ETH: {
    tr: "Ethereum perp. DUSD teminat, maks 40x kaldıraç.",
    en: "Ethereum perp with DUSD margin, max 40x leverage.",
    fr: "Perp Ethereum, marge DUSD, levier max 40x.",
    zh: "以太坊永续，DUSD 保证金，最高 40 倍。",
    ja: "Ethereum パープ。DUSD 証拠金、最大 40 倍。",
  },
  SOL: {
    tr: "Solana perp. StandX ana ağlarından biri; maks 30x.",
    en: "Solana perp. One of StandX’s home chains; max 30x.",
    fr: "Perp Solana. Une des chaînes natives StandX ; max 30x.",
    zh: "Solana 永续。StandX 主链之一；最高 30 倍。",
    ja: "Solana パープ。StandX の基盤チェーンの一つ。最大 30 倍。",
  },
  BNB: {
    tr: "BNB perp. BNB Chain StandX’in ana ağlarından; maks 30x.",
    en: "BNB perp. BNB Chain is one of StandX’s home networks; max 30x.",
    fr: "Perp BNB. BNB Chain est une chaîne native StandX ; max 30x.",
    zh: "BNB 永续。BNB Chain 是 StandX 主网之一；最高 30 倍。",
    ja: "BNB パープ。BNB Chain は StandX の基盤ネット。最大 30 倍。",
  },
  HYPE: {
    tr: "HYPE perp. Maks kaldıraç 20x.",
    en: "HYPE perp. Max leverage 20x.",
    fr: "Perp HYPE. Levier max 20x.",
    zh: "HYPE 永续。最高杠杆 20 倍。",
    ja: "HYPE パープ。最大レバレッジ 20 倍。",
  },
  XAU: {
    tr: "XAU altın perp. Emtia sınıfı, maks 40x.",
    en: "XAU gold perp. Commodity class, max 40x.",
    fr: "Perp XAU (or). Matière première, max 40x.",
    zh: "XAU 黄金永续。商品类，最高 40 倍。",
    ja: "XAU 金パープ。コモディティ、最大 40 倍。",
  },
  XAG: {
    tr: "XAG gümüş perp. Emtia sınıfı, maks 40x.",
    en: "XAG silver perp. Commodity class, max 40x.",
    fr: "Perp XAG (argent). Matière première, max 40x.",
    zh: "XAG 白银永续。商品类，最高 40 倍。",
    ja: "XAG 銀パープ。コモディティ、最大 40 倍。",
  },
  CL: {
    tr: "CL ham petrol perp. Maks 40x.",
    en: "CL crude oil perp. Max 40x.",
    fr: "Perp CL (pétrole). Max 40x.",
    zh: "CL 原油永续。最高 40 倍。",
    ja: "CL 原油パープ。最大 40 倍。",
  },
  TSLA: {
    tr: "TSLA hisse perp. Temettü düzeltmesi var; maks 20x.",
    en: "TSLA stock perp. Dividend adjustment applies; max 20x.",
    fr: "Perp action TSLA. Ajustement de dividende ; max 20x.",
    zh: "TSLA 股票永续。有股息调整；最高 20 倍。",
    ja: "TSLA 株式パープ。配当調整あり。最大 20 倍。",
  },
  SPCX: {
    tr: "SPCX hisse perp. Maks 20x.",
    en: "SPCX stock perp. Max 20x.",
    fr: "Perp action SPCX. Max 20x.",
    zh: "SPCX 股票永续。最高 20 倍。",
    ja: "SPCX 株式パープ。最大 20 倍。",
  },
  MU: {
    tr: "MU (Micron) hisse perp. Maks 20x.",
    en: "MU (Micron) stock perp. Max 20x.",
    fr: "Perp action MU (Micron). Max 20x.",
    zh: "MU（美光）股票永续。最高 20 倍。",
    ja: "MU（Micron）株式パープ。最大 20 倍。",
  },
};

export default function CoinCard({ market, onClose }) {
  const { lang, t } = useLang();
  const [profile, setProfile] = useState(null);
  const ticker = base(market?.symbol);

  useEffect(() => {
    let stop = false;
    setProfile(null);
    if (!ticker) return undefined;
    coinProfile(ticker, lang).then((row) => {
      if (!stop) setProfile(row);
    });
    return () => {
      stop = true;
    };
  }, [ticker, lang]);

  if (!market) return null;
  const up = (market.change || 0) >= 0;
  const local = FALLBACK[ticker];
  const raw = profile?.text || local?.[lang] || local?.en || "";
  const blurb = raw.length > 168 ? `${raw.slice(0, 165).replace(/\s+\S*$/, "")}…` : raw;

  return (
    <article className={`coinCard ${up ? "up" : "down"}`} role="dialog" aria-label={market.symbol}>
      <header className="coinCardBrand">
        <img className="coinCardMark" src={MARK} alt="" />
        <img className="coinCardWord" src={WORDMARK_LIGHT} alt="StandX" />
        <button type="button" className="coinCardClose" onClick={onClose} aria-label={t.askClose}>
          ×
        </button>
      </header>
      <div className="coinCardTop">
        <h3>{market.symbol}</h3>
        <strong className={up ? "up" : "down"}>{px(market.mark)}</strong>
        <em className={up ? "up" : "down"}>{pct(market.change)}</em>
      </div>
      <dl className="coinCardStats">
        <div>
          <dt>{t.volume24}</dt>
          <dd>{money(market.volume)}</dd>
        </div>
        <div>
          <dt>{t.openInterest}</dt>
          <dd>{money(market.oi)}</dd>
        </div>
        <div>
          <dt>{t.fundingRate}</dt>
          <dd className={market.funding >= 0 ? "up" : "down"}>{funding(market.funding)}</dd>
        </div>
      </dl>
      {blurb ? <p className="coinCardBlurb">{blurb}</p> : null}
      {profile?.rank ? (
        <p className="coinCardMeta">
          {profile.name} · #{profile.rank} · {profile.cap ? money(profile.cap) : "—"}
        </p>
      ) : null}
      <a className="coinCardGo" href={LINKS.perps} target="_blank" rel="noopener noreferrer">
        StandX Perps →
      </a>
    </article>
  );
}
