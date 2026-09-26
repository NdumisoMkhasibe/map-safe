# ADR-006: Google-only authentication and server sessions

## Status

Accepted — 2026-09-26

## Context

Anonymous reading should be simple, while writes and administration require verified identities. The MVP does not need passwords or access to users' Google services.

## Decision

Use Google Identity Services' JavaScript credential callback and google-auth-library server verification. Verify signature, issuer, audience and expiry, require verified email, and identify users by stable Google subject. Store only necessary profile/account fields. Return public first-name identities separately from private account metadata.

Issue random opaque session tokens in HttpOnly cookies; store only their hashes and expiry. Require Secure cookies in production, a constrained SameSite policy, trusted Origin and the custom X-MapSafe-Request: web header for JSON mutations. Do not persist Google credentials in browser storage. Logout deletes the session.

Initial admin assignment uses ADMIN_EMAILS and only Google's authoritative email cases (Gmail or a verified Workspace hosted-domain claim). Other verified Google accounts can be ordinary users. Production refuses development authentication fixtures.

## Consequences

Google sign-in still requires the owner's configured web client and authorized origins. Administrators must carefully control the allowlist. This design is the app's protected JSON callback, not Google's direct form-post mode. See [server verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) and [GIS integration](https://developers.google.com/identity/gsi/web/guides/integrate). Native clients will need a reviewed transport, not a browser-header bypass.
