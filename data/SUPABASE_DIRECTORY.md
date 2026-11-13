# Supabase interpreter registry

The directory page loads the official Supabase JS v2 browser bundle from:
`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`.
`jsdelivr.net` is the service's website; `cdn.jsdelivr.net` is the script CDN.

Public configuration is in `supabase-config.js`. The owner corrected the original
service-homepage URL to `https://gykeddempkafqqmzuydy.supabase.co`. The exact supplied
publishable key and case-sensitive `Interpreters` table name are used. This key is
intended for public client code, not a secret/service-role credential. Never substitute
a service-role key. No approval-column filter is added: the owner explicitly confirmed
all table rows and their contact fields are pre-approved for public display.

On load, the client uses `supabase.from('Interpreters').select('*')`, paginated with
`.range()` in batches of 500, until an empty page confirms completion. The offset advances by the actual response
size so a lower server response cap does not silently truncate the registry. Anonymous SELECT
permissions and Row Level Security policies must allow these public records on the
server. No policies or schema are modified by this website change. Client display
flags are not an authorization boundary: the database must not expose non-public
records/columns to the publishable key. Keep private directory requests in separate,
non-public storage. The upstream under-construction notice and closed submissions are preserved; no form or writes are added.

Field mapping uses bracket notation: `row['Full Name']`, `row['Languages']`,
`row['Certification']`, `row['Email']`, `row['Phone Number']`. Optional specialization,
location, availability and website columns are supported; other non-empty columns
are rendered as plain text with exact labels. Empty/null/whitespace/empty arrays or
objects are hidden; numeric zero and false are preserved. Contacts use mailto/tel
links. HTML-like strings are text, never executable markup. Filters and search operate
on the fetched profiles. No member records are copied into this repository.

The SDK disables session persistence, token refresh and URL-session detection; no
login system is introduced. Loading, empty, failure and retry states are provided.
Raw database errors and connection details are not printed into the visitor UI.
Existing events, resource catalogs and pending resource-suggestion changes are preserved.

## Verification

The environment fetched the official CDN bundle successfully (HTTP 200), but its
network proxy blocked the Supabase project request with `Tunnel connection failed:
403 Forbidden`. This is not evidence of invalid credentials or database RLS failure.
Live connection/schema/row availability remains unverified. No database changes or
network-policy changes have been made. Do not claim live registry connectivity or
publication based only on mocked tests.

`SUPABASE_SDK_PATH=/tmp/hub-supabase-v2-cdn.js HUB_BASE_URL=http://127.0.0.1:8000 node tests/supabase-directory.cjs`
uses the actual downloaded official SDK and simulated API responses. Obtain that
bundle with normal verified HTTPS from the CDN URL above. The test covers uppercase
columns/table, no approval filters, contact links, empty values, additional columns,
HTML safety, search/filter behavior, pagination and error/retry states. The static
community test isolates its consent fixtures from the new remote loader; events and
consent gates remain covered there.
