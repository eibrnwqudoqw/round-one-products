# Integration notes

The shop now uses the real repository catalogue and Netlify payment functions. The complete configuration guide is in `README.md`; source issues are in `docs/CATALOGUE-AUDIT.md`.

Endpoints:

- GET `/.netlify/functions/checkout-config`: only public availability/shipping settings.
- POST `/.netlify/functions/create-checkout`: validated product/variant IDs and quantities, provider and browser checkout proof; creates Stripe or PayPal checkout.
- POST `/.netlify/functions/payment-status`: verifies the browser proof and provider state; captures an approved PayPal order when requested by its returning browser.
- POST `/.netlify/functions/stripe-webhook`: Stripe SDK signature verification and provider-backed payment confirmation.
- POST `/.netlify/functions/paypal-webhook`: PayPal signature verification and provider-backed capture confirmation.

Checkout requires explicit environment enablement, shipping settings and the selected provider's credentials/webhook configuration. No secrets are included. Netlify Functions and Blobs are required for payments; the static site and cart work independently.

Live provider checks, charge tests and account setup have not been performed. Do not mistake local mocked tests for a verified live payment connection. No API keys need to be sent in chat.
