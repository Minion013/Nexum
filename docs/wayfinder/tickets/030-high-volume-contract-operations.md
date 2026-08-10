---
parent: ../post-login-contract-ux-migration-map.md
status: closed
type: prototype
assignee: Codex
blocked_by:
  - 023-retired model-contracts-and-Contract Drafts.md
---

# High-volume retired model Contract operations

## Question

What pagination, filtering persistence, bulk actions, selection safeguards, and mobile equivalents keep a high-volume retired model Contracts view usable without weakening existing Contract visibility boundaries?

## Resolution

Use cursor pagination at 25 Contracts per page, with stage, party, and updated-date filters persisted in the URL so views can be shared and restored. The MVP permits no bulk Contract mutation: selection may support a local export or copy workflow only. Any future bulk action must submit explicit Contract IDs and re-check the requester’s access for every row server-side. On mobile, expose the same filters in a bottom sheet and retain card-first records; omit multi-select rather than forcing a desktop table pattern onto a small screen.
