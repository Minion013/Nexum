---
status: open
type: spec
labels:
  - ready-for-agent
---

# PactFlow testnet MVP specification

## Problem Statement

Singapore-based clients hiring freelancers and digital creators across Southeast Asia need a way to turn a custom service agreement into a shared, trustworthy payment process. Today, scope, evidence, deadlines, approvals, and payment decisions are fragmented across messages, invoices, cloud storage, and payment applications. A seller may begin work without confidence that funds exist, while a buyer may pay without a clear, objective delivery and review process.

Existing marketplaces protect engagements conducted inside their platforms, and cross-border payment services move money or administer contractors. Neither is the primary product boundary for PactFlow: two parties who already found each other need a portable, custom payment agreement with visible rules and a pre-funded payment process.

The hackathon MVP must demonstrate that a mutually approved digital-service payment agreement can govern mock-token release, buyer-controlled missed-delivery refund, and a bound-resolver dispute outcome without giving the platform discretion to move escrowed funds. It must do so without implying real custody, real-money transfer, fiat conversion, cash-out, legal compliance, or production dispute operations.

## Solution

PactFlow is a rules-first, Base Sepolia testnet prototype for custom digital-service escrow. A buyer or seller proposes a payment agreement containing 2-3 milestones, delivery evidence requirements, UTC deadlines, review windows, a resolver, and an optional transparent success fee. Both parties approve the same immutable agreement version. Either can create its dedicated unfunded Escrow Vault, and the buyer explicitly funds it with valueless eUSD in a separate wallet-confirmed action.

For each sequential milestone, the seller makes one final evidence submission. The buyer may accept it, dispute it in the review window, or take no action. The vault then applies only the published objective rules: an eligible release can be called by either participant or a relayer; a missed delivery makes the milestone buyer-cancellable; and a dispute freezes only that milestone for the resolver's pre-authorized outcome. Future, unstarted work can change only through a mutually signed amendment with an auditable version history.

The application presents the workflow in familiar, Web2-style language, creates or connects a user-owned test wallet, stores private agreement and evidence details off-chain, and renders chain-authoritative payment state. It does not custody keys or determine payment outcomes.

## User Stories

1. As a buyer, I want to create a custom payment agreement for digital-service work, so that my seller and I start with one shared payment process.
2. As a seller, I want to propose a payment agreement, so that I can turn my quote into a reviewable agreement without waiting for the buyer to draft it.
3. As either participant, I want to invite the other participant to my draft, so that we can negotiate the same agreement.
4. As a participant new to Web3, I want email or social sign-in to create a user-owned embedded test wallet, so that I can use the demo without prior wallet setup.
5. As a participant with an existing wallet, I want to connect it instead, so that I retain my preferred wallet workflow.
6. As a proposer, I want an agreement co-pilot to turn plain-language terms into an editable draft, so that I can structure milestones and rules faster.
7. As either participant, I want to edit the scope, milestones, evidence requirements, deadlines, and review windows before approval, so that the payment agreement reflects our actual work.
8. As a participant, I want each milestone to show its amount, delivery deadline, review window, and acceptance criteria, so that no release rule is hidden.
9. As a participant in a cross-border agreement, I want deadlines displayed in my local time while enforced as UTC, so that the agreement has one unambiguous canonical time.
10. As a participant, I want to select a resolver before funding, so that any disputed milestone has a known and bounded decision-maker.
11. As a participant, I want to review a plain-language summary of the exact agreement version, so that I understand what I am approving.
12. As a buyer or seller, I want my approval to apply only to one immutable agreement version, so that a later edit cannot silently reuse my consent.
13. As either participant, I want any edit after approval to create a new version and clear prior approvals, so that both parties always consent to the same terms.
14. As either signed participant, I want to create the agreed vault without funding it, so that the buyer's transfer remains a distinct and visible action.
15. As a buyer, I want a clear “Fund Escrow Vault” action and wallet confirmation, so that I knowingly transfer the exact mock-eUSD allocation into escrow.
16. As a seller, I want to see that an agreement is funded before beginning work, so that I know the agreed allocation is actually locked.
17. As either participant, I want an unfunded agreement to expire after 48 hours, so that stale approvals cannot be funded indefinitely.
18. As a seller, I want only the current milestone to become active, so that the delivery sequence and locked future allocations are clear.
19. As a seller, I want to prepare evidence privately and submit one final evidence record before the delivery deadline, so that the review clock begins from a definite submission.
20. As a buyer, I want to see the evidence reference, submission time, and review-window end, so that I can assess the milestone with the agreed information.
21. As a buyer, I want to accept a delivered milestone during its review window, so that its payment becomes eligible immediately.
22. As a seller, I want an eligible milestone to be released even if the buyer is silent after the review window, so that objective rules protect completed work.
23. As either participant, I want a release action to work through the vault's rules rather than platform approval, so that the platform cannot gate a valid payment.
24. As a buyer, I want a missed-delivery state when the seller does not submit evidence by the deadline, so that I can see the objective basis for cancelling that allocation.
25. As a buyer, I want to explicitly cancel and refund a missed-delivery milestone, so that I remain in control of that remedy rather than receiving an unexpected automatic refund.
26. As a buyer, I want to open a dispute only during the review window with a structured private record, so that a delivery challenge freezes the appropriate milestone promptly.
27. As a seller, I want a dispute to freeze only the affected milestone, so that a disagreement does not retroactively disturb released work or unrelated allocations.
28. As a resolver, I want to be able to release, refund, or split only the disputed milestone, so that my authority is limited to the outcome the parties pre-authorized.
29. As a buyer, I want a split outcome to return my portion without a platform fee, so that fees apply only to the seller's released portion.
30. As either participant, I want to suggest a deadline extension for an unstarted milestone, so that we can adapt future work without silently rewriting an active rule.
31. As either participant, I want an amendment to take effect only after both parties approve its exact new version, so that no one can unilaterally change future work, allocation, or resolver details.
32. As a participant, I want an append-only change history with versions, approvals, timestamps, and a readable diff, so that I can understand how the agreement evolved.
33. As a participant, I want the application to show pending, confirmed, failed, and rejected wallet-transaction states, so that I know whether an agreement action actually reached the chain.
34. As a participant, I want agreement and milestone status to remain understandable after refresh or on another device, so that I can rely on the payment process rather than a transient screen.
35. As a hackathon judge, I want to follow a concise trust flow and inspect a rules workspace, so that I can see how normal release, missed delivery, and dispute outcomes arise from the same custom-agreement engine.
36. As a platform operator, I want no ability to withdraw, pause, upgrade, rescue, or select the outcome of a vault, so that the demo proves the intended non-custodial boundary.

## Implementation Decisions

- The MVP is limited to custom digital-service payment agreements in the Singapore-to-Southeast-Asia launch corridor. Physical-goods rules are not reused for this prototype.
- Settlement occurs only on Base Sepolia with a clearly valueless, 6-decimal eUSD ERC-20. The product must not call this token USDT, imply Tether affiliation, or make a real-money claim.
- A payment agreement is represented by one isolated, minimal-clone Escrow Vault. Vaults do not pool balances and must not be administered by the application, factory, or platform operator.
- Agreement finalization uses EIP-712 signatures from buyer and seller over the exact agreement-version hash. The factory verifies both signatures and permits only those signed parties to create the unfunded vault.
- Vault creation and funding are separate actions. Only the buyer can fund, funding transfers the exact aggregate milestone allocation, and an unfunded vault cannot receive evidence or settle a milestone. Funding becomes impossible when its 48-hour window expires or the first unresolved delivery deadline has passed.
- The agreement state is limited to Unfunded, Funded, and Expired. Milestones are Pending, Active, InReview, Disputed, Released, Refunded, or Split. Release eligibility is computed from the recorded state and timestamps, rather than persisted as a separately mutable status.
- Milestones are sequential. The next unresolved milestone alone is active; later milestone allocations remain locked until the current one reaches a terminal outcome.
- The seller's final evidence submission stores only a hash and timestamp on-chain. Private evidence links, work materials, and human-readable evidence metadata remain off-chain. The first on-chain evidence submission begins an immutable review window.
- Buyer acceptance and review-window expiry make a milestone eligible for the same permissionless release operation. The vault, not a server or relayer, validates all eligibility conditions.
- A deadline that passes without final evidence creates a missed-delivery condition. Only the buyer may invoke the explicit refund for that milestone; the system must not automatically transfer the refund.
- A buyer may open a dispute only while the milestone is in review. The vault anchors the private structured dispute record with a hash and timestamp, freezes that milestone, and allows the bound resolver only to release, refund, or split its allocation.
- The agreement can configure an immutable success-fee basis-points value and fee recipient, with zero valid for demos. Fees are deducted only from the seller's released amount, including the seller's share of a split; refunds are fee-free.
- A mutual amendment affects only unstarted milestones and preserves the settlement token, total escrowed amount, and total remaining allocation. It may change future deadlines, future evidence requirements, and future allocations. It may change the resolver only for unstarted and undisputed milestones.
- Every accepted amendment emits a version event that connects the prior and new agreement hashes. The off-chain system retains the append-only full agreement versions, signatures, timestamps, and human-readable field changes.
- Time-based rules are evaluated by public vault calls rather than scheduled chain automation. Any caller may record funding expiry or execute a valid release, but only the designated party may perform a buyer-only, seller-only, or resolver-only action.
- Vault implementation must use safe ERC-20 transfer handling, reentrancy protection, exact allocation accounting, and lifecycle events. It must have no owner, upgrade, pause, rescue, or administrative withdrawal capability after initialization.
- The application owns coordination, authentication, private data, invitations, version display, transaction presentation, and read-model rendering. The chain is authoritative for funding and payment state; application services must never hold a user key or make a payment decision.
- The agreed product experience consists of a concise trust-flow presentation and an agreement-detail rules workspace. Demo scenarios are illustrative fixtures, not mandatory agreement templates.

## Testing Decisions

- A good test observes participant-visible behavior and finalized token balances, events, and state through public commands. It does not assert private storage layout, helper calls, or implementation-specific control flow.
- The primary test seam is a deployed factory and Escrow Vault accessed through their public interfaces. Scenario tests should exercise signed approval, vault creation, explicit funding, evidence submission, buyer acceptance, timeout release, missed-delivery refund, dispute resolution, and amendment behavior as the buyer, seller, resolver, and an unrelated caller.
- The scenario suite must prove authority boundaries: an unrelated caller cannot create an agreement with someone else's signatures, the seller cannot fund or refund a missed milestone, the buyer cannot resolve a dispute, the resolver cannot alter an undisputed or completed milestone, and the platform has no privileged fund-moving route.
- Boundary tests must cover timing at and immediately before/after funding expiry, delivery deadlines, and review-window expiry; sequential-milestone gating; rejection of duplicate or late evidence; allocation-preserving splits; zero and non-zero fee outcomes; amendment limits; and immutable historical versions.
- End-to-end application tests should drive the user-facing agreement flow with a wallet test double or test account, asserting rendered action availability and transaction outcome states from chain-derived status. They must not rely on the UI as the sole proof of a payment outcome.
- Index and read-model tests should consume emitted lifecycle events plus direct chain reads and assert that a refresh or delayed event delivery converges to the vault's authoritative state.
- There is no existing application test suite in the repository to adopt as prior art. The first implementation should establish the public agreement-scenario suite as the reference pattern for later application and indexing tests.

## Out of Scope

- Real funds, real USDT, fiat deposits or conversion, cash-out, exchange rates, licensed payment operation, production safeguarding, KYC/KYB, sanctions screening, or regulatory-readiness claims.
- Platform custody of wallets or keys, platform-selected payment outcomes, platform emergency withdrawal controls, pooled customer balances, upgrade governance, or gas-sponsorship/account-abstraction optimization.
- Marketplace discovery, job listings, freelancer ratings, payroll, contractor administration, invoicing replacement, or replacing marketplace-native protections.
- AI authority over payment release, creative-quality assessment, evidence judgment, disputes, or amendments. Agreement co-pilot quality is a high-fidelity demo concern rather than a core on-chain requirement.
- Production notification delivery, production file storage, human-resolver operations, appeals, court-like adjudication, and evidence-retention compliance.
- Physical-goods escrow, shipping, tracking, inspection, return, or conformity evidence flows.
- Concurrent milestone execution, late evidence resubmission, amendments to active or disputed milestones, and unilateral resolver changes.

## Further Notes

- The product is custom-agreement-first. The three demo narratives (designer dispute, creator auto-release, and developer missed delivery) demonstrate different outcomes of the same rule engine and must not constrain users to preset templates.
- The phrase “automatic release” means that elapsed objective conditions make release eligible; a caller still submits the on-chain transaction. It does not imply that a platform service can move funds autonomously.
- The remaining technical planning work will refine the off-chain data model, application authorization boundary, wallet interaction design, event indexing, and monorepo/deployment blueprint. Those decisions must preserve the product and vault constraints in this specification.
- Proposed test seam confirmation: use the public factory/vault agreement scenario as the highest-level behavioral seam. This specification assumes that approach unless the team chooses a different test harness before implementation begins.
