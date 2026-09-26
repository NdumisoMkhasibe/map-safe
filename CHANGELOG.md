# Changelog

All notable changes to this project will be documented in this file.

This project follows the principles of [Keep a Changelog](https://keepachangelog.com/) and uses Semantic Versioning where appropriate.

---

## [Unreleased]

### Added

- Responsive React/TypeScript web client with MapLibre, editable quadrilateral areas, explicit place search and accessible score labels.
- Versioned Express API with Google identity-token verification, hashed HTTP-only sessions, public read endpoints and authenticated reporting.
- PostgreSQL/Prisma 5 area, rating, incident, verification, account, session and moderation-audit models.
- Exponential score decay, overlapping-area composite scores, seven-day visit attestation and configurable overlap cooldown.
- Optional GPS verification without persisting raw coordinates, incident categories, admin moderation and explicit disabled-by-default geocoding.
- Domain/component, PostgreSQL integration and Playwright test infrastructure plus GitHub Actions checks.
- Forward migration retaining old point data as legacy records, fictional repeatable local demo seed and deployment/setup documentation.

### Changed

- Superseded the original point model with editable quadrilateral review areas (ADR-002).
- Kept Prisma 5.22 as the sole Prisma toolchain and removed accidental root Prisma 7 setup.
- Replaced planned JWT/email-password and Google Maps approaches with Google-only OIDC and provider-configurable MapLibre/OpenFreeMap.

---

## [0.1.0] - 2026-07-01

### Added

#### Project Foundation

- Created GitHub repository.
- Added README with project overview.
- Added Product Vision document.
- Added Product Requirements Document (PRD).
- Added User Stories.
- Added initial Architecture documentation.
- Created GitHub milestones, issues, labels, and Kanban board.

#### Backend

- Initialized Node.js project.
- Configured TypeScript.
- Added Express server.
- Implemented modular application structure.
- Added Health Check endpoint.
- Refactored backend into:
  - Routes
  - Controllers
  - Services
  - Config
  - Middleware
  - Utilities

#### Database

- Installed PostgreSQL.
- Configured Prisma ORM.
- Created initial database schema.
- Added User model.
- Added Location model.
- Added Rating model.
- Applied initial migration.
- Connected Prisma Client.

#### Documentation

- Added CONTRIBUTING.md.
- Added CHANGELOG.md.
- Added Architecture Decision Records (ADR).
- Documented Location Model decision.

---

The next suggested release is **0.2.0-beta.1** after the open database, real Google credential, browser and operational checks in [the implementation ledger](docs/CODEX_IMPLEMENTATION_PLAN.md) pass. No release has been published.
