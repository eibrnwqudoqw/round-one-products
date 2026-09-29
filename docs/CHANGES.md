# Changes in the 29 September 2026 ZIP

The base is the complete 27 September source export. No live account settings, repository commits or deployments are changed by downloading this file.

| File | Change |
| --- | --- |
| lib/http.mjs | Adds PAYMENT_MODE and separate STRIPE_ENABLED/PAYPAL_ENABLED checks; defaults to test mode with providers disabled; checks that Stripe key mode and PayPal environment match the requested mode. |
| lib/payments.mjs | Uses separate Stripe sandbox Price IDs in test mode, preserves original catalogue IDs in live mode, validates retrieved price mode, blocks mismatched provider credentials at API access, and recognizes restricted Stripe key modes for order-store naming. |
| config/stripe-test-prices.json | New server-only mapping of existing product IDs to blank test Price ID placeholders. Fill only with real IDs from your own Stripe sandbox. |
| netlify/functions/checkout-config.mjs | Reports the non-secret payment mode to the cart. Credentials remain server-side. |
| dist/cart/checkout.js | Shows a TEST CHECKOUT notice when test payments are available and separates cached checkout attempts by payment mode. Existing styling and cart functions remain. |
| netlify.toml | Includes the new server test-price mapping in function bundles. Existing build, routes and headers remain. |
| .env.example | Documents the three new safeguards; sets the confirmed free-Australia delivery values; leaves all credentials blank and payments disabled. This is not automatically imported by Netlify. |
| tests/payments.test.mjs | Adds mode mismatch, independent provider, missing test map and original live Price ID regression tests; updates Stripe sandbox fixtures. |
| tests/ui.test.mjs | Tests PayPal-only sandbox button states, free shipping, AUD total and test-mode notice. |
| README.md | Updates payment controls, new mapping file and Netlify configuration instructions. |
| START-HERE.md | Updates export date and the next steps for the new settings. |
| docs/PAYMENT-SETUP.md | New step-by-step upload, PayPal-only sandbox, Stripe testing and live migration guide. |
| docs/EXPORT-NOTES.md | Records this update's provenance, unchanged assets and what was not deployed. |
| docs/VALIDATION.md | Records the actual checks performed for this ZIP and account-level checks still outstanding. |
| docs/CHANGES.md | This exact change list. |
| EXPORT-MANIFEST.json | Regenerated file sizes and SHA-256 hashes for the complete updated archive. |

## Unchanged

All eight HTML pages, all CSS files, photographs, branding, typography, popup forms and original products.json are byte-for-byte unchanged from the previous export. No prices, qualifications, policies or reviews are invented. Missing catalogue images remain documented and unavailable.

The full website remains included, not just a patch. Runtime dependencies and their lockfile are unchanged. No API keys, passwords or actual environment files are packaged.
