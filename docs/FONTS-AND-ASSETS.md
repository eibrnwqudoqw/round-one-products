# Fonts and artwork

The six original WebP brand/training images and SVG favicon remain in `dist/assets/` and `dist/favicon.svg`. The catalogue now uses the 100 original product photographs from the root `images/` tree; the build copies them to `dist/images/`. Five missing variant-photo references are documented in CATALOGUE-AUDIT.md. The Round One wordmark is HTML text styled with CSS, not a missing logo file. Interface icons are inline SVG or text in the HTML/JavaScript.

The original site loads these Google Fonts through the first `@import` in `dist/style.css`:

- Barlow Condensed, weights 600, 700, 800, 900: https://fonts.google.com/specimen/Barlow+Condensed
- DM Sans, weights 400, 500, 600, 700: https://fonts.google.com/specimen/DM+Sans
- Exact original stylesheet: https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap

Font binaries are not bundled. The original Google Fonts dependency is preserved; a network connection is required for the exact typefaces. The site's fallback fonts still work offline. If you self-host fonts, download the required files from their official sources, keep their supplied license files, add them under `dist/assets/fonts/`, replace the Google Fonts import with matching `@font-face` declarations, and retain the same family names and weights.

Images are copied byte-for-byte from the website. This export does not add a blanket license or claim additional rights over third-party artwork. The private-training and online-coaching illustrations are illustrative generated images, not verified photographs of your coach or clients. No additional licensed stock assets are required by the code.
