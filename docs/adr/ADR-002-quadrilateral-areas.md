# ADR-002: Quadrilateral areas replace point locations

## Status

Accepted — 2026-09-26

## Context

The original location model could not express the boundary a contributor experienced, while planning documents also described incompatible radii. The new product requirement is an editable four-corner area.

## Decision

Represent each area as a GeoJSON Polygon: four unique vertices plus ring closure. Validate coordinates, self-intersections, effective corners, size and geographic operational limits on the server. Compute centroid/bounds from the geometry; neither substitutes for the polygon. Reviewed geometry becomes immutable; users create a new area when the boundary changes.

This supersedes [ADR-001](ADR-001-location-model.md). Preserve its text as history. Forward migrations archive original point locations and ratings without inventing polygon boundaries or destroying historical data.

## Consequences

Draw/edit UI and geometry tests are required. Overlapping areas remain separate records. Antimeridian/polar regions and very large polygons are outside MVP bounds. Legacy records need an explicit owner-reviewed conversion process before they could become public quadrilateral reports.
