# Product requirements

This document describes the current web MVP. Historical point/radius concepts are superseded by [ADR-002](adr/ADR-002-quadrilateral-areas.md). Executed verification and remaining release gates belong in [the implementation plan](CODEX_IMPLEMENTATION_PLAN.md).

## People and access

| Actor                 | Capabilities                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| Anonymous visitor     | Browse map and details, view reports, submit explicit place searches                                            |
| Active signed-in user | Create areas, submit ratings/incidents, view own account                                                        |
| Active administrator  | Inspect statistics, search content/users, hide/restore content, suspend/reactivate users, inspect audit history |
| Suspended account     | Cannot perform authenticated mutations; public browsing remains available                                       |

Google Identity Services is the only sign-in provider. There is no password database. Server verification, status and role checks are authoritative.

## Areas and map

An area is a GeoJSON Polygon with four unique corners and one closing coordinate, no holes, no self-intersection and non-zero area. Concave quadrilaterals are permitted if valid. Current operational bounds are latitude -85 to 85, longitude -180 to 180, area 1 square metre to 100 square kilometres, no antimeridian span of 180 degrees or more, and no collinear effective corners. Contributors draw and adjust corners before confirmation; backend validation runs independently.

MapLibre GL JS renders translucent polygons using an environment-configured style provider, initially OpenFreeMap. Attribution remains visible. Viewport queries load areas; selecting a point covered by overlapping areas returns a composite score. Reviewed geometry is immutable so historical reports cannot silently move elsewhere.

## Experience submission

1. Sign in, select or draw an area, and confirm its boundary.
2. Enter a visit time within the previous seven days, no later than server time.
3. Explicitly attest to personally visiting the area.
4. Optionally request current location verification. Permission denial permits a self-attested submission.
5. Select an integer score: **1 = extremely safe; 10 = extremely unsafe**.
6. Optionally add an explanation and incident reports.
7. Submit; receive validation feedback, a cooldown retry time, or the saved result.

GPS evidence must be inside the boundary, have accuracy at most 100 metres, and be at most five minutes old (with 30 seconds of future clock tolerance). The server stores verification result/time/accuracy, not the raw point. Browser location can be spoofed: the badge is a limited signal, not evidence that a crime occurred.

Incident categories are Theft, Pickpocketing, Mugging / robbery, Assault, Car break-in, Hijacking, Harassment, Vandalism, Suspicious activity, Poor lighting, Lack of visible security and Other. Other requires an incident-type explanation. Narratives are optional. Separate records allow separate moderation.

## Scores, overlap and abuse controls

Colours progress green, yellow, orange and red, always alongside a number and text. No eligible reports means no score. Scores are shown with counts and context; sparse reports do not establish confidence.

For each eligible report, `weight = 0.5 ** (ageDays / halfLifeDays)`. Divide the sum of `score * weight` by total weight. Default half-life is 180 days; reports remain the source of truth. A point score combines distinct eligible reports from active containing areas, deduplicated by rating ID.

A user cannot submit within seven days of an earlier rating when polygon overlap reaches the configured threshold: default 60% of the smaller polygon. Transactions serialize concurrent submissions by a user. The conflict explains when all conflicting cooldowns expire.

## Moderation

Administrators filter and inspect users, areas, ratings and incidents. Hide/restore changes visibility without deleting records. Moderation requires a reason and creates an audit entry. Backend checks protect administrator accounts from accidental suspension. Initial administrators are bootstrapped from an environment email allowlist, subject to authoritative Google email checks; personal emails are never hard-coded.

## Quality and delivery

Mobile sheets, desktop panels, keyboard controls, readable labels, announced errors and touch-sized controls support the same flows. Unit/component tests mock third-party services; database integration and browser E2E tests exercise persistence and journeys. Coverage targets are 85% lines/functions and 80% branches, with executed evidence required before claiming them.

No hosting, billing, Google credentials or production database is provisioned automatically. See the [release guide](09-Deployment.md).
