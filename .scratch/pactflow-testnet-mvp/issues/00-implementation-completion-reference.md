# 00 — Testnet MVP implementation-completion reference

**Purpose:** This is the authoritative completion baseline for every implementation ticket in this directory. It prevents the local rules-engine demo from being reported as a completed Base Sepolia MVP.

## What counts as complete

A checklist item is complete only when its stated acceptance criterion is demonstrated in the target architecture:

1. **Profiles, workspaces, and private coordination:** Supabase Auth is the system of record for permanent user identities and sessions. Every verified user is provisioned into a durable User Profile and initial personal Workspace; onboarding guidance is never an account type or authorization source. Supabase Postgres stores the workspace, membership, contact, project, contract-party, delegation, and invitation records needed for that model, and Row Level Security (RLS) enforces access with the authenticated user's `auth.uid()`.
2. **Wallets:** Privy is a linked, user-controlled wallet capability—not the PactFlow account system. A Privy embedded or external wallet is linked to the signed-in Supabase user through Privy's custom-JWT integration. PactFlow never receives a private key.
3. **Payment authority:** A Base Sepolia transaction and the deployed `EscrowVault` are the proof of funding or settlement. A local `AgreementEngine` transition, browser state, or server response cannot check a chain-authoritative item.
4. **Privacy and persistence:** Versioned Contract terms, invitations, acceptances, delegated project access, and private evidence references are persisted through the Supabase schema and tested under RLS. A Contract links independent personal or collaborative workspaces; one-to-one engagements must not require either party to join the other's workspace. In-memory maps and one shared local demo agreement do not meet this criterion.
5. **Verification:** The automated test cited by a ticket must run against the relevant seam: RLS/integration tests for off-chain access, wallet test doubles or test accounts for UI flows, and public factory/vault scenarios for payment rules. The judge runbook must execute against the configured Base Sepolia deployment.

## Current reference point — 6 August 2026

The repository has a verified **local simulation, contract-foundation, and linked Supabase access-foundation baseline**, not a completed testnet MVP:

- `npm.cmd --prefix web test` passes 28 tests: local rule scenarios, local API access checks, factory/vault-foundation scenarios, profile-onboarding API behaviour, authenticated workspace access, and the RLS-scoped durable Home API seam.
- `npm.cmd --prefix web run typecheck` and `npm.cmd --prefix web run contracts:check` pass.
- The linked Supabase project has applied migrations for Profile-triggered personal Workspaces, collaborative membership, contacts, projects, Contract Parties, delegations, invitations, versions/sections/acceptances, the Authority Registry, Case Officers, disputes, and private evidence references.
- The rollback-only `supabase/tests/durable-access-rls.sql` integration proof runs against that linked project. It verifies personal and collaborative workspace isolation, active-delegate access, authority/version/case binding, Case Officer case-only access, and contract/milestone-bound evidence. `supabase db lint --linked` also passes.
- `web/src/server.mjs` verifies Supabase access tokens, provisions and loads Profiles, and exposes an authenticated role-free Home built from RLS-visible Workspaces and Contracts. Its browser agreement sessions, invitations, participants, and agreement state remain process-local simulation data.
- No browser-backed durable contract write flow, invitation-acceptance workflow, chain reader/indexer, browser EIP-712 signature, or real wallet transaction flow has been verified yet. The Base Sepolia MockEUSD token and EscrowVaultFactory are deployed, but no Contract-specific Escrow Vault, buyer funding, or settlement transaction has been verified.

## Account-profile scope

The application-foundation decisions are tracked in the [PactFlow application foundation map](../../pactflow-application-foundation/map.md). It supersedes the old role-based local-session model for all new work:

- A user has one durable User Profile and can hold multiple personal or collaborative Workspaces.
- Creator, buyer, and resolver are onboarding guidance only. They do not create account types or grant authorization.
- A Contract Party is an individual profile or workspace; either party may initiate a private draft and a shared contract exists only through explicit invitation and version-specific acceptance.
- Contacts are reusable invitation targets and may be private to a user or shared by a collaborative workspace. They grant no access by themselves.
- Resolution Authorities are registry-managed organisations, not resolver profiles. Any Case Officer acts only through authority-scoped case access.
- The contract builder uses a single versioned model with typed sections rather than a demo-only payment-agreement form.

No implementation ticket may claim that this application foundation is complete until the map's decisions have been resolved and their durable schema, RLS policies, and integration tests exist.

## Re-reviewed ticket position

| Ticket | Target-architecture position | Current evidence / remaining gap |
| --- | --- | --- |
| 01 — Bootstrap the demo application safely | Partial — local evidence | Public entry, health check, smoke test, and safe failures exist; the target Supabase/Privy configuration boundary is not established. |
| 02 — Establish Supabase participant accounts and sessions | Partial — linked-project RLS evidence | The linked project now provisions durable Profiles and personal Workspaces, and the RLS integration proof passes. Browser setup is role-free and lands on a read-only durable Home with RLS-visible Workspaces and Contracts. Contract creation, invitations, acceptances, delegation, evidence, and Case Officer browser workflows remain incomplete. |
| 02a — Link user-owned wallets to Supabase accounts | Partial — local browser evidence | Privy custom-JWT authentication is configured against Supabase's asymmetric-JWT JWKS endpoint. The browser uses the signed-in Supabase session as Privy's identity to create or link a user-controlled EVM wallet, request a Base Sepolia typed-data check, and submit an explicit zero-value self-transaction. Live browser verification remains required. |
| 03 — Restrict agreement access to invited participants | Partial — durable browser and linked-project RLS evidence | The exact-email invitation has a signed-in durable browser/API path. The linked-project rollback proof verifies a different Profile cannot accept it or read the Contract, its versions, sections, evidence, or invitation, while the invited Profile becomes a Contract Party and can read them. Browser end-to-end verification remains open. |
| 04 — Create a validated custom payment-agreement draft | Partial — local evidence plus schema foundation | Typed Contract Version/Section persistence exists, but the local draft editor does not write participant-scoped durable drafts. |
| 05 — Review, version, and approve agreement terms | Partial — linked-project schema foundation | Immutable authority snapshots, version rows, and acceptance records are modelled with integrity constraints; durable review/acceptance UI and user-wallet EIP-712 approval are absent. |
| 06 — Offer co-pilot-assisted agreement drafting | Partial — durable browser/API evidence | An authenticated Contract Party can submit a plain-language brief from the durable Contract page and receive deterministic, editable scope, milestone, evidence, deadline, and review-window suggestions. Applying a suggestion does not persist or share it; the existing validated Version flow remains the only write/review boundary. No production-quality provider integration or live browser proof is claimed. |
| 07 — Deploy a non-administered vault foundation | Partial — deployed contract evidence | The Base Sepolia MockEUSD token and EscrowVaultFactory are deployed and public; no browser-created Contract-specific Vault or settlement implementation is complete. |
| 08 — Fund a vault through an explicit buyer action | Partial — contract-foundation evidence | An isolated Vault accepts its fixed buyer's exact eUSD allocation once before its funding and first-delivery deadlines; the token and Factory are deployed, but no Contract-specific Vault or browser funding transaction exists. |
| 09 — Show chain-authoritative agreement status | Partial — local evidence | The UI renders local state and transaction-like outcomes; it has no chain read, refresh reconciliation, or authoritative vault state. |
| 10 — Record final seller delivery evidence | Partial — linked-project schema foundation | Private evidence-reference records are RLS-protected and constrained to their Contract, dispute case, and milestone; the browser submission flow and on-chain anchor are absent. |
| 11 — Release an accepted milestone | Partial — local evidence | Local accepted-release accounting and fee behavior are tested; no contract settlement transaction is available. |
| 12 — Release after review-window expiry | Partial — local evidence | Local timeout eligibility and release are tested; public chain execution and event verification are absent. |
| 13 — Refund a missed-delivery milestone | Partial — local evidence | Local buyer-only missed-delivery refund behaviour is tested; no deployed-vault refund transaction is available. |
| 14 — Open and resolve a milestone dispute | Partial — linked-project RLS evidence | The platform-managed simulated Authority Registry, verified Case Officer affiliation, authority/version-bound case assignment, and case-only evidence access are persisted and RLS-tested. The browser still uses the fixed local resolver simulation; no on-chain dispute anchor or resolver transaction exists. |
| 15 — Amend future work with mutual approval | Partial — local evidence | Local amendment versioning and remaining-allocation conservation are tested; no signed or on-chain amendment path exists. |
| 16 — Present the append-only agreement history | Partial — local evidence plus schema foundation | Durable version, section, and acceptance records exist, but no durable history/event presentation has replaced the local engine view. |
| 17 — Index and reconcile chain activity | Ready | No event indexer or direct-chain reconciliation exists. |
| 18 — Produce the judge-ready demo and runbook | Partial — local evidence | A local runbook exists; the required Base Sepolia deployment, seeded testnet flows, and end-to-end testnet verification remain open. |

No implementation ticket is **Complete** against the target-architecture completion rule yet. The partial entries above retain local, contract-foundation, or linked-schema/RLS evidence without treating them as completed testnet work.

## Updated implementation order

1. Build authenticated durable Contract creation and private invitation acceptance from the role-free Home, with Contract Parties and Delegated Project Access enforced at the browser/API and RLS seams.
2. Implement the typed Contract builder, version review and acceptance, lifecycle transitions, and history pages on the durable schema; retire the fixed local resolver flow rather than preserving it as a product role.
3. Add the focused Contract-led page for parties, milestones, evidence, version history, and Authority state, then add evidence and Case Officer workflows.
4. Add the linked Privy/external-wallet capability and browser signatures only after those durable workflows are live.
5. Resume Base Sepolia deployment, settlement, and chain reconciliation once the application path can create accepted payment contracts.

## Status vocabulary

- **Complete:** all checklist boxes meet the target-architecture criteria above.
- **Partial — local evidence:** a local prototype or contract foundation demonstrates the behaviour, but one or more target-architecture criteria remain open.
- **Partial — linked-project RLS evidence:** migrations and a linked Supabase RLS/integration proof demonstrate the access/data seam, but the browser workflow and/or payment authority remains incomplete.
- **Ready:** no target-architecture implementation has been claimed yet.

Each ticket may retain partial evidence in its notes, but must not tick a testnet acceptance criterion solely because the local simulator behaves similarly.

## 7 August 2026 update — standalone local Contract pages

- `npm.cmd --prefix web test` now passes 29 tests, including canonical local Contract route coverage; `npm.cmd --prefix web run typecheck` also passes.
- The local simulation has independently addressable Contract overview, draft, milestone, activity, version, and invitation pages under `/contracts/local-demo-agreement`, plus the authenticated `/workspace` dashboard.
- The overview and milestone pages retain the existing simulated state-changing controls. The activity and version pages present local history, and invitations have their own local page.
- This is navigation and presentation evidence only. The pages continue to read and mutate the process-local simulation; they do not establish durable Contract-scoped browser workflows, wallet transactions, signatures, or chain-authoritative state.
- The next durable step remains replacing these local page data sources with Contract-scoped Supabase records and RLS-enforced workflows.

## 7 August 2026 update — durable Contract creation foundation

- [x] An authenticated participant can create a private Contract through the durable Supabase schema from Home. The initial version contains immutable authority, scope, party, and change-control sections; it has no payment authority.
- [x] The authenticated server API supports a durable, 14-day counterparty invitation and exact-email acceptance through `create_contract_invitation` and `accept_contract_invitation`. The functions run under the caller's Supabase identity and grant no general route- or identifier-based access.
- [x] The linked Supabase project has applied migrations `20260807100000` and `20260807101000`; `supabase db lint --linked` reports no schema errors. The API seam is covered by the 31-test local suite.
- [x] A Contract-specific browser detail page now reads and saves a durable typed Contract draft. It supports scope, a 2–3 milestone schedule, exact allocations, private evidence requirements, local-time deadline entry with canonical UTC storage, review windows, a published Resolution Authority, and a disclosed success fee. Drafts explicitly have no payment authority.
- [x] Browser invitation acceptance now completes Ticket 03's participant workflow. Version review and acceptance still need to complete Ticket 05; those separate gaps keep the broader Contract path **Partial**, not a completed testnet workflow.
- [ ] Privy custom-JWT wallet linking, EIP-712 signatures, Base Sepolia deployment/transactions, chain reconciliation, evidence/dispute workflows, and judge-ready testnet verification remain open. Tickets 02a and 05–18 remain **Ready** or **Partial** as recorded above.

## 7 August 2026 update — local simulator removal

- The process-local `AgreementEngine`, role sessions, in-memory invitations, local Contract routes, state-changing agreement APIs, and their browser bundles/tests have been removed.
- The application now exposes only the durable Supabase-backed Profile, Workspace, Home, private Contract creation, and exact-email invitation-acceptance workflows.
- `npm.cmd --prefix web test` now passes 20 tests. The isolated Solidity foundation scenarios remain, but do not establish browser payment authority.
- This retirement does not complete future work: version review, wallet linking, Base Sepolia deployment, evidence/dispute workflows, and reconciliation remain outstanding.

## 7 August 2026 update — durable Contract draft builder

- [x] A verified Contract Party can open `/contracts/:id` and edit its durable private Contract draft through the authenticated API. The page supports 2–3 milestones, including returning from three to two, with complete allocation, evidence, deadline, review-window, Resolution Authority, and success-fee validation.
- [x] Each save creates a new immutable Contract Version rather than overwriting shared terms. A selected published Resolution Authority is snapshot-bound to that new Version; pending invitations are revoked and reissued against the replacement Version.
- [x] The linked Supabase project has applied migrations `20260807110000` and `20260807112000`. `supabase db lint --linked` reports no schema errors, and the rollback-only durable-access RLS proof verifies both a permitted Party update and denial of an unrelated Profile update. The write boundary also recognises active Delegated Project Access for a Workspace Contract Party.
- [x] `npm.cmd --prefix web test` passes 22 tests; `npm.cmd --prefix web run typecheck` and the client build pass.
- [ ] Ticket 04 retains durable builder evidence. Ticket 05's review and version-specific acceptance, wallet signatures, payment authority, and all later settlement work remain open.

## 7 August 2026 update — durable invitation acceptance browser path

- [x] A Contract proposer receives an exact acceptance link after creating the durable invitation. The link serves a signed-in browser page at `/invitations/:id`; it submits only to the existing authenticated `accept_contract_invitation` API boundary.
- [x] The acceptance page explains that only the invited Profile's exact email can join. The database function, executing under that Profile's Supabase identity, remains the authorization authority; the route and invitation ID confer no access by themselves.
- [x] `npm.cmd --prefix web test` passes 24 tests, including focused route and authenticated API coverage; typecheck, the client build, the Solidity check, and the linked Supabase rollback proof also pass.
- [x] The linked-project rollback proof now exercises an invitation identifier returned by the same durable RPC: an unrelated Profile cannot accept it or read the private Contract, versions, sections, evidence, or invitation, while the exact-email invitee becomes a Contract Party and can read them.
- [ ] Ticket 03 remains **Partial** until the signed-in browser path is verified end to end against the linked project. Storage-object denial is out of scope until private object storage is introduced.
- [ ] No wallet, payment, evidence, dispute, or Contract-version acceptance capability is implied by this UI. Those remain separate ticket scopes.

## 7 August 2026 update — durable Contract Version review and acceptance

- [x] An authenticated Contract Party can open the Contract-specific read-only review surface and see the latest immutable Version number, canonical terms hash, typed terms, Resolution Authority snapshot, testnet allocation/fee summary, each Party's Acceptance state, and missing template sections.
- [x] The authenticated API and linked `accept_contract_version` boundary permit Contract Acceptance only for a latest, template-complete Version that a future share validator has explicitly marked ready and that has exactly two Parties. It will retain the canonical terms hash alongside each Party's Acceptance and does not grant access from a route or Version identifier.
- [x] Migrations `20260807130000` through `20260807135000` are applied to the linked project. The rollback-only RLS proof verifies denial for an unrelated Profile and denial of an unvalidated Version, while a later draft revision still creates a new Version with no carried-forward Acceptances. `supabase db lint --linked` reports no schema errors.
- [x] `npm.cmd --prefix web test` passes 26 tests; typecheck and the client build pass.
- [x] The Service Engagement builder now captures all nine typed sections and validates the complete template before its protected write. A successful write stores the immutable Authority snapshot, refreshes the canonical terms hash, and marks the exact Version ready for Contract Acceptance; an incomplete or non-conserving template never reaches Supabase.
- [x] Migrations `20260807220000` and `20260807221000` are applied to the linked project. The rollback-only RLS proof now demonstrates acceptance of a share-validated Version, while its successor Version has no carried-forward Acceptances; `supabase db lint --linked` reports no schema errors.
- [ ] Privy custom-JWT wallet linking, an EIP-712 signature over the exact Version hash, Base Sepolia funding/settlement, and chain reconciliation remain unimplemented. Ticket 05 therefore remains **Partial**.

## 7 August 2026 update — completed Ticket 04 builder and share validator

- [x] The authenticated Contract page now collects the complete nine-section Service Engagement template: named Contract Party responsibilities, scope outcome and deliverable boundaries, 2–3 measurable milestones, Base Sepolia funding terms, evidence/review rules, intellectual-property/confidentiality choices, change control, Authority selection, and notices.
- [x] Sharing validates the complete template before durable persistence. The protected Supabase write checks allocation conservation, ordered canonical UTC deadlines, permitted review windows, disclosed fee bounds, Authority publication, private-safe evidence requirements, and required acknowledgements. A successful share creates a new immutable Version, snapshots its Resolution Authority, recomputes the canonical terms hash, and marks it ready for Contract Acceptance.
- [x] Migrations `20260807220000`, `20260807221000`, and `20260807222000` are applied to the linked project. The RLS rollback proof passes, including acceptance of a share-validated Version and replacement without carried-forward Acceptances; linked schema lint reports no errors.
- [x] `npm.cmd --prefix web test` passes 28 tests; typecheck, client build, and Solidity compilation pass.
- [ ] This completes Ticket 04's durable builder/share-validator evidence, but not the testnet-MVP completion rule: browser end-to-end verification, Privy-linked wallet signatures, Base Sepolia funding, settlement, and reconciliation remain separate work. Ticket 05 remains **Partial** because its current acceptance record is not an EIP-712 wallet approval.

## 7 August 2026 update — Supabase-linked wallet capability

- [x] Home now exposes an opt-in, lazy-loaded Privy wallet capability only when `PRIVY_APP_ID` is configured. It uses the current signed-in Supabase access token for Privy's JWT-based authentication; Supabase remains the system of record for the PactFlow Profile and RLS access.
- [x] Privy custom-JWT authentication is configured to validate Supabase's asymmetric-JWT JWKS endpoint.
- [x] A participant can create a recovery-protected embedded EVM wallet or link an external EVM wallet. A refreshed Supabase access token remounts the Privy JWT synchronizer, preventing a second PactFlow participant identity from being created by session renewal.
- [x] The wallet panel can request a Base Sepolia EIP-712 typed-data check and an explicit zero-value self-transaction. It clearly labels the flow as valueless testnet activity, warns about test ETH gas, and does not receive or store a private key.
- [x] `npm.cmd --prefix web test` passes 30 tests; typecheck, client build, and Solidity compilation pass. Configuration and route seams are automated; there is not yet a browser wallet test double or live Privy/Base Sepolia end-to-end proof.
- [ ] This is **Partial — local browser evidence** for Ticket 02a, not target-architecture completion. A live signed-in browser must still verify creation/linking, reconnection after refresh, a signature, and a Base Sepolia transaction.
- [ ] No wallet check or zero-value test transaction is a Contract Acceptance, funding action, payment authority, deployment, or settlement. Ticket 05 still requires a durable EIP-712 signature over the exact Version hash; Tickets 07–18 retain their stated gaps.

## 7 August 2026 update - wallet-backed Contract Acceptance

- [x] A ready Version can request a Base Sepolia EIP-712 signature from the authenticated participant's Privy wallet. The signed payload binds the Contract ID, Version ID, canonical Version hash, and a no-funds-moved statement.
- [x] The application server recovers and verifies the signer before using a service-role-only Supabase write boundary. Browser-authenticated clients cannot invoke that RPC directly, and the service key is not returned to the browser.
- [x] Migrations `20260807223000` through `20260807225000` are applied to the linked project. Schema lint and the rollback-only RLS proof pass; the proof includes denial of a browser-side bypass attempt. Commit `720f93b` records this work.
- [x] `npm.cmd --prefix web test` passes 30 tests; typecheck, client build, and Solidity compilation pass.
- [ ] Ticket 05 remains **Partial**. The server does not yet independently prove that the recovered signing address is linked to the authenticated Privy identity, and live two-party Privy acceptance plus revision-invalidation browser verification remain open. This records off-chain Version consent only; it does not deploy, fund, or settle an Escrow Vault.

## 7 August 2026 update — durable Contract drafting co-pilot

- [x] An authenticated Contract Party can submit a plain-language commercial brief from its private Contract page and receive deterministic, editable suggestions for scope, two milestones, private evidence requirements, canonical UTC deadlines, and 72-hour review windows.
- [x] Applying a suggestion only populates the existing editable draft form. It does not persist or share a Contract Version; the same protected validation, immutable Version creation, and read-only review flow used by manual drafts remain the only write path.
- [x] The UI and returned notice explicitly state that the co-pilot cannot approve terms, move or release funds, judge quality, or resolve disputes. The implementation is deterministic and makes no claim of a production AI-provider integration.
- [x] `npm.cmd --prefix web test` passes 32 tests; typecheck, Solidity compilation, and the client build pass. Commit `a0937fe` records this work.
- [ ] Ticket 06 remains **Partial**: live signed-in browser verification and any production-quality provider integration remain open. It does not confer Contract Acceptance, payment, funding, settlement, evidence, or dispute authority.

## 7 August 2026 update — buyer-only vault funding foundation

- [x] `EscrowVault` now permits only its immutable buyer to fund the exact milestone allocation once. It records the public funded state and funded amount, then still exposes no owner, pause, rescue, upgrade, platform-withdrawal, or settlement operation.
- [x] Funding requires a successful exact ERC-20 transfer and rejects a non-buyer, insufficient balance or allowance, duplicate funding, an expired funding window, and an agreement whose first delivery deadline has elapsed. The Factory also rejects a pair of signed Contract Acceptances after its fixed acceptance deadline.
- [x] `MockEUSD` is an explicitly valueless, six-decimal test token with a capped public faucet. Contract scenarios cover the factory approvals, non-administered Vault configuration, buyer-only funding, exact custody, and deadline rejections. `npm.cmd --prefix web test` passes 35 tests; typecheck, Solidity compilation, and the client build pass.

## 7 August 2026 update - Base Sepolia deployment readiness

- [x] `npm.cmd --prefix web run deploy:base-sepolia` loads the existing local environment, then compiles and deploys the explicitly valueless `MockEUSD` token and non-administered `EscrowVaultFactory` through the configured `BASE_SEPOLIA_RPC_URL`, but only when a local `BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY` is supplied at execution. The key is validated locally, never written to the deployment manifest, and never printed.
- [x] The command refuses an RPC endpoint that does not report Base Sepolia chain ID `84532`, waits for both deployment confirmations, and writes only public chain ID, addresses, and deployment transaction hashes to `contracts/deployments/base-sepolia.json`.
- [x] Deployment configuration, wrong-network refusal, and public-manifest behaviour are covered by focused tests. `npm.cmd --prefix web test` passes 39 tests; typecheck, Solidity compilation, and the client build pass.
- [ ] No Base Sepolia transaction was sent in this workspace, so no deployment addresses or target-architecture payment authority are claimed. Ticket 07 remains **Partial - contract-foundation evidence**; Ticket 08 still needs the browser funding confirmation/transaction; Ticket 09 remains blocked on an actual deployed vault and that browser funding seam.
- [ ] This is **Partial — contract-foundation evidence** for Ticket 08. There is no browser funding confirmation, wallet transaction, Base Sepolia deployment, chain reader, refresh reconciliation, or settlement flow. The next nominal ticket is 09, but its chain-authoritative status work remains blocked until those deployment and browser funding seams exist.

## 8 August 2026 update - Base Sepolia contracts deployed

- [x] The Base Sepolia deployment command completed against chain ID `84532`. It deployed the explicitly valueless `MockEUSD` token at `0xEcF583DcC9CA0c6E59b14df86412E4C0ED96FF3c` (`0xfb509385c572a2b92a9b207f701eebce3bd0f2a9a712ec9e0716ff02082362af`) and the non-administered `EscrowVaultFactory` at `0xafe47537eA51eF0D32D89369ecBB5FfE364fF39b` (`0x4333b04665fb0245f146b0b750aa00dacb208c4b18b6a6bdf9a1e2f301696e53`).
- [x] The public deployment manifest is recorded at `contracts/deployments/base-sepolia.json`; it contains the chain ID, public deployer address, public contract addresses, and transaction hashes only. The deployer private key is neither persisted nor printed.
- [x] Deployment configuration now accepts a valid 32-byte EVM private key with or without a `0x` prefix, normalizing it only in process. The focused deployment tests, full 39-test suite, typecheck, client build, and Solidity compilation pass.
- [ ] Ticket 07 is **Partial - deployed contract evidence**. The application cannot yet create a Contract-specific Vault from its two durable, wallet-signed Contract Acceptances. Ticket 08 remains **Partial** because a buyer cannot inspect and submit a browser funding transaction, and Ticket 09 remains blocked on that Contract-specific Vault/funding chain-read seam. No settlement, chain reconciliation, or judge-ready end-to-end flow is claimed.
