# ADR-005: Retain and pin Prisma 5.22

## Status

Accepted — 2026-09-26

## Context

The real backend used Prisma 5.22; a second accidental Prisma 7 setup at repository root introduced competing generation/configuration behavior.

## Decision

Retain compatible Prisma CLI and client 5.22.0 in the backend workspace. Remove the accidental root Prisma dependency/configuration. Use the existing migration history plus a forward migration. Root scripts delegate generation/migration to the backend; there is one schema and one Prisma owner. Align Node runtime and Node types at the supported repository major.

## Consequences

This avoids mixing schema engines or an unrelated major upgrade into the MVP. Dependency/security maintenance remains necessary. A later major upgrade needs its own branch, migration review and integration suite; this decision does not exempt older dependencies from monitoring.
