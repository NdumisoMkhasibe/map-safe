# Product vision

MapSafe helps people understand how an area feels to people who recently visited it. Tourists, residents, students, delivery drivers and e-hailing drivers can browse community experiences on a map before deciding where to go.

The product answers: **“Based on community experiences, how safe does this area currently appear to be?”** A score is a summary of subjective reports, not a prediction, crime statistic or guarantee. Conditions change, participation is uneven, and reports can be mistaken or malicious.

## Principles

- **Context before certainty.** Show the score, report count, dates, comments and verification method together. A place without reports has no score; it is not automatically safe.
- **Recent experience matters.** Visits must be within seven days when submitted. Reports contribute to an exponential time-weighted score with a configurable 180-day half-life.
- **Clear boundaries.** Contributors draw editable quadrilaterals describing the area they experienced. A point or radius is not the current model.
- **Privacy by design.** Browsing requires no account. GPS verification is optional; raw verification coordinates are not retained. Public identities exclude email and Google identifiers.
- **Responsible participation.** Contributors attest to a personal visit, overlap cooldowns limit repeated influence, and administrators moderate content with an audit trail.
- **Accessible and affordable.** Mobile browsers and desktops share one responsive web application. Core technology is open source; paid services require an explicit future decision.

## Scope

The web MVP includes anonymous browsing, explicit place search, Google sign-in, area drawing, ratings, optional incident reports and administration. Self-attested and GPS-verified reports are visibly distinct. GPS checks supplied coordinates against the area at submission; it cannot establish that an incident occurred.

Emergency response, police integration, predictive crime scoring, tracking individuals, navigation routing, native applications and official crime-data feeds are outside this release. A future native client can reuse the versioned API after its authentication transport is designed and reviewed.

MapSafe should not be the sole basis for emergency decisions. Contact appropriate local emergency services in an emergency.
