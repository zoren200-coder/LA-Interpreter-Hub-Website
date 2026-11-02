# Resource catalog

`resources.js` is the single catalog for navigation, categories, and resource records.
Each category/subcategory ID is stable and is used in shareable `resources.html` URLs.
The current repository contains illustrative homepage topics, not actual linked materials.
They remain on the homepage; no fictional resource records have been added.

Add actual records to `resources` with these fields:

- `id`: stable unique source ID (future Discord imports should use the message/attachment ID).
- `title`, `description`: plain text.
- `category`, `subcategory`: IDs from the taxonomy.
- `type`: `pdf`, `document`, `video`, or `external`.
- `language`: language name (use a consistent vocabulary).
- `source`: author or publishing organization.
- `url`: existing relative file location or HTTPS URL; do not invent links.
- `status`: `published` or `review`.

Preserve original files and source URLs when organizing imported records. Deduplicate by ID.
Put ambiguous records in `reviewQueue` with the original metadata and a `reviewReason`;
do not guess a category. Review records must not be published until approved. No Discord
connection, import, or authentication is implemented here.

Development: from the repository root run `python -m http.server 8000`.
No package manifest, build step, or existing automated test suite is present.

Validation: with the static server running, use
`HUB_BASE_URL=http://127.0.0.1:8000 node tests/verify.cjs`.
This requires the Playwright Node package and Chromium (`CHROMIUM_PATH` can override
`/usr/bin/chromium`). The suite checks navigation destinations, all 11 subcategory
views, desktop/tablet/mobile and keyboard menus, preserved homepage functionality,
and filters using temporary in-memory test records. No test records enter the catalog.
