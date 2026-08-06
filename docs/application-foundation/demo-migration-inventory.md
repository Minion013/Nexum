# Local-demo migration inventory

## Decision

The local rules-engine demo remains a labelled development fixture until a durable replacement exists. It is not data to migrate into production records: its identities, invitation IDs, evidence hashes, approvals, event history, and transaction-like outcomes are synthetic and process-local. Any new user-facing durable workflow must use the Workspace/Contract model rather than adding compatibility paths to the local role model.

## Inventory

| Area | Current source | Preserve | Replace or retire | Migration rule |
| --- | --- | --- | --- | --- |
| Authentication | `web/public/login.js`, `web/src/server.mjs` | Supabase magic-link session verification and Profile provisioning | Local `buyer`, `seller`, `resolver`, `guest`, and `invitee` choices; server-side `localSessions` | A signed-in Profile lands in its Workspaces. Onboarding guidance may be recorded but does not create an authority-bearing session. |
| Agreement access | `web/src/server.mjs` maps `participantUsers`, `invitations`, and `localAgreementId` | The negative-access test intent | One shared agreement and one-time in-memory invitation codes | Create Contracts, Contract Parties, Invitations, and Delegated Project Access through authenticated Supabase writes; run RLS integration proofs. |
| Drafting and versions | `web/src/agreement-engine.mjs`, `web/public/app.js` | Validation scenarios: conserving allocations, increasing deadlines, required evidence, immutable Version history | `replaceDraft` and browser-only draft state | Store the Service Engagement Template's typed sections as a private Draft/Version with a server/API seam that enforces authorised Contract Party access. |
| Acceptance | `AgreementEngine.approve` | The invariant that every party accepts one exact Version | Local-role approval records and simulated version hashes as proof | Create Version-specific Contract Acceptances. Later EIP-712 signatures may supplement them but cannot replace durable product records. |
| Authority and disputes | `AgreementEngine.resolve`, fixed `resolver` identity, `contracts/EscrowVault.sol` resolver field | Per-milestone freeze behaviour; case-only RLS model and registry records | Resolver profile/session and direct resolver selection | Parties select a registry Authority snapshot. Platform operations assigns Case Officers per dispute; a later vault adapter maps the authority decision without treating an officer as a contract party. |
| Evidence | Generated `local-evidence-*` hashes and browser action | Required-evidence and review-window behaviour | Any local hash as an audit record | Create private evidence references bound to Contract, Version/milestone, and (when relevant) Dispute Case; do not copy local hashes. |
| Payment/settlement | Local `fund`, `release`, `refund`, `resolve`; `MockEUSD.sol`, `EscrowVault.sol`, factory tests | Solidity compilation and public factory/vault scenario tests | Browser/server report as payment proof; local simulated eUSD events | Keep contracts as a foundation. Add Base Sepolia deployment, wallet transactions, chain reads, and reconciliation before any funding/settlement claim. |
| UI and runbook | `workspace.html`, `README.md` local-demo steps | Plain-language safety boundary and explanation of local-vs-chain status | Demo control panel as the primary application UI | Replace with Workspace, Contract list, builder, review/history, invitation, evidence, and case pages. Retain the local fixture only behind an explicit development label. |

## Supabase migration disposition

| Migration | Disposition for the durable path |
| --- | --- |
| `20260806133000_create_profiles.sql` | Retain. Profiles remain the durable authenticated-person record. |
| `20260806143000_add_profile_onboarding.sql` | Retain and reinterpret its UI: onboarding guidance replaces local role selection and grants no authority. |
| `20260806153000_ensure_profiles_for_verified_users.sql` | Retain. Verified-user provisioning remains the entry invariant. |
| `20260806170000_create_durable_access_graph.sql` | Retain and extend. Its Workspace, Contract Party, Version, Section, Invitation, acceptance, authority, and evidence tables are the base for the builder; add lifecycle-safe write procedures and typed-section validation. |
| `20260806173000_add_simulated_case_officer_provisioning.sql` | Retain as the MVP simulated-authority fixture; do not surface it as a resolver account. |
| `20260806174000_harden_durable_access_graph.sql` | Retain. Its ownership, delegation, invitation, and Version integrity rules remain required. |
| `20260806175000_bind_authority_and_evidence_access.sql` | Retain. Authority snapshots and evidence bindings must be used by the durable browser flow. |
| `20260806176000_enforce_case_officer_scope.sql` | Retain. The case-only visibility boundary remains unchanged. |
| `20260806177000_prevent_workspace_owner_reassignment.sql` | Retain. Personal Workspace ownership remains non-transferable. |

None of these migrations represents a migration of the local demo's in-memory records. The next migration set must add the typed builder and lifecycle write seam; it must not introduce compatibility tables for `localAgreementId`, local roles, or local invitation codes.

## Compatibility and cutover rules

1. No local-demo identifier becomes a primary key, party identity, wallet link, evidence record, acceptance, or payment record.
2. Existing local tests remain as simulator/contract-foundation tests and must be labelled accordingly; they do not prove durable browser workflows.
3. Every replacement must add the nearest relevant verification seam before the old UI path is removed: RLS integration tests for data access, browser test doubles for UI flows, and public testnet scenarios for payment authority.
4. Retire the fixed resolver UI at the same time as the Authority Registry and Case Officer case screens become the route for disputes. Do not retain both concepts in the user-facing product.
5. The local demo can be removed only after the judge runbook uses the durable path and a Base Sepolia deployment; before that it may remain as a non-authoritative developer fixture.

## Implementation sequence enabled by this inventory

1. Replace local role selection with Workspace-aware onboarding and navigation.
2. Build Contract creation, invitation acceptance, typed Draft/Version writes, and version history against the existing durable access schema.
3. Add evidence and case workflows, then Privy wallet capability and Version signatures.
4. Deploy and reconcile Base Sepolia vault activity; update the runbook only when the public testnet path is demonstrated.
