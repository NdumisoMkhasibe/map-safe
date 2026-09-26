# MapSafe implementation plan and verification ledger

## Repository baseline

Inspected baseline: branch `main`, commit `10a40de`. The repository contained an Express 5 / TypeScript backend, Prisma 5.22 client/schema and an initial User/Location/Rating migration. A second Prisma 7 setup existed at root. There was no frontend, test suite or CI.

The original backend compiled after generating its Prisma 5 client and was started successfully: `GET /health` returned HTTP 200. Database connectivity and persistence were not established at baseline. The preliminary ratings endpoint trusted request data and was not a complete authenticated domain implementation. Existing documents contradicted each other about point/radius geometry, planned Google Maps, and incorrectly said there was no code.

## GitHub access and workflow

Authenticated GitHub CLI/API access was unavailable during implementation. No remote issue, label, milestone, project-board movement or release is claimed here. Historical changelog statements about earlier GitHub setup are historical, not evidence of a current remote inspection.

When access is available, first search existing issues and reuse matching work. Create missing labels/milestone only if needed. Suggested milestone: **Web MVP 0.2.0**. All exact issue records below target that milestone. Suggested board columns: Backlog → In progress → Verification → Done. Do not close an issue solely because files exist.

Current local status: implementation and verification in progress. The checklist below records executed evidence; database-backed release gates remain open. Suggested branches are review/split boundaries, not a claim that all branches or commits already exist.

### chore(repo): consolidate the npm workspace and Prisma 5 toolchain

- **Milestone:** Web MVP 0.2.0
- **Labels:** `chore`, `dependencies`
- **Suggested branch:** `chore/repository-cleanup`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Remove accidental root Prisma 7 dependencies/configuration, pin matching backend Prisma 5.22 CLI/client, align Node/types, and add root development/check scripts.
- **Acceptance:** A clean install generates the backend client; root lint, format, typecheck and builds pass; only one active Prisma schema/configuration remains.

### feat(area): persist and validate quadrilateral safety areas

- **Milestone:** Web MVP 0.2.0
- **Labels:** `enhancement`, `backend`, `database`
- **Suggested branch:** `feature/area-domain`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Add Area geometry, centroid/bounds, creator and moderation metadata. Preserve the initial migration and archive point-based legacy data in a forward migration without fabricating quads.
- **Acceptance:** Clean and legacy-populated database migration tests preserve historical records; four-corner, coordinate, self-intersection, size and containment tests pass; viewport/detail endpoints work.

### feat(auth): add Google identity verification and server sessions

- **Milestone:** Web MVP 0.2.0
- **Labels:** `enhancement`, `security`, `backend`
- **Suggested branch:** `feature/google-auth`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Implement Google-only sign-in, stable-subject user upsert, hashed opaque session tokens, secure cookies, Origin/custom-header CSRF checks, profile/logout endpoints, active-account checks and safe admin bootstrap.
- **Acceptance:** Invalid tokens/claims and unauthorized writes fail; public DTOs contain no private identity; session expiry/logout work; production refuses fixture authentication.

### feat(rating): enforce recent visits, overlap cooldown and weighted scores

- **Milestone:** Web MVP 0.2.0
- **Labels:** `enhancement`, `backend`
- **Suggested branch:** `feature/ratings`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Validate score, recent visit and attestation; optionally verify fresh accurate GPS inside the polygon without storing the point. Serialize per-user overlap cooldown checks. Calculate decayed area/composite scores.
- **Acceptance:** Zero/single/multiple-report decay, threshold boundaries, invalid GPS, exact expiry, deduplication and concurrent duplicate submissions are tested; conflict includes retry time.

### feat(incident): capture and moderate community incident reports

- **Milestone:** Web MVP 0.2.0
- **Labels:** `enhancement`, `backend`, `frontend`
- **Suggested branch:** `feature/incidents`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Persist incident reports independently under ratings, allow multiple categories and optional narratives, require a type description for Other, and label incidents as community reports.
- **Acceptance:** Schema/API/UI tests cover all categories, Other, malformed input, hidden parent visibility and separate incident moderation.

### feat(admin): add audited content and account moderation

- **Milestone:** Web MVP 0.2.0
- **Labels:** `enhancement`, `security`, `backend`, `frontend`
- **Suggested branch:** `feature/admin`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Build dashboard statistics/activity, searchable/filterable user and content lists, inspection, suspension/reactivation and hide/restore actions with reasons and atomic audit records.
- **Acceptance:** Every admin endpoint enforces active ADMIN authorization; ordinary users fail; admin lockout is prevented; moderation changes public scores/content and appears in audit history.

### feat(web): build the responsive MapLibre browsing and drawing experience

- **Milestone:** Web MVP 0.2.0
- **Labels:** `enhancement`, `frontend`, `accessibility`
- **Suggested branch:** `feature/web-map`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Create React/Vite interface with configurable OpenFreeMap style/attribution, viewport queries, area details, overlap point selection, mobile sheets and editable four-corner drawing.
- **Acceptance:** Anonymous desktop/mobile browsing works; geometry can be edited by pointer and coordinate inputs; score labels/counts accompany colour; empty/loading/error states are usable.

### feat(web): complete Google sign-in and review submission flows

- **Milestone:** Web MVP 0.2.0
- **Labels:** `enhancement`, `frontend`, `accessibility`
- **Suggested branch:** `feature/review-flow`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Connect auth state, visit attestation, optional GPS, score, comment, incidents, submission feedback, cooldown retry guidance and refreshed map/details.
- **Acceptance:** Component/browser tests cover sign-in requirements, recent visit, Other validation, optional GPS denial, successful submission and cooldown rejection; dialogs support keyboard focus.

### feat(search): add configurable explicit geocoding with policy safeguards

- **Milestone:** Web MVP 0.2.0
- **Labels:** `enhancement`, `backend`, `frontend`
- **Suggested branch:** `feature/place-search`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Introduce a disabled-by-default geocoder interface and deliberately configured low-volume Nominatim adapter with application identification, cache, timeout and serialized request budget.
- **Acceptance:** Typing causes no network searches; explicit searches use API; cache and one-request-per-second upstream gate are tested without public traffic; failures remain usable; multi-instance limit documented.

### test(mvp): cover domain, APIs and core browser journeys

- **Milestone:** Web MVP 0.2.0
- **Labels:** `testing`, `quality`
- **Suggested branch:** `test/e2e`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Add deterministic unit/component tests, dedicated PostgreSQL integration tests and Playwright journeys with Google/map/geocoding doubles.
- **Acceptance:** Anonymous browse, create/rate, overlap cooldown and admin moderation pass; clean migration and legacy preservation pass; measured coverage is reported honestly against 85% lines/functions and 80% branches.

### ci(mvp): enforce checks and production builds with PostgreSQL

- **Milestone:** Web MVP 0.2.0
- **Labels:** `ci`, `quality`
- **Suggested branch:** `chore/ci`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Configure GitHub Actions install, format, lint, typecheck, database integration, backend/frontend tests, builds and reliable E2E; avoid paid CI services and third-party service dependency.
- **Acceptance:** Workflow syntax/configuration is reviewed; local matching commands pass; first remote CI execution remains open until actually observed.

### docs(mvp): publish setup, ADRs and a verified release checklist

- **Milestone:** Web MVP 0.2.0
- **Labels:** `documentation`
- **Suggested branch:** `docs/mvp`
- **Status:** Local implementation; acceptance verification pending.
- **Description:** Replace stale radius/Google Maps/mandatory-GPS planning with implemented contracts; add architecture/database/API/frontend/testing/deployment docs, ADRs, privacy limits and screenshot instructions.
- **Acceptance:** README setup is reproduced, env/API docs match code, legacy ADR is marked superseded without rewriting history, verification evidence and external setup limits are explicit.

## Release verification checklist

Record command, environment, result and coverage summary when each check actually runs. Never replace an unavailable real-service check with an unlabeled mock result.

- [x] Inspect baseline code, migrations, docs and Git state.
- [x] Compile and run baseline backend; observe HTTP 200 from health.
- [ ] Reproduce clean install with the pinned Node/npm environment.
- [x] Generate the Prisma 5.22 client from the updated schema; schema validation completed as part of generation.
- [x] Apply both committed migrations to an empty `mapsafe_test` PostgreSQL database.
- [ ] Apply the forward migration to a database containing legacy User/Location/Rating records; verify preservation.
- [x] Run the non-production seed repeatedly; confirm it is repeatable and clearly labelled demo content.
- [x] Pass formatting, lint and strict typechecking with `npm run check`.
- [x] Pass backend and frontend unit/component suites: 50 domain tests and 2 score component tests.
- [x] Pass the PostgreSQL API integration suite (7 tests, including auth persistence, role bootstrap, concurrency and moderation).
- [x] Add database-backed concurrent submission and broader admin/auth moderation cases.
- [x] Measure unit/component coverage with `npm run test:coverage`; record actual values below.
- [x] Pass all 10 browser journeys on desktop and mobile with controlled external-service doubles.
- [x] Build backend and frontend with `npm run check` (MapLibre vendor chunk: 1,029.68 kB minified / 280.81 kB gzip).
- [x] Inspect desktop/mobile layouts, keyboard navigation and provider attribution with seeded browser captures; reposition the map score legend and provider label so they no longer cover the attribution control.
- [x] Review map-provider failure behavior: the fallback message, community browsing and coordinate-based report setup remain available. Browser journeys use a controlled local style fixture, not the live provider.
- [ ] Complete manual Google sign-in/logout/admin-bootstrap checks on the intended origin. The owner reports that real local Google sign-in now succeeds; automated database checks use a controlled verifier and do not replace this live-service check.
- [ ] Validate chosen live map provider and, if enabled, operator-approved search configuration.
- [ ] Review public data privacy, production env, migrations/backups and current dependency findings.
- [ ] Review Git diff/status for secrets, generated artifacts and unintended changes.
- [ ] Observe remote CI after pushing; do not infer remote success from local runs.

### Local verification results (2026-09-26)

- `npm run format`: completed; `npm run format:check`, `npm run lint` and `npm run typecheck`: passed.
- `npm test`: passed, 52 tests total (50 backend domain, 2 frontend score).
- `npm run build`: passed for backend and frontend. The separate MapLibre chunk is approximately 1.03 MB minified / 281 kB gzip and should be reviewed for a future mobile-network budget.
- `npm run test:coverage`: passed, but measured coverage is **18.33% backend lines / 15.74% functions / 15.77% branches** and **2.17% frontend lines / 1.44% functions / 3.44% branches**. These are far below the proposed target; the small local unit/component suite does not exercise API/services or full UI flows.
- The repository's embedded PostgreSQL 18.4 instance responded on `127.0.0.1:55432`; the launcher was updated to recognize and reuse that process. Both migrations applied to a clean `mapsafe_test` database. An initial development migration attempt exposed a retained `Rating_pkey` index name after table rename; the forward migration now renames legacy constraints first. The development seed ran repeatedly without duplicate data.
- `npm run test:integration`: passed all 7 API tests against `mapsafe_test`. Added controlled Google-identity cases confirm user upsert and PostgreSQL persistence, hashed sessions, authoritative `ADMIN_EMAILS` bootstrap, denial of an allowlisted but non-authoritative email, admin-only access, audited suspension/session revocation, admin-account protection, and one-winner behavior for concurrent overlapping submissions. These cases exercise the API and database with a test identity verifier; they do not call Google.
- `npm run test:e2e`: passed all 10 Playwright journeys across desktop and mobile against `mapsafe_e2e`, using development auth and a local map style fixture. Coverage includes provider-failure fallback and desktop/mobile attribution visibility/non-overlap assertions. This does not validate live Google sign-in or a production map provider. Hosted CI has not been observed.
- The owner reports that real Google sign-in succeeds locally. This turn's Google auth integration coverage uses a controlled verifier; manual logout/admin-bootstrap checks remain open. Desktop/mobile screenshots were visually reviewed with fictional data and a controlled map fixture; keyboard navigation and the provider-failure fallback are covered by browser journeys. Live map-provider integration remains open.

## External setup and release boundary

The owner must configure a Google web client and authorized origins, choose deployment infrastructure and supply production database/HTTPS configuration. No external resources, billing or paid services are provisioned. Public Nominatim requires a deliberate operator decision and a conforming application identifier; search starts disabled.

Suggested next release is **0.2.0** after verification, preferably a prerelease such as `0.2.0-beta.1` while real-credential/operational checks remain. No tag or GitHub release has been published as part of this ledger.
