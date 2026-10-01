# Latest update: required phones and paid-order spam correction

**Built from your attached `round-one-products-main (1)(2).zip`. No tests, build, deployment, form submissions or payments were run.**

## Required setup for the spam correction

Netlify's Akismet filter can flag legitimate automated webhook submissions. The update keeps that filter enabled. A private scheduled function uses the Netlify API to mark only matching, verified paid-order false positives as legitimate.

1. In your Netlify user settings, open **Applications → Personal access tokens** and create a token that can access/manage Forms for this project. Keep the token private. Do not put it in this ZIP, GitHub or chat.
2. In the website's **Project configuration → Environment variables**, add **NETLIFY_FORMS_TOKEN** with that token. Mark it secret. Use Functions scope, or All scopes if your plan does not support individual scopes, for Production.
3. Add **NETLIFY_FORMS_SITE_ID** with your Netlify **Project ID** (the UUID in project details), not the site name or URL. The automatically provided `SITE_ID` is a fallback, but the explicit variable avoids ambiguity.
4. Upload the complete updated project to your existing repository and let Netlify deploy it. Leave all working Stripe, PayPal, shipping and site URL settings unchanged.
5. Keep your existing `paid-order` email notification to **phonestarsadelaide@gmail.com**. Do not add a second overlapping notification if one already covers this form.
6. After deployment, the Functions list should include **review-paid-order-spam**, scheduled every five minutes. It runs automatically on published deploys. You can use Netlify's **Run now** button if needed; this is not a public approval endpoint.

Without the token/project configuration, mandatory phone collection still works, but automatic spam correction cannot run. No token or account setting was created for you.

## What the correction does

The job reads spam entries only from the detected **paid-order** form. Before marking an entry verified, it requires:

- Its matching private `orders/<id>` and `payments/<id>` records with matching provider, currency and total.
- Its private `paid-order-forms/<id>` snapshot created by the verified webhook flow.
- Matching transaction and provider order IDs.
- An exact match of the submitted customer/address/product/amount fields to that private notification snapshot.

It does not trust an order ID or a `Paid` label alone. Unmatched entries stay in spam. Contact and personal-training forms, honeypots and global spam protection are untouched. It promotes the existing entry rather than posting another form submission, preserving the original webhook submission's duplicate reservation. This can also recover an earlier false positive if its private records are still present in the same store.

A second atomic reservation at `paid-order-spam-reviews/<order-id>` prevents simultaneous jobs or duplicate copies from making multiple automatic promotion attempts for an order. If the API result is uncertain, it leaves the review marked `needs_review` (or `promoting` after an interruption), logs only the order ID and retains both the payment and submission. Check Netlify before manually retrying; do not repeat a payment or delete its form reservation. A missing/expired token or an API outage does not reverse a payment.

A scan covers up to 500 spam entries and is bounded by the scheduled runtime limit. If an unusually large spam backlog exceeds that window, clear unrelated spam manually in Netlify or seek help with the backlog. No submitted content is logged. Tokens remain server-side. Normal Netlify Forms notification settings, usage limits and email delivery rules still apply.

## Required phone numbers

A single field above the existing payment buttons is required for both Stripe and PayPal. The field uses the current black/yellow styling, an accessible label, mobile phone keyboard and inline errors. Nothing else about the page layout or animations was changed.

The same format validator runs in the browser and on the server **before a payment session is created**. It accepts Australian mobile/geographic numbers in local form (e.g. `0412 345 678`) or international form (e.g. `+61 412 345 678`); overseas numbers require a `+` country code. It strips ordinary formatting and stores a normalized international number. Missing numbers, letters, invalid lengths and invalid Australian prefixes are rejected. This is format validation, not SMS verification or a guarantee that a number is reachable.

The phone is stored as `customerPhone` on the private order and paid receipt, included in the checkout-attempt fingerprint, and used in `paid-order` notifications for both providers. Changing it starts a new browser checkout attempt. Stripe additionally receives `phone_number_collection: { enabled: true }`. PayPal uses the required pre-checkout number even when the PayPal account omits a phone. Existing in-flight payment verification remains compatible; old orders without the new field fall back to provider-supplied numbers.

## Exact files in this update

Edited:

- `dist/cart/index.html` — required phone field only.
- `dist/cart/checkout.js` — validates and sends phone before opening Stripe/PayPal; includes it in the tab's checkout draft/signature.
- `dist/commerce.css` — styles scoped to the new phone field only.
- `lib/payments.mjs` — validates/stores phone, includes it in the order fingerprint and paid receipt, enables Stripe collection, exposes the private review job using the existing order store.
- `lib/paid-order-form.mjs` — prefers the stored checkout phone, with provider-phone fallback for older orders.
- `.env.example` — blank Netlify API token/project-ID placeholders; payment defaults were not changed.
- `PAID-ORDER-SETUP.md` — these setup instructions.

Added:

- `dist/checkout-phone.mjs` — shared phone-format validator; no secrets.
- `lib/paid-order-spam.mjs` — authenticated, paid-order-only false-positive correction.
- `netlify/functions/review-paid-order-spam.mjs` — private scheduled worker.

All other attached files are carried through unchanged. No dependencies were added. Existing payment signatures, provider verification, capture logic, pricing, cart calculations, animation scripts, product data and enquiry forms were not rewritten.

Official references:

- https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/#change-submission-state
- https://docs.netlify.com/manage/forms/spam-filters/
- https://docs.netlify.com/build/functions/scheduled-functions/
- https://docs.stripe.com/api/checkout/sessions/create

---

## Original paid-order setup notes

# Paid-order notifications

This copy is based only on your attached LATESTROUNDONE.zip. No tests, build, deployment or real form submissions were run for this update.

## Email setup after you upload

1. Upload the complete updated project to your existing GitHub repository and let your connected Netlify project deploy it.
2. In that Netlify project, open **Forms**. Confirm form detection is enabled and **paid-order** appears after deployment. If you enable detection after a deploy, redeploy once.
3. Open **Forms → Submission notifications → Add notification → Email notification**.
4. Select the **paid-order** form and enter **phonestarsadelaide@gmail.com** as the recipient, then save.
5. Keep the existing enquiry/contact notification settings. If an existing notification already emails you for **all forms**, it will cover paid-order too; avoid adding a second overlapping notification.

No Resend account, Gmail password or SMTP key is required. The paid-order spam correction added below requires two Netlify environment variables. Keep your existing payment settings and SITE_URL, which must point to this deployed Netlify website.

## What changed

The initial paid-order implementation added or edited these four files (see the newer update below for its additional changes):

- **lib/payments.mjs** — small hooks after the existing verified paid Stripe and PayPal webhook flows. Checkout creation, capture, payment verification and browser payment-status logic are unchanged.
- **lib/paid-order-form.mjs** — formats the saved order/customer/address/items and submits it to Netlify Forms. Records the submission attempt in the existing private Netlify Blobs order store.
- **dist/paid-order/index.html** — hidden static form schema named paid-order for Netlify deployment detection. It is not linked from the website and has no visible form or browser submission script.
- **PAID-ORDER-SETUP.md** — these instructions.

All other files from the attachment are included unchanged, including prices, cart, design, animations, existing forms and assets. No dependency or Netlify configuration change is required.

## Payment verification and duplicate prevention

Only the successful verified webhook paths in this application call the new submission helper. An unpaid event or merely visiting the success page does not call it. The saved order supplies prices, selected colour/size, quantities and totals; the verified payment record supplies customer and delivery details. Missing optional details are labelled Not supplied. Test-mode payments are marked TEST — DO NOT FULFIL in the subject.

An atomic `onlyIfNew` write at `paid-order-forms/<order-id>` in the existing private order store reserves exactly one automatic POST attempt per order. Concurrent or repeated Stripe/PayPal webhook deliveries do not create another automatic POST. A successful payment record is never removed or changed because of a notification failure.

**Delivery tradeoff:** Netlify Forms does not provide a transactional idempotency key for these POST submissions. To avoid duplicates after an uncertain timeout or crash, this implementation does not automatically repeat an attempted POST. The reservation stays in private storage as `posting`, `submitted` or `needs_review`, with the full notification fields available to recover the order details. `submitted` records an HTTP success response; it does not prove email delivery or bypass Netlify spam filtering.

If a notification is missing, check **Forms → paid-order**, including spam submissions, and the email inbox/spam folder. Then check the relevant webhook function logs and the private `paid-order-forms/<order-id>` record. If the record remains `posting` after the webhook finishes, or says `needs_review`, reconcile it with Netlify before resending anything. Do not delete its reservation and replay the webhook unless you have positively established that Netlify did not receive the first submission. Never repeat a customer's payment to retry a notification.

Netlify Forms submission endpoints are public, even when the HTML form is hidden. This implementation only *automatically* submits verified orders, but Forms itself does not authenticate a claimed payment. Keep Stripe/PayPal and the private paid-order records as the source of truth for fulfilment; a form entry or email alone is not proof of payment. Existing Netlify spam filtering and Forms usage limits still apply.

Official instructions: https://docs.netlify.com/manage/forms/notifications/
