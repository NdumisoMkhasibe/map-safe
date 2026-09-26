# ADR-007: Exponential decay and deduplicated point scores

## Status

Accepted — 2026-09-26

## Context

Old reports should gradually contribute less while preserving a transparent, reproducible score. Overlapping polygons must not amplify the same rating twice.

## Decision

Use weight = 0.5^(ageDays / halfLifeDays), default halfLifeDays = 180, based on rating creation time and a single explicit calculation time. Compute sum(score × weight) / sum(weight) from eligible reports. Validate scores as integers from 1 (extremely safe) to 10 (extremely unsafe). Zero eligible reports returns no score and count zero.

Calculate area scores from their reports. For safety at a point, find active containing areas, collect eligible reports, deduplicate by rating ID, and apply the same formula. Do not average area averages, which would weight small and large report sets incorrectly. Report count accompanies every score.

## Consequences

No stored average is the authority. Clock-driven tests cover empty/single/multiple reports, boundaries and decay. Decay adjusts relative influence, not the absolute value of one old report; a lone old rating keeps its original score, so dates/counts must remain visible. Confidence estimation and spatial partitioning are deferred.
