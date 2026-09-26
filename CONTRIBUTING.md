# Contributing to MapSafe

MapSafe summarizes community experiences. Preserve the product's privacy, accessibility and uncertainty language as carefully as its code.

## Set up and verify

Follow [README](README.md) with Node 24 and a dedicated local PostgreSQL database. Keep credentials in ignored environment files. Use a separate test database: integration tests may clear their test data.

Before committing, run relevant tests, typechecking and a build. At each logical milestone, run the full checks documented in [testing strategy](docs/08-Testing-Strategy.md). Report actual coverage, failures and unexecuted checks. Tests must not depend on live Google, map or public geocoding services.

## Workflow

1. Inspect existing issues and reuse one matching the change. If remote access is unavailable, add its exact proposed title, description, labels and milestone to [the local plan](docs/CODEX_IMPLEMENTATION_PLAN.md).
2. Create a focused branch, such as `feature/area-domain`, `feature/google-auth`, `test/e2e` or `docs/mvp`.
3. Implement one reviewable concern, updating tests and documentation with the contract.
4. Use Conventional Commits, for example `feat(rating): enforce overlap cooldown` or `test(auth): reject invalid Google claims`.
5. Open a PR describing the concrete behavior change, validation and remaining limits. Reference the issue; include screenshots for material UI changes.
6. Close the issue and update its board only after acceptance passes.

Do not bundle unrelated changes into a giant “finish MVP” commit. Do not claim remote actions that have not happened.

## Code and design standards

Use strict TypeScript and focused functions. Routes/middleware own HTTP concerns, domain/services own product rules, and data access owns persistence. Avoid unneeded microservices or provider coupling.

Add comments explaining file responsibility, security assumptions, geospatial/scoring rules and non-obvious workarounds. Explain why rather than restating syntax. Prefer code a junior contributor can follow.

Keep these invariants intact:

- Score 1 is extremely safe; 10 is extremely unsafe. Always show text and numbers with colour.
- Reviewed areas are quadrilaterals; raw current GPS is not retained.
- Authentication/roles come from server-verified identity, never a JSON user ID.
- Moderation is soft, audited and server-authorized.
- Database changes use forward migrations; never erase or rewrite applied migrations.
- No paid dependency/service or billing setup without explicit owner authorization.
- Provider URLs and attribution are configurable; public geocoding is explicit and policy-constrained.
- Development fixtures cannot run in production.

## Documentation and review

Update API/env/setup docs when code contracts change. Significant decisions need an ADR; supersede accepted records rather than rewriting history. Add meaningful tests for behavior and failure cases, not tests that only restate implementation.

Keep screenshots free of personal details, tokens and real private reports. Never commit `.env`, production data, coverage output, generated builds or local database directories. Raise security reports privately through a channel agreed with the repository owner; do not include secrets in public issues.
