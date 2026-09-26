# Architecture decision records

Accepted decisions describe the current implementation. ADR-001 remains as historical evidence and is superseded.

| ADR                                   | Decision                                        | Status            |
| ------------------------------------- | ----------------------------------------------- | ----------------- |
| [001](ADR-001-location-model.md)      | Original point location model                   | Superseded by 002 |
| [002](ADR-002-quadrilateral-areas.md) | Quadrilateral areas replace point locations     | Accepted          |
| [003](ADR-003-map-providers.md)       | MapLibre and configurable OpenFreeMap           | Accepted          |
| [004](ADR-004-geospatial-storage.md)  | GeoJSON, derived bounds and Turf before PostGIS | Accepted          |
| [005](ADR-005-prisma-version.md)      | Retain and pin Prisma 5.22                      | Accepted          |
| [006](ADR-006-google-sessions.md)     | Google-only authentication and server sessions  | Accepted          |
| [007](ADR-007-score-decay.md)         | Exponential decay and deduplicated point scores | Accepted          |
| [008](ADR-008-visit-verification.md)  | Self-attestation with optional GPS evidence     | Accepted          |
| [009](ADR-009-overlap-cooldown.md)    | Seven-day cooldown across overlapping areas     | Accepted          |
| [010](ADR-010-moderation.md)          | Soft moderation with an audit trail             | Accepted          |

Add a new ADR when changing an accepted decision; mark the old decision superseded rather than rewriting its historical rationale.
