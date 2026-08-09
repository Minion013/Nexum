---
parent: ../application-foundation-map.md
status: closed
type: grilling
assignee: Codex
blocked_by:
  - application-foundation/05-define-authority-registry-operations.md
---

# Authority Registry operating model

## Question

What verification evidence, update workflow, audit trail, suspension process, and case-assignment controls govern a published Resolution Authority and its Case Officers in the MVP's simulated operations model?

## Resolution

Use a platform-controlled simulated Authority model. Publish one clearly labelled simulated Resolution Authority with its jurisdiction label and ruleset version; retain an internal verification or provenance note without claiming real accreditation. Registry changes are operator-only and append an audit record with actor, timestamp, reason, and before or after values. A ruleset change creates a new version and never rewrites a Contract Version’s stored Authority snapshot. Suspension removes an Authority from new Contract selection while existing Contracts retain their snapshot and an assigned case remains accessible. Platform operations assigns exactly one Case Officer per case; officers cannot self-assign, view unassigned or other cases, or alter Contract terms. Reassignment is audited.
