# Testing strategy

The suite combines deterministic domain/component tests, database-backed integration and browser journeys. Google identity, map style/tiles and geocoding are controlled with doubles where needed; CI must not depend on public third-party requests. Test results are evidence only when executed, not because a test file exists.

## Run locally

Install dependencies and generate Prisma first:

```sh
npm ci
npm run db:generate
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run format:check
npm run build
```

For persistence checks, start local PostgreSQL and set `TEST_DATABASE_URL` to a dedicated disposable database such as `mapsafe_test`. Apply committed migrations to that database before integration tests; the tests may clear their own data. Never aim tests at development data you need, or at production.

```sh
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

For the portable database on Windows PowerShell, migrate the test database with `$env:DATABASE_URL='postgresql://mapsafe:mapsafe_local_only@127.0.0.1:55432/mapsafe_test?schema=public'; npm run db:deploy`, then clear the override with `Remove-Item Env:DATABASE_URL`. Set `E2E_DATABASE_URL=postgresql://mapsafe:mapsafe_local_only@127.0.0.1:55432/mapsafe_e2e?schema=public` in the shell before `npm run test:e2e`; the browser runner migrates and seeds that isolated database automatically.

See the repository Playwright configuration for its isolated server/database settings. Keep the local database process running for database-backed journeys. Browser binaries are installed once per environment; CI installs required system dependencies where appropriate.

`npm run check` runs formatting, lint, typecheck, unit/component tests and builds. Database integration and E2E are separate release requirements.

## Domain and API test matrix

| Concern             | Important cases                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exponential scoring | No reports, one report, contrasting ages, configurable half-life, deterministic clock, invalid scores, very old dates, duplicate IDs, report count and labels               |
| Quadrilaterals      | Exactly four distinct corners, closure, longitude/latitude bounds, holes, crossing edges, zero area/collinearity, concavity, size bounds and antimeridian restriction       |
| Spatial operations  | Point inside/outside/on boundary; partial overlap, containment, identical polygons, disjoint polygons and shared edges; ratio relative to smaller area                      |
| Cooldown            | Just below/at/above threshold, just before/at seven-day expiry, multiple conflicts/retry time, hidden historical reports, competing submissions                             |
| Visit evidence      | Attestation required; future and stale visits; optional GPS inside/outside, freshness, accuracy and no raw-coordinate storage                                               |
| Incidents           | Every category, Other required type, empty/long descriptions, repeated categories and count bounds                                                                          |
| Authentication      | Invalid claims/audience/issuer/expiry, verified email, stable subject, session expiry/logout, suspended account, admin bootstrap restrictions, production fixture rejection |
| HTTP security       | Body/query/param validation, unauthenticated and forbidden responses, Origin/custom-header checks, CORS, rate/body limits and sanitized error envelopes                     |
| Moderation          | Role checks on each route, protected admin account, status transitions, inherited visibility, audit atomicity and public score updates                                      |
| Migration           | Empty database setup, legacy populated database preservation, seed repeatability and absence of synthetic legacy polygons                                                   |

## Browser/component test matrix

Test score selection and explanatory labels; visit/attestation; optional GPS failure; Other incident fields; authenticated/anonymous state; modal focus; errors/loading; admin search/actions; and bottom-sheet behavior. Mocking WebGL alone does not prove real map rendering: include manual browser checks with the chosen provider before release.

Core E2E journeys:

1. Anonymous browse and area detail.
2. Authenticated four-corner selection and review submission.
3. Geographic cooldown on a repeated overlapping submission.
4. Admin moderation changes visibility and creates an audit record.

External-service doubles must be clearly labelled. A successful fixture login test does not prove the owner's Google client is configured correctly.

## Coverage and CI

Targets are at least **85% lines/functions and 80% branches overall**, with particular attention to geometry, security, scoring and validation. Read uncovered branches and failures before adding tests; do not duplicate implementation solely to inflate a number.

Workspace reports live under their ignored `coverage/` directories. If reporting an overall percentage, combine instrumented file counts with the appropriate weighted denominator; do not average two workspace percentages. Report each workspace separately when an aggregate is not computed.

Record executed commands, pass/fail counts, measured coverage and limitations in [the verification ledger](CODEX_IMPLEMENTATION_PLAN.md). A threshold shortfall is an open item, not an implicit pass.

GitHub Actions is configured to install from the lockfile, check formatting/lint/types, run tests with PostgreSQL and build both workspaces. A workflow file is not evidence of a successful hosted CI run; observe that separately after pushing.

## Manual release checks

Check desktop and narrow mobile layouts, safe-area spacing, keyboard-only dialogs/forms, browser zoom, visible attribution, empty data, provider failure, expired sessions and readable cooldown recovery. Test GPS denied/unavailable and real Google sign-in/logout/admin bootstrap with configured credentials over the intended origin. Avoid submitting test geocoding traffic to a public service without its explicit operator configuration.

Capture approved demonstration screenshots only after these checks; keep personal information out of artifacts.
