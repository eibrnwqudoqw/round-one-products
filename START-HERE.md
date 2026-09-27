# Round One - start here

Fresh complete website source, exported 27 September 2026.
Includes the latest homepage hero fix, popup Contact and Personal Training forms, product catalogue, saved shopping cart, Stripe/PayPal server source and Netlify configuration.

## 1. Extract the ZIP

On Windows, right-click round-one-boxing-source.zip and choose Extract All.
Open the round-one-boxing folder. You should see package.json, netlify.toml, products.json, dist, images, lib, netlify, scripts and tests.

## 2. Upload the extracted files to GitHub

Upload the CONTENTS of round-one-boxing to the root of your website repository. Do not upload the ZIP itself. Do not accidentally place everything inside a second nested round-one-boxing folder.

Use GitHub Desktop to commit and push the complete folder if the browser uploader cannot accept the full set of files. With the browser, upload folders/files in batches as needed and preserve their paths. In either case, package.json and netlify.toml should be visible on the repository's main file list after upload.

If updating your existing round-one-products repository, keep a backup first and use it as the complete website repository. This ZIP contains the catalogue and image snapshot previously integrated into the website. If you have changed products.json or images since that snapshot, compare those changes before replacing them so you do not lose newer product edits.

Include all supplied source files and folders, including .env.example and .gitignore. Do not add actual secret values, local .env files or node_modules. The root images folder is the source; dist/images contains its generated public copy. Both are included in this complete export. Edit the root copy and rebuild.

## 3. Connect Netlify

Import the GitHub website repository into Netlify.
- Base directory: leave empty when package.json is at the repository root.
- Build command: npm run build
- Publish directory: dist
- Functions directory: netlify/functions (already set in netlify.toml)
- Node version: 22 (already configured)

Uploading only dist is not enough for payments. Use the full Git-connected project.

## 4. Configure services when ready

Payments: set the variables listed in .env.example securely in Netlify, with Functions scope. Keep PAYMENTS_ENABLED=false until catalogue, shipping and provider settings are ready. Follow the Stripe and PayPal sections in README.md. Test using isolated test/sandbox accounts before switching to live. Do not send API keys in chat.

Forms: enable Netlify form detection and redeploy. Confirm contact and personal-training-enquiry appear under Forms, then set your Gmail notification address in Netlify. No Gmail password is needed. Submit each form and verify both its Netlify entry and email notification. See docs/FORMS.md.

Training: enquiries are not automatically confirmed bookings. External scheduler links, genuine prices, policies and contact details still need your choices.

## 5. Edit locally in VS Code

Install Node.js 22 or newer. Open this folder in VS Code. In its terminal run:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Local browsing and the cart work, but this static server does not process payments or deliver enquiries.

Before uploading changes, stop the dev server with Ctrl+C and run:

```sh
npm run build
npm test
npm run test:http
```

## Known issues and further instructions

Read docs/CATALOGUE-AUDIT.md before enabling sales: five image mappings are missing, gloves5 has a $0.99 price to confirm, and glovestest is a visible test entry blocked from purchase. These source issues are preserved honestly, not silently changed.

README.md explains editing, payments, shipping and fulfilment. docs/VALIDATION.md records checks performed and what remains untested. EXPORT-MANIFEST.json lists included files and SHA-256 checksums. All required source/assets currently available are included; an export cannot supply missing original catalogue images.
