---
labels:
  - wayfinder:map
---

# PactFlow post-login workspace redesign map

## Destination

Deliver a build-ready and implemented, responsive post-login PactFlow experience: an action-first dashboard, a social People directory, workspace-owned Contracts, and personal Profile Settings.

## Notes

This map carries execution after decisions are validated. Consult `CONTEXT.md` for PactFlow language and `design-system/pactflow/MASTER.md`. Contracts belong to a Workspace; Buyer and Service Provider are Contract-scoped responsibilities, never account roles. Use **Proposal** in the UI for a private Contract Draft, and never foreground its private state. Adopt a quietly confident workspace-utility visual direction: warm off-white surfaces, charcoal type, restrained cobalt actions, soft status tints, and quiet depth. Navigation labels use normal weight; semibold is reserved for the active item and high-importance actions.

## Decisions so far

<!-- the index is populated as tickets resolve -->

- [High-volume Workspace Contract operations](tickets/030-high-volume-workspace-contract-operations.md) - Contracts use 25-item cursor pages and URL-persisted filters; the MVP forbids bulk mutation and preserves the same filters in mobile cards.

- [Dark-mode scope and token policy](tickets/031-dark-mode-scope-and-token-policy.md) - Dark mode is deferred beyond the hackathon MVP; semantic tokens remain theme-ready, while the supported experience is light only.

- [Dashboard metrics and empty-state policy](tickets/029-dashboard-metrics-and-empty-state-policy.md) - Show active Contracts, milestones needing attention, upcoming deadlines, and only chain-backed payment amounts; empty and attention states lead to a concrete next action.

- [Workspace contracts and proposals](tickets/023-workspace-contracts-and-proposals.md) - Contracts are Workspace-owned and table-first; an unshared Proposal is creator-only until an explicit share or invitation grants access.

- [People directory and profile settings](tickets/022-people-directory-and-profile-settings.md) - People contains peer Discover, My network, and Requests sections; Profile Settings remains a persistent personal destination, separate from Workspace Settings.

- [Action-first dashboard](tickets/021-action-first-dashboard.md) - Urgent actions first, then an active-project milestone timeline and lightweight Workspace metrics; state is explicit and authority is never overstated.

- [Post-login shell and design system](tickets/020-post-login-shell-and-design-system.md) — One responsive signed-in navigation model with a desktop sidebar, mobile drawer and bottom navigation, implemented through shared semantic tokens and the established workspace-utility visual direction.

## Not yet specified



## Out of scope

- Public unauthenticated profiles, job listings, marketplace ratings, and direct messaging.
- Changing underlying Contract visibility, invitation, or authorisation rules beyond surfacing the existing boundaries clearly.
