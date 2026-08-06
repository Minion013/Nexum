# 00 — Testnet MVP implementation-completion reference

**Purpose:** This is the authoritative completion baseline for every implementation ticket in this directory. It prevents the local rules-engine demo from being reported as a completed Base Sepolia MVP.

## What counts as complete

A checklist item is complete only when its stated acceptance criterion is demonstrated in the target architecture:

1. **Accounts and private coordination:** Supabase Auth is the system of record for permanent participant accounts and sessions. Supabase Postgres stores participant, profile, connection, and invitation data; Row Level Security (RLS) enforces access with the authenticated user's `auth.uid()`. A verified user missing a profile must be provisioned into incomplete setup rather than blocked from sign-in.
2. **Wallets:** Privy is a linked, user-controlled wallet capability—not the PactFlow account system. A Privy embedded or external wallet is linked to the signed-in Supabase user through Privy's custom-JWT integration. PactFlow never receives a private key.
3. **Payment authority:** A Base Sepolia transaction and the deployed `EscrowVault` are the proof of funding or settlement. A local `AgreementEngine` transition, browser state, or server response cannot check a chain-authoritative item.
4. **Privacy and persistence:** Agreement terms, invitations, approvals, and private evidence references are persisted through the Supabase schema and tested under RLS. In-memory maps and one shared local demo agreement do not meet this criterion.
5. **Verification:** The automated test cited by a ticket must run against the relevant seam: RLS/integration tests for off-chain access, wallet test doubles or test accounts for UI flows, and public factory/vault scenarios for payment rules. The judge runbook must execute against the configured Base Sepolia deployment.

## Current reference point — 6 August 2026

The repository has a verified **local simulation and contract-foundation baseline**, not a completed testnet MVP:

- `npm.cmd --prefix web test` passes 23 tests: local rule scenarios, local API access checks, factory/vault-foundation scenarios, and profile-onboarding API behaviour.
- `npm.cmd --prefix web run typecheck` and `npm.cmd --prefix web run contracts:check` pass.
- `web/src/server.mjs` verifies Supabase access tokens and loads a Supabase profile, but it still holds local demo sessions, invitations, participants, and agreement state in process memory.
- Local profile migrations and tests exist, but the linked Supabase project has not been verified with those migrations or its profile-provisioning trigger. The observed `Your PactFlow profile is unavailable.` failure is therefore not target-architecture evidence.
- No durable participant/invitation/agreement schema and RLS proof, Base Sepolia deployment, chain reader/indexer, browser EIP-712 signature, or real wallet transaction flow has been verified yet.

## Account-profile scope

The user-profile and professional-connections decisions are tracked in the [PactFlow account profile and connections map](../../../docs/wayfinder/account-profile-and-connections-map.md). Its immediate prerequisite is reliable verified-user profile provisioning. Profile photos, the People directory, connections, and inbox behaviour must not be reported as implemented until their Supabase schema, storage policies, RLS, and integration tests exist.

## Re-reviewed ticket position

| Ticket | Target-architecture position | Current evidence / remaining gap |
| --- | --- | --- |
| 01 — Bootstrap the demo application safely | Partial — local evidence | Public entry, health check, smoke test, and safe failures exist; the target Supabase/Privy configuration boundary is not established. |
| 02 — Establish Supabase participant accounts and sessions | Partial — app-level evidence | Supabase token verification, profile loading, local migrations, and tests exist; apply and verify the schema in the linked project, recover missing profiles into setup, and prove durable sessions under RLS. |
| 02a — Link user-owned wallets to Supabase accounts | Ready — after 02 | Privy currently authenticates the local app; it must be changed to a wallet capability linked to a Supabase identity. |
| 03 — Restrict agreement access to invited participants | Partial — local evidence | In-memory invitation and participant checks are tested; persistent records and RLS policies are absent. |
| 04 — Create a validated custom payment-agreement draft | Partial — local evidence | The local draft editor and rule validation exist; participant-scoped persistence is absent. |
| 05 — Review, version, and approve agreement terms | Partial — local evidence | Local immutable versions and approvals exist; user-wallet EIP-712 approval is absent. |
| 06 — Offer co-pilot-assisted agreement drafting | Partial — local evidence | Deterministic editable suggestions and authority notice exist; no production-quality provider integration is claimed. |
| 07 — Deploy a non-administered vault foundation | Partial — contract foundation | Factory/vault scenario tests pass; no Base Sepolia deployment or full settlement implementation is complete. |
| 08 — Fund a vault through an explicit buyer action | Partial — local evidence | The local engine enforces buyer-only simulated funding after approval; no wallet transaction or deployed vault funding exists. |
| 09 — Show chain-authoritative agreement status | Partial — local evidence | The UI renders local state and transaction-like outcomes; it has no chain read, refresh reconciliation, or authoritative vault state. |
| 10 — Record final seller delivery evidence | Partial — local evidence | The local engine records a generated evidence hash and review window; no on-chain anchor or private Supabase evidence record exists. |
| 11 — Release an accepted milestone | Partial — local evidence | Local accepted-release accounting and fee behavior are tested; no contract settlement transaction is available. |
| 12 — Release after review-window expiry | Partial — local evidence | Local timeout eligibility and release are tested; public chain execution and event verification are absent. |
| 13 — Refund a missed-delivery milestone | Partial — local evidence | Local buyer-only missed-delivery refund behavior is tested; no deployed-vault refund transaction is available. |
| 14 — Open and resolve a milestone dispute | Partial — local evidence | Local dispute freezing and resolver split behavior are tested; no on-chain dispute anchor or resolver transaction exists. |
| 15 — Amend future work with mutual approval | Partial — local evidence | Local amendment versioning and remaining-allocation conservation are tested; no signed or on-chain amendment path exists. |
| 16 — Present the append-only agreement history | Partial — local evidence | The local engine retains version approvals and field changes; no durable private history or version-event link exists. |
| 17 — Index and reconcile chain activity | Ready | No event indexer or direct-chain reconciliation exists. |
| 18 — Produce the judge-ready demo and runbook | Partial — local evidence | A local runbook exists; the required Base Sepolia deployment, seeded testnet flows, and end-to-end testnet verification remain open. |

No implementation ticket is **Complete** against the target-architecture completion rule yet. The partial entries above are intentionally retained as completed local or contract-foundation evidence, without treating them as completed testnet work.

## Updated implementation order

1. Close the remaining configuration boundary in ticket 01.
2. Complete ticket 02: apply the Supabase migrations, prove verified-user profile provisioning and RLS against the linked project, and eliminate profile-absence login failures.
3. Implement ticket 03: participant, invitation, agreement, and private-evidence schema with RLS tests.
4. Implement tickets 04 and 02a in parallel only after ticket 02: durable drafts on one path, linked Privy/external wallets on the other.
5. Resume wallet signatures and vault work at ticket 05, then follow the existing payment-flow dependencies.

## Status vocabulary

- **Complete:** all checklist boxes meet the target-architecture criteria above.
- **Partial — local evidence:** a local prototype or contract foundation demonstrates the behavior, but one or more target-architecture criteria remain open.
- **Ready:** no target-architecture implementation has been claimed yet.

Each ticket may retain local evidence in its notes, but must not tick a testnet acceptance criterion solely because the local simulator behaves similarly.
