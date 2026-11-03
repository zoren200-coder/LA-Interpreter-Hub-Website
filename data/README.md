# Resource catalog

`resources.js` is the single catalog for navigation, categories, and resource records.
Each category/subcategory ID is stable and is used in shareable `resources.html` URLs.
The catalog contains 17 original-source references supplied by the site owner: 14 in
Spanish ↔ English and 3 in Vietnamese ↔ English. The owner
confirmed both Google Drive files use “Anyone with the link” sharing; neither file is rehosted. These are
links to the original publishers, not redistributed copies. The original homepage topics remain intact.
External link verification is currently blocked by the environment; see RESOURCE_IMPORT_REPORT.md and VIETNAMESE_RESOURCE_IMPORT_REPORT.md.

Add actual records to `resources` with these fields:

- `id`: stable unique source ID (future Discord imports should use the message/attachment ID).
- `title`, `description`: plain text.
- `category`, `subcategory`: IDs from the taxonomy.
- `type`: `pdf`, `document`, `video`, or `external`.
- `language`: language name (use a consistent vocabulary).
- `source`: author or publishing organization.
- `url`: existing relative file location or HTTPS URL; do not invent links.
- `linkLabel`, `openInNewTab`: optional link label and safe new-tab behavior.
- `sharingPermission`: owner-provided sharing confirmation, when available.
- `subject`: subject grouping within the Spanish–English section.
- `status`: `published` or `review`.
- `metadataSource`, `accessStatus`, `distribution`: provenance and verification notes.
  A published record is a display flag, not proof that its URL has passed an access check.

Preserve original files and source URLs when organizing imported records. Deduplicate by ID.
Put ambiguous records in `reviewQueue` with the original metadata and a `reviewReason`;
do not guess a category. Review records must not be published until approved. No Discord
connection, import, or authentication is implemented here.

Development: from the repository root run `python -m http.server 8000`.
No package manifest or build step is present. Run the browser validation suite described below.

Validation: with the static server running, use
`HUB_BASE_URL=http://127.0.0.1:8000 node tests/verify.cjs`.
This requires the Playwright Node package and Chromium (`CHROMIUM_PATH` can override
`/usr/bin/chromium`). The suite checks navigation destinations, all 11 subcategory
views, desktop/tablet/mobile and keyboard menus, preserved homepage functionality,
and filters using temporary in-memory test records. No test records enter the catalog.
