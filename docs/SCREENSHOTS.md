# Screenshots and demonstration guide

Screenshots should show the actual running build with fictional seeded data. No image placeholder should be mistaken for a captured application.

## Suggested captures

| File to add under `docs/images/` | Content                                                                  | Suggested viewport |
| -------------------------------- | ------------------------------------------------------------------------ | ------------------ |
| `desktop-map.png`                | Anonymous map with area selection, numerical score/count and attribution | 1440 × 900         |
| `mobile-area.png`                | Mobile details sheet with reports and verification labels                | 390 × 844          |
| `review-area.png`                | Editable four-corner shape and rating/incident form                      | 1280 × 900         |
| `admin-moderation.png`           | Admin content review plus an audited moderation result                   | 1440 × 900         |

Create the directory when adding approved captures. Keep images reasonably compressed, add meaningful Markdown alt text, and link them from README only after they exist.

## Capture process

1. Use a disposable local database and the non-production seed. Do not copy production data.
2. Start API/frontend using README instructions. Choose a known viewport containing demo areas.
3. Confirm map/provider attribution is visible and the interface has finished loading.
4. Capture desktop and mobile states, including realistic long text. Avoid browser extensions, notification overlays or developer secrets.
5. Use fixture accounts or redact private email/account information before publishing.
6. Visually inspect clipping, scroll traps, score direction, focus states, contrast and touch controls.
7. State which commit/build and viewport the images represent in the PR.

A useful two-minute demo starts anonymous, selects an area, explains community uncertainty and verification badges, draws four corners, submits a recent experience, shows the overlap cooldown, then switches to an administrator to hide/restore a report and inspect its audit entry.

Explain that demo reports are fictional and local fixture authentication is not the real Google credential flow. Do not present screenshots as evidence of real-world safety, a deployed service, accessibility certification or completed release checks.
