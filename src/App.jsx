import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Core3D from "./components/Core3D.jsx";
import AssistantDock, { openAsk } from "./components/AssistantDock.jsx";
import CoinCard from "./components/CoinCard.jsx";
import Gate from "./components/Gate.jsx";
import LangBar from "./components/LangBar.jsx";
import Stander, { MARK, POSE_LIST, STANDER, VAULTS, WORDMARK_LIGHT } from "./components/Stander.jsx";
import { useLang } from "./lib/Lang.jsx";
import { useActiveSection, useCountUp, useReveal } from "./lib/motion.js";
import { COMMUNITY, LAYERS, LINKS, STEPS } from "./lib/content.js";
import { KNOWLEDGE } from "./lib/knowledge.js";
import { depthUrl, fetchJson, marketUrl, parseDepth, parseOverview } from "./lib/api.js";
import { base, bps, funding, money, pct, px } from "./lib/format.js";

const SECTIONS = ["home", "live", "protocol", "learn", "brand", "community", "ask"];

function Section({ id, className = "", children }) {
  const [ref, shown] = useReveal();
  return (
    <section id={id} ref={ref} className={`section ${className} ${shown ? "in" : ""}`.trim()}>
      {children}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export default function App() {
  const { lang, t } = useLang();
  const [overview, setOverview] = useState(null);
  const [selected, setSelected] = useState("BTC-USD");
  const [book, setBook] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);
  const [clock, setClock] = useState(() => new Date());
  const [feedErr, setFeedErr] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [layer, setLayer] = useState("sip-5");
  const [copied, setCopied] = useState("");
  const [entered, setEntered] = useState(() => {
    try {
      return sessionStorage.getItem("standx-entered") === "1";
    } catch {
      return false;
    }
  });
  const [cardOn, setCardOn] = useState(false);
  const active = useActiveSection(SECTIONS);
  const shellRef = useRef(null);

  const pull = useCallback(async () => {
    try {
      const raw = await fetchJson(marketUrl());
      const parsed = parseOverview(raw);
      if (!parsed.symbols.length) throw new Error("empty");
      setOverview(parsed);
      setSyncedAt(new Date());
      setFeedErr(false);
      setSelected((prev) => (parsed.symbols.some((s) => s.symbol === prev) ? prev : parsed.symbols[0].symbol));
    } catch {
      setFeedErr(true);
    }
  }, []);

  useEffect(() => {
    pull();
    const id = setInterval(() => {
      if (!document.hidden) pull();
    }, 5000);
    return () => clearInterval(id);
  }, [pull]);

  useEffect(() => {
    if (!selected) return;
    let stop = false;
    const run = async () => {
      try {
        const raw = await fetchJson(depthUrl(selected));
        if (!stop) setBook(parseDepth(raw));
      } catch {
        if (!stop) setBook(null);
      }
    };
    run();
    const id = setInterval(() => {
      if (!document.hidden) run();
    }, 3000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [selected]);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // A soft light follows the pointer so the page feels lit rather than printed.
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const onMove = (e) => {
      el.style.setProperty("--mx", `${e.clientX}px`);
      el.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const markets = overview?.symbols || [];
  const market = markets.find((m) => m.symbol === selected) || markets[0];
  const volume = useCountUp(overview?.volume24h || 0);
  const oi = useCountUp(overview?.openInterest || 0);
  const count = useCountUp(markets.length);
  const bestSpread = useMemo(() => (book ? book.spreadBps : null), [book]);
  const age = syncedAt ? Math.max(0, Math.round((clock - syncedAt) / 1000)) : null;

  const activeLayer = LAYERS.find((l) => l.id === layer) || LAYERS[0];
  const layerLore = KNOWLEDGE.find((k) => k.id === activeLayer.knowledge)?.a[lang];

  async function copyMark() {
    try {
      const blob = await (await fetch(MARK)).blob();
      await navigator.clipboard.write([new window.ClipboardItem({ [blob.type]: blob })]);
      setCopied("mark");
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  }

  return (
    <div className="shell" ref={shellRef}>
      <div className="glow" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      {!entered && (
        <Gate
          onEnter={() => {
            try {
              sessionStorage.setItem("standx-entered", "1");
            } catch {
              /* ignore */
            }
            setEntered(true);
          }}
        />
      )}

      <header className="nav">
        <a className="navLogo" href="#home">
          <img className="navMark" src={MARK} alt="" />
          <img className="navWord" src={WORDMARK_LIGHT} alt="StandX" />
          <b>community assistant</b>
        </a>

        <nav className={`navLinks ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)}>
          <a href="#live" className={active === "live" ? "on" : ""}>{t.navLive}</a>
          <a href="#protocol" className={active === "protocol" ? "on" : ""}>{t.navProtocol}</a>
          <a href="#learn" className={active === "learn" ? "on" : ""}>{t.navLearn}</a>
          <a href="#brand" className={active === "brand" ? "on" : ""}>{t.navBrand}</a>
          <a href="#community" className={active === "community" ? "on" : ""}>{t.navCommunity}</a>
          <a
            href="#ask"
            className={active === "ask" ? "on" : ""}
            onPointerDown={() => openAsk()}
          >
            {t.navAsk}
          </a>
          <a
            className="navTradeMobile"
            href={LINKS.perps}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.trade}
          </a>
        </nav>

        <div className="navRight">
          <LangBar />
          <a className="cta" href={LINKS.perps} target="_blank" rel="noopener noreferrer">
            {t.trade}
          </a>
          <button
            type="button"
            className="burger"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <i />
            <i />
          </button>
        </div>
      </header>

      <div className="ticker" aria-hidden="true">
        <div className="tickerTrack">
          {[...markets, ...markets].map((m, i) => (
            <span key={`${m.symbol}-${i}`} className={m.change >= 0 ? "up" : "down"}>
              <b>{base(m.symbol)}</b> {px(m.mark)} <em>{pct(m.change)}</em>
            </span>
          ))}
          {!markets.length && <span className="muted">{t.syncing}…</span>}
        </div>
      </div>

      <div className="pageBody">
      <div className="pageMain">
      <main>
        <Section id="home" className="hero">
          <div className="heroCopy">
            <p className="kicker">
              <i className="dot" />
              {t.heroKicker}
            </p>
            <h1>
              <span className="l1">{t.heroLine1}</span>
              <span className="l2">{t.heroLine2}</span>
              <span className="l3">{t.heroLine3}</span>
            </h1>
            <p className="lead">{t.heroSub}</p>
            <div className="heroBtns">
              <a className="btn primary" href="#live">
                {t.heroCta}
              </a>
              <a className="btn ghost" href="#ask" onPointerDown={() => openAsk()}>
                {t.heroCta2}
              </a>
            </div>
            <div className="statRow">
              <Stat label={t.statVolume} value={money(volume)} />
              <Stat label={t.statOi} value={money(oi)} />
              <Stat label={t.statMarkets} value={Math.round(count) || "—"} />
              <Stat label={t.statSpread} value={bestSpread == null ? "—" : bps(bestSpread)} />
            </div>
            <p className="fine">
              <i className={`pulse ${feedErr ? "bad" : ""}`} />
              {feedErr ? "feed offline" : `${t.liveNow} · ${age == null ? t.syncing : `${age}s`}`} · {t.tickerNote}
            </p>
          </div>

          <div className="heroStage">
            <Core3D
              markets={markets}
              selected={selected}
              onSelect={(symbol) => {
                setSelected(symbol);
                setCardOn(true);
              }}
            />
            {cardOn && market && (
              <CoinCard market={market} onClose={() => setCardOn(false)} />
            )}
            <button type="button" className="heroHolo" onPointerDown={() => openAsk()}>
              <span className="heroHoloBeam" aria-hidden="true" />
              <span className="heroHoloBody">
                <img src={STANDER.front} alt="" />
                <i className="heroHoloScan" />
                <i className="heroHoloSweep" />
              </span>
              <span className="heroHoloPad" aria-hidden="true" />
              <span className="heroHoloBubble">{t.heroHelp}</span>
            </button>
          </div>
        </Section>

        <Section id="live" className="live">
          <header className="sectionHead">
            <h2>{t.liveTitle}</h2>
            <p>{t.liveSub}</p>
          </header>

          <div className="marketGrid">
            {markets.map((m) => (
              <button
                key={m.symbol}
                type="button"
                className={`marketCard ${m.symbol === selected ? "on" : ""} ${m.change >= 0 ? "up" : "down"}`}
                onClick={() => setSelected(m.symbol)}
              >
                <b>{base(m.symbol)}</b>
                <strong>{px(m.mark)}</strong>
                <em>{pct(m.change)}</em>
                <span>{money(m.volume)}</span>
              </button>
            ))}
            {!markets.length && <p className="muted">{t.syncing}…</p>}
          </div>

          <div className="inspect">
            <div className="inspectMain">
              <div className="inspectTop">
                <h3>{market?.symbol || "—"}</h3>
                <strong className={market?.change >= 0 ? "up" : "down"}>{px(market?.mark)}</strong>
                <em className={market?.change >= 0 ? "up" : "down"}>{pct(market?.change)}</em>
              </div>
              <dl>
                <div>
                  <dt>{t.volume24}</dt>
                  <dd>{money(market?.volume)}</dd>
                </div>
                <div>
                  <dt>{t.openInterest}</dt>
                  <dd>{money(market?.oi)}</dd>
                </div>
                <div>
                  <dt>{t.fundingRate}</dt>
                  <dd className={market?.funding >= 0 ? "up" : "down"}>{funding(market?.funding)}</dd>
                </div>
                <div>
                  <dt>{t.spread}</dt>
                  <dd>{book ? bps(book.spreadBps) : "—"}</dd>
                </div>
                <div>
                  <dt>{t.bookBias}</dt>
                  <dd className={book?.imbalance >= 0 ? "up" : "down"}>
                    {book
                      ? `${book.imbalance >= 0 ? t.bidSide : t.askSide} ${(Math.abs(book.imbalance) * 100).toFixed(0)}%`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="xray">
              <div className="xrayHead">
                <span>{t.depth}</span>
                <b>{market?.symbol}</b>
              </div>
              <div className="ladder">
                <div className="col asks">
                  {(book?.asks || []).slice(0, 10).reverse().map((r, i) => (
                    <div key={`a${i}`} className="row">
                      <i style={{ width: `${Math.min(100, (r.qty / (book.asks[0]?.qty || 1)) * 60)}%` }} />
                      <span>{px(r.price)}</span>
                      <em>{r.qty.toFixed(3)}</em>
                    </div>
                  ))}
                </div>
                <div className="mid">
                  <span>{book ? px(book.mid) : "—"}</span>
                  <em>{book ? bps(book.spreadBps) : t.syncing}</em>
                </div>
                <div className="col bids">
                  {(book?.bids || []).slice(0, 10).map((r, i) => (
                    <div key={`b${i}`} className="row">
                      <i style={{ width: `${Math.min(100, (r.qty / (book.bids[0]?.qty || 1)) * 60)}%` }} />
                      <span>{px(r.price)}</span>
                      <em>{r.qty.toFixed(3)}</em>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section id="protocol" className="protocol">
          <header className="sectionHead">
            <h2>{t.protocolTitle}</h2>
            <p>{t.protocolSub}</p>
          </header>

          <div className="layerRow">
            {LAYERS.map((l) => (
              <button
                key={l.id}
                type="button"
                className={l.id === layer ? "on" : ""}
                onClick={() => setLayer(l.id)}
                onMouseEnter={() => setLayer(l.id)}
              >
                <b>{l.sip}</b>
                <small>{l.name[lang]}</small>
              </button>
            ))}
          </div>

          <div className="layerBody" key={activeLayer.id}>
            <article>
              <span className="tag rule">{t.rule}</span>
              <p>{layerLore}</p>
            </article>
            <aside>
              <span className="tag live">{t.liveData}</span>
              <p>{activeLayer.live[lang]}</p>
              {activeLayer.id === "sip-5b" && (
                <img className="layerFigure" src={VAULTS} alt="Strategy, Reward and Shield vaults" />
              )}
              <div className="layerStatus">
                <span>{t.status}</span>
                <b className={activeLayer.status === "Implemented" ? "ok" : "wip"}>{activeLayer.status}</b>
              </div>
            </aside>
          </div>
        </Section>

        <Section id="learn" className="learn">
          <header className="sectionHead">
            <h2>{t.learnTitle}</h2>
            <p>{t.learnSub}</p>
          </header>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.id} style={{ "--i": i }}>
                <span className="stepNo">{s.icon}</span>
                <h3>{s.title[lang]}</h3>
                <p>{s.body[lang]}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="brand" className="brand">
          <header className="sectionHead">
            <h2>{t.brandTitle}</h2>
            <p>{t.brandSub}</p>
          </header>

          <div className="brandGrid">
            <div className="brandCard">
              <img className="brandMark" src={MARK} alt="StandX" />
              <div className="brandActions">
                <a className="btn small" href={MARK} download>
                  {t.download}
                </a>
                <button type="button" className="btn small ghost" onClick={copyMark}>
                  {copied === "mark" ? t.copied : "Copy PNG"}
                </button>
              </div>
              <ul className="brandRules">
                <li>{t.brandRule1}</li>
                <li>{t.brandRule2}</li>
                <li>{t.brandRule3}</li>
              </ul>
            </div>

            <div className="brandCard poses">
              <span className="posesLabel">{t.poses}</span>
              <div className="poseRow">
                {POSE_LIST.map((p) => (
                  <figure key={p}>
                    <img src={STANDER[p]} alt={p} loading="lazy" />
                    <figcaption>{p}</figcaption>
                  </figure>
                ))}
              </div>
              <a className="btn small ghost" href={LINKS.gallery} target="_blank" rel="noopener noreferrer">
                gallery.standx.org
              </a>
            </div>
          </div>
        </Section>

        <Section id="community" className="community">
          <header className="sectionHead">
            <h2>{t.communityTitle}</h2>
            <p>{t.communitySub}</p>
          </header>
          <div className="cards">
            {COMMUNITY.map((c, i) => (
              <a
                key={c.id}
                className={`card tone-${c.tone}`}
                style={{ "--i": i }}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <h3>{c.title[lang]}</h3>
                <p>{c.body[lang]}</p>
                <span className="cardGo">{t.open} →</span>
              </a>
            ))}
          </div>
        </Section>

        <Section id="ask" className="ask">
          <header className="sectionHead">
            <h2>{t.askTitle}</h2>
            <p>{t.askSub}</p>
          </header>
          <button type="button" className="btn primary askLaunch" onPointerDown={() => openAsk()}>
            {t.askPrompt}
          </button>
          <p className="askHint">{t.askDockHint}</p>
        </Section>
      </main>

      <footer className="foot">
        <div className="footBrand">
          <Stander pose="cozy" className="footMascot" />
          <div>
            <strong>StandX community assistant</strong>
            <p>{t.footerNote}</p>
          </div>
        </div>
        <div className="footCols">
          <div>
            <span>{t.footerLinks}</span>
            <a href="#live">{t.navLive}</a>
            <a href="#protocol">{t.navProtocol}</a>
            <a href="#learn">{t.navLearn}</a>
            <a href="#ask" onPointerDown={() => openAsk()}>{t.navAsk}</a>
          </div>
          <div>
            <span>{t.footerConnect}</span>
            <a href={LINKS.discord} target="_blank" rel="noopener noreferrer">Discord</a>
            <a href={LINKS.x} target="_blank" rel="noopener noreferrer">X</a>
            <a href={LINKS.docs} target="_blank" rel="noopener noreferrer">{t.docs}</a>
          </div>
        </div>
        <LangBar full />
        <a className="toTop" href="#home">
          ↑ {t.backTop}
        </a>
        <p className="footBy">
          {t.footerBy}
          {" · "}
          <a href={LINKS.builderX} target="_blank" rel="noopener noreferrer">
            X @metacryptox01
          </a>
        </p>
      </footer>
      </div>
      <AssistantDock />
      </div>
    </div>
  );
}
