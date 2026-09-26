# Roadmap

## Web MVP 0.2.0

Current scope is the responsive web application: editable quadrilateral areas, Google-only sign-in, recent self-attested/optional GPS experiences, weighted scores, overlap cooldowns, incident reports, explicit provider-backed search and audited administration.

Implementation and verification status live in [the local issue/release ledger](CODEX_IMPLEMENTATION_PLAN.md). Feature code, passing local tests, live external-service checks and deployed operation are separate milestones. Release a beta while required owner configuration or operational checks remain.

## Public beta readiness

Before accepting unrestricted real reports:

- Complete real Google and intended-provider smoke tests, remote CI and clean setup rehearsal.
- Choose hosting without silently enabling billing; test HTTPS/proxy/cookie configuration.
- Rehearse migrations, backup restoration and recovery; define monitoring and alert ownership.
- Define moderation response, appeals, privacy requests, retention and erasure procedures.
- Review measured performance, abuse risks, accessibility findings and dependency updates.
- Load-test spatial/report aggregation; choose shared rate limits/cache or a new geocoder before adding API instances.

## Later, driven by evidence

PostGIS spatial indexing can replace application-side candidate scans while retaining GeoJSON API contracts. Materialized score caches need documented invalidation for new reports, time decay and moderation. Distributed abuse controls and a reputation model require privacy/fairness review rather than simply accumulating user location history.

A native React Native/MapLibre Native client may reuse the domain API after browser-independent auth transport and native UX are designed. It is not part of the current implementation.

Notifications, official data feeds, navigation routing, historical trend analysis and offline behavior are possible later projects, not promised MVP capabilities. Crime prediction, surveillance and emergency dispatch remain outside the product's purpose. No paid service is automatically approved by inclusion on this roadmap.
