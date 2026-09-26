# MapSafe

**Community experiences, mapped with context.** MapSafe is a responsive web application for exploring and reporting how an area feels to people who recently visited it.

Browse without an account. Draw a four-corner area, sign in with Google, and contribute a score from **1 (extremely safe)** to **10 (extremely unsafe)**. Reports can include optional explanations and incident categories. Seven-day visit attestation, optional GPS verification, overlap cooldowns and audited moderation support responsible participation.

Scores describe community reports. They are not official crime statistics, guarantees, predictions or emergency guidance. Conditions change; reports may be incomplete or inaccurate. Contact appropriate local emergency services in an emergency.

## What is here

- React, TypeScript and Vite web client with mobile sheets and desktop panels.
- MapLibre GL JS, configurable OpenFreeMap style/attribution, editable quadrilateral areas and viewport loading.
- Express 5 API, PostgreSQL and pinned Prisma 5.22; validated GeoJSON plus derived bounds/centroid and Turf calculations.
- Google-only sign-in and server-side sessions; anonymous public reading.
- Exponentially weighted area and overlapping-point scores; default 180-day half-life.
- Optional incident reports, seven-day geographic cooldown, administrator dashboard and soft moderation audit history.
- Unit/component, database integration and browser test infrastructure; GitHub Actions checks.

This is the web MVP implementation. Release verification, external setup and remaining gates are tracked in [the implementation ledger](docs/CODEX_IMPLEMENTATION_PLAN.md). A configured real Google sign-in and the intended production environment still require operator validation; source code alone is not a production-readiness certificate.

## Architecture

```mermaid
flowchart LR
  Web[React / MapLibre] -->|/api/v1 + session cookie| API[Express / TypeScript]
  Web --> Map[Configured style and tile provider]
  Web --> Google[Google Identity Services]
  API -->|Verify identity| Google
  API --> Domain[Geometry, scores, cooldown, moderation]
  Domain --> Prisma[Prisma 5.22]
  Prisma --> DB[(PostgreSQL)]
  API --> Search[Replaceable geocoder + cache]
```

See [architecture](docs/04-System-Architecture.md), [database](docs/05-Database-Design.md), [API](docs/06-API-Design.md) and [decisions](docs/adr/README.md).

## Local setup

Prerequisites: **Node.js 24**, npm 11 or later, and PostgreSQL. Run commands from the repository root. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

```sh
npm ci
npm run db:generate
```

Create local environment files:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

On macOS/Linux use `cp` instead of `Copy-Item`. Never commit these files. Review [all configuration](docs/ENVIRONMENT.md).

Choose one local database approach:

- **Portable development database:** run `npm run db:local` in a separate terminal and leave it open when it starts a new process. It creates loopback-only PostgreSQL databases `mapsafe`, `mapsafe_test` and `mapsafe_e2e` on port **55432**, using local-only credentials `mapsafe / mapsafe_local_only`. Data is stored in ignored `.local/postgres`; Ctrl+C shuts down a process started in that terminal. If the repository's database is already running, the command confirms it and exits.
- **Existing PostgreSQL:** create a development database and separate test/E2E databases owned by a local development role. Set the connection strings accordingly. PostgreSQL 16 or later is the target.
- **Docker:** an optional PostgreSQL service configuration is available in the repository. Use its documented credentials/port and configure the environment to match. Docker is not required.

For the portable option, configure `backend/.env`:

```dotenv
DATABASE_URL=postgresql://mapsafe:mapsafe_local_only@127.0.0.1:55432/mapsafe?schema=public
TEST_DATABASE_URL=postgresql://mapsafe:mapsafe_local_only@127.0.0.1:55432/mapsafe_test?schema=public
```

Then apply committed migrations and optionally load clearly labelled demonstration data:

```sh
npm run db:deploy
npm run db:seed
npm run dev
```

Open **http://localhost:5173**. The API listens on **http://localhost:3001**; Vite proxies `/api` and `/health`. Check `http://localhost:3001/health` for liveness. Keep `localhost` consistent with configured origins; mixing it with `127.0.0.1` changes browser origin/cookie behavior.

The seed is for non-production demonstrations. Its reports are fictional, not safety advice. It does not create Google credentials. Do not import demo data into a public service.

## Google sign-in

Create/configure a **Web application** client in a Google project you control. Configure its consent screen and authorized JavaScript origin `http://localhost:5173` (plus the eventual HTTPS origin). Put the same public client ID in `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. Add test users if the Google app's consent configuration requires them.

MapSafe uses the GIS JavaScript credential callback and verifies tokens on the backend. It needs a client ID, not a Google client secret in the browser. Set `ADMIN_EMAILS` only to intended administrators; automatic admin bootstrap additionally requires an authoritative Gmail/Workspace email claim. Other verified Google accounts can sign in as users. See [authentication ADR](docs/adr/ADR-006-google-sessions.md).

For isolated local demonstrations/tests, development fixtures can be enabled explicitly with backend `ENABLE_DEV_AUTH=true` and frontend `VITE_ENABLE_DEV_AUTH=true`. Keep both false otherwise. The backend refuses production bypass configuration; a frontend switch never authorizes a user by itself. Real Google authentication must still be smoke-tested with the owner's credentials before release.

## Maps and place search

The map style, provider name and attribution are frontend environment configuration. The initial OpenFreeMap integration needs no committed API key; [provider setup](https://openfreemap.org/quick_start/) and attribution should be reviewed for deployment.

Place search uses public Nominatim by default for explicit user searches. The app identifies MapSafe with the supplied project contact, caches results and serializes upstream requests to at most one per second per backend instance. Keep one API instance unless a shared rate limit/cache is added. Typing does not trigger searches and there is no autocomplete. Set `GEOCODING_PROVIDER=disabled` to turn it off. See [provider configuration and restrictions](docs/ENVIRONMENT.md#place-search). Automated tests do not send public geocoding traffic.

## Commands

| Command                                | Purpose                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `npm run dev`                          | Run API and frontend together                               |
| `npm run dev:backend` / `dev:frontend` | Run one workspace                                           |
| `npm run build`                        | Compile backend and build production frontend               |
| `npm run typecheck`                    | Strict checking in both workspaces                          |
| `npm run lint`                         | ESLint                                                      |
| `npm run format:check` / `format`      | Check/write Prettier formatting                             |
| `npm test`                             | Backend unit/API and frontend component tests               |
| `npm run test:integration`             | PostgreSQL-backed tests against dedicated test database     |
| `npm run test:coverage`                | Coverage reports; check measured targets                    |
| `npm run test:e2e`                     | Playwright journeys; see database/browser setup below       |
| `npm run db:local`                     | Optional local PostgreSQL process                           |
| `npm run db:generate`                  | Generate the pinned Prisma client                           |
| `npm run db:migrate`                   | Create/apply a development migration                        |
| `npm run db:deploy`                    | Apply committed migrations without creating new ones        |
| `npm run db:seed`                      | Load non-production demo data                               |
| `npm run check`                        | Formatting, lint, typecheck, unit/component tests and build |

Integration/E2E tests use dedicated disposable data. Install Playwright's Chromium with `npx playwright install chromium` before the first browser run. See [testing strategy](docs/08-Testing-Strategy.md) for exact environment requirements and coverage reporting. `check` does not replace database integration and E2E runs.

## Screenshots and demonstrations

Capture real application screenshots after following [the screenshot guide](docs/SCREENSHOTS.md). Planned images: desktop browsing, mobile area details, drawing/review and admin moderation. No placeholder image is presented as an actual application capture.

For a recruiter demonstration, use a disposable seeded database, explain that fixtures are fictional, show anonymous browsing, draw an area, submit a recent experience, trigger the overlap cooldown, and demonstrate audited moderation.

## Deployment and limits

Use [the vendor-neutral deployment guide](docs/09-Deployment.md) for HTTPS, environment injection, migrations, backups, health checks and release verification. No hosting, billing or external service has been provisioned.

The MVP uses JSONB/bounding-box candidate queries rather than PostGIS spatial indexes. Rate-limit/search caches are process-local. Browser GPS is not tamper-proof evidence. Scores can be sparse or biased; exponential weighting does not make a single old report recent. Incident claims are not verified crimes. Privacy retention/deletion operations, distributed abuse controls and large-scale spatial querying need further work before unrestricted public adoption.

Native mobile applications, navigation, notifications, official crime feeds, crime prediction and payments are deferred. See [roadmap](docs/10-Roadmap.md).

## Documentation

[Vision](docs/01-Product-Vision.md) · [Requirements](docs/02-Product-Requirements.md) · [User stories](docs/03-User-Stories.md) · [Frontend](docs/07-Frontend-Design.md) · [Testing](docs/08-Testing-Strategy.md) · [Environment](docs/ENVIRONMENT.md) · [ADRs](docs/adr/README.md) · [Contribution guide](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

Licensed under [MIT](LICENSE).
