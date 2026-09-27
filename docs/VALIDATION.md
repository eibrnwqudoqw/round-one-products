# Verification of the fresh complete export

## Export checks - 27 September 2026

Performed on the separately staged portable source, not on an earlier ZIP:

- Latest saved Site version confirmed as 11, matching source commit `c47416f32a7ca872a89a9d54f69c51351ad766bf`.
- `npm ci --prefer-offline --no-audit --no-fund`: installed 84 packages successfully from the supplied lockfile.
- `npm run build`: passed; generated 20 catalogue entries and 100 product images. Verified all eight HTML pages, 135 public files, local links/anchors/assets and browser/server JavaScript syntax.
- `npm test`: all 21 tests passed, including popup opening/closing, form discovery, validation, simulated delivery and failures, shop/cart and payment logic.
- `npm run test:http`: passed; all public pages/assets served byte-for-byte, route redirects and content types checked, private paths and unsupported methods rejected.
- Runtime source, product data and assets compared byte-for-byte with the latest saved checkout; only export documentation is changed or added.
- ZIP entries checked against the manifest and source hashes; archive integrity and required files verified. The archive omits installed dependencies, Git history and host-only metadata.
- Export checked for accidental secret files and common private credential patterns. .env.example contains placeholders only; payment tests contain explicit dummy fixture values.

These checks do not contact Stripe/PayPal, deploy to Netlify, submit a live enquiry or deliver Gmail. They do not establish real account ownership, webhook delivery or production storage. Real provider and form tests remain required after configuration. The latest popup layout has not had a complete visual browser pass; the automated UI checks use jsdom. The existing homepage hero was previously checked at common mobile/tablet/desktop widths.

The missing product mappings remain documented in CATALOGUE-AUDIT.md. Contact and training popup forms are included and prepared for Netlify Forms, superseding the older note below that contact submission was pending implementation. A training enquiry is not a confirmed booking. Remaining setup is described in README.md and FORMS.md.

---

## Historical integration verification (22 September 2026)

The following records the original catalogue/payment work. Its 14-test count and original browser limitation describe that earlier run, not the fresh export checks above.

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
