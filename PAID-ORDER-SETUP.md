# Paid-order notifications

This copy is based only on your attached LATESTROUNDONE.zip. No tests, build, deployment or real form submissions were run for this update.

## Email setup after you upload

1. Upload the complete updated project to your existing GitHub repository and let your connected Netlify project deploy it.
2. In that Netlify project, open **Forms**. Confirm form detection is enabled and **paid-order** appears after deployment. If you enable detection after a deploy, redeploy once.
3. Open **Forms → Submission notifications → Add notification → Email notification**.
4. Select the **paid-order** form and enter **phonestarsadelaide@gmail.com** as the recipient, then save.
5. Keep the existing enquiry/contact notification settings. If an existing notification already emails you for **all forms**, it will cover paid-order too; avoid adding a second overlapping notification.

No Resend account, Gmail password, SMTP key or new environment variable is required. Keep your existing payment settings and SITE_URL, which must point to this deployed Netlify website.

## What changed

Only four files were added or edited:

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
