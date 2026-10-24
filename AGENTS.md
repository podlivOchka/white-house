# White House project rules

## Product and design

- Continue the existing React, TypeScript and Vite project. Do not replace it with an unrelated template or migrate hosting without an explicit request.
- The visual reference is `https://visagehall.ru/catalog/promo/`: a compact campaign banner, restrained typography, thin dividers, catalog filters and a product-first grid. Keep the White House identity and clothing photography.
- Keep customer-facing copy in Russian. Do not add developer credits, tool branding or exclamation marks.
- The three store profiles, the Kaspiysk address and the existing administrator must remain available.
- Do not invent prices, stock, sizes, discounts, delivery promises or company details.

## Catalog and hosting

- `public/content/catalog.json` contains the owner's actual editable inventory. Never replace it with `tests/fixtures/catalog.json` or reset its revision during a visual update.
- Preserve uploaded photos, hidden products, unavailable variants and server-side order storage.
- GitHub Pages and the Node/SQLite server are separate supported modes. Preserve both.
- Use `assetUrl` and router links so assets and routes also work below `/white-house/`.
- The GitHub Pages checkout prepares an email for the customer to send. It must never report that an order was sent automatically.
- Only actual catalog old/new prices may produce product discount badges. Inactive promotions and hidden products must not be displayed.

## Security and accessibility

- Never commit credentials, SMTP passwords, tokens, personal orders or customer addresses.
- `VITE_` values are public build-time configuration, not a place for secrets.
- Preserve server-side authentication, origin checks, validation, rate limits and order idempotency.
- Keep the admin token in its existing encrypted device vault. Never put a shared administrator password in client code.
- Add no tracking, session recording or external data services without an explicit decision about data collection.
- Content must remain visible without animation support and with reduced motion enabled. Preserve keyboard navigation, focus indicators, mobile scrolling and the reachable checkout action.

## Verification

- Install locked dependencies with `npm ci`.
- Run `npm test`, `npm run build`, `npm run test:e2e` and `npm audit --audit-level=high`.
- The server browser tests intentionally use an isolated eight-product fixture and temporary database. They must not edit the real catalog or send real email.
- For Pages compatibility, build with `VITE_BASE_PATH=/white-house/`, `VITE_PREVIEW=true`, `VITE_STATIC_PREVIEW=true` and `VITE_ADMIN_BACKEND=github`, then run `npm run test:pages`.
- Inspect desktop and mobile screenshots, including the catalog, promotional catalog and checkout, before publishing.
- Preserve unrelated owner changes. Publish through a reviewable branch and verify the deployment before presenting the public link as updated.
