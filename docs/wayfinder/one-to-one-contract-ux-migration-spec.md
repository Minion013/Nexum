---
labels:
  - ready-for-agent
---

# PactFlow one-to-one Contract UX migration specification

## Problem Statement

PactFlow's signed-in product currently exposes Workspace, Proposal, Agreement, and team-oriented concepts that do not match the intended bilateral product. Its existing Dashboard and Contract experience also do not yet reflect the focused visual hierarchy of the supplied MilestonePay reference. The result is a product that is harder to understand, presents obsolete destinations, and risks conflating a participant's available test-wallet balance with Contract Escrow Vault funds.

## Solution

PactFlow will become a permanent one-to-one Contract product. Every user-facing occurrence of Agreement, Proposal, Workspace, workspace membership, and team collaboration will be removed or migrated to a Contract-and-User-Profile model. The signed-in experience will adopt the relevant MilestonePay Dashboard, Contracts list, and Contract-detail design direction, adapted to PactFlow's real Contract lifecycle. A standalone Wallet destination will present only the User Profile's personal Base Sepolia test wallet and available test-token balance. The primary signed-in navigation will be Dashboard, Contracts, Wallet, and People; Profile Settings remains available from the avatar menu, while Notifications is not a sidebar or bottom-navigation item.

## User Stories

1. As a signed-in participant, I want to see Dashboard, Contracts, Wallet, and People as the only primary destinations, so that the product's purpose is immediately clear.
2. As a signed-in participant, I want Profile Settings to remain reachable from my avatar menu, so that personal account management stays available without distracting from the core Contract flow.
3. As a signed-in participant, I want Notifications excluded from the sidebar and bottom navigation, so that primary navigation remains focused.
4. As a participant, I want all customer-facing product copy to call my project record a Contract, so that I never have to reconcile Agreement and Proposal terminology.
5. As a participant, I want a Contract to be directly between two User Profiles, so that I do not need to create, own, join, or understand a Workspace or team.
6. As a participant, I want an editable Contract Draft to be clearly a Contract, so that draft work does not become a separate product concept.
7. As a participant, I want to access only the Contracts in which I am a party, so that bilateral Contract privacy remains durable.
8. As a participant, I want a Dashboard with the MilestonePay-inspired information hierarchy, so that I can see my Contract work and next actions at a glance.
9. As a participant, I do not want a Recent Activity section on Dashboard, so that the page remains focused on present Contract work.
10. As a participant, I want Dashboard states to distinguish loading, empty, attention, and available Contract data, so that I know what action to take in every state.
11. As a participant, I want the Contracts list to use the reference's clean, scan-friendly structure, so that I can find and open a Contract quickly.
12. As a participant, I want each Contract list item to identify the counterparty, lifecycle state, amount only when chain-backed, milestones, and relevant action, so that I can decide what needs attention.
13. As a participant, I want Contracts to remain usable on narrow screens, so that the list does not depend on a desktop-only table.
14. As a participant, I want Contract detail to follow the reference's visual hierarchy while retaining PactFlow's version, acceptance, milestone, evidence, amendment, and authority boundaries, so that a Contract is understandable and actionable.
15. As a Contract Party, I want all actions and statuses to use PactFlow's authoritative Contract data, so that visual redesign does not imply permissions or settlement states that do not exist.
16. As a participant, I want a standalone Wallet page, so that I can identify my personal Base Sepolia wallet without opening a Contract.
17. As a participant, I want Wallet to show my connected address, network, available test-token balance, and testnet safety context, so that I can safely prepare for Contract actions.
18. As a participant, I want Wallet not to include Contract Escrow Vault balances, so that locked funds cannot be mistaken for spendable funds.
19. As a participant, I do not want Wallet to expose a wallet-wide transaction history, so that financial history remains in the relevant Contract context.
20. As a participant with no connected wallet, I want Wallet to explain the available connection or disposable test-wallet choices, so that I can proceed safely.
21. As a participant, I want old Workspace and Proposal routes to disappear or redirect safely to their Contract equivalent, so that bookmarks do not strand me in obsolete experiences.
22. As a maintainer, I want obsolete Workspace, Proposal, and Agreement code, tests, database access paths, assets, and documentation removed once the replacement is verified, so that the repository does not retain unused product code.
23. As a maintainer, I want existing durable Contract history preserved while its ownership/access representation migrates, so that the permanent model change does not destroy valid Contract records.
24. As the product owner, I want the MilestonePay reference project kept until I have reviewed the completed migration and separately authorize deletion, so that the visual source remains available during acceptance.

## Implementation Decisions

- The durable domain is bilateral: a Contract has exactly two User Profile parties. Workspace ownership, workspace membership, collaborative-workspace behavior, and proposal-access records are retired.
- Customer-facing language is Contract only. Agreement and Proposal are prohibited in navigational labels, pages, buttons, empty states, notifications, help text, and tests except where a narrowly scoped database migration must reference a legacy object.
- The migration uses an expand-and-contract approach: establish Profile-based Contract ownership/access and backfill verified existing Contract records before cutting application reads and writes over; remove legacy objects only once the replacement and backfill are verified.
- Contract Draft is the only pre-signature state. Invitation, review, acceptance, version, milestone, evidence, amendment, and authority capabilities remain Contract-scoped rather than being reimplemented as a separate workflow.
- The shared signed-in shell has four primary destinations: Dashboard, Contracts, Wallet, and People. The same priorities apply to desktop sidebar, mobile drawer, and bottom navigation. Notifications remains available only through a non-primary control if retained; Profile Settings is avatar-menu-only.
- Dashboard and Contract presentation take visual cues from MilestonePay—compact navigation, restrained card/table surfaces, clear status treatment, concise metrics, strong primary actions, and responsive spacing—while applying PactFlow tokens and never copying the reference's Settings, Payments, or Recent Activity feature surfaces.
- Dashboard contains action-oriented Contract content and may show only chain-backed monetary values. It does not include a Recent Activity section.
- Contracts provides a desktop table and an equivalent responsive record/card presentation. Its data comes from the authenticated participant's Contract access scope and does not expose retired ownership concepts.
- Contract detail is the canonical place for individual Contract lifecycle information and for any Contract Escrow Vault balance or transaction/activity history. It retains existing authorization and wallet-signature safeguards.
- Wallet is a standalone authenticated destination. It presents a User Profile's connected Base Sepolia test wallet, address management affordances, available MockEUSD/test-token balance, connection state, and testnet safety wording. It never aggregates Contract Escrow Vault balances and has no wallet-wide transaction history.
- Existing authenticated application routes and workflows remain the highest integration seam. The route layer, authenticated loaders/workflows, and rendered client experience evolve together instead of introducing a parallel application stack.
- Legacy routes redirect only where a direct, safe Contract equivalent exists; otherwise they return the normal not-found behavior. No obsolete page remains reachable as a hidden product destination.
- The MilestonePay project is retained during delivery and may be deleted only after the product owner has reviewed the migration and explicitly authorizes removal.

## Testing Decisions

- Tests assert externally observable behavior: authenticated routes, responses, access boundaries, screen content, navigation destinations, and Contract actions. They do not assert internal helper structure or CSS implementation details.
- Route-level application tests verify that the signed-in shell exposes only Dashboard, Contracts, Wallet, and People as primary navigation; Profile Settings remains avatar-menu-only; and Notifications is absent from sidebar and bottom navigation.
- Authenticated workflow and Supabase/RLS tests verify that exactly the two User Profile Contract Parties can access a Contract and that no Workspace membership or proposal-access path grants access.
- Contract API behavior tests cover creation, invitation, draft editing, review, version acceptance, and authorization under the Profile-based Contract model.
- Rendered page tests cover Dashboard without Recent Activity, Contract list/detail terminology without Agreement or Proposal wording, responsive Contract records, and Wallet's separation of available personal balance from Contract Escrow Vault funds.
- Browser acceptance covers desktop and mobile navigation, the primary Dashboard and Contracts flows, Wallet loading/empty/connected states, and visible no-overflow behavior.
- Database migration and RLS regression tests prove existing Contract records are backfilled safely, legacy access paths no longer authorize a request, and a non-party cannot access a Contract.
- Existing server route tests and authenticated Supabase session/workflow tests provide the prior-art seams; production build, type checking, and the full test suite remain required regression checks.

## Out of Scope

- Copying MilestonePay Settings, payment/funding pages, global payment history, Recent Activity, or their unrelated product routes.
- Introducing team collaboration, Workspace membership, or multi-party Contracts.
- Combining personal wallet funds with Contract Escrow Vault balances or implementing wallet-wide transaction history.
- Changing the Contract's existing on-chain settlement rules, authority model, or wallet-signature acceptance semantics beyond replacing legacy ownership/access references.
- Deleting the MilestonePay source project before explicit owner approval after review.

## Further Notes

- The reference is a UX source, not a feature source: PactFlow keeps its own domain, authorization, and testnet safety boundaries.
- The project owner has explicitly requested that unused application files not remain after the migration. Legacy removal is therefore a release requirement, while the reference-project deletion remains owner-gated.
- The source decision map remains a historical planning artifact; this specification is the build-ready source for delivery tickets.
