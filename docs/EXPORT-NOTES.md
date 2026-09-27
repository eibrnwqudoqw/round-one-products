# Fresh portable source export

Prepared 27 September 2026 from saved Round One website version 11.
Website source commit: `c47416f32a7ca872a89a9d54f69c51351ad766bf`.

The latest saved version and its source commit were checked against Sites metadata before this export. All tracked project files are included except `.openai/hosting.json`, which only identifies the original ChatGPT hosting project and is not needed by Netlify. Git history, installed node_modules, local credentials and hosting caches are intentionally not included. Dependencies install from package-lock.json with npm ci.

The runtime source and public assets preserve the latest website. The export adds START-HERE.md and EXPORT-MANIFEST.json and updates documentation to describe the current popup forms and verification. No website redesign, product corrections or new integrations were performed during export.

## Catalogue provenance

The original products.json and images/ folder come from https://github.com/eibrnwqudoqw/round-one-products at commit `b349c5f2d66475668639f137786c8cf7734335b7`. Their source values and image paths are preserved. There are 20 catalogue entries, including one non-purchasable test entry, and 100 supplied product photographs. Five referenced photographs were already missing from that repository. Affected variants remain unavailable. See CATALOGUE-AUDIT.md.

Rebuilding creates browser catalogue data, public image copies and server catalogue data from the root data and images. Product images are not downloaded from GitHub at runtime. The source catalogue snapshot is not a claim that the external product repository has no newer changes.

## Independence and remaining services

This source does not depend on Astra/ChatGPT to run on Netlify. Netlify Forms handles enquiries after deployment and form detection; Netlify Functions and Blobs run the payment backend and private order storage. Stripe and PayPal accounts, environment settings and webhooks must be configured. Google Fonts is an external font dependency, documented in FONTS-AND-ASSETS.md. Training scheduling, branded order emails, inventory reservation and dispatch automation are not implemented. No private address or new credentials are added by this export.

This operation only creates a download. It does not upload to your GitHub repository, deploy to Netlify, change payment accounts or modify the existing hosted website. The contents of round-one-boxing should be at your website repository root, or Netlify must use that folder as its base directory.
