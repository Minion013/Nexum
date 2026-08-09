# PactFlow application foundation

## Destination

Define the product, access, contract, authority, and interface decisions required to replace PactFlow's role-based local demo flow with a durable multi-workspace application where user profiles, contacts, projects, and versioned contracts have explicit ownership and lifecycle rules.

## Notes

- Use `/domain-modeling` for each resolved domain term; the current vocabulary is in [`CONTEXT.md`](../../CONTEXT.md).
- An authenticated person receives a User Profile and initial personal Workspace. The creator/buyer/resolver prompt is Onboarding Guidance, never an account type or authorization source.
- A Workspace may remain personal for one-to-one projects or opt into Collaboration for shared membership. A Contract links independent workspaces; a Contract Party can be an individual profile or a workspace.
- Contracts use a single, versioned model assembled from typed Contract Sections. Either side can initiate a private draft; Contract Acceptance is recorded for one exact version.
- Disputes name a Resolution Authority from a platform-managed Authority Registry. Case Officers act only through restricted authority case access; there are no resolver-profile accounts.

## Decisions so far

- [Application integration scope boundary](tickets/033-application-integration-scope-boundary.md) - Exact-version EIP-712 acceptance and Base Sepolia Vault settlement are durable MVP capabilities; external Authority systems, credentials, webhooks, filings, and sync remain deferred.

- [Contract assurance and scope](DECISIONS.md#contract-assurance-and-scope-boundary) — PactFlow's first release is a fully functional Base Sepolia testnet prototype. Its version-specific acceptances are explicit product records, not a claim of legal enforceability in any jurisdiction. Testnet payment settlement remains in scope; external authority case-system integration is deferred.
- [Durable access graph](DECISIONS.md#durable-access-graph) — A Contract grants access only to its Contract Parties and their explicit, per-contract Delegated Project Access records. Parties never gain workspace membership through a contract. Contacts and invitations grant no access until the authenticated recipient accepts the specific invitation. Workspace owners and administrators manage memberships and delegations; ordinary members have no contract authority by default. Each verified user receives one sole-owner personal Workspace; collaboration is opt-in. Workspace acceptances retain the delegated Profile who acted for the Workspace. Case Officers see only directly assigned authority cases and are never Contract Parties.
- [Contract lifecycle](DECISIONS.md#contract-lifecycle) — An authorised party can create a private, editable Contract Draft; it becomes visible to a counterparty only through an explicit invitation. During negotiation either party may propose a new immutable Version, which invalidates earlier acceptances. The Contract activates only after every required party accepts one exact Version; buyer funding follows in a separate window. Bilateral amendments cover future, uncompleted work only; prior outcomes are immutable. A dispute freezes only its affected milestone, and the Contract completes when every milestone reaches a final outcome.
- [Authority Registry operating model](tickets/032-authority-registry-operating-model.md) - Platform operations controls one clearly labelled simulated Authority, append-only registry audit, immutable Contract snapshots, and single-officer, audited case assignment.

- [Initial Service Engagement Template](DECISIONS.md#initial-service-engagement-template) — The first builder uses one typed, versioned service-engagement template. It validates Parties, Scope, a 2–3 Milestone Schedule, Payment and Funding, Evidence and Review, Intellectual Property and Confidentiality, Change Control, Dispute Resolution, and Notices before a Version can be shared. The same Version-specific sections drive review and acceptance.
- [Demo migration inventory](DECISIONS.md#demo-migration-inventory) — The process-local demo agreement, global local roles, invitations, simulated evidence, approvals, and payment outcomes are non-migratable fixtures. New product workflows must use the durable Workspace and Contract model; the fixed resolver UI is retired with Authority/Case Officer workflows.

## Not yet specified



## Out of scope

- Claims of legal enforceability, regulated escrow, custody, fiat conversion, cash-out, or production dispute-resolution operations.
- External Resolution Authority case-system integrations.
