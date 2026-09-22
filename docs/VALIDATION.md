# Validation of the Netlify commerce project

Performed against the actual product repository commit `b349c5f2d66475668639f137786c8cf7734335b7` on 22 September 2026.

## Passed

- Repository access via Git and actual products.json parsing.
- All 100 supplied product images opened and decoded. The five absent image references are documented and remain unavailable, not silently replaced.
- Byte comparison of all 102 original repository files (products.json, 100 photographs and images/.gitkeep): original content and folder paths preserved.
- `npm run build`: catalogue generation, eight HTML pages, local links/anchors/assets, product/variant image references and JavaScript/server-function syntax.
- `npm test`: 14 tests covering catalogue preservation; price parsing; missing images; variant merging; cart totals, removal and storage; payment configuration; server rejection of forged or unavailable items; Stripe mapping checks; checkout retries; server-confirmed payment; actual SDK signature verification; PayPal approval/capture safeguards; rejected webhook signatures; request origin/content-type checks; DOM interactions.
- DOM simulations cover product filters, colour-photo changes, details dialogs, Add to Cart, saved cart navigation, quantity controls, removal, disabled payment buttons and the mobile menu.
- `npm run test:http`: direct page routes and public assets served byte-for-byte by the local server, appropriate content types, directory redirect, 404 handling, blocked private paths and method checks. images/.gitkeep is a source placeholder, not a public photograph.
- All five Netlify Functions successfully bundled using Netlify's `@netlify/zip-it-and-ship-it` bundler with esbuild and the supplied included-files configuration.
- ZIP integrity and required source-file presence checked before delivery.

## Limits

Provider APIs and Netlify Blobs were mocked in payment unit tests. No real Stripe/PayPal account, Price ID ownership, live price amount, webhook registration, payment transaction, Netlify deployment or production storage operation was verified. No credentials were requested or accessed.

A full browser visual pass was not performed because a Chromium runtime was unavailable. jsdom tests exercise DOM logic, not CSS rendering or provider-hosted payment pages. Existing design/styles were retained, with the documented commerce additions.

Source issues and operational limitations are documented in CATALOGUE-AUDIT.md and README.md. Payments remain disabled until genuine environment settings are configured. Training bookings and contact submission are outside the product repository's capabilities and retain their pending setup.

## Re-run

```sh
npm ci
npm run build
npm test
npm run test:http
npm run dev
```

Use a Git-connected Netlify deployment to build the five server functions. A static-only upload cannot run the payment integration. Test both providers in their test/sandbox environments with matching prices before enabling real charges.
