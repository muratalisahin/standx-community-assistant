export function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

export function px(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return "—";
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(5);
}

export function pct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export function funding(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(4)}%`;
}

export function bps(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(1)} bps`;
}

export function base(symbol) {
  return String(symbol || "").split("-")[0];
}
