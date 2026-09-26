# ADR-010: Soft moderation with an audit trail

## Status

Accepted — 2026-09-26

## Context

Community reports can be abusive or inaccurate. Administrators need reversible actions and accountability without routine destructive deletion.

## Decision

Give active administrators server-enforced access to dashboard, user/content lists and audit history. Hide/restore areas, ratings and incidents; suspend/reactivate ordinary users; require a reason. Write state change and audit entry in one transaction. Protect administrator accounts from suspension through ordinary moderation controls. Public queries filter moderated content consistently, including inherited area/rating visibility.

Keep account role separate from content status. Bootstrap administrators through the verified Google email allowlist rather than a public role-changing endpoint.

## Consequences

Hidden records remain available for review; hiding is not erasure. Audit records carry personal/operational context and need controlled access and future retention policies. Abuse handling, appeals and privacy deletion require owner-operated procedures. Admin UI visibility alone never authorizes an action.
