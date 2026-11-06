# Events and interpreter directory

Public data lives in `community.js`; both arrays start empty. No events, people or
credentials are fabricated. The existing resource catalog and Pages configuration
remain unchanged.

## Add an event

Add a reviewed record to `events` with a unique `id`, `title`, `type` (from
`eventTypes`), `startAt` (ISO 8601 including UTC `Z` or an explicit offset),
optional `endAt` in the same format, IANA `timeZone`, `location` (include online
format/platform when appropriate), `organizer`, `description`, and an original
HTTPS event/registration `url`. Confirm real details with the organizer before
publishing. Keep expired records if the past-events archive is useful. Upcoming
and ongoing events sort by start date ascending; past events sort descending.
Display includes the event's time zone. Invalid dates/time zones/links are excluded.
The page refreshes its time-based grouping on load and when filters change.

## Receive and review directory requests

The form on `directory.html` is deliberately disabled. It collects/transmits/stores
nothing until a secure external submission service or backend is configured. No
email endpoint or public GitHub Issue intake is used. Do not enable the form without:

1. A chosen HTTPS form service with private submissions, restricted reviewer access,
   appropriate retention/deletion controls and a clear privacy notice identifying
   the service, data use and how to withdraw consent/request corrections.
2. A configured private reviewer destination. Never embed service credentials or
   private recipient data in the repository. If credentials are required, use a backend.
3. Required publication consent and separate private reply contact/reviewer fields.
   Validate submissions and confirm the public fields/contact link with the applicant.
4. An editorial process: review the application and consent privately, check the
   applicant's requested wording, and approve only authorized public information.
   Do not export raw submissions, private email, notes, consent evidence, timestamps,
   or supporting credential files to the public repository.

After review, manually add the approved **public** record to `interpreters`:
`id`, `name`, `languages` (array of language pairs), `specializations` (array),
`credentials` (array of member-supplied credential labels), `serviceArea`,
`availability`, optional HTTPS `website`, optional `contactURL`,
`approved: true`, `publicationAuthorized: true`. Include `contactAuthorized: true`
only when that specific contact URL was approved for public disclosure. Prefer a
member's professional contact-form URL. Explicitly authorized `mailto:`/`tel:` links
are supported but become public; never insert private contact details by default.

The directory requires both approval and authorization flags. Contact links require
their own authorization flag. These display gates are not a privacy boundary: do
not put pending/private data in the public catalog at all. The flags do not claim
identity or credential verification. No application is published automatically.
Remove or update a public record promptly when consent is withdrawn or corrected.

## Verify

Run the normal resource suite plus `HUB_BASE_URL=http://127.0.0.1:8000 node tests/community.cjs`
against a local static server. Fixtures are intercepted only in the test browser and
never added to public arrays. The suite checks empty states, event ordering/past
separation, filters, consent gates, safe contact URLs, disabled submission handling,
and responsive navigation. No login or payment system is added.
