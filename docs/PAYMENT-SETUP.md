# Payment setup after uploading this ZIP

## What this update does

It keeps the website's existing design and adds separate payment switches. A live Stripe key cannot be used when PAYMENT_MODE=test. PayPal sandbox can be tested with Stripe disabled. No account settings or credentials are included or changed by this ZIP.

## 1. Upload the code

1. Extract the ZIP. Copy the contents of round-one-boxing into your cloned repository folder, replacing matching files. Preserve the repository's .git folder. Compare any catalogue edits you made since the previous export before replacing products.json or images.
2. In GitHub Desktop, review the changes, commit with “Separate payment providers and add test-mode safeguards”, then Push origin.
3. In Netlify, check that the deployment succeeds. Use npm run build, publish dist, and the supplied netlify.toml. Import the whole repository, not only dist.
4. Keep PAYMENTS_ENABLED=false on the customer-facing project while setup is underway. The new provider switches also default to false.

## 2. Test PayPal first, without changing the Stripe catalogue

Use a separate Netlify test project connected to the updated repository. Set its SITE_URL to its own HTTPS address. Keep this test site's settings separate from the customer-facing project.

Set these variables in that TEST project's Netlify environment settings:

| Key | Value |
| --- | --- |
| SITE_URL | The test project's actual HTTPS origin, without a trailing slash or page path |
| PAYMENT_MODE | test |
| STRIPE_ENABLED | false |
| PAYPAL_ENABLED | true |
| PAYMENTS_ENABLED | false initially; true after the sandbox app/webhook settings below are complete |
| SHIPPING_CENTS | 0 |
| SHIPPING_COUNTRIES | AU |
| PAYPAL_ENV | sandbox |
| PAYPAL_CLIENT_ID | Sandbox app Client ID |
| PAYPAL_CLIENT_SECRET | Secret from the same sandbox app |
| PAYPAL_WEBHOOK_ID | Webhook ID from the same sandbox app |

Do not copy live Stripe credentials into the test project. On an existing project, a live Stripe key left configured is blocked both by STRIPE_ENABLED=false and by the test-mode check. You do not need Stripe test prices for a PayPal-only test.

In PayPal Developer, keep Sandbox selected, open the same app under Apps & Credentials, and add this webhook using the TEST site's address:

`https://YOUR-TEST-SITE.netlify.app/.netlify/functions/paypal-webhook`

Select PAYMENT.CAPTURE.COMPLETED and save. Copy the resulting ID into PAYPAL_WEBHOOK_ID. An ID registered for the main site's URL does not automatically register the separate test site's URL.

Use All scopes, or Functions scope if your plan supports it. No upgrade is required for All scopes. Mark the client secret as secret. Once configured, set PAYMENTS_ENABLED=true on the test project and redeploy. The cart should show a TEST CHECKOUT notice, PayPal enabled and Stripe disabled when it contains available products.

Sign in at PayPal checkout with your Australian PERSONAL sandbox buyer account. Do not use the sandbox Business seller account as the buyer. Verify free shipping, Australia-only acceptance, the correct total, return to the website and cart removal only after confirmation. Verify the completed payment in PayPal, delivery of the webhook, and the private paid record in Netlify Blobs. Also test cancellation; it must retain the cart. These account-level checks have not been performed for you.

## 3. Add Stripe testing when ready

Keep PAYMENT_MODE=test on the test project. In a Stripe sandbox, create test Prices with the same amounts and AUD currency as the products you will test. Fill their real test Price IDs into config/stripe-test-prices.json, keyed by the existing product IDs. Empty values are deliberate placeholders. Do not replace the original IDs in products.json.

Example structure (replace the placeholder with a genuine ID):

```json
{
  "gloves7": "YOUR_ACTUAL_STRIPE_TEST_PRICE_ID"
}
```

Keep the other keys from the supplied file; they can remain blank for products you are not testing. Commit and push this mapping; Price IDs are identifiers, not secret API keys. The map is server configuration and is not copied to dist.

Set STRIPE_SECRET_KEY to the matching sandbox key and STRIPE_ENABLED=true. Create a Stripe sandbox webhook for:

`https://YOUR-TEST-SITE.netlify.app/.netlify/functions/stripe-webhook`

Subscribe to checkout.session.completed and checkout.session.async_payment_succeeded. Put its signing secret in STRIPE_WEBHOOK_SECRET. Redeploy, then test a product whose mapping you filled. The backend requires an active one-time/per-unit Price in AUD with the exact catalogue amount and test mode. Blank mappings or mismatches stop checkout rather than falling back to original IDs.

Use Stripe test payment details from its official testing documentation. Verify payment, webhook delivery, stored order and cart clearing. No real card or live key should be used for sandbox tests.

## 4. Launch with real payments after tests pass

On the customer-facing project, keep PAYMENTS_ENABLED=false while configuring:

- SITE_URL: your final public HTTPS origin.
- PAYMENT_MODE=live.
- STRIPE_ENABLED=true only when its live account, existing catalogue Price IDs, live key and live webhook are verified.
- PAYPAL_ENABLED=true only when its live app credentials and live webhook are configured.
- PAYPAL_ENV=live. A sandbox Client ID, Secret or Webhook ID cannot be reused as live credentials.
- SHIPPING_CENTS=0 and SHIPPING_COUNTRIES=AU.

You can leave either provider disabled while launching the other. The live Stripe flow preserves the existing Price IDs in products.json. Register live webhooks using the customer-facing site's address. Finish pending tests before changing credentials; store namespaces depend on provider modes and deployment context.

Replace exposed live secrets in provider dashboards, enter replacements securely in Netlify and redeploy. Once account checks, catalogue corrections, policies and fulfilment arrangements are complete, set PAYMENTS_ENABLED=true on the customer-facing project and redeploy. Switching that variable is a real-payment launch, not a test.

## Forms and remaining website work

Forms are unchanged: enable Netlify form detection, redeploy and check that contact and personal-training-enquiry are detected. Set Gmail submission notifications in Netlify and submit each popup form to verify delivery. No Gmail password or SMTP key is required. Read FORMS.md.

Five missing photo mappings, the gloves5 price, training prices, genuine contact/policy details and any scheduling links still need your decisions. See CATALOGUE-AUDIT.md and README.md. The export does not invent these details or claim the site is launch-ready.

## Official references

- https://docs.netlify.com/build/functions/environment-variables/
- https://docs.netlify.com/manage/forms/setup/
- https://docs.stripe.com/keys
- https://docs.stripe.com/testing
- https://developer.paypal.com/api/rest/webhooks/rest/
