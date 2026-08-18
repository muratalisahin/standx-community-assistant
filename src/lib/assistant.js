import { DOC_ROOT, KNOWLEDGE } from "./knowledge.js";

/** Strip punctuation but keep CJK, since those scripts carry meaning per character. */
function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CJK = /[\u3040-\u30ff\u3400-\u9fff]/;

function tokens(text) {
  const clean = normalize(text);
  if (!clean) return [];
  const words = clean.split(" ").filter((w) => w.length > 1);
  if (!CJK.test(clean)) return words;
  // CJK has no spaces, so also index every 2-character window.
  const grams = [];
  const bare = clean.replace(/\s/g, "");
  for (let i = 0; i < bare.length - 1; i++) {
    const gram = bare.slice(i, i + 2);
    if (CJK.test(gram)) grams.push(gram);
  }
  return [...words, ...grams];
}

const INDEX = KNOWLEDGE.map((entry) => ({
  entry,
  terms: new Set([...tokens(entry.tags), ...tokens(entry.id.replace(/-/g, " "))]),
}));

function scoreEntry(row, asked, lang) {
  let score = 0;
  for (const term of asked) {
    if (row.terms.has(term)) score += 3;
    else {
      for (const t of row.terms) {
        if (t.length > 3 && (t.startsWith(term) || term.startsWith(t))) {
          score += 1;
          break;
        }
      }
    }
  }
  // A direct hit inside the answer text itself is weaker evidence but still counts.
  const body = normalize(row.entry.a[lang] || row.entry.a.en);
  for (const term of asked) {
    if (term.length > 3 && body.includes(term)) score += 0.5;
  }
  return score;
}

export function ask(question, lang = "en") {
  const asked = tokens(question);
  if (!asked.length) return null;
  const ranked = INDEX.map((row) => ({ row, score: scoreEntry(row, asked, lang) }))
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;

  const best = ranked[0].row.entry;
  const related = ranked
    .slice(1, 4)
    .map((r) => r.row.entry)
    .filter((e) => e.id !== best.id);

  return {
    id: best.id,
    text: best.a[lang] || best.a.en,
    source: best.source,
    url: `${DOC_ROOT}${best.source}`,
    related: related.map((e) => ({ id: e.id, source: e.source, url: `${DOC_ROOT}${e.source}` })),
  };
}

export function topicCount() {
  return KNOWLEDGE.length;
}
