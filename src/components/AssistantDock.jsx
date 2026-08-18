import React, { useCallback, useEffect, useState } from "react";
import Assistant from "./Assistant.jsx";
import Stander from "./Stander.jsx";
import { useLang } from "../lib/Lang.jsx";
import { speakListen } from "../lib/speak.js";
import { detectLang } from "../lib/i18n.js";

export function openAsk() {
  speakListen(detectLang());
  window.dispatchEvent(new Event("standx-open-ask"));
}

export function askAbout(question) {
  const q = String(question || "").trim();
  if (!q) return;
  speakListen(detectLang());
  window.dispatchEvent(new CustomEvent("standx-ask", { detail: { question: q } }));
}

export default function AssistantDock() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState("");
  const [seedTick, setSeedTick] = useState(0);

  const openChat = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onOpen = () => openChat();
    const onAsk = (e) => {
      const q = String(e.detail?.question || "").trim();
      setSeed(q);
      if (q) setSeedTick((n) => n + 1);
      setOpen(true);
    };
    window.addEventListener("standx-open-ask", onOpen);
    window.addEventListener("standx-ask", onAsk);
    return () => {
      window.removeEventListener("standx-open-ask", onOpen);
      window.removeEventListener("standx-ask", onAsk);
    };
  }, [openChat]);

  return (
    <aside className={`assistantRail ${open ? "open" : ""}`} aria-live="polite">
      <div className="dockInner">
        <div className="dockPanel" hidden={!open}>
          <button
            type="button"
            className="dockClose"
            onClick={() => {
              setOpen(false);
              setSeed("");
            }}
            aria-label={t.askClose}
          >
            ×
          </button>
          <Assistant compact seed={seed} seedTick={seedTick} />
        </div>
        {!open && (
          <button
            type="button"
            className="dockFab"
            onPointerDown={() => {
              speakListen(lang);
              openChat();
            }}
          >
            <span className="dockBeam" aria-hidden="true" />
            <span className="dockHop">
              <Stander pose="front" cycle every={1600} className="dockMascot holo" />
              <i className="holoScan" />
              <i className="holoSweep" />
            </span>
            <span className="dockPad" aria-hidden="true" />
            <span className="dockBubble">{t.askPrompt}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
