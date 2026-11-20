# Stack Value Card

A free Reddit app from Agate Precious Metals. Value your whole stack —
add a line for every piece you own (metal, weight, unit, purity, quantity)
and see the total estimated value and the total dealer value (95%) at live
prices, with a shareable summary card.

Built November 20, 2026 from the Agate Metals Checker rebuild
(`~/workspace/reddit-devvit-app/app/`, Devvit React template 0.15.4,
Vite/React/Hono/Tailwind/TypeScript, Node 24). It reuses the checker's
price chain, estimate math, and house rules verbatim — see
`app/src/server/prices.ts` (identical except the User-Agent string) and
`app/src/shared/metals.ts` (identical).

## How it works

- **Entry point:** subreddit "•••" menu → "Create a new post" (moderators).
  The post opens the stack calculator full-screen.
- **Holdings list:** each line is metal (Silver / Gold / Platinum /
  Palladium / Rhodium) + weight + unit (Troy Oz / Gram) + purity % +
  quantity. Add and remove lines freely. Each line shows its own estimated
  value at the live price.
- **Totals card:** TOTAL estimated value + TOTAL dealer value (95% of the
  total), with a line count and how many lines were priced. Lines with no
  price are excluded from the total, never zeroed or guessed.
- **Sharing:** share the totals card as a new post, or copy a summary to
  paste anywhere on Reddit.

## How the math works

Per line, reusing the checker's `estimateValue` exactly (0% premium — a
stack is valued at melt, the checker's premium slider is for single
pieces):

```
line value = spot $/troy oz × weight in troy oz × (purity % / 100) × quantity
total value = sum of all priced lines
total dealer value = total value × 0.95
```

1 troy oz = 31.1034768 g. Hand-computed test stack in
`app/src/shared/stack.test.ts` and `BUILD-REPORT.md` (run with
`npm run test:unit`).

## Price fallback chain (per metal, in order)

1. Yahoo Finance futures (GC=F gold, SI=F silver, PL=F platinum, PA=F
   palladium). Rhodium has no Yahoo futures symbol, so it skips this leg.
2. gold-api.com (gold, silver, platinum, palladium — no rhodium).
3. metalpriceapi.com — only when a `metalpriceapi_key` is set in app
   settings. This is the only live leg that covers rhodium.
4. Moderator-maintained daily reference prices (Redis). Moderators update
   them from the subreddit menu ("Update fallback prices") — no new upload
   needed. Seeded on install with the Nov 20, 2026 reference prices.

Prices are cached server-side for 60 seconds and refreshed on the same
interval in the client. **Rhodium note:** with no Metal Price API key and
no moderator reference price, rhodium lines honestly show "no live price"
instead of a guess.

## Theme

- **Devvit app (Reddit): gold-on-navy**, matching the original app and the
  checker — navy `#0a1a2e` background, gold `#d4af37` accents.
- **Standalone HTML twin (website): LIGHT theme** (Joe, Nov 20, 2026) —
  white page background, dark text, gold accents only (headers, buttons,
  key numbers), so it reads clean on agatemetals.com and
  bullionpricecheck.com, both light sites.

## Commands (from `app/`)

- `npm run dev`: Playtest the app live on Reddit.
- `npm run build`: Builds the client and server.
- `npm run check`: Type-checks, lints, and checks formatting.
- `npm run test:unit`: Runs the hand-computed stack-math tests.
- `npm run deploy`: Uploads a new version of your app.
- `npm run launch`: Uploads and submits the app for review.
- `npm run login`: Logs your CLI into Reddit.

## Publish

```sh
npx devvit publish --public
```

Needs Joe's Reddit login + device browser — see BUILD-REPORT.md.

## Standalone web version

`standalone/stack-value-standalone.html` is the same calculator as a
single self-contained HTML file (no Devvit dependencies) for embedding on
a web page, e.g. bullionpricecheck.com. Same five metals, holdings list,
totals card, 60-second refresh, copy-summary button, and disclaimer.
Prices come from gold-api.com first, then Yahoo Finance, then built-in
reference prices (verified Nov 20, 2026). No API key needed; an optional
metalpriceapi.com key can be set inside the file. Light (white) theme.

## Disclaimers

Every figure the app shows is an **estimate**, not a quote and not
financial advice. Prices move constantly. Terms:
https://agatepreciousmetals.com/terms.html — Privacy:
https://agatepreciousmetals.com/privacy.html
