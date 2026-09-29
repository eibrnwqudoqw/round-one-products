# Round One - catalogue shop and Netlify checkout

This is the complete Round One website with its existing black/yellow/gold design, updated to use the actual product repository. It is plain HTML, CSS and JavaScript with **Netlify Functions** for Stripe and PayPal and **Netlify Blobs** for private order/payment records.

## Updated complete export - 29 September 2026

Based on the complete 27 September export of website version 11, with payment safeguards added for your Netlify migration. The homepage hero fix, popup enquiry forms, design, catalogue and images are preserved. Stripe and PayPal now require separate enablement and matching test/live settings. Existing deployments with no new switches keep checkout closed.

Read `START-HERE.md` first and `docs/PAYMENT-SETUP.md` for the exact next steps. `docs/CHANGES.md` lists every changed file. This ZIP does not change Netlify settings, create payment credentials, push to GitHub or deploy the site.

## Start here

Read `docs/CATALOGUE-AUDIT.md` first. It lists the five missing images, reused SKUs, two sub-dollar prices and the limits of Stripe verification without account credentials.

The original `products.json` and `images/` folder are at the project root, copied byte-for-byte from commit `b349c5f2d66475668639f137786c8cf7734335b7` of https://github.com/eibrnwqudoqw/round-one-products. No changes are pushed to that repository. The catalogue contains 20 entries, including a preserved non-purchasable test entry.

Install Node.js 22 or newer, open this folder in VS Code, then:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. This local static server supports browsing and the saved cart. Payment functions run on Netlify; buttons remain unavailable on the static-only local server. This is intentional, not a fake payment demo.

## Build and test

```sh
npm run build
npm test
npm run test:http
```

The build reads the root `products.json` and `images/`, creates the shared browser catalogue, replaces the marked equipment-card sections in Home and Shop, copies images without renaming or conversion, and validates pages/assets/code. It does not download anything from GitHub at runtime. After changing the repository, copy its updated source files into this project and rebuild.

`npm test` exercises the real catalogue/cart/payment logic with mocked payment APIs and in-memory storage. Stripe webhook signature checks use the Stripe SDK's actual signing/verification implementation. The UI tests use jsdom to simulate filtering, galleries, cart controls and the mobile menu. These tests do not make real payments or render browser screenshots. `npm run test:http` tests the local static server.

## Project structure and editing

| Path                                                      | Purpose                                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `products.json`                                           | Original product titles, descriptions, prices, colours, SKUs and Stripe Price IDs. Edit here. |
| `images/`                                                 | Original product-image tree. Preserve paths used by `colour_images`.                          |
| `scripts/build-catalogue.mjs`                             | Generates product cards/data and copies the original images into the public website.          |
| `lib/catalogue.mjs`                                       | Converts source data to consistent product/variant records without rewriting it.              |
| `lib/catalogue-data.json`, `lib/image-manifest.json`      | Generated server catalogue and image list. Do not edit directly.                              |
| `dist/products.js`, `dist/products.json`, `dist/images/`  | Generated browser copies. Edit root source instead.                                           |
| `dist/index.html`, `dist/shop/index.html`                 | Home and Shop. Product cards between `CATALOGUE` markers are generated.                       |
| `dist/personal-training/`, `dist/about/`, `dist/contact/` | Preserved training, About and Contact pages.                                                  |
| `dist/cart/`                                              | Cart display and provider buttons.                                                            |
| `dist/checkout/`                                          | Return page that verifies payment with the server.                                            |
| `dist/style.css`, `dist/site.css`, `dist/pages.css`       | Existing brand/layout styles.                                                                 |
| `dist/commerce.css`                                       | Product galleries, accurate product colours, cart/payment styling.                            |
| `dist/script.js`                                          | Product filtering, colour/image selection, gallery and Add to Cart.                           |
| `dist/cart-core.js`, `dist/cart-state.js`                 | Calculation and browser persistence.                                                          |
| `lib/http.mjs`                                            | Configuration, request validation and safe JSON responses.                                    |
| `lib/payments.mjs`                                        | Server prices, provider sessions, capture, payment verification and order storage.            |
| `netlify/functions/`                                      | Public server endpoints; secrets stay in their runtime environment.                           |
| `config/stripe-test-prices.json` | Separate test Stripe Price IDs by product ID; blank placeholders until you supply real test IDs. |
| `.env.example`                                            | Environment template with free AU shipping, disabled payments and blank credentials.                                   |
| `netlify.toml`                                            | Build, function bundling, publish folder and headers.                                         |
| `tests/`                                                  | Catalogue, cart, payment and local-server checks.                                             |

To update a product, change the root JSON and relevant source images, then run `npm run build`. Home and Shop cards now update from the same data automatically. The JSON object key is the product identifier; do not change it for a simple rename or price correction. Variants use stable colour/size labels derived from supplied values. Keep product IDs and variant labels stable where possible so saved carts remain valid.

All original descriptions are shown in the details dialog. Products with a colour-image mapping switch the photograph with that colour. Other local images in that product folder are available as gallery thumbnails. Images are shown in their actual colours so customers can identify the selected variant. The original site-wide black/yellow/gold styling remains.

## Netlify deployment

Upload the **complete project** to your existing website repository, not just `dist`. Your repository must include the website, functions and configuration files together. If it is nested in another repository, set Netlify's base directory to the folder containing `package.json` and `netlify.toml`.

Netlify settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node: 22

Use a Git-connected Netlify deployment so functions and their dependencies are bundled. Uploading only `dist` serves the shop but omits payments. Each page has its own `index.html`; no single-page-app catch-all rewrite is needed.

In Netlify's environment settings, create the variables in `.env.example`, with **All scopes**, or **Functions** if your plan supports specific scopes. Keep keys out of browser code, products.json, Git, screenshots and chat. Redeploy after changes. Your old Astra hosting access restrictions do not migrate; set access on the new host if needed.

### Payment setup

See `docs/PAYMENT-SETUP.md` for the complete PayPal-only sandbox, Stripe test and live-launch instructions.

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Actual public HTTPS origin, without a path. The template uses your Round One Netlify address; update it for a separate test project or a new domain. |
| `PAYMENTS_ENABLED` | Master switch. Keep `false` during setup. |
| `PAYMENT_MODE` | `test` (default) or `live`. Invalid modes disable checkout. |
| `STRIPE_ENABLED` | `true` to permit new Stripe sessions; defaults to `false`. |
| `PAYPAL_ENABLED` | `true` to permit new PayPal orders; defaults to `false`. |
| `SHIPPING_CENTS` | `0`, your confirmed free delivery policy. |
| `SHIPPING_COUNTRIES` | `AU`, your confirmed Australia-only delivery policy. |
| `STRIPE_SECRET_KEY` | Matching Stripe account/mode key, entered only in Netlify. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for that mode's webhook endpoint. |
| `PAYPAL_ENV` | `sandbox` for test mode; `live` for live mode. |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Credentials from the same PayPal REST app/environment. |
| `PAYPAL_WEBHOOK_ID` | Webhook ID registered in that same app/environment. |

A provider only opens when its own switch, the master switch, credentials, mode, origin and shipping settings are valid. Stripe keys are checked for test/live prefixes. PayPal's environment must match `PAYMENT_MODE`; its API validates the supplied app credentials. The server still validates provider totals and signatures. The switch checks do not establish credential validity or webhook delivery; real sandbox verification is required.

Stripe test mode reads only `config/stripe-test-prices.json` for the selected product's test Price ID. Blank or invalid test mappings stop checkout. Live mode uses the original IDs in `products.json`. The server verifies price mode, active status, one-time/per-unit pricing, AUD and exact amount before creating the hosted checkout. No publishable key is needed for this implementation.

PayPal uses server-validated catalogue amounts and does not require the Stripe test-price map. Both providers use the original product names, selected variants and quantities. Disabling a provider switch stops new orders; already-created sessions can still be reconciled while matching credentials remain configured. Changing mode/credentials mid-checkout can prevent reconciliation, so finish test orders before switching settings.

One flat shipping charge applies per order. No tax engine, postcode-based rates or carrier quotes are added. Confirm your product prices' tax treatment before selling.

## Order confirmation, records and fulfilment

- Netlify Blobs is accessed by the functions using Netlify's runtime context; no extra Blobs token needs to be placed in this project.
- Store names separate the Stripe mode, PayPal mode and Netlify deployment context. In Netlify's Blobs view, look for `round-one-orders-...`.
- `orders/` contains the immutable server-validated order snapshot. `sessions/` and `providers/` bind it to a real provider session/order.
- `payments/` is written only after a matching completed provider payment is verified. Repeated requests/webhooks do not create a second paid record for the same order.
- Captured records contain items, selected variants, amounts, transaction references and provider-supplied customer/shipping details. They are server-side data, not public assets. Access them through your private Netlify account.
- The return page needs the browser's checkout token. It cannot mark a payment successful simply from a URL or a click. Provider webhooks can record payment even if the browser never returns.
- The purchased quantities are removed from the browser cart only after server confirmation; new unrelated items are retained.
- No warehouse dispatch, shipping label, automated order email, inventory reservation, refund administration or tax engine is added. Manage fulfilment using the confirmed record and provider dashboard, or add those integrations. Never dispatch based on the browser page alone.
- Stock counts are unknown. The 99-per-line cap is technical, not a promise of availability. Add a transactional inventory system before claiming real-time stock or reservation.
- Reconcile refunds/disputes in provider dashboards; the current paid record is a historical payment receipt, not a full order lifecycle ledger.

## Existing non-shop features

Training/private-vs-online controls, About and Contact remain. Contact and Personal Training enquiries now open in popup dialogs only when triggered. Both forms have validation, success/error handling and honeypot spam protection; they are ready for Netlify Forms detection. See `docs/FORMS.md` for deployment and Gmail notifications. Ordinary static previews deliberately do not send submissions.

Optional external booking URLs are configured in `dist/personal-training/config.js`; they are currently unset, so training buttons open the enquiry popup. An enquiry is not a confirmed booking. No automatic scheduler is configured. Training prices, contact details and policy placeholders still need genuine business values.

## Verification and limits

See `docs/VALIDATION.md`. Local builds and automated tests are separate from real provider account verification and a live Netlify deployment. No real transaction is claimed. `docs/CATALOGUE-AUDIT.md` contains the exact unresolved source issues.

Official integration references used:

- https://docs.netlify.com/build/functions/configuration/
- https://docs.netlify.com/build/functions/environment-variables/
- https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/api/prices/retrieve
- https://docs.stripe.com/checkout/fulfillment
- https://developer.paypal.com/api/orders/v2/
- https://developer.paypal.com/api/rest/webhooks/

## Current ChatGPT Sites deployment

The ChatGPT-hosted version publishes `dist/` as a static website. The catalogue and browser cart work there, but Netlify Functions are not executed on this host. Payment buttons remain disabled when no checkout backend is available. Deploy the complete repository to Netlify and follow the provider configuration above to enable Stripe and PayPal; no live payment credentials are included.
