# PLU Youth Registration Dashboard

Next.js 16 App Router application with the existing PLU interface, Geist typography, and Supabase SSR connection helpers.

## Run locally

Requires Node.js 20.9 or newer (Node 24 recommended).

```sh
npm ci
```

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase project. The supplied project is configured in the local, ignored `.env.local`; actual values are not committed.

```sh
npm run dev
```

Open **http://127.0.0.1:3000/login**. For production, run `npm run build` then `npm run start`. Configure the same environment variables in your hosting environment before building. This application needs a Next.js server, rather than a static Vite host.

## Routes and behavior

| Route                     | View                                                     |
| ------------------------- | -------------------------------------------------------- |
| `/` or `/overview`        | Staff overview, preceded by demo login                   |
| `/login`                  | Standalone login preview                                 |
| `/registrations`          | Search, filters, pagination, details and review timeline |
| `/staff-entry`            | Repeat registration and draft entry                      |
| `/edit/PLU-2026-<number>` | Continue a session draft                                 |
| `/register`               | Public self-service registration                         |
| `/status`                 | Public phone/reference lookup without NIN                |
| `/districts`              | District rollups                                         |
| `/api/supabase/health`    | Read-only Supabase Auth connectivity check               |

Navigation uses Next.js links and URLs. A provider in the root layout preserves temporary records and the demo login across client navigation. Reloading the page resets them. Legacy `/#/...` links are converted to their new paths on initial load. Unknown paths return a 404.

The login still accepts any input, including blank fields, as requested for the visual preview. Credentials entered there are not sent to Supabase or stored. **This is not an authorization boundary.** Public registration and status checking remain accessible directly.

Try a public lookup using **0700000000** and **PLU-2026-1042**.

## Supabase integration

- `utils/supabase/client.ts`: cookie-backed browser client, using the publishable key.
- `utils/supabase/server.ts`: per-request server client with awaited Next.js cookies.
- `utils/supabase/middleware.ts`: calls `auth.getClaims()` and propagates refreshed cookies to the request and response, including private/no-store cache headers.
- `proxy.ts`: Next.js 16 middleware entry point; excludes static assets.
- `/api/supabase/health`: uses the server helper and checks the live Auth endpoint, returning only `{ connected: boolean }` with no caching.
- `npm run check:supabase`: verifies the key against Auth and performs a head-only SDK probe of the supplied `todos` example without retrieving rows or writing data.

The server helper is used as `const supabase = await createClient()`. It obtains its own cookie store. It can be used later from Server Components, Route Handlers, or Server Actions.

No registration schema, migrations, real sign-in flow, NIN encryption, or persistence was introduced. The existing sample records remain local. The supplied `todos` example is a connection probe only, not an application page or a registration data model. An actual user session is needed to verify a live expired-token refresh; anonymous connectivity alone does not establish that result.

Implementation references: [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs) and [Next.js proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).

## Structure

- `app/`: server layout, validated route entry, 404, and connectivity handler.
- `src/`: shared preview state, dashboard components, login, sample data, and styles.
- `public/brand/`: assets consumed by the live app.
- `utils/supabase/`: client and session helpers.
- `tests/`, `e2e/`, `scripts/`: verification tools.
- `extra/`: original WordPress exports, prior design notes/screenshots, old Vite entry and migration context. None of these are served by Next.js.

Generated dependencies, builds, local environment values, test output, and archived screenshots/build output are excluded from Git. The original reference exports are retained in `extra/` for future work.

## Verification

```sh
npm test
npm run typecheck
npm run check:supabase
npm run build
npx playwright install chromium
npm run test:e2e
```

To test the production server, build first, stop any dev server on port 3000, and run the browser suite with `PLAYWRIGHT_PRODUCTION=1` in your shell. Playwright starts `next start` when no server is already listening.

The browser suite covers login, public access, guardian fields, registration/review/lookup/rollup consistency, draft continuation, filters, pagination, mobile layouts, and Next.js route/connectivity behavior.
