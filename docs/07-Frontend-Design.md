# Frontend design

The `frontend/` workspace uses React, strict TypeScript, Vite and MapLibre GL JS. One browser application adapts between desktop and mobile; no native application or separate mobile codebase is included.

## Map and layout

The map is the main canvas. Desktop uses floating panels for context and controls; narrow screens use compact controls and a bottom-sheet style detail/review surface with safe-area spacing. Numerical scores, labels and report counts accompany translucent safety colours. Calm risk language avoids promises that a place is safe.

Anonymous visitors can browse, inspect reports and intentionally search. Areas load for the visible bounding box. Clicking/tapping an area opens details; selecting a point covered by multiple polygons displays a composite community score. Provider loading/failure and empty reports need distinct states. Attribution remains visible around panels and mobile controls.

## Drawing and review

A contributor enters selection mode, places four corners, adjusts them, confirms the shape, then supplies their experience. Dragging corners is complemented by numeric longitude/latitude inputs for precision and keyboard access. The browser previews validity; the API is authoritative.

The form requires an integer 1–10 score, visit time in the past seven days and explicit attestation. Optional GPS requests permission only when the user chooses it. Permission denial/error returns the user to the self-attested path; it must not silently assign GPS verification. Other incident type becomes required only when Other is selected.

Submission disables duplicate form actions while pending. API field errors, authorization failures and cooldown retry time are shown in context. After success the map/details refresh. Dismissing a dialog, failure recovery and narrow-screen scrolling must preserve usable controls.

## Authentication and API state

Google Identity Services receives the configured public client ID and sends its callback credential to the backend. Auth context uses the current-user endpoint; HttpOnly sessions are never read from JavaScript. The API client includes credentials and `X-MapSafe-Request: web` on mutations.

No client-supplied identity/role is authoritative. Missing Google configuration produces a clear sign-in setup state while anonymous browsing remains usable. Explicit development fixture controls are hidden unless configured and are unusable against a production backend.

## Administration

The admin interface presents dashboard totals/recent activity and tables for users, areas, ratings and incidents. Search/filter/pagination bound large collections. Inspection shows relevant geometry, report text and metadata. Reversible hide/restore and suspend/reactivate actions require a reason; audit history lets an administrator see who changed what.

Client-side admin navigation is convenience only. Every request is independently authorized by the API. Account email appears only in authorized account/admin views, never public report cards.

## Accessibility and responsive checks

Use real buttons and labelled inputs, descriptive accessible names, visible keyboard focus, status/error announcements, and dialogs that move/restore focus with Escape dismissal. Score controls must expose both numeric meaning and text. Never encode verification or risk using colour alone.

Map gestures are intrinsically visual; coordinate inputs and readable report lists provide useful alternatives without claiming a fully nonvisual geospatial editor. Verify browser zoom, long text, touch targets, panel scroll, safe areas, high contrast and keyboard reachability at mobile and desktop sizes.

Automated component/browser tests complement manual inspection. See [testing strategy](08-Testing-Strategy.md) and [screenshot guide](SCREENSHOTS.md).

## Configuration and public information

Map style URL, provider name, attribution, API base URL and Google client ID are environment driven. Vite values are public build-time configuration. Search occurs only on explicit form submission, never each keystroke.

Privacy/safety information explains community sourcing, incomplete reports, changing conditions, optional GPS, lack of raw-location retention and emergency limitations. Seeded demo reports are labelled fictional. See [environment reference](ENVIRONMENT.md).
