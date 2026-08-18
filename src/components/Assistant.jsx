import React, { useEffect, useRef, useState } from "react";
import Stander from "./Stander.jsx";
import { useLang } from "../lib/Lang.jsx";
import { topicCount } from "../lib/assistant.js";
import { reply } from "../lib/brain.js";
import { SUGGESTIONS } from "../lib/knowledge.js";

let seq = 0;

export default function Assistant({ compact = false, seed = "", seedTick = 0 }) {
  const { lang, t } = useLang();
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const logRef = useRef(null);
  const pose = thinking ? "think" : thread.length ? "focus" : "front";

  useEffect(() => {
    setThread([]);
  }, [lang]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread, thinking]);

  async function send(text) {
    const q = String(text || "").trim();
    if (!q) return;
    setDraft("");
    setThread((list) => [...list, { id: ++seq, role: "you", text: q }]);
    setThinking(true);
    try {
      const hit = await reply(q, lang);
      setThread((list) => [
        ...list,
        hit
          ? { id: ++seq, role: "stander", text: hit.text, source: hit.source, url: hit.url }
          : { id: ++seq, role: "stander", text: t.askEmpty },
      ]);
    } catch {
      setThread((list) => [...list, { id: ++seq, role: "stander", text: t.askEmpty }]);
    } finally {
      setThinking(false);
    }
  }

  const sendRef = useRef(send);
  sendRef.current = send;
  const askedToken = useRef("");

  useEffect(() => {
    const q = String(seed || "").trim();
    if (!q || !seedTick) return;
    const token = `${seedTick}:${q}`;
    if (token === askedToken.current) return;
    askedToken.current = token;
    sendRef.current(q);
  }, [seed, seedTick]);

  const suggestions = SUGGESTIONS[lang] || SUGGESTIONS.en;

  return (
    <div className={`assistant ${compact ? "compact" : ""}`.trim()}>
      <div className="assistantHead">
        <span className="holoWrap small">
          <Stander pose={pose} className="assistantMascot holo" />
          <i className="holoScan" />
        </span>
        <div>
          <strong>{t.askTitle}</strong>
          <span>{t.askSub}</span>
        </div>
        <em className="assistantCount">{topicCount()}</em>
      </div>

      <div className="assistantLog" ref={logRef}>
        <div className="bubble stander intro">
          <p>{t.askIntro}</p>
        </div>
        {thread.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            <p>{m.text}</p>
            {m.url && (
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="bubbleSource">
                {t.askSource}: {m.source}
              </a>
            )}
          </div>
        ))}
        {thinking && (
          <div className="bubble stander typing" aria-live="polite">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>

      <div className="assistantChips">
        <span>{t.askTry}</span>
        {suggestions.map((s) => (
          <button key={s} type="button" onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>

      <form
        className="assistantForm"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.askPlaceholder}
          aria-label={t.askTitle}
          maxLength={400}
        />
        <button type="submit" disabled={!draft.trim() || thinking}>
          {t.askSend}
        </button>
        {thread.length > 0 && (
          <button type="button" className="ghost" onClick={() => setThread([])}>
            {t.askClear}
          </button>
        )}
      </form>
    </div>
  );
}
