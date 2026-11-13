# Supabase membership setup

Membership uses Supabase Auth, not the public `Interpreters` table. No new database table or migration is required for this phase. No account information is written to the public directory. The browser uses the existing publishable key; never use a secret/service-role key.

In the Supabase dashboard for project `gykeddempkafqqmzuydy`:

1. Authentication → Sign In / Providers → Email: enable email signup and **Confirm email**. Registration is automatic; there is no administrator membership approval.
2. Authentication → URL Configuration: set Site URL to `https://zoren200-coder.github.io/LA-Interpreter-Hub-Website/`. Add this exact Redirect URL: `https://zoren200-coder.github.io/LA-Interpreter-Hub-Website/membership.html`. Preserve any existing redirect entries that are still in use.
3. Configure production SMTP under Authentication email settings. Supabase's default mail service has delivery/rate/recipient restrictions and is not suitable for general public registration. Set a minimum password length of at least 12 in the project's password settings too.
4. Test with a new account: submit registration, receive and follow confirmation email, sign in, sign out, request password reset, follow the email and save a new password. Check Authentication → Users for the confirmed account.

The membership page is `membership.html`, linked from the homepage and directory footer. Registered users' professional names and consent timestamps are stored in their own Auth user metadata. Credentials are managed by Supabase Auth. Sessions persist in the browser to support sign-in; members should sign out on shared devices.

Directory applications remain closed. Existing approved public profiles remain visible. No directory write access has been added. For the future directory application flow, use private pending records and database policies that validate the authenticated user and verified email server-side. Never rely on the browser's membership display or editable user metadata for authorization, and never expose Auth users via an anonymous SELECT policy. Directory publication must remain a separate reviewed/consented action.

Dashboard configuration and live confirmation/reset delivery cannot be verified by local tests. Do not announce registration as operational until those settings and end-to-end email tests are complete. Existing GitHub Pages deployment configuration is unchanged.
