# PLU Youth Registration — preliminary build

A React + Vite interface using the supplied PLU palette, a locally bundled Geist font, and the existing export's logo. Original WordPress exports are preserved.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. `npm run build` produces `dist/`; `npm run preview` serves that build.

## Screens

- `/#/login`: visual staff entry gate; every input (including empty fields) succeeds. No credentials are read or stored. Staff deep links show the same gate before entry. Public screens remain accessible. See [login design notes](doc/login-design.md).

- `/#/overview`: session totals, status journey, recent register.
- `/#/registrations`: search, combined status/district/education filters, pagination, expandable details, review actions and dated timeline.
- `/#/staff-entry`: repeat entry, partial drafts, resume through the register, guardian fields below age 18.
- `/#/register`: self-service entry and reference confirmation.
- `/#/status`: phone + reference lookup; no NIN in the public result.
- `/#/districts`: counts and stacked bars derived from the same session records.

Try public lookup with **0700000000** and **PLU-2026-1042**, or use its demo-details button. A new submission appears immediately in the staff register, public lookup and district totals while navigating within the app.

## Structure and choices for review

- `src/main.jsx`: navigation, shared state, reusable field/badge/table/form components, and screen components.
- `src/data.js`: 72 synthetic records covering all six statuses and 12 sample districts, plus DOB, phone and display-mask helpers.
- `src/styles.css`: supplied brand variables, responsive layouts and component states.
- `public/brand/`: copied PLU logo from the static export.
- Hash navigation keeps all screens addressable on a static host without rewrite configuration.
- State is deliberately in memory only: refresh, new tabs, or restarting the app resets changes. No localStorage, database, API, auth, identifier encryption, or offline sync exists.
- NIN is a visual mask only, visible while editing and masked on blur. Fictional entered values remain in browser memory. Use demo details only.
- District selection covers 12 illustrative districts; the supplied 146 figure is a conceptual denominator, not a verified administrative dataset. Subcounty is free text pending an authoritative location hierarchy.
- Rollups include drafts. They count records rather than deduplicated people; identity verification and deduplication are deferred.
- Public draft/submitted/review entries use a pending badge with specific draft guidance. Rejected outcomes are shown explicitly. Correction and rejection require a note; approval is immediate. Decisions can be revisited in this prototype.
- Skills are optional. There is no upper age restriction because the brief specifies only the under-18 rule. NIN format verification is deferred; phone checks are basic UI validation.
- Status changes are session-local actions and timeline entries. This preview does not send messages or allow public correction resubmission.

## Verification

```sh
npm test
npx playwright install chromium
npx playwright test
npm run build
```

Unit checks cover eighteenth-birthday behavior, phone normalization, NIN display and fixture consistency. Browser flows cover minor registration, guardian UI, correction/rejection/approval, public lookup without NIN, rollup updates, draft continuation, repeat entry, combined filters, pagination, empty states and 375px layouts.

This is a reviewable UI prototype. All backend, authentication, security, encryption, offline and compliance work remains explicitly deferred.
