import React, { useEffect, useState } from "react";
import Stander, { MARK, WORDMARK_LIGHT } from "./Stander.jsx";
import { COPY, LANGS, langById } from "../lib/i18n.js";
import { useLang } from "../lib/Lang.jsx";
import { preloadVoice, speakEnter } from "../lib/speak.js";

export default function Gate({ onEnter }) {
  const { lang, setLang } = useLang();
  const [hover, setHover] = useState(null);
  const [opening, setOpening] = useState(false);
  const preview = hover || lang;
  const meta = langById(preview);
  const t = COPY[preview] || COPY.en;

  useEffect(() => {
    LANGS.forEach((l) => preloadVoice(l.id));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function choose(id) {
    if (opening) return;
    setLang(id);
    setHover(id);
    setOpening(true);
    speakEnter(id);
    window.setTimeout(() => onEnter?.(), 1600);
  }

  return (
    <div className={`gate ${opening ? "opening" : ""}`} role="dialog" aria-label={meta.welcome}>
      <div className="gatePane left" aria-hidden="true" />
      <div className="gatePane right" aria-hidden="true" />
      <div className="gateStage">
        <img className="gateWord" src={WORDMARK_LIGHT} alt="StandX" />
        <div className="gateHolo">
          <span className="gateBeam" aria-hidden="true" />
          <span className="holoWrap">
            <Stander cycle every={1400} className="gateMascot holo" />
            <i className="holoScan" />
            <i className="holoSweep" />
          </span>
          {opening && <span className="gateBubble">{meta.gateWelcome || meta.welcome}</span>}
          <span className="gatePad" aria-hidden="true" />
        </div>
        <img className="gateMark" src={MARK} alt="" />
        <h1 className="gateHello">{opening ? meta.gateWelcome || meta.welcome : meta.welcome}</h1>
        {!opening && <p className="gateAsk">{t.gateAsk}</p>}
        <div className="gateLangs">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={preview === l.id ? "on" : ""}
              onMouseEnter={() => setHover(l.id)}
              onFocus={() => setHover(l.id)}
              onPointerDown={() => choose(l.id)}
            >
              <b>{l.short}</b>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
