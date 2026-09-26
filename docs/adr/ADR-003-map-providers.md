# ADR-003: MapLibre and configurable OpenFreeMap

## Status

Accepted — 2026-09-26

## Context

The MVP needs a responsive map without introducing billing or a proprietary map dependency. Earlier plans mentioned Google Maps.

## Decision

Use MapLibre GL JS. Configure style URL, provider name and attribution through frontend environment variables; OpenFreeMap is the initial style provider. Keep attribution visible and retain attribution embedded by the style. Do not use standard OpenStreetMap public tile servers as an unlimited CDN.

Search is a separate backend provider boundary and starts disabled until deliberately configured. Map rendering does not depend on geocoding.

## Consequences

Switching compatible style providers does not change business logic. Style/attribution frontend changes require rebuilding the Vite bundle. External map availability is not guaranteed. Check each provider's terms before deployment. See [OpenFreeMap integration guidance](https://openfreemap.org/quick_start/).
