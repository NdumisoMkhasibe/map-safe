# Environment and provider configuration

Copy `backend/.env.example` and `frontend/.env.example` to ignored `.env` files for development. Backend configuration is read at process start. Vite `VITE_*` values are public and embedded at build time: never put a secret in them. Use deployment secret injection for database credentials.

## Backend

| Variable                 | Default / format                       | Purpose                                                                               |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------- |
| `NODE_ENV`               | `development`                          | Production enables stricter configuration/cookies and forbids fixture authentication. |
| `PORT`                   | `3001`                                 | Backend HTTP listener behind the production proxy.                                    |
| `DATABASE_URL`           | PostgreSQL connection string, required | Application database; use a least-privileged production role.                         |
| `TEST_DATABASE_URL`      | Separate PostgreSQL connection string  | Dedicated disposable integration database; never production.                          |
| `FRONTEND_ORIGIN`        | `http://localhost:5173`                | Exact allowed web origin for credentialed CORS and mutation checks.                   |
| `GOOGLE_CLIENT_ID`       | Google web client ID                   | Audience for server-side credential verification.                                     |
| `ADMIN_EMAILS`           | Comma-separated allowlist              | Admin bootstrap; requires authoritative Google email, not request-supplied identity.  |
| `ENABLE_DEV_AUTH`        | `false`                                | Explicit local/test fixture switch; rejected in production.                           |
| `SESSION_DAYS`           | `7`                                    | Server-session lifetime.                                                              |
| `SCORE_HALF_LIFE_DAYS`   | `180`                                  | Positive exponential decay half-life.                                                 |
| `OVERLAP_THRESHOLD`      | `0.6`                                  | Fraction of smaller polygon intersected before seven-day cooldown blocks.             |
| `GEOCODING_PROVIDER`     | `disabled` or `nominatim`              | Search provider selection; deliberate opt-in.                                         |
| `GEOCODING_USER_AGENT`   | Identifying application and contact    | Required for Nominatim; configure a real owner contact.                               |
| `GEOCODING_BASE_URL`     | Nominatim-compatible service base URL  | Replace provider endpoint without frontend business-logic changes.                    |
| `GEOCODING_CACHE_TTL_MS` | `86400000`                             | In-process successful search cache lifetime.                                          |
| `TRUST_PROXY`            | `false`                                | Enable only for the actual trusted reverse-proxy topology.                            |

Do not expose the database publicly or reuse local demonstration passwords in production. Production must use an HTTPS frontend origin. An empty client ID disables real sign-in in development; it is not a reason to enable fixtures publicly.

## Frontend

| Variable                 | Default / purpose                                                               |
| ------------------------ | ------------------------------------------------------------------------------- |
| `VITE_API_URL`           | `/api/v1`; prefer a same-origin reverse proxy.                                  |
| `VITE_GOOGLE_CLIENT_ID`  | Same public web client ID as the backend audience.                              |
| `VITE_MAP_STYLE_URL`     | `https://tiles.openfreemap.org/styles/positron`; compatible MapLibre style URL. |
| `VITE_MAP_PROVIDER_NAME` | `OpenFreeMap`; human-readable provider.                                         |
| `VITE_MAP_ATTRIBUTION`   | Required provider/data attribution; preserve style-provided attribution too.    |
| `VITE_INITIAL_LONGITUDE` | `28.0473`; initial Johannesburg map centre.                                     |
| `VITE_INITIAL_LATITUDE`  | `-26.2041`; initial map centre, not a tracked location.                         |
| `VITE_ENABLE_DEV_AUTH`   | `false`; local fixture controls only. Backend independently enforces access.    |

A compatible map style/provider can be switched by changing build configuration. A frontend rebuild is required. Some styles reference additional tile/font/sprite hosts; update deployment CSP to allow the actual required sources while keeping attribution visible. Consult the [OpenFreeMap quick start](https://openfreemap.org/quick_start/).

## Place search

**Read and deliberately accept the [public Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) before enabling it.** The default is disabled. The application owner is responsible for compliance.

Public Nominatim permits modest, explicitly user-triggered requests with an identifying User-Agent/Referer, attribution, caching and an application-wide maximum of one upstream request per second. Autocomplete, systematic/bulk queries and background searches are unsuitable. Do not submit personal/confidential search text. Service access and policy can change.

The adapter uses explicit Search submissions, a bounded server cache and a serialized request gate. Its gate/cache are in one process; multiple API instances would multiply upstream traffic. Keep a single instance or replace the provider/add a shared gate before scaling. Do not point automated tests at the public service.

To enable deliberately: choose `GEOCODING_PROVIDER=nominatim`, set a real identifying `GEOCODING_USER_AGENT` with owner contact, verify the base URL and keep attribution. To disable quickly, select `disabled` and restart. A self-hosted or alternative compatible endpoint can use `GEOCODING_BASE_URL`; a different API requires another implementation of the provider interface. No paid service may be introduced without owner approval.

## Browser and proxy behavior

The frontend sends cookies with API requests and `X-MapSafe-Request: web` for mutations. The server checks Origin as well as session authorization. Do not weaken CORS to `*` or remove Origin checks to fix a local port mismatch. Instead align the browser URL, proxy target and `FRONTEND_ORIGIN`.

Prefer frontend and API under one HTTPS origin in production. If using subdomains, test cookie/SameSite behavior explicitly. Do not assume unrelated domains will support credential cookies. Configure proxy trust only when direct backend access is blocked and forwarded headers come from the known proxy.
