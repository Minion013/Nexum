# PactFlow implementation tracker

This is the canonical operating overview for implementation. Ticket files in [`tickets`](tickets) hold the acceptance criteria and blockers; this register is the single place to see the programme and current evidence.

## Completion reference

The [implementation completion reference](implementation-completion-reference.md) defines the target-architecture bar. No local simulator, browser-only state, or schema-only proof may be reported as a complete testnet MVP.

## Current evidence

- Durable Supabase Profile, Workspace, invitation, Contract-Version, Authority, case-access, and notification foundations have linked-project RLS coverage.
- The responsive signed-in shell, People discovery/connection foundation, Profile Settings hydration, and Proposal handoff have committed browser and endpoint coverage.
- Base Sepolia MockEUSD and the EscrowVaultFactory are deployed, but Contract-specific Vault creation, wallet funding, authoritative chain reads, settlement, and end-to-end judge verification remain incomplete.

## Open decision queue


## Testnet MVP implementation queue

- [Bootstrap the demo application safely](tickets/implementation-testnet-01-bootstrap-demo-application-safely.md) — complete 2026-08-08: production startup plus `/health` and public-config boundary were verified; smoke (6), typecheck, and full suite (46) pass.
- [Establish secure profiles, sessions, and Workspaces](tickets/implementation-testnet-02-create-secure-participant-sessions-and-wallets.md) — blocked / check later 2026-08-09: an unrestricted local browser previously verified six-digit OTP sign-in, durable Profile hydration after refresh, the minimal account-aware confirmation, and sign-out before a different-account email flow. This session confirmed the linked-project OTP and Workspace switcher, but browser Workspace creation failed safely even though a privileged linked-database diagnostic can create the Workspace and owner membership. The port-3456 local server could not be restarted because the host denied termination. Revisit after that server can be restarted or the request failure is diagnosed; browser creation, cross-account private-image access, rejected-upload handling, and Gmail delivery confirmation remain. Typecheck and 58 tests pass.
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

- [Establish the responsive signed-in app shell](tickets/implementation-post-login-01-establish-responsive-signed-in-app-shell.md) — complete 2026-08-08: accessible sidebar/drawer/avatar controls, responsive bottom navigation, canonical People alias coverage, typecheck, production build, and 48 tests pass.
- [Deliver the action-first Dashboard](tickets/implementation-post-login-02-deliver-action-first-dashboard.md) — complete 2026-08-08: action-first hierarchy, RLS-scoped Home data, authoritative milestone timeline and analytics, loading/empty/error states, responsive browser acceptance, typecheck, and 48-test suite verified.
- [Deliver table-first Workspace Contracts](tickets/implementation-post-login-03-deliver-table-first-workspace-contracts.md) — blocked / check later 2026-08-09: RLS-scoped Contract titles, semantic table/mobile records, user-facing stage labels, responsive no-overflow checks, typecheck, production build, `git diff --check`, and 58 tests pass. OTP and a linked RLS query verified one approved Buyer Proposal is durable and caller-visible, but browser Contracts and Dashboard reads now return generic `Request failed.` responses. Do not select again until that authenticated read failure is diagnosed; live filter acceptance and the second test Proposal remain.
- [Deliver Profile Settings and discoverability foundation](tickets/implementation-post-login-05-deliver-profile-settings-and-discoverability-foundation.md) — complete 2026-08-09: accessible avatar contrast, hydrated/truncated signed-in identity, private-image upload card, short-lived owner image URLs in Settings and the sidebar, protected discoverability, API authorization, and linked-project cross-Profile RLS evidence verified; typecheck, full 53-test suite, and production build pass.
- [Eliminate cross-route profile loading jitter](tickets/implementation-post-login-09-eliminate-cross-route-profile-loading-jitter.md) — in progress 2026-08-09: reserved loading identity, verified atomic image/fallback resolution, stale-result protection, focused tests (4), typecheck, production build, and full 57-test suite pass; authenticated browser navigation acceptance remains.
- [Deliver role-led Proposal creation](tickets/implementation-post-login-04-deliver-role-led-proposal-creation.md)
- [Deliver People discovery](tickets/implementation-post-login-06-deliver-people-discovery.md) â€” in progress 2026-08-09: safe endpoint payload, username/blocked-profile RLS migration, and responsive Discover loading/empty/error/access-boundary UI are implemented; focused tests, full 58-test suite, typecheck, build, linked-project migration, and linked RLS regression pass. Live OTP succeeds but the server-side Supabase user lookup rejects the fresh browser session at `/api/session`, so authenticated browser privacy acceptance remains.
- [Deliver My network and Requests](tickets/implementation-post-login-07-deliver-my-network-and-requests.md)
- [Connect People to Proposal creation](tickets/implementation-post-login-08-connect-people-to-proposal-creation.md)
