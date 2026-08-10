---
parent: ../post-login-contract-ux-migration-map.md
status: closed
type: prototype
assignee: Codex
blocked_by:
  - 020-post-login-shell-and-design-system.md
---

# retired model contracts and Contract Drafts

## Question

How should a retired model own a table-first Contracts view and a role-led creation flow, while describing an unshared Contract Draft as a discreet Contract Draft rather than exposing “private draft” language?

## Resolution

Provide a Profile-owned, table-first Contracts view with a role-led creation flow. Call an unshared Contract Draft a Contract Draft in the UI, without using “private draft” wording. A pre-draft Contract Draft is creator-only by default; another person gains access only through an explicit sharing or invitation action.
