# PactFlow implementation tracker

This is the canonical operating overview for implementation. Ticket files in [`tickets`](tickets) hold the acceptance criteria and blockers; this register is the single place to see the programme and current evidence.

## Completion reference

The [implementation completion reference](implementation-completion-reference.md) defines the target-architecture bar. No local simulator, browser-only state, or schema-only proof may be reported as a complete testnet MVP.

## Current evidence

- Durable Supabase Profile, Profile-owned Contract party/access, invitation, Contract-Version, Authority, case-access, and notification foundations have linked-project RLS coverage.
- The responsive signed-in shell, People discovery/connection foundation, Profile Settings hydration, Contract Draft handoff, and standalone Wallet have committed browser and endpoint coverage.
- Temporary local browser-auth fixtures are documented in ticket 03. They are disabled by default, production-refused, and must be removed after the normal `/api/session` failure is resolved.
- Base Sepolia MockEUSD and the EscrowVaultFactory are deployed, but Contract-specific Vault creation, wallet funding, authoritative chain reads, settlement, and end-to-end judge verification remain incomplete.

## Active priority â€” one-to-one Contract UX migration

The [one-to-one Contract UX migration specification](one-to-one-contract-ux-migration-spec.md) is the active delivery source. Its Contract-only, two-User-Profile model takes precedence over every retired model, Contract Draft, and Contract-oriented queue below.

1. [Establish Profile-owned Contract access](tickets/01-establish-profile-owned-contract-access.md) - **complete 2026-08-10**: migration `20260810100000` is applied; linked post-deployment checks found zero invalid Contract Parties, zero active delegations, and zero Contracts missing their creator Profile party. The rollback-only RLS regression proves a retained Contract Draft access Workspace cannot authorize a non-party; linked lint, 61-test suite, typecheck, and build pass.
2. [Retire legacy Contract authoring and routes](tickets/02-retire-legacy-contract-authoring-and-routes.md) - **complete 2026-08-10**: retired Workspace paths/API now return not-found; Contract-only creation and Profile-owned review have focused route/API coverage, typecheck, build, and 59 tests passing. The product owner independently verified the browser behavior; the local fresh-token `/api/session` harness failure was reproduced in both browser surfaces and is recorded as environment evidence rather than a ticket gap.
3. [Clean the retired product model from the repository](tickets/06-clean-legacy-repository-and-retire-reference.md) - **complete 2026-08-10**: removed retired routes, code, assets, documentation, and generated output; migrated the Vault's Contract-facing terminology. Repository scans, production build, typecheck, Solidity compilation, `git diff --check`, and the 59-test suite pass.
4. [Deliver focused signed-in navigation and Wallet](tickets/03-deliver-focused-signed-in-navigation-and-wallet.md) - **complete 2026-08-10**: standalone `/wallet` keeps available MockEUSD separate from Contract Escrow Vault funds and history; desktop and 390 px signed-in browser checks verify the four-destination navigation plus empty/connected Wallet states. Route coverage, 61 tests, typecheck, production build, and `git diff --check` pass. The local-only test-auth fixture emails and mandatory cleanup are recorded in ticket 03.
5. [Deliver MilestonePay-informed Dashboard](tickets/04-deliver-milestonepay-informed-dashboard.md) - **complete 2026-08-10**: action-first Contract surfaces, no-money boundary, and empty/attention/populated state coverage are implemented; focused route/presentation coverage, 63 tests, typecheck, build, and `git diff --check` pass. The product owner independently verified authenticated Dashboard rendering at desktop and 390 px widths with the local test fixture.
6. [Deliver MilestonePay-informed Contracts experience](tickets/05-deliver-milestonepay-informed-contracts-experience.md) - **complete 2026-08-10**: authenticated Contract records now have a scan-ready table and equivalent 390 px records with lifecycle actions and no unverified monetary values; the Contract Draft detail retains its authorized lifecycle context without a review-context failure blocking editing. Desktop and narrow browser checks, focused route/presentation tests, typecheck, build, `git diff --check`, and 65 tests pass.
7. [Retire MilestonePay reference after approval](tickets/07-retire-milestonepay-reference-after-approval.md) - blocked by 4 through 6 and explicit product-owner authorization to remove `milestonepay`.

## Legacy queues

The retired model-specific portions of the existing testnet and post-login queues are superseded by active tickets 1 and 2. Existing shell, Dashboard, Profile Settings, and People work remains reusable evidence only where it conforms to the active Contract model. Resume Contract lifecycle tickets only after tickets 1 and 2 have established Profile-owned access, reconciling their labels and prerequisites to Contract-only language as they are selected.

## Open decision queue


## Deferred Testnet MVP implementation queue

- [Bootstrap the demo application safely](tickets/implementation-testnet-01-bootstrap-demo-application-safely.md) â€” complete 2026-08-08: production startup plus `/health` and public-config boundary were verified; smoke (6), typecheck, and full suite (46) pass.
- [Establish secure profiles, sessions, and retired models](tickets/implementation-testnet-02-create-secure-participant-sessions-and-wallets.md) â€” blocked / check later 2026-08-09: an unrestricted local browser previously verified six-digit OTP sign-in, durable Profile hydration after refresh, the minimal account-aware confirmation, and sign-out before a different-account email flow. This session confirmed the linked-project OTP and retired model switcher, but browser retired model creation failed safely even though a privileged linked-database diagnostic can create the retired model and owner membership. The port-3456 local server could not be restarted because the host denied termination. Revisit after that server can be restarted or the request failure is diagnosed; browser creation, cross-account private-image access, rejected-upload handling, and Gmail delivery confirmation remain. Typecheck and 58 tests pass.
- [Link and present user-owned wallets](tickets/implementation-testnet-02a-link-user-owned-wallets-to-supabase-accounts.md) â€” partial wallet-capability evidence.
- [Invite project participants without widening retired model access](tickets/implementation-testnet-03-restrict-contract-access-to-invited-participants.md) â€” partial local evidence.
- [Create a Profile-owned Project and standalone Contract Draft](tickets/implementation-testnet-04-create-a-validated-custom-payment-contract-draft.md)
- [Review, version, and approve Contract terms](tickets/implementation-testnet-05-review-version-and-approve-contract-terms.md)
- [Offer co-pilot-assisted Contract drafting](tickets/implementation-testnet-06-offer-copilot-assisted-contract-drafting.md)
- [Deploy a Project-specific, non-administered Escrow Vault](tickets/implementation-testnet-07-deploy-a-non-administered-vault-foundation.md)
- [Fund a Project Escrow Vault through an explicit Buyer action](tickets/implementation-testnet-08-fund-a-vault-through-an-explicit-buyer-action.md) â€” partial contract-foundation evidence.
- [Show Project and Escrow Vault status from the chain](tickets/implementation-testnet-09-show-chain-authoritative-contract-status.md)
- [Record final seller delivery evidence](tickets/implementation-testnet-10-record-final-seller-delivery-evidence.md)
- [Release an accepted milestone](tickets/implementation-testnet-11-release-an-accepted-milestone.md)
- [Release after review-window expiry](tickets/implementation-testnet-12-release-after-review-window-expiry.md)
- [Refund a missed-delivery milestone](tickets/implementation-testnet-13-refund-a-missed-delivery-milestone.md)
- [Open and resolve a milestone dispute in Contract context](tickets/implementation-testnet-14-open-and-resolve-a-milestone-dispute.md)
- [Amend future work with mutual approval](tickets/implementation-testnet-15-amend-future-work-with-mutual-approval.md)
- [Present the append-only Contract history](tickets/implementation-testnet-16-present-the-append-only-contract-history.md)
- [Index and reconcile chain activity](tickets/implementation-testnet-17-index-and-reconcile-chain-activity.md)
- [Produce the judge-ready demo and runbook](tickets/implementation-testnet-18-produce-the-judge-ready-demo-and-runbook.md)
- [Deliver a private notification inbox for Project actions](tickets/implementation-testnet-19-deliver-a-private-notification-inbox.md) â€” partial durable-inbox evidence.
- [Define the testnet payment-method and funding model](tickets/implementation-testnet-20-define-the-testnet-payment-method-and-funding-model.md) â€” decision recorded; browser funding remains pending.

## Superseded post-login retired model implementation queue

- [Establish the responsive signed-in app shell](tickets/implementation-post-login-01-establish-responsive-signed-in-app-shell.md) â€” complete 2026-08-08: accessible sidebar/drawer/avatar controls, responsive bottom navigation, canonical People alias coverage, typecheck, production build, and 48 tests pass.
- [Deliver the action-first Dashboard](tickets/implementation-post-login-02-deliver-action-first-dashboard.md) â€” complete 2026-08-08: action-first hierarchy, RLS-scoped Home data, authoritative milestone timeline and analytics, loading/empty/error states, responsive browser acceptance, typecheck, and 48-test suite verified.
- [Deliver table-first retired model Contracts](tickets/implementation-post-login-03-deliver-table-first-contracts.md) â€” blocked / check later 2026-08-09: RLS-scoped Contract titles, semantic table/mobile records, user-facing stage labels, responsive no-overflow checks, typecheck, production build, `git diff --check`, and 58 tests pass. OTP and a linked RLS query verified one approved Buyer Contract Draft is durable and caller-visible, but browser Contracts and Dashboard reads now return generic `Request failed.` responses. Do not select again until that authenticated read failure is diagnosed; live filter acceptance and the second test Contract Draft remain.
- [Deliver Profile Settings and discoverability foundation](tickets/implementation-post-login-05-deliver-profile-settings-and-discoverability-foundation.md) â€” complete 2026-08-09: accessible avatar contrast, hydrated/truncated signed-in identity, private-image upload card, short-lived owner image URLs in Settings and the sidebar, protected discoverability, API authorization, and linked-project cross-Profile RLS evidence verified; typecheck, full 53-test suite, and production build pass.
- [Eliminate cross-route profile loading jitter](tickets/implementation-post-login-09-eliminate-cross-route-profile-loading-jitter.md) â€” in progress 2026-08-10: local authenticated browser acceptance verified the stable loading-to-current-Profile fallback across Dashboard, Contracts, People, Profile Settings, and the 390 px mobile drawer; focused delayed-avatar tests, typecheck, production build, `git diff --check`, and the full 65-test suite pass. A browser run with a usable current private image remains required before completion.
- [Deliver role-led Contract Draft creation](tickets/implementation-post-login-04-deliver-role-led-contract-creation.md)
- [Deliver People discovery](tickets/implementation-post-login-06-deliver-people-discovery.md) Ã¢â‚¬â€ in progress 2026-08-09: safe endpoint payload, username/blocked-profile RLS migration, and responsive Discover loading/empty/error/access-boundary UI are implemented; focused tests, full 58-test suite, typecheck, build, linked-project migration, and linked RLS regression pass. Live OTP succeeds but the server-side Supabase user lookup rejects the fresh browser session at `/api/session`, so authenticated browser privacy acceptance remains.
- [Deliver My network and Requests](tickets/implementation-post-login-07-deliver-my-network-and-requests.md)
- [Connect People to Contract Draft creation](tickets/implementation-post-login-08-connect-people-to-contract-creation.md)
