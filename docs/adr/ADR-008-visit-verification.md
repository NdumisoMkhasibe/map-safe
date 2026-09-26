# ADR-008: Self-attestation with optional GPS evidence

## Status

Accepted — 2026-09-26

## Context

Requiring current location would exclude genuine recent visitors and collect more location data than necessary. Browser GPS cannot provide tamper-proof presence proof.

## Decision

Require a visit timestamp within the previous seven days and an explicit personal-visit attestation. SELF_ATTESTED is the ordinary path. Users may voluntarily provide current GPS evidence; the backend checks location inside the polygon, accuracy at most 100 metres and freshness within five minutes, with 30 seconds of clock tolerance.

Store GPS_VERIFIED, verification time and optional accuracy only after validation. Do not persist the supplied raw point or log request bodies. Expose clear verification badges. Permission denial permits self-attestation, not silent GPS verification.

## Consequences

This minimizes retained movement data and supports later reviews. Browser coordinates may be manipulated; verification does not establish an incident's truth. No background tracking, mandatory GPS or claim that all reports are location-verified is permitted.
