# Discussion resource suggestions

The latest homepage links to a public discussion board on a separate origin:
`louisiana-hub-discussions.lattertulip17.chatgpt.site`. Its featured-conversation,
read/join/browse links, registration wording and private feedback board are preserved.
No editor or supported provider API is exposed in this static checkout. The Hub
cannot read the external board's editor/posts directly; no cross-origin scraping
or automatic post annotation is claimed.

A labeled “Find a related resource” textarea is beside the featured conversation
(below it on narrow screens). Suggestions appear below that field. The local adapter
can also annotate readable `.thread` title/body markup if such posts are present;
currently real posts live on the other site, so only the finder is integrated there.
The old static sample posts are not restored. Browser tests inject test-only readable
post markup to verify the optional adapter, without publishing fake posts.

`assets/resource-suggestions.js` builds an in-memory index on each page load directly
from `HUB_CATALOG`: published titles, descriptions, category/subcategory labels,
subjects, optional tags, sources, and cross-list metadata. No parallel resource catalog
or hard-coded resource links are maintained. New catalog records become eligible when
the updated site loads; no search service or index build dependency is needed.

Matching lowercases, strips accents, normalizes I-485 variants, and uses a small bilingual
term/concept map. Specific acronyms/phrases carry higher weight than general terms.
Broad words alone cannot trigger suggestions. IDF-style lexical scores, title evidence,
a minimum threshold, and a two-result limit keep suggestions conservative. Repeated
query words do not inflate scores. The concise-title tie-break favors focused references
without hard-coded record IDs. Deposition/deposición is supported, but no dedicated
deposition resource is invented when the catalog lacks one. This is deterministic
lexical matching, not semantic understanding or an assurance that a resource answers
a question. Publisher links retain their pre-existing verification status.

All processing is local. The finder does not submit, log, store, or put question text
in a URL, and does not call external matching services. No suggestion container is
shown for empty, broad-only, or unrelated queries. Links use catalog text via textContent
and safe HTTP(S)/relative URLs; unpublished/review records and executable URLs are excluded.

For a future real board/editor, connect its supported same-origin title/body fields to
`HubResourceSuggestions.suggest(index, title, body)`. A cross-origin iframe cannot be
read directly: use only the provider's documented integration or retain the finder.
Do not scrape private posts, bypass browser isolation, or send drafts to a third party.

Checks:
- `node tests/suggestions.cjs` — pure matching and catalog tests.
- `HUB_BASE_URL=http://127.0.0.1:8000 node tests/discussion-suggestions.cjs` — browser/privacy tests.
- Existing `verify.cjs`, `community.cjs`, and `social.cjs` suites remain applicable.
