const ALLOWED = [
  "/api/query_market_overview",
  "/api/query_symbol_market",
  "/api/query_depth_book",
  "/api/kline/history",
];

export default async function handler(req, res) {
  const path = String(req.query.path || "");
  const route = path.split("?")[0];
  if (!ALLOWED.includes(route)) {
    res.status(400).json({ error: "Path not allowed." });
    return;
  }
  try {
    const upstream = await fetch(`https://perps.standx.com${path}`, {
      headers: { accept: "application/json" },
    });
    const body = await upstream.text();
    res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "public, max-age=2, stale-while-revalidate=8");
    res.status(upstream.status).send(body);
  } catch {
    res.status(502).json({ error: "Upstream unavailable." });
  }
}
