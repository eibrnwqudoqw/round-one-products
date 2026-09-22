# Catalogue verification report

Verified before modifying the shop on 22 September 2026.

Repository: https://github.com/eibrnwqudoqw/round-one-products

Read commit: `b349c5f2d66475668639f137786c8cf7734335b7` (main).

## Access and source preservation

The public Git repository was cloned successfully. The actual `products.json` parsed successfully: 20 entries, comprising 6 bags, 12 glove entries (including `glovestest`) and 2 pads. All 100 existing product photographs could be read and decoded. `images/.gitkeep` is an empty Git placeholder, not an image or a corrupt photograph.

The source JSON and the entire `images/` tree are copied without changing their bytes, names or directory structure. `npm run build` creates browser files from these inputs. No product descriptions, supplied prices, colours, SKUs or Stripe Price IDs were corrected or invented.

## Five missing image references

| Product  | Colour | Referenced file         |
| -------- | ------ | ----------------------- |
| gloves7  | Cyan   | `images/gloves7/20.png` |
| gloves11 | Black  | `images/gloves11/1.png` |
| gloves11 | Blue   | `images/gloves11/2.png` |
| gloves11 | Pink   | `images/gloves11/3.png` |
| gloves11 | Red    | `images/gloves11/4.png` |

The `images/gloves11/` folder is absent. These five variants are unavailable in the storefront and rejected by both server-side payment flows. No substitute colour image is used. `gloves11` still appears with its supplied information and a photo-unavailable message. Add the exact missing files, or correct the mappings in the source when you have verified replacements, and rebuild to restore these variants.

## Duplicate or inconsistent SKU observations

| Supplied SKU | Entries using it             |
| ------------ | ---------------------------- |
| PBBWATER18   | bag2, bag3, bag4             |
| PBG9EMEXMR16 | gloves2, gloves3             |
| PBG5GB16     | gloves5, gloves6, glovestest |
| PBG6B16      | gloves9, gloves10            |

These are reused across different titles, models, colours or sizes. The application therefore identifies products by their unique JSON keys, not by SKU. Source SKUs remain unchanged.

Additional observations requiring catalogue-owner review:

- `gloves4` is titled 16oz, while its SKU ends in `12`.
- `gloves6` is titled 14oz, while its SKU ends in `16`.
- `gloves10` is titled 12oz, while its SKU ends in `16`.
- `gloves8` contains a trailing space in its SKU.

These suffix observations are possible inconsistencies, not proof of the manufacturer's SKU convention.

## Price and Stripe mappings

- All 20 entries have unique, syntactically valid `price_...` IDs. None is missing or duplicated.
- `gloves5` is supplied at **$0.99**. That value is preserved. Confirm that this is your intended selling price before opening payments.
- `glovestest` is supplied at **$0.01** and reuses the gloves5 images. Its source entry is preserved and shown as a test entry; it cannot be added or purchased. This exclusion lives in the adapter, not in the source JSON.
- `gloves3` has a different-looking Price ID from most other entries. Its ownership cannot be inferred from its text. No ID was replaced.
- No credentials were requested or accessed. Stripe account ownership, test/live mode, active status and provider-side currency/amounts could not be checked during repository verification.
- At Stripe checkout, the function retrieves every selected existing Price ID and requires an active, one-time, per-unit AUD price with the exact supplied amount. Any mismatch or inaccessible Price ID stops checkout.
- The repository provides one Price ID per product entry, rather than one per colour. That ID is reused for its supplied colour choices. The selected colour and fixed size are preserved in order records and Stripe metadata. PayPal receives the selected variant description.

All `sizes` arrays are empty. Where a title explicitly says `16oz`, `14oz`, etc., that supplied size is used as the fixed variant label. No additional sizes are invented. No stock quantities are provided; the limit of 99 per line is a technical cart limit, not a stock claim.

## Other information not supplied

The existing site's AUD currency is retained. Actual shipping charges and destinations must be configured explicitly before either provider enables checkout. No shipping rates, delivery times, tax registrations, availability promises or return policies have been invented. The supplied prices are treated as the final product amounts; no extra tax is automatically calculated by this implementation.
