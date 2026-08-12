---
parent: ../post-login-contract-ux-migration-map.md
status: superseded 2026-08-11
type: task
labels:
  - wayfinder:task
assignee: Codex
blocked_by:
  - 036-contract-profile-ownership-and-access-migration.md
  - 037-signed-in-contract-navigation-and-wallet-boundary.md
---

# Dashboard and Contract experience delivery

## Question

What implementation and acceptance sequence delivers the MilestonePay-informed Dashboard, Contracts list, and Contract detail in PactFlow while omitting recent activity and removing all retired post-login routes and labels?

## Resolution

Superseded on 2026-08-11. The Contracts-list and Dashboard portions were delivered by their completed focused tickets, while the former dense Contract Draft detail has been replaced by the authenticated `/contracts/:id` Contract detail. That surface provides Overview and Deliverables, plus payment and milestone context, using the selected persisted Contract record from Supabase.

The remaining decisions are not covered by this ticket: private evidence storage and authorisation, criteria-gated review decisions, chain-authoritative payment states, and responsive end-to-end verification remain in the active MilestonePay-informed Contract workflow tickets 02 through 05. The detail view must not be used as evidence that those obligations are complete.
