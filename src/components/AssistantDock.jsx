import React, { useCallback, useEffect, useState } from "react";
import Assistant from "./Assistant.jsx";
import Stander from "./Stander.jsx";
import { useLang } from "../lib/Lang.jsx";
import { speakListen } from "../lib/speak.js";
import { detectLang } from "../lib/i18n.js";

export function openAsk() {
  speakListen(detectLang());
  window.dispatchEvent(new Event("standx-open-ask"));
  if (location.hash !== "#ask") location.hash = "ask";
}

export default function AssistantDock() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);

  const openChat = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onOpen = () => openChat();
    const onHash = () => {
      if (location.hash === "#ask") openChat();
    };
    window.addEventListener("standx-open-ask", onOpen);
    window.addEventListener("hashchange", onHash);
    if (location.hash === "#ask") openChat();
    return () => {
      window.removeEventListener("standx-open-ask", onOpen);
      window.removeEventListener("hashchange", onHash);
    };
  }, [openChat]);

  return (
    <aside className={`assistantRail ${open ? "open" : ""}`} aria-live="polite">
      <div className="dockInner">
        {open ? (
          <div className="dockPanel">
            <button type="button" className="dockClose" onClick={() => setOpen(false)} aria-label={t.askClose}>
              ×
            </button>
            <Assistant compact />
          </div>
        ) : (
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
