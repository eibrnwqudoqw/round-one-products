# Verification - 29 September 2026

Performed on the updated portable project that is packaged in this ZIP:

- npm ci --prefer-offline --no-audit --no-fund: installed 84 packages from the supplied lockfile.
- npm run build: passed. Generated 20 catalogue entries and 100 photographs. Verified eight HTML pages and 135 public files, including local links, anchors, assets and JavaScript/server syntax.
- npm test: all 27 tests passed. Tests cover product data, cart persistence, popup forms and simulated submission states, Stripe signature verification, payment totals, server validation, independent enablement, test/live mismatches, separate sandbox mappings, and preserved live catalogue IDs.
- npm run test:http: passed. All public pages and assets served byte-for-byte; redirects, content types, missing routes, private paths and unsupported methods checked.
- Byte comparison: all eight HTML pages, CSS files, original products.json, source product images and training/hero assets match the previous complete export. The only changed browser code is the cart checkout script.
- Archive integrity, complete file inclusion, checksum manifest and absence of private credential files verified during packaging. Blank secret fields and dummy test fixtures are intentional.

## Not performed

No real Netlify deployment, account login completion, Stripe/PayPal transaction, provider webhook delivery, Netlify Blobs production operation or Gmail notification was verified. Payment APIs/storage are mocked in automated tests. The Stripe SDK performs actual signature verification on test fixtures. The UI tests use jsdom, not a visual browser. No new responsive screenshot pass was performed; HTML and CSS are unchanged.

These results establish that the supplied code builds and passes its automated checks. They do not establish that the site is launch-ready or that your external credentials and webhook registrations are valid. See PAYMENT-SETUP.md for live-account steps and CATALOGUE-AUDIT.md for known data gaps.

## Re-run

```sh
npm ci
npm run build
npm test
npm run test:http
```
