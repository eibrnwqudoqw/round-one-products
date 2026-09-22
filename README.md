# Round One - catalogue shop and Netlify checkout

This is the complete Round One website with its existing black/yellow/gold design, updated to use the actual product repository. It is plain HTML, CSS and JavaScript with **Netlify Functions** for Stripe and PayPal and **Netlify Blobs** for private order/payment records.

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
| `.env.example`                                            | Blank environment-variable template. No real keys included.                                   |
| `netlify.toml`                                            | Build, function bundling, publish folder and headers.                                         |
| `tests/`                                                  | Catalogue, cart, payment and local-server checks.                                             |

To update a product, change the root JSON and relevant source images, then run `npm run build`. Home and Shop cards now update from the same data automatically. The JSON object key is the product identifier; do not change it for a simple rename or price correction. Variants use stable colour/size labels derived from supplied values. Keep product IDs and variant labels stable where possible so saved carts remain valid.

All original descriptions are shown in the details dialog. Products with a colour-image mapping switch the photograph with that colour. Other local images in that product folder are available as gallery thumbnails. Images are shown in their actual colours so customers can identify the selected variant. The original site-wide black/yellow/gold styling remains.

## Netlify deployment

Import the **complete project**, not only the catalogue repository and not just `dist`, into your own website repository. The catalogue-only repository does not contain the website or functions. If it is nested in another repository, set Netlify's base directory to the folder containing `package.json` and `netlify.toml`.

Netlify settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node: 22

Use a Git-connected Netlify deployment so functions and their dependencies are bundled. Uploading only `dist` serves the shop but omits payments. Each page has its own `index.html`; no single-page-app catch-all rewrite is needed.

In Netlify's environment settings, create the variables in `.env.example`, with the **Functions** scope. Keep keys out of browser code, products.json, Git, screenshots and chat. Redeploy after changes. Your old Astra hosting access restrictions do not migrate; set access on the new host if needed.

### Shared payment settings

| Variable             | What to enter                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`           | Your actual HTTPS site origin, e.g. `https://your-site.netlify.app`. Used to create trusted return URLs and check request origin. |
| `PAYMENTS_ENABLED`   | Keep `false` during setup. Set `true` after catalogue, shipping and provider setup are verified.                                  |
| `SHIPPING_CENTS`     | Your actual flat shipping charge in AUD cents. Must be supplied. `0` explicitly means free shipping.                              |
| `SHIPPING_COUNTRIES` | Comma-separated country codes you actually ship to, e.g. `AU`. No default destination is invented.                                |

This implementation supports one flat shipping charge per order, displayed before payment. If you need weight-based, postcode-based or carrier-calculated shipping, implement those rules before opening sales. Prices remain the supplied amounts and no additional tax is automatically applied. Confirm how your product prices should account for tax before selling.

### Stripe setup

1. Set `STRIPE_SECRET_KEY` for the Stripe account and mode that own the existing Price IDs. There is no need for a browser publishable key with this hosted Checkout flow.
2. Create a webhook endpoint in that Stripe account pointing to:
   `https://YOUR-SITE/.netlify/functions/stripe-webhook`
3. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. Store the endpoint signing secret in `STRIPE_WEBHOOK_SECRET`.
5. Verify with Stripe test mode before real charges. Existing live Price IDs cannot be used with test-mode credentials; use a separate test copy with real test Price IDs if needed. The provided IDs are preserved unchanged.

The function retrieves the supplied Price ID and verifies active status, one-time/per-unit pricing, AUD currency and the exact amount. It then creates a real hosted session using that existing ID. Inaccessible IDs or mismatches stop checkout. Product keys, colours and sizes are stored in the order snapshot and Stripe metadata.

### PayPal setup

1. Create/select a PayPal REST app and set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in Netlify.
2. Set `PAYPAL_ENV=sandbox` during testing; use `live` only with matching live credentials.
3. Add an app webhook pointing to:
   `https://YOUR-SITE/.netlify/functions/paypal-webhook`
4. Subscribe to `PAYMENT.CAPTURE.COMPLETED` and store its ID in `PAYPAL_WEBHOOK_ID`.

PayPal opens its hosted approval page. The server creates the order using the trusted catalogue prices and selected colour/size. After the customer approves and returns, the server validates the stored order, amount and shipping destination before capture. It never trusts a browser-supplied amount or PayPal order ID. PayPal does not use Stripe Price IDs; both providers use the same source amounts.

Stripe and PayPal can be configured independently. Unconfigured provider buttons stay disabled. No payment keys are loaded into the browser.

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

Training/private-vs-online booking controls, About and Contact remain. Booking URLs are still configured in `dist/personal-training/config.js`; training prices and contact details still need your genuine business values. No booking scheduler or contact form backend was supplied by the product repository. Policy placeholders are preserved.

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
