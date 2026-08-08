# PactFlow implementation tracker

This is the canonical operating overview for implementation. Ticket files in [`tickets`](tickets) hold the acceptance criteria and blockers; this register is the single place to see the programme and current evidence.

## Completion reference

The [implementation completion reference](implementation-completion-reference.md) defines the target-architecture bar. No local simulator, browser-only state, or schema-only proof may be reported as a complete testnet MVP.

## Current evidence

- Durable Supabase Profile, Workspace, invitation, Contract-Version, Authority, case-access, and notification foundations have linked-project RLS coverage.
- The responsive signed-in shell, People discovery/connection foundation, Profile Settings hydration, and Proposal handoff have committed browser and endpoint coverage.
- Base Sepolia MockEUSD and the EscrowVaultFactory are deployed, but Contract-specific Vault creation, wallet funding, authoritative chain reads, settlement, and end-to-end judge verification remain incomplete.

## Open decision queue

- [Off-chain data and privacy model](tickets/008-off-chain-data-and-privacy-model.md)
- [Application boundary and authorisation](tickets/009-application-boundary-and-authorisation.md)
- [Wallet and transaction experience](tickets/010-wallet-transaction-experience.md)
- [Chain-event index and consistency](tickets/011-chain-event-index-and-consistency.md)
- [Monorepo, test, and deployment blueprint](tickets/012-monorepo-test-and-deployment-blueprint.md)
- [Profile persistence and access model](tickets/017-profile-persistence-and-access-model.md)
- [Account and directory experience](tickets/018-account-and-directory-experience.md)
- [Connection record and safety model](tickets/019-connection-record-and-safety-model.md)
- [Post-login shell and design system](tickets/020-post-login-shell-and-design-system.md)
- [Action-first dashboard](tickets/021-action-first-dashboard.md)
- [People directory and profile settings](tickets/022-people-directory-and-profile-settings.md)
- [Workspace Contracts and Proposals](tickets/023-workspace-contracts-and-proposals.md)
- [Profile-photo storage lifecycle](tickets/025-profile-photo-storage-lifecycle.md)
- [People directory operations and safety policy](tickets/026-people-directory-operations-and-safety-policy.md)
- [Profile deactivation and contract-history policy](tickets/027-profile-deactivation-and-contract-history-policy.md)
- [Connection handoff to Proposal creation](tickets/028-connection-handoff-to-proposal-creation.md)
- [Dashboard metrics and empty-state policy](tickets/029-dashboard-metrics-and-empty-state-policy.md)
- [High-volume Workspace Contract operations](tickets/030-high-volume-workspace-contract-operations.md)
- [Dark-mode scope and token policy](tickets/031-dark-mode-scope-and-token-policy.md)
- [Authority Registry operating model](tickets/032-authority-registry-operating-model.md)
- [Application integration scope boundary](tickets/033-application-integration-scope-boundary.md)

## Testnet MVP implementation queue

- [Bootstrap the demo application safely](tickets/implementation-testnet-01-bootstrap-demo-application-safely.md) — complete 2026-08-08: production startup plus `/health` and public-config boundary were verified; smoke (6), typecheck, and full suite (46) pass.
- [Establish secure profiles, sessions, and Workspaces](tickets/implementation-testnet-02-create-secure-participant-sessions-and-wallets.md) — partial local evidence.
- [Link and present user-owned wallets](tickets/implementation-testnet-02a-link-user-owned-wallets-to-supabase-accounts.md) — partial wallet-capability evidence.
- [Invite project participants without widening Workspace access](tickets/implementation-testnet-03-restrict-agreement-access-to-invited-participants.md) — partial local evidence.
- [Create a Workspace-owned Project and standalone Proposal](tickets/implementation-testnet-04-create-a-validated-custom-payment-agreement-draft.md)
- [Review, version, and approve agreement terms](tickets/implementation-testnet-05-review-version-and-approve-agreement-terms.md)
- [Offer co-pilot-assisted agreement drafting](tickets/implementation-testnet-06-offer-copilot-assisted-agreement-drafting.md)
- [Deploy a Project-specific, non-administered Escrow Vault](tickets/implementation-testnet-07-deploy-a-non-administered-vault-foundation.md)
- [Fund a Project Escrow Vault through an explicit Buyer action](tickets/implementation-testnet-08-fund-a-vault-through-an-explicit-buyer-action.md) — partial contract-foundation evidence.
- [Show Project and Escrow Vault status from the chain](tickets/implementation-testnet-09-show-chain-authoritative-agreement-status.md)
- [Record final seller delivery evidence](tickets/implementation-testnet-10-record-final-seller-delivery-evidence.md)
- [Release an accepted milestone](tickets/implementation-testnet-11-release-an-accepted-milestone.md)
- [Release after review-window expiry](tickets/implementation-testnet-12-release-after-review-window-expiry.md)
- [Refund a missed-delivery milestone](tickets/implementation-testnet-13-refund-a-missed-delivery-milestone.md)
- [Open and resolve a milestone dispute in Contract context](tickets/implementation-testnet-14-open-and-resolve-a-milestone-dispute.md)
- [Amend future work with mutual approval](tickets/implementation-testnet-15-amend-future-work-with-mutual-approval.md)
- [Present the append-only agreement history](tickets/implementation-testnet-16-present-the-append-only-agreement-history.md)
- [Index and reconcile chain activity](tickets/implementation-testnet-17-index-and-reconcile-chain-activity.md)
- [Produce the judge-ready demo and runbook](tickets/implementation-testnet-18-produce-the-judge-ready-demo-and-runbook.md)
- [Deliver a private notification inbox for Project actions](tickets/implementation-testnet-19-deliver-a-private-notification-inbox.md) — partial durable-inbox evidence.
- [Define the testnet payment-method and funding model](tickets/implementation-testnet-20-define-the-testnet-payment-method-and-funding-model.md) — decision recorded; browser funding remains pending.

## Post-login workspace implementation queue

- [Establish the responsive signed-in app shell](tickets/implementation-post-login-01-establish-responsive-signed-in-app-shell.md)
- [Deliver the action-first Dashboard](tickets/implementation-post-login-02-deliver-action-first-dashboard.md)
- [Deliver table-first Workspace Contracts](tickets/implementation-post-login-03-deliver-table-first-workspace-contracts.md)
- [Deliver role-led Proposal creation](tickets/implementation-post-login-04-deliver-role-led-proposal-creation.md)
- [Deliver Profile Settings and discoverability foundation](tickets/implementation-post-login-05-deliver-profile-settings-and-discoverability-foundation.md)
- [Deliver People discovery](tickets/implementation-post-login-06-deliver-people-discovery.md)
- [Deliver My network and Requests](tickets/implementation-post-login-07-deliver-my-network-and-requests.md)
- [Connect People to Proposal creation](tickets/implementation-post-login-08-connect-people-to-proposal-creation.md)
