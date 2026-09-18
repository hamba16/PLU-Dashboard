# PLU Youth Registration Dashboard

Next.js workspace for Kampala Central, Kawempe, Makindye, Nakawa and Rubaga. Account creation is restricted to full administrators. Public registration and public status lookup have been removed.

## Current readiness

The access-control implementation and database migration are in place. The linked Supabase project has public signup disabled and a private application schema. **Live email OTP and the four review accounts are not ready yet:** a Resend API key, a verified sender address and four individually checked email addresses are still required. See [implementation and verification report](doc/RBAC_AUTH_AUDIT_REPORT.md).

## Local application

```sh
npm ci
npm run dev
```

Configure the keys listed in `.env.example` in ignored `.env.local`. `DATABASE_URL` uses the dedicated `plu_app` server login, not the public Supabase key. Remote database connections verify both Supabase's CA and hostname. The public CA is in `supabase/certs/`; it is not a credential. Keep `NIN_ENCRYPTION_KEY` in secure backup: losing it makes stored NINs unrecoverable. None of the service-role key, database password, NIN key, passwords or session tokens belong in public environment variables or source control.

`APP_ORIGIN` accepts a comma-separated list of exact browser origins and must include the final HTTPS origin when deploying (for example, `https://plu-dashboard.vercel.app`). On Vercel, the guard also recognizes the deployment and production project URLs from Vercel's `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` variables. The application uses secure, HttpOnly, SameSite=Strict cookies in production. Use a Next.js server, not static hosting.

## Access and routes

| Route                                       | Access                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `/login`                                    | Registered staff login; password, email OTP, initial permanent password    |
| `/overview`, `/registrations`, `/districts` | Completed staff session; registration role sees its assigned division only |
| `/staff-entry`                              | Registration and full administrator                                        |
| `/edit/<uuid>`                              | Server-enforced ownership, division and status checks                      |
| `/users`, `/audit`                          | Full administrator only                                                    |
| `/api/supabase/health`                      | Non-sensitive Auth connectivity boolean                                    |

All reads and mutations enforce access on the server. Registration accounts can edit their own draft/submitted/correction records. Approvers make decisions on submitted records and cannot change field values. Rejected records are terminal. Full administrators can edit approved records, with field-level audit history. Read-only administrators cannot mutate registrants, accounts or decisions, access audit history, or unmask NINs.

## Supabase setup

The current project migration is applied and recorded. On a fresh project, apply `supabase/migrations/` through the Supabase CLI. The migration creates a non-login `plu_app` role; a database administrator must set its login password separately and configure `DATABASE_URL`. Do not put this password into migration SQL.

Auth must have public signup and anonymous sign-in disabled. Email OTP expires after 600 seconds. OTP delivery uses the server-side Resend API. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to ignored `.env.local`; replace `re_xxxxxxxxx` with your real Resend API key and use a sender address verified in Resend. Never expose the key as a `NEXT_PUBLIC_*` variable. Do not turn off OTP to work around missing email delivery.

The app intentionally does not accept Supabase access tokens as application sessions. Password verification starts a server-held challenge. OTP verification completes that challenge before data access; first login additionally requires a permanent password. This prevents password-only and email-only Supabase sessions from bypassing the app's two-step login. OTP is on by default; full administrators may toggle it for any account, including their own.

## Four seed/test accounts

Set these four distinct, individually checked inboxes in `.env.local`:

- `SEED_REGISTRATION_EMAIL`
- `SEED_APPROVAL_EMAIL`
- `SEED_ADMIN_READONLY_EMAIL`
- `SEED_ADMIN_FULL_EMAIL`

Then run `npm run seed:test`. The seed refuses absent/duplicate/example inboxes and unexpected existing accounts. It provisions exactly one account per role, assigns registration to Kampala Central, enables OTP, and requires a permanent password. Generated temporary credentials are written only to ignored `.env.seed-credentials.json`. Names and metadata explicitly identify seed/test accounts. No dummy registrants are seeded.

After real provisioning, deactivate the four seed profiles and delete their Supabase Auth identities. Retain historical profiles/audit attribution; do not erase audit history. Remove the local temporary-credential file after handoff. The first seed administrator is an explicit bootstrap exception to admin-created accounts and is marked in the audit log.

## Account administration and audit

Full administrators can create accounts, edit name/role/division/active status, toggle OTP, and set a temporary password with the Reset password action. Security changes revoke app sessions immediately through live profile version checks. A reset forces a new permanent password on next login. If the external Auth provider fails during a reset, the account remains inactive; the failure is recorded. Retry the reset and explicitly reactivate the account after success.

Record writes and audit entries commit in one transaction. Concurrent stale edits return a conflict. NINs are AES-256-GCM encrypted with the record ID bound as authenticated data; ordinary responses expose only the final four characters. The unmask endpoint logs each access before returning plaintext. Field audit entries record that a NIN changed without recording either raw value. The audit view filters by actor, record, action and UTC date range, paginates, and exports the displayed page as JSON. History is append-only.

## Verification

```sh
npm test
npm run typecheck
npm run build
npm run check:supabase
```

The first commands check local code. `check:supabase` performs live, read-only Auth/configuration, Data API isolation and database checks; it prints counts, not record content or credentials.

Database integration tests require a disposable local PostgreSQL database with the migration applied and test roles `anon` and `authenticated`. Set `TEST_DATABASE_URL` to its owner connection and run `npm run test:integration`. Remote URLs are refused. The test rolls back its fixtures.

Browser verification requires the app server's `DATABASE_URL` to point to that same disposable local database. Set `TEST_DATABASE_URL` and run `npm run test:e2e`; it seeds local test profiles/sessions only. For the additional Auth orchestration tests, run `node tests/auth-provider.mjs` with `TEST_DATABASE_URL`, start the app with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55440` and test-only Supabase keys, and set `TEST_AUTH_PROVIDER=1` when running Playwright. This loopback Auth double sends no emails and is never imported by the application. Those tests establish app behavior, not live SMTP delivery.

Stop the test app/provider and discard its isolated database after testing. Never configure a deployed app with test provider settings.

## Structure

- `app/`: guarded pages, Auth/records/accounts/audit APIs.
- `src/`: UI, shared role checks and validated form contracts; no runtime fixtures.
- `utils/`: server database access, session guards, NIN encryption and record transactions.
- `supabase/`: migrations, Auth settings and public CA.
- `tests/`, `e2e/`: clearly isolated test fixtures and checks.
- `extra/`: archived design exports and earlier prototypes, outside the served application.
