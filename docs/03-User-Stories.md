# User stories and acceptance criteria

| Story                                                          | Acceptance criteria                                                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| As a visitor, I can inspect an unfamiliar area anonymously.    | Map pans/zooms; viewport areas load; selected areas show score, count, report times, incidents and verification; empty/error states are readable.  |
| As a visitor, I can search intentionally.                      | Typing makes no upstream query; Search submits; selecting a result moves the map; failures are recoverable.                                        |
| As a contributor, I can sign in with Google.                   | Backend verifies the credential; local identity uses Google subject; a session cookie authenticates subsequent requests; invalid credentials fail. |
| As a contributor, I can describe the boundary I experienced.   | Four corners can be placed and adjusted; invalid geometry is rejected; the final polygon is shown before sending.                                  |
| As a recent visitor, I can report later.                       | Seven-day visit window and attestation are required; GPS is optional; verification badges distinguish methods.                                     |
| As a contributor, I can explain my score.                      | Integer score 1–10 is required; direction is consistent; optional comment and multiple incident types survive submission.                          |
| As a contributor, I can describe an unlisted incident.         | Other requires a type explanation; a narrative remains optional; content is labelled community-reported.                                           |
| As a reader, I can understand overlapping reports.             | Point queries return active containing areas and a deduplicated report-weighted score; no areas gives no score.                                    |
| As a community member, I am protected from repeated influence. | Substantial overlap within seven days returns a conflict and retry time; concurrency cannot bypass it.                                             |
| As an administrator, I can moderate content.                   | Dashboard shows counts/activity; searchable lists provide context; hide/restore requires a reason and is audited.                                  |
| As an administrator, I can manage harmful accounts.            | Suspension/reactivation requires backend roles; administrator lockout is prevented; ordinary users receive forbidden responses.                    |
| As a mobile or keyboard user, I can complete core flows.       | Panels fit; fields have labels; dialogs manage focus; submission states/errors are announced; drawing has coordinate inputs.                       |
| As a privacy-conscious visitor, I understand what is shared.   | Public responses exclude emails, Google identifiers, sessions and raw GPS; privacy and safety information is reachable.                            |

These are acceptance criteria, not executed results. See [testing strategy](08-Testing-Strategy.md) and [release verification](CODEX_IMPLEMENTATION_PLAN.md).
