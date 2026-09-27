# Contact and personal training forms

## What is included

- `contact` in a popup on `/contact/`: name, email, optional phone, subject and message.
- `personal-training-enquiry` in a popup on `/personal-training/`: name, email, phone, training option, experience, goals, preferred times and message.
- All training fields are required. All contact fields except phone are required.
- Both forms are present in static HTML with unique names, `method="POST"`, `data-netlify="true"`, a hidden `form-name` and a `netlify-honeypot="bot-field"` field. Netlify can detect them during deploy-time HTML processing.
- Shared `dist/forms.css` preserves the existing design; `dist/forms.js` handles inline errors, focus, URL-encoded submission, request failure, retry, duplicate-click protection and success.
- Forms are hidden inside native dialogs and open only through enquiry or booking buttons. Each popup has a close button, supports Escape and backdrop dismissal, traps focus, restores focus to the opener, and scrolls internally on small screens. Drafts remain when closed and reopened. Configured external booking destinations keep their existing booking flow; otherwise training buttons open the enquiry popup directly with the chosen format selected. An enquiry never confirms a booking.

## Current hosted preview

No form submission is sent from the ChatGPT-hosted site or an ordinary local static server. Netlify removes the `data-netlify` attribute when it processes a form. The shared script uses that documented transformation to distinguish a processed form from the unprocessed preview. In the preview, all fields and validation can be checked, but a valid submission explicitly says the message was not sent. There are no Gmail, SMTP or API credentials, and submitted field values are not stored in browser storage or application logs.

Do not manually remove `data-netlify` from source HTML: it is needed for form detection. JavaScript is required to open these popups. The forms retain native HTML required/email constraints in their static markup. Submission handling is unavailable on the current static host.

## When you move to Netlify — nothing to configure now

1. Deploy the complete project with its existing `npm run build` command and `dist` publish directory.
2. Enable automatic form detection in Netlify if it is not already enabled, then redeploy. Check that **contact** and **personal-training-enquiry** appear under Forms.
3. Configure email notifications to your chosen Gmail address in Netlify. The address does not need to be placed in website code, and no Gmail password is needed.
4. Send one test submission through each form on your Netlify URL. Confirm it appears in Netlify Forms, then confirm the notification arrives in Gmail (including spam folders).

A browser success state means the submission endpoint accepted the request; it does not guarantee email notification delivery. The form keeps typed values after network/server errors. A timeout can happen after the server accepted a message, so a manual retry could create a duplicate. The in-flight guard prevents repeated clicks from starting simultaneous requests.

## Spam protection

The hidden honeypot is declared for Netlify's server-side checking. Browser JavaScript also rejects filled honeypots. Netlify's built-in spam filtering applies after deployment. No CAPTCHA service, keys or user account setup is required by this implementation. These protections reduce spam; they do not guarantee none will arrive.

## Checks

Run `npm ci`, `npm run build`, then `npm test`.
The form tests simulate processed and unprocessed HTML and accepted/rejected responses. They do not contact Netlify or send an email. Live Netlify submission and Gmail delivery checks remain for after deployment.

For browser layout QA, copy `tests/responsive-check.html` temporarily to `dist/__layout-check.html`, run the local development server, and open `/__layout-check.html`. Its width and page selectors render the real pages inside a resizable iframe. Remove the temporary copy before publishing; the fixture belongs only under `tests/`.

Official references:
- https://docs.netlify.com/manage/forms/setup/
- https://docs.netlify.com/manage/forms/spam-filters/
- https://docs.netlify.com/manage/forms/notifications/
