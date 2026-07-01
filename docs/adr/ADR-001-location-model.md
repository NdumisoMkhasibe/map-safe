# ADR-001: Location Data Model for the MVP

## Status

Accepted

## Date

2026-07-01

## Context

MapSafe is a community-driven platform that allows users to report and view safety information for different areas.

One of the first architectural decisions was determining how a location should be represented in the database.

Several options were considered:

- A single latitude and longitude coordinate
- A rectangular (quadrilateral) area
- A polygon representing the exact boundaries of an area

The choice impacts database design, API complexity, frontend implementation, and future scalability.

## Decision

For the Minimum Viable Product (MVP), a location will be represented using a single latitude and longitude coordinate.

The coordinate represents the approximate centre of the location being rated.

Example:

- Cape Town Station
- Latitude: -33.9249
- Longitude: 18.4241

## Rationale

This approach was selected because it:

- Keeps the initial database schema simple.
- Makes API development straightforward.
- Integrates easily with Google Maps.
- Allows rapid development and testing.
- Provides a solid foundation for future enhancements.

## Consequences

### Advantages

- Simple database design.
- Easy to query.
- Easy to display on maps.
- Lower implementation complexity.

### Disadvantages

- Cannot accurately represent large or irregularly shaped areas.
- Multiple markers may be needed for larger neighbourhoods.
- Area-based analysis is limited.

## Future Considerations

Future versions of MapSafe may support:

- Rectangular safety zones.
- Polygon-based regions.
- Spatial queries using PostGIS.
- Heat maps generated from user reports.

This decision is intentionally limited to the MVP and may be revisited in a future architecture decision record.