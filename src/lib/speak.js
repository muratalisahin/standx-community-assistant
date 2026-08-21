import { detectLang, langById } from "./i18n.js";

const clips = new Map();
let held = [];
let pump = 0;
let ctx = null;

function urlFor(langId, kind) {
  return `/voice/${langId}-${kind}.mp3`;
}

function getClip(langId, kind) {
  const key = `${langId}-${kind}`;
  let audio = clips.get(key);
  if (!audio) {
    audio = new Audio(urlFor(langId, kind));
    audio.preload = "auto";
    audio.volume = 1;
    clips.set(key, audio);
  }
  return audio;
}

export function preloadVoice(langId = detectLang()) {
  if (typeof window === "undefined") return;
  getClip(langId, "enter");
  getClip(langId, "listen");
}

function pickVoice(locale) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (!voices.length) return null;
  const loc = String(locale || "en-US").toLowerCase().replace("_", "-");
  const prefix = loc.slice(0, 2);
  return (
    voices.find((v) => v.lang.toLowerCase().replace("_", "-") === loc) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
    voices.find((v) => /en/i.test(v.lang)) ||
    voices[0] ||
    null
  );
}

function pumpResume() {
  if (pump || typeof window === "undefined" || !window.speechSynthesis) return;
  pump = window.setInterval(() => {
    const s = window.speechSynthesis;
    if (!s) return;
    if (s.paused) s.resume();
    if (!s.speaking && !s.pending) {
      window.clearInterval(pump);
      pump = 0;
    }
  }, 200);
}

export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
  try {
    window.speechSynthesis?.getVoices?.();
    window.speechSynthesis?.resume?.();
  } catch {
    /* ignore */
  }
}

export function cancelSpeech() {
  if (typeof window === "undefined") return;
  try {
    window.speechSynthesis?.cancel?.();
  } catch {
    /* ignore */
  }
}

function speakBrowser(text, locale) {
  const synth = window.speechSynthesis;
  if (!synth) return false;
  try {
    synth.resume?.();
    const u = new SpeechSynthesisUtterance(String(text));
    u.volume = 1;
    u.rate = 0.94;
    u.pitch = 1;
    const voice = pickVoice(locale);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = locale || "en-US";
    }
    held = [u];
    synth.speak(u);
    pumpResume();
    return true;
  } catch {
    return false;
  }
}

function playClip(langId, kind, fallbackText) {
  const lang = langById(langId);
  try {
    clips.forEach((audio, key) => {
      if (key === `${lang.id}-${kind}`) return;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* ignore */
      }
    });
    const audio = getClip(lang.id, kind);
    audio.pause();
    audio.currentTime = 0;
    const go = audio.play();
    if (go && go.catch) {
      go.catch(() => speakBrowser(fallbackText, lang.locale));
    }
    return true;
  } catch {
    return speakBrowser(fallbackText, lang.locale);
  }
}

function speakNow(kind, langId = detectLang()) {
  if (typeof window === "undefined") return;
  const lang = langById(langId);
  const text =
    kind === "listen"
      ? lang.listen || lang.greet
      : lang.gateWelcome || lang.welcome || lang.greet || lang.hello;
  unlockAudio();
  playClip(lang.id, kind, text);
}

export function speakText(text, locale = "en-US") {
  speakBrowser(text, locale);
}

/** Live tape. Skips when the ask dock is open, the tab is hidden, or motion is reduced. */
export function speakRadio(text, locale = "en-US") {
  if (typeof window === "undefined") return false;
  if (document.hidden) return false;
  if (document.body.classList.contains("dock-open")) return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return false;
  const line = String(text || "").trim();
  if (!line) return false;
  unlockAudio();
  cancelSpeech();
  window.setTimeout(() => speakBrowser(line, locale), 50);
  return true;
}

export function speakGreet(langId = detectLang()) {
  speakNow("enter", langId);
}

export function speakWelcome(langId = detectLang()) {
  speakNow("enter", langId);
}

export function speakListen(langId = detectLang()) {
  speakNow("listen", langId);
}

export function speakEnter(langId = detectLang()) {
  speakNow("enter", langId);
}
