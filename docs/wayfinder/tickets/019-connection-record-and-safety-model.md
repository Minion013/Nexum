---
parent: ../account-profile-and-connections-map.md
status: closed
type: grilling
assignee: Codex
blocked_by:
  - 015-professional-connection-lifecycle.md
---

# Connection record and safety model

## Question

What connection states, uniqueness rules, request limits, and block semantics make the resolved request, withdrawal, acceptance, removal, and blocking flow safe and unambiguous?

## Resolution

Use one canonical unordered record per Profile pair. Its lifecycle is pending to accepted, with recipient-only decline, requester-only withdrawal, either-side removal after acceptance, and blocked as terminal until the blocker unblocks. Record which Profile blocked; a block hides the other Profile from discovery and requests in both directions and prevents new requests. Limit each Profile to 10 new outbound requests per rolling 24 hours. A declined or withdrawn request may be retried only after 30 days, while a block cannot be retried. Connections are purely social and never create Workspace, Contract, or invitation access.
