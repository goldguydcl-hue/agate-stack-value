# Stack Value Card — App Directory listing copy

Ready to paste into the Developer Portal (Developer Settings) when the app
is uploaded. The portal has no separate tagline/category fields — the About
description is the single free-text field, and the README.md is the App
Directory's long description.

## About description (portal "About description" field)

Stack Value Card is a free Reddit app from Agate Precious Metals. List
every piece of metal you own — gold, silver, platinum, palladium, or
rhodium, any weight, any quantity — and it totals what the whole stack is
worth from live futures references, plus the dealer value at 95%. No
sign-up, no payment, just an answer. Values are estimates, not quotes and
not financial advice.

## Featuring description (portal "Featuring description" field)

What is your whole stack worth? Add every coin and bar, get the total at
live prices, and share the card with your community.

## Tile tagline (portal "Tile tagline" field)

What's your whole stack worth?

## Terms & Privacy URLs (portal Developer Settings)

- Terms & Conditions: https://agatepreciousmetals.com/terms.html
- Privacy Policy: https://agatepreciousmetals.com/privacy.html
- Both live — reused from the Agate Metals Checker listing (verified live
  2026-11-20), not recreated.

## Catalog assets (portal uploads)

Build from the real Agate logo, gold-on-navy, same as the checker in
~/workspace/reddit-devvit-app/assets/ (icon.png 512×512, tile.png 512×512,
featuring.png 1200×600, fallback.png 1200×600). The parent agent owns
asset production for this app — do not reuse the checker's files as-is
without re-rendering for the Stack Value Card name.

Note: Devvit does not publish exact pixel specs for these four fields in
its docs; the sizes above are the standard sizes the portal accepts. If
the portal rejects any size on upload, re-render at the size it asks for
(builder: ~/workspace/reddit-devvit-app/build_assets.py).

## Publish command (run from app/ once Joe logs in)

```sh
npx devvit publish --public
```

This submits the app for Reddit review and lists it in the public App
Directory once approved. Review typically takes 1–2 business days; Reddit
pauses reviews during holiday periods (Thanksgiving week may delay it).
Publishing needs Joe's Reddit login in the device browser — it cannot be
done from this VM.
