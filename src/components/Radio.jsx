import React, { useEffect, useRef, useState } from "react";
import Stander from "./Stander.jsx";
import { useLang } from "../lib/Lang.jsx";
import { langById } from "../lib/i18n.js";
import {
  formatCall,
  loadRadioMuted,
  pickCall,
  pushSnapshot,
  rememberSpoken,
  saveRadioMuted,
  takeSnapshot,
} from "../lib/radio.js";
import { cancelSpeech, speakRadio, unlockAudio } from "../lib/speak.js";

export default function Radio({ live, overview, book, selected, onLine }) {
  const { lang, t } = useLang();
  const [muted, setMuted] = useState(loadRadioMuted);
  const [call, setCall] = useState(null);
  const [talking, setTalking] = useState(false);
  const history = useRef([]);
  const spoken = useRef([]);
  const roster = useRef({ i: 0 });
  const mutedRef = useRef(muted);
  const liveRef = useRef(live);
  const langRef = useRef(lang);
  const onLineRef = useRef(onLine);
  mutedRef.current = muted;
  liveRef.current = live;
  langRef.current = lang;
  onLineRef.current = onLine;

  useEffect(() => {
    if (!live || !overview) return;
    pushSnapshot(history.current, takeSnapshot(overview, book, selected));
  }, [live, overview, book, selected]);

  useEffect(() => {
    if (!live) return;
    let timer = 0;
    let speakTimer = 0;
    const tick = () => {
      if (!liveRef.current || document.hidden) {
        timer = window.setTimeout(tick, 4000);
        return;
      }
      const next = pickCall(history.current, spoken.current, roster.current);
      if (next) {
        rememberSpoken(spoken.current, next);
        setCall(next);
        const id = langRef.current;
        const line = formatCall(next, id);
        onLineRef.current?.(line);
        if (!mutedRef.current && line) {
          setTalking(true);
          speakRadio(line, langById(id).locale);
          speakTimer = window.setTimeout(() => setTalking(false), 9000);
        }
      }
      const wait = next?.kind === "status" || next?.kind === "desk" ? 16000 : 22000 + Math.round(Math.random() * 6000);
      timer = window.setTimeout(tick, wait);
    };
    timer = window.setTimeout(tick, 7000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(speakTimer);
    };
  }, [live]);

  useEffect(() => {
    if (!call) return;
    onLine?.(formatCall(call, lang));
  }, [call, lang, onLine]);

  useEffect(() => {
    if (!live) cancelSpeech();
  }, [live]);

  useEffect(() => {
    if (!live) return;
    const prime = () => unlockAudio();
    window.addEventListener("pointerdown", prime, { once: true });
    return () => window.removeEventListener("pointerdown", prime);
  }, [live]);

  const line = formatCall(call, lang);

  return (
    <div className={`radio ${talking && !muted ? "hot" : ""} ${muted ? "muted" : ""}`} aria-live="polite">
      <span className="radioFace" aria-hidden="true">
        <Stander pose={talking && !muted ? "focus" : "front"} className="radioMascot" />
      </span>
      <div className="radioBody">
        <span className="radioTag">
          <i />
          {t.radioOnAir}
        </span>
        <p>{line || t.radioWait}</p>
      </div>
      <button
        type="button"
        className="radioMute"
        aria-pressed={muted}
        onClick={() => {
          const next = !muted;
          setMuted(next);
          saveRadioMuted(next);
          if (next) {
            cancelSpeech();
            setTalking(false);
          }
        }}
      >
        {muted ? t.radioUnmute : t.radioMute}
      </button>
    </div>
  );
}
