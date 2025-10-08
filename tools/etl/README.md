# ETL Toolkit Notes

The canonical CSV produced by `columns-review.mjs` now includes photo-aware fields for WhatsApp-ready feeds:

- `photos`: every valid photo URL concatenated with `|`. Accepts multiple input styles:
  - Columns like `foto_1`, `foto2`, `galeria`, etc.
  - A single column containing a pipe/semicolon/comma separated list.
  - JSON arrays such as `["https://...","https://..."]`.
- `primary_image_url`: first valid URL discovered (or provided explicitly).
- `photo_count`: number of deduplicated URLs.

URLs are normalised to absolute `https://` links; duplicates and invalid entries are removed silently.
