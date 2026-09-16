# PLU access-control implementation and verification

14 September 2026. The application implementation and live database setup are complete; the full requested delivery is **not yet complete** because live email OTP and the four seed accounts require external inputs.

## Implemented

- Four direct roles with fixed division assignment for registration staff. The five divisions are Kampala Central, Kawempe, Makindye, Nakawa and Rubaga.
- Server-side page/API guards, live account status/version checks, private database schema and dedicated server database login. Supabase access tokens alone cannot access application data.
- Owner-only registration edits in draft/submitted/needs_correction; approved registrations lock registration staff out; rejected records are terminal. Approvers decide submitted records with required rejection/correction reasons and cannot change submitted fields. Correction edits and resubmission are separate actions.
- Password verification, server-held email OTP challenge, initial permanent-password change, fixed eight-hour sessions, ten-minute incomplete-login expiry, session rotation, logout, durable login/code attempt limits, origin checks and no-store responses. OTP is enabled by default and full admins can toggle it for any user, including themselves.
- Full-admin account creation, name/role/division/active-state editing, OTP control and explicit temporary-password resets. Role/account/security changes invalidate existing sessions. No self-registration or anonymous password-reset interface.
- Atomic record changes and audit events; field before/after values; attributed status history; account action intent/outcome records; NIN unmask events. The audit UI filters by actor, record, action and UTC dates, paginates and exports the displayed page.
- AES-256-GCM NIN encryption, record-ID authentication binding, masked ordinary responses, admin-only audited reveal with automatic hiding. NIN field audit entries contain a change marker, not plaintext before/after values.
- Explicit seed script for exactly four accounts: one per role, registration assigned to Kampala Central, clearly named SEED TEST, OTP on and permanent-password change required. Temporary credentials are generated into an ignored local file; no credentials are embedded in source.

## Live changes and evidence

Project: `PLU youth dashboard`, ref `yuqspijbfvdvoleuvoym`.

- Inspected before modification: no application tables and zero Auth users.
- Applied `20260913114615_rbac_auth_audit.sql`; Supabase migration history matches the local migration.
- Created the dedicated `plu_app` server role and configured its credential in ignored `.env.local`. Connected successfully with CA and hostname verification. Public CA source: `https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`.
- Configured server-only Supabase service-role and NIN encryption keys locally. No secret values were printed or committed.
- Disabled public signup; retained disabled anonymous sign-in. Set a 12-character minimum password, six-digit OTP and 600-second OTP expiry.
- Live private Data API query denied with `PGRST106`. Server role has neither UPDATE nor DELETE permission on audit history.
- Supabase security advisor: **No issues found**.
- Final live counts: **0 registrants, 0 app accounts, 0 seed accounts**. No dummy registrants were created in the live project.
- Fixed a production-only certificate-loading issue in server-rendered pages and explicitly included the CA in deployment file tracing.
- Production build using live configuration: `/overview` redirects to `/login`; records, users and audit APIs return 401 without a completed session; a forged app cookie also returns 401 through the real database; `/api/supabase/health` returns 200 with `connected: true`.

## Checks performed

| Check | Result | Boundary |
| --- | --- | --- |
| `npm test` | 5 passed | Includes 80 role/status/ownership/division combinations, assignment rules, field validation and audit redaction |
| `npm run test:integration` | Passed | Real isolated PostgreSQL transactions, correction flow, stale writes, locks, encryption, audit immutability, Data API-role denial and session revocation |
| Playwright with isolated database and local Auth double | 6 passed | Browser forms, role APIs, initial password, OTP-required/disabled paths, wrong/replayed codes, signout/deactivation, admin create/reset, simulated provider failure, audit filtering and mobile routes |
| Browser visual checks | Passed | Existing login design, registrations, audit and mobile layout; mobile Sign out fixed |
| `npm run build` | Passed | Production compilation and TypeScript |
| `npm run typecheck` | Passed | TypeScript |
| `git diff --check` | Passed | No whitespace errors |
| `npm run check:supabase` | Passed | Live read-only Auth settings, Data API boundary, TLS connection, counts and audit privileges |
| Supabase security advisor | Passed | Live database security findings |
| `npm run seed:test` | Blocked before writes | Missing four real email addresses; script refuses invented/duplicate/example addresses |
| Live inbox delivery and positive login for each role | Not performed | Custom SMTP and real accounts are unavailable |

The Auth test double is confined to `tests/auth-provider.mjs`, listens only on loopback and sends no email. The app does not import it. Browser fixtures were created only in an isolated local PostgreSQL instance. Passing those tests does not establish live Supabase email delivery. The local provider was stopped before the production build/live checks.

## External blockers

Supabase rejected the requested Magic Link email-template update with HTTP 400:

> Email template modification is not available for free tier projects using the default email provider. Please upgrade your plan or configure a custom SMTP provider.

The required template is prepared in `supabase/templates/login-code.html`. It must be applied after configuring a capable email provider. The standard Supabase provider also restricts delivery to project-team addresses and is unsuitable for normal staff provisioning; see [Supabase custom SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

The four individually checked email addresses were not provided and are absent from `.env.local`. Add `SEED_REGISTRATION_EMAIL`, `SEED_APPROVAL_EMAIL`, `SEED_ADMIN_READONLY_EMAIL` and `SEED_ADMIN_FULL_EMAIL`, then run `npm run seed:test`. Until then there are no usable staff accounts. Do not deploy this as a completed operational rollout or disable OTP to bypass the blocker.

Once SMTP is configured, apply the prepared template, seed the four accounts, and verify receipt and login for each inbox, permanent-password setup, subsequent OTP login, and admin-assisted resets against live Supabase. A real login verification requires the code delivered to the corresponding inbox.

## Judgment calls and cleanup

- Email OTP is enforced as an application login step after password proof; it is not presented as Supabase AAL2/MFA. Supabase's passwordless email session by itself is insufficient for app access.
- First login also verifies email before setting the permanent password when OTP is enabled. This is stricter than postponing email verification until the next login.
- Approvers act only on submitted records. Rejected records cannot reopen; full administrators may edit approved field values, with audit history.
- Audit management means filtering and export. Neither full admins nor the application database login can rewrite/delete history.
- Last-active-full-admin demotion/deactivation is blocked. A failed external password reset leaves its target inactive to prevent access with uncertain credentials. Administrators can retry/reset and reactivate it. Maintain a second real full admin for operational recovery before retiring the seed admin; an interrupted sole-admin reset can require privileged operator recovery.
- Failed account creation reserves an inactive, audited profile. If Auth creation fails or a process is interrupted, reconcile the profile and Auth identity before retrying provisioning; the app does not silently delete the audit evidence.
- Removed runtime synthetic records/rollups, permissive login, public registration/lookup, prototype context and unused Supabase browser/SSR session helpers. Removed obsolete tests asserting that blank credentials work. Health verification no longer probes the unrelated `todos` example.
- Original reference exports and older prototype archives remain in `extra/`; these are outside the served app. New synthetic data exists only in explicit test files, never runtime data providers.
- The display route `/districts` is retained for compatibility, but all displayed content and rollups use Kampala divisions. The registration form's existing `district` transport key maps to the database `division` column; it cannot broaden scope.
- No commit, push or deployment was requested or performed. The production build can be reviewed locally, but live account review awaits the dependencies above.

## Seed retirement

After real accounts exist, deactivate the four SEED TEST profiles and remove their Supabase Auth identities. Retain historical profile attribution and audit events. Remove the ignored temporary-credential handoff file after use. Keep the NIN key in secure backup and set `APP_ORIGIN` to the deployment's exact HTTPS origin.
