---
labels:
  - wayfinder:map
---

# PactFlow one-to-one Contract UX migration map

## Destination

Produce a build-ready migration plan for a permanent, one-to-one PactFlow post-login experience that adopts the relevant MilestonePay visual direction for Dashboard and Contracts, adds a standalone Wallet, and removes Workspace, Proposal, Agreement, and team concepts.

## Notes

This is a planning map. Consult `CONTEXT.md`, `design-system/pactflow/MASTER.md`, and `milestonepay/milestonepay/src/app/routes.tsx`. Customer-facing language is **Contract** only; `Agreement`, `Proposal`, and `Workspace` are retired terms. Wallet shows a personal Base Sepolia test-wallet balance only, never pooled with Contract Escrow Vault funds or a global transaction history. Retain Profile Settings behind the avatar menu; primary navigation is Dashboard, Contracts, Wallet, and People. Notifications are not a sidebar or bottom-navigation destination. Do not delete the MilestonePay reference project until the user explicitly authorises it after migration review.

## Decisions so far

<!-- the index is populated as tickets resolve -->

## Not yet specified

- Exact visual parity details that become relevant only after the reference inventory and codebase migration boundary are decided.

## Out of scope

- Copying MilestonePay Settings or payment/funding views as standalone post-login destinations.
- Deleting `milestonepay` before the user has reviewed a complete migration and explicitly authorises removal.
