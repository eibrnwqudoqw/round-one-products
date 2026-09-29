# Updated portable source export

Prepared 29 September 2026 from the complete 27 September export of Round One website version 11, source commit c47416f32a7ca872a89a9d54f69c51351ad766bf, with the payment setup changes listed in CHANGES.md.

This update is a portable download. It has not been pushed to GitHub, published to Netlify or applied to the original ChatGPT-hosted site. Netlify environment variables, payment credentials and provider webhooks must be configured separately. The attempted account sign-in on 28 September did not result in any confirmed account changes.

All original product data, HTML, CSS and assets are retained byte-for-byte from the previous complete export. The original products.json and images folder came from the supplied GitHub catalogue at commit b349c5f2d66475668639f137786c8cf7734335b7. No claim is made that the external repository has no newer owner edits; compare them before replacing files. There are 20 catalogue entries including one blocked test item, 100 photographs and five missing photo mappings. See CATALOGUE-AUDIT.md.

The export includes the human-readable website, popup forms, cart, payment functions, configuration, dependency lockfile, tests and editing/deployment documentation. Git history, installed node_modules, credentials and original host-specific .openai metadata are excluded. Install dependencies with npm ci. The manifest lists every archived file except itself.

This source runs independently of the ChatGPT website editor. Netlify provides Forms, Functions and Blobs after deployment. Stripe and PayPal provide hosted payments after account configuration. Google Fonts remains an external typography dependency. Scheduling, automatic order emails, inventory reservation and dispatch automation remain unimplemented. No missing business details or catalogue assets have been fabricated.
