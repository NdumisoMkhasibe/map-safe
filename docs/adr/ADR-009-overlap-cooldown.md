# ADR-009: Seven-day cooldown across overlapping areas

## Status

Accepted — 2026-09-26

## Context

An ID-only cooldown is easy to evade by drawing a slightly different polygon. The restriction must follow geographic coverage and be safe under concurrent requests.

## Decision

For a proposed rating, inspect that user's ratings from the previous seven days. Calculate overlap as intersection area / min(proposed area, earlier area). Reject when any ratio is at least OVERLAP_THRESHOLD (default 0.6). Touching edges have zero area overlap. Identical polygons have ratio one. Keep all of that user's recent reports eligible for anti-abuse checks, even when content has been hidden.

Serialize check-and-write operations per user inside the database transaction so simultaneous submissions cannot both pass. Return a structured conflict with the latest expiry among blocking reports, when all conflicts have cleared.

## Consequences

The rule works across area IDs but is not a complete anti-abuse system; multiple accounts and coordinated activity remain possible. Turf intersections and bounded recent-history scans cost CPU. Test threshold boundaries, smaller-polygon containment, disjoint/edge contact, expiry and concurrency.
