---
parent: ../account-profile-and-connections-map.md
status: closed
type: grilling
assignee: Codex
blocked_by:
  - 018-account-and-directory-experience.md
  - 019-connection-record-and-safety-model.md
  - 022-people-directory-and-profile-settings.md
---

# People directory operations and safety policy

## Question

What search ranking, pagination, request-rate limits, reporting/moderation process, and connection-safety rules let signed-in People discovery scale without exposing private profiles or turning the directory into a marketplace?

## Resolution

Search only opted-in, non-blocked Profiles by display name, username, and headline, using stable alphabetical ranking rather than popularity, proximity, or recommendations. Use cursor pagination with 20 results per page and a 30-searches-per-minute limit. Apply the 10 outbound requests per 24 hours and block rules before returning any result or request action. Let users report a Profile or connection into a private, auditable moderation record containing its reason and timestamp. MVP operations may hide a reported Profile from discovery or suspend its directory access, but do not build ratings, reputation scores, public reports, or marketplace workflows.
