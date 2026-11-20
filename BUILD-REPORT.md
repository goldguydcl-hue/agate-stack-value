# Stack Value Card — Build Report

Built Nov 20, 2026 (02:36–02:45 ET) from the Agate Metals Checker rebuild
at `~/workspace/reddit-devvit-app/app/` (Devvit React template 0.15.4).
App name `agate-stack-value`, version 0.0.1. No deploy, no publish, no
push — parent agent owns GitHub/zipping.

## 1. `npm run check` — PASS (exit 0)

`npm run test:types && npm run lint && npx prettier --check .` in `app/`.
Type-check, ESLint, and Prettier all clean.

Notes on the two config deviations from the checker template (both
documented here so they are not mistaken for drift):

- `src/shared/stack.ts` imports `./api.ts` / `./metals.ts` with explicit
  `.ts` extensions, and `tools/tsconfig.base.json` sets
  `allowImportingTsExtensions` + `emitDeclarationOnly`. Reason: the unit
  tests run under Node 24 `--experimental-strip-types`, which cannot
  resolve extensionless imports. Without the extensions the tests fail
  with `ERR_MODULE_NOT_FOUND`.
- `tools/tsconfig.shared.json` excludes `**/*.test.ts` and
  `eslint.config.js` ignores `**/*.test.ts` — the shared tsconfig has
  `types: []`, so `node:test` / `node:assert` types are unavailable there.
  The test file is still executed by `npm run test:unit`.

## 2. `npm run build` — PASS (exit 0)

`vite build` completed; `dist/client/` (game/splash) and `dist/server/`
(`index.cjs`) produced.

## 3. Math test — PASS (2/2 unit tests)

`npm run test:unit` in `app/`: 2 passed, 0 failed.
Test file: `app/src/shared/stack.test.ts`. Math reuses the checker's
`estimateValue` / `dealerPrice` from `src/shared/metals.ts` (byte-identical
to the checker) — nothing re-derived.

Hand-computed test stack at fixed test prices
(gold $4,000/oz, silver $50/oz, platinum $1,500/oz):

| Line | Input | Hand-computed expected | App actual |
|---|---|---|---|
| L1 | 2 troy oz gold, 99.9%, qty 1 | 4000 × 2 × 0.999 = **$7,992.00** | $7,992.00 |
| L2 | 100 g silver, 99.9%, qty 3 | 50 × (100 / 31.1034768) × 0.999 = $160.592979… each → **$481.78** (×3) | $481.778937… |
| L3 | 1 troy oz platinum, 95%, qty 2 | 1500 × 1 × 0.95 × 2 = **$2,850.00** | $2,850.00 |
| **Total** | | **$11,323.78** (11,323.778937…) | $11,323.778937… |
| **Dealer (95%)** | | **$10,757.59** (10,757.589990…) | $10,757.589990… |

Rhodium guard test: `lineValue(rhodium 1 oz, price null)` → `null`, and
`stackTotals` excludes it (total $0.00, 1 unpriced line) — unpriced lines
are never zeroed into the total as $0 of value, they are excluded.

## 4. Price chain — tested live (Nov 20, 2026 ~07:41 UTC)

Live curls against the exact upstream legs the server code calls
(`src/server/prices.ts` is byte-identical to the checker's except the
User-Agent `AgateStackValue/1.0` — verified by `diff`):

| Leg | Result at 07:41 UTC |
|---|---|
| gold-api.com XAU | $3,545.25 |
| gold-api.com XAG | $41.59 |
| gold-api.com XPT | $1,295.50 |
| gold-api.com XPD | $886.00 |
| gold-api.com XRH | **no price returned** (rhodium not covered) |
| Yahoo GC=F (gold) | $3,552.40 |
| Yahoo SI=F (silver) | $41.615 |
| Yahoo PL=F (platinum) | $1,293.00 |
| Yahoo PA=F (palladium) | $883.00 |

- Gold/silver/platinum/palladium: live prices return from both free legs.
- Rhodium: no free live source — confirmed live (gold-api returns nothing
  for XRH). App shows "no live price" for rhodium unless metalpriceapi
  (key only) or a moderator reference price covers it.
- 60-second server cache: implemented in `getPrices()` (Redis `prices:cache`,
  `CACHE_TTL_MS = 60_000`, `cacheHit` flag) — code is the checker's verbatim,
  so cache behaviour is identical. It was **not** executed against a live
  Devvit Redis here: running the server needs `devvit playtest` with Joe's
  Reddit login, which this subagent cannot do (no live browser). Same
  applies to the network-down → moderator-prices fallback leg: the code
  path is the checker's verbatim (leg 4, Redis `moderatorPrices`, seeded on
  install with Nov 20, 2026 values: gold $3,559.17, silver $41.88,
  platinum $1,303.20, palladium $888.25, rhodium null) but was not executed
  end-to-end in Devvit. First playtest should confirm: (a) second request
  within 60s returns `cacheHit: true`, (b) with all live legs blocked the
  moderator prices serve.
- metalpriceapi leg: only runs when `metalpriceapi_key` is set in Reddit
  secrets; no key was set or used in testing. No invented prices anywhere.

## 5. Standalone HTML — PASS (smoke-tested end-to-end)

File: `standalone/stack-value-standalone.html`.
- `node --check` on the extracted script: syntax OK (13,210 bytes).
- jsdom smoke test (Node fetch stubbed in, real network): renders, live
  prices load — ticker showed Silver $41.82 / Gold $3,546.87 / Platinum
  $1,300.50 / Palladium $884.00 / Rhodium — no live price (07:43 UTC).
- Default stack (1 troy oz gold 99.9% + 1 troy oz silver 99.9%) computed
  TOTAL $3,585.10, DEALER $3,405.85 — hand-checked: 3546.87×0.999 =
  $3,543.32 + 41.82×0.999 = $41.78 → $3,585.10; ×0.95 = $3,405.85. ✓
- "+ Add a line" grew the list 2 → 3 lines; "Copy summary" button flipped
  to "Copied!" (clipboard stubbed). Copy-summary UI present; no Devvit
  share button in the standalone (no Reddit context — by design).

### Light theme (Joe, Nov 20 ~02:37 ET)

Per Joe's design change, the standalone is **white background, not
gold-on-navy**: `body background: #ffffff`, dark text `#0a1a2e`, gold
accents only — gold kicker `#a8861a`, gold price chips on pale-gold
`#fdf8e7`, gold totals card `#d4af37` with dark text, gold "Add a line"
outline button, navy primary copy button. Line cards are pale grey
`#f8fafc` with light borders so they read on the white page. The Devvit
app was **not** touched — it stays gold-on-navy (the Reddit look,
matching the original app and the checker).

## Files

- `app/` — Devvit project (`agate-stack-value`, 0.0.1)
- `standalone/stack-value-standalone.html` — light-theme website twin
- `README.md`, `docs/listing-copy.md`, `BUILD-REPORT.md` (this file)

## Still needing Joe

- **Reddit publish:** `devvit login` + `npx devvit publish --public`
  need Joe's Reddit login in the device browser; cannot be done from
  this VM. First playtest should also confirm the 60s cache-hit flag and
  the moderator-fallback leg live (see §4).
- **Catalog assets:** icon/tile/featuring/fallback images for the App
  Directory listing — parent agent owns asset production; do not reuse
  the checker's files as-is without re-rendering for the Stack Value
  Card name.
- **Install target subreddit(s):** not specified — Joe to say where it
  should be installed first (r/agatemetals_dev for playtest, then
  public).
