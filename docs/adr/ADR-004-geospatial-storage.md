# ADR-004: GeoJSON, derived bounds and Turf before PostGIS

## Status

Accepted — 2026-09-26

## Context

PostgreSQL is already in place. Prisma 5 does not make spatial geometry a first-class model type. A reliable small MVP needs exact domain checks without a rushed GIS migration.

## Decision

Store polygon GeoJSON as PostgreSQL JSONB through Prisma, with derived centroid and west/south/east/north bounds. Use bounds to narrow candidates and Turf for validity, area, point containment and overlap. Keep authoritative validation in domain functions, and derive metadata server-side.

For PostGIS, add a geometry(Polygon,4326) column in a forward migration, backfill from validated JSONB, compare sampled and edge-case results, add a GiST index, then route spatial queries through a dedicated repository using parameterized SQL. Keep the API GeoJSON contract stable. Review geography/projection choices for metric areas and antimeridian behavior before switching.

## Consequences

JSONB/bounds do not offer PostGIS spatial indexing or large-dataset performance. Candidate scans and application-side intersections require limits and monitoring. No spatial scalability claim is made. Do not drop JSONB until parity, rollback and migration behavior are tested.
