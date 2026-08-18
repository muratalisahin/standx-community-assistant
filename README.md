# StandX Hub

A living StandX community hub. Not a list of links: live perps data, the whole protocol explained, and an assistant that knows the docs — in five languages.

## What is in it

- **Live market monitor** — real 24h volume, open interest, funding, spread and a depth ladder, straight from the StandX public API, refreshed every few seconds.
- **3D hero** — a DUSD core with one orbiting node per live market. Node size follows open interest, colour follows the last tick, orbit speed follows volume.
- **Protocol anatomy** — every layer from SIP-1 to SIP-5B, with what the rule says next to what the live data can actually show.
- **Start from zero** — wallet to first trade in six steps, each one taken from the docs.
- **Brand and mascot** — the official mark plus all eight Stander poses.
- **Ask Stander** — an assistant built on a knowledge base distilled from 61 documentation pages. Every answer links back to the doc page it came from.
- **Five languages** — Turkish, English, French, Chinese, Japanese. The whole interface and every assistant answer.

## Run it

```bat
npm install
npm run dev
```

Open the `Local:` URL Vite prints.

In development, market requests go through the Vite proxy to `perps.standx.com`. In production they go through `api/proxy.js`, which only forwards an allow-list of public read endpoints.

## Layout

```
src/lib/knowledge.js   Stander's knowledge base, five languages, each entry carrying its doc source
src/lib/assistant.js   Retrieval: keyword and CJK bigram scoring over the knowledge base
src/lib/i18n.js        Every interface string, five languages
src/lib/content.js     Protocol layers, onboarding steps, community links
src/lib/api.js         StandX market, depth and kline calls
src/components/        3D hero, assistant, mascot, language bar
api/proxy.js           Serverless read-only proxy for production
```

## Notes

Educational content only. Not official financial advice, and not affiliated with StandX.
Figures come from the StandX public market, depth and kline endpoints. Vault balances are never shown, because the public feed does not carry them.
