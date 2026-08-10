---
labels:
  - ready-for-agent
---

# MilestonePay-informed Contract workflow specification

## Problem Statement

PactFlow's existing Contract Draft editor is a single, dense form that does not resemble the focused MilestonePay workflow supplied by the product owner. It makes selecting a counterparty, defining project terms, reviewing an editable milestone schedule, and sharing the Contract Draft feel like one undifferentiated task.

PactFlow also needs a consistent Milestone Review surface. A Contract Party must be able to inspect submitted evidence, evaluate the pre-agreed Acceptance Criteria, understand the applicable review rules and deadline, and see the append-only history before making a decision. The product must preserve PactFlow's two-party access model and never imply that proposed terms are secured funds or that PactFlow can automatically release a payment.

## Solution

PactFlow will replace the long-form Contract Draft editing journey with a MilestonePay-informed, four-step creation flow:

1. Choose person
2. Project details
3. Review terms
4. Send

The flow will use the supplied reference's restrained layout, horizontal stepper, information hierarchy, milestone status treatment, evidence/criteria/activity tabs, review countdown, and clear primary actions. It will use PactFlow's visual tokens and Contract-only language.

The initiator selects an existing Person or supplies an exact-email invitation in the first step. The second step records project information and the initiator's Contract responsibility. The third step presents an editable generated schedule of two or three milestones and all governing Contract terms. Sending validates and shares the resulting Contract Draft through PactFlow's existing protected invitation boundary.

Every milestone will define required evidence, one or more Acceptance Criteria, its delivery deadline, and review-window rules. After a Service Provider submits evidence, the Buyer receives a systematic review screen that joins the submitted evidence, the criteria checklist, and an append-only activity trail. All required criteria must be checked before an acceptance or release action can be enabled. A Buyer may request revision or raise a dispute without completing the checklist. Expiry of the review window makes a milestone release-eligible; it never causes a platform-controlled payment.

## User Stories

1. As a Contract initiator, I want to create a Contract through four clear steps, so that I can understand what remains before I send it.
2. As a Contract initiator, I want to choose an existing Person I have worked with, so that I can start a Contract without retyping their details.
3. As a Contract initiator, I want to invite a new person by exact email, so that I can create a Contract with someone outside my existing network.
4. As a Person selected during Contract creation, I want selection alone not to grant access, so that I do not receive Contract visibility without an explicit invitation.
5. As a Contract initiator, I want to choose whether I am the Buyer or Service Provider in Project details, so that the Contract captures my responsibility without changing my Profile's permissions elsewhere.
6. As a Contract initiator, I want to describe the project name, scope, deliverables, type, timeline, budget, and revision policy, so that the generated terms begin from the commercial intent.
7. As a Contract initiator, I want Project details to generate an editable milestone schedule, so that I can start quickly without accepting unreviewed terms.
8. As a Contract initiator, I want to edit each generated milestone until I send the Contract Draft, so that allocations, deadlines, evidence requirements, and Acceptance Criteria accurately reflect the work.
9. As a Contract initiator, I want each milestone allocation to conserve the proposed Contract total, so that the schedule cannot contain contradictory amounts.
10. As a Contract initiator, I want milestone deadlines to remain ordered and review windows to be explicit, so that both parties can understand when delivery and review decisions are due.
11. As a Contract initiator, I want each milestone to have one or more measurable Acceptance Criteria, so that review expectations are agreed before work starts.
12. As a Contract initiator, I want the Review terms step to expose the complete Contract version before I send it, so that I can verify parties, scope, milestones, payment terms, evidence, change control, intellectual property, notices, and dispute-resolution terms together.
13. As a Contract initiator, I want proposed allocations clearly labelled as draft terms, so that I do not mistake them for secured or released money.
14. As a Contract initiator, I want Send to validate the Contract Draft and explicitly create or send the invitation, so that the counterparty gains access only through PactFlow's established invitation process.
15. As an invited counterparty, I want to review the exact shared Contract Version before accepting it, so that I never approve terms that changed after invitation.
16. As a Service Provider, I want to submit the required milestone evidence within the delivery window, so that the Buyer has a structured basis for review.
17. As a Service Provider, I want evidence to remain private to authorised Contract Parties and authorised dispute handling, so that I do not publish private work details or credentials.
18. As a Buyer, I want to see all submitted evidence, so that I can check the delivered work against the Contract terms.
19. As a Buyer, I want to mark every required Acceptance Criterion during review, so that acceptance is based on the agreed measurable conditions.
20. As a Buyer, I want acceptance and release disabled until I have completed every required criterion, so that I cannot release a milestone without a documented review.
21. As a Buyer, I want to request a revision with a recorded reason without completing the acceptance checklist, so that feedback does not resemble acceptance.
22. As a Buyer, I want to raise a dispute from the same review context, so that a contested milestone can be frozen without losing its evidence and activity history.
23. As either Contract Party, I want to see milestone activity in append-only chronological order, so that I can understand submissions, review actions, requested revisions, disputes, and settlement eligibility.
24. As either Contract Party, I want to see the review-window countdown, so that I know how long a Buyer can respond.
25. As either Contract Party, I want an expired review window to show release eligibility rather than an automatic payout, so that PactFlow does not appear to control Contract funds.
26. As a Contract Party, I want secured, paid, and vault balances displayed only when chain-authoritative, so that the UI does not overstate the payment state.
27. As a mobile Contract Party, I want the same authoring and review decisions available without horizontal overflow, so that I can govern Contracts from a small screen.
28. As an authorised Contract Party, I want existing Contract Draft and active Contract access rules preserved, so that a visual workflow update never weakens Profile-owned privacy boundaries.

## Implementation Decisions

- Customer-facing language uses Contract and Contract Draft exclusively. Agreement is a retired synonym and must not appear in interactive copy, navigation, headings, buttons, status labels, empty states, or tests except when a narrowly scoped legacy migration requires it.
- The Contract Draft authoring client is a four-phase state machine. Earlier phases remain editable while the user is in the flow; moving forward validates only the information required for the next phase. No phase transition grants a selected Person Contract access.
- Choose person presents the existing People/connection option and exact-email fallback. Its only output is the intended counterparty identity or email; the protected invitation process remains the sole way to share a Contract Draft.
- Project details contains the initiator's Buyer or Service Provider choice, project title and scope, engagement details, proposed total allocation, timeline, and revision policy. The system derives the counterparty's complementary responsibility without changing either Profile's account-level permissions.
- Review terms creates a local, editable draft of all typed Contract Sections. It generates two to three milestone proposals from Project details and preserves the established invariants: positive whole-number allocations, allocations equal to the proposed total, ordered UTC delivery deadlines, supported review-window values, safe private evidence requirements, and valid required Contract Sections.
- Each milestone term gains an ordered Acceptance Criteria collection. Every criterion has a concise description and a required flag; new generated criteria are required by default. A milestone cannot be sent without at least one required criterion.
- Draft-specific additions become part of the versioned Contract terms before sharing. Once both parties accept a Contract Version, active-milestone terms remain immutable except through the existing bilateral amendment boundary for permitted future work.
- Send performs the existing server-side Contract Draft validation, versioning, and exact-email invitation actions. A draft remains private and has no payment authority until the protected sharing and acceptance lifecycle succeeds.
- A Milestone Review read model combines the currently reviewable milestone's versioned terms, private submitted evidence metadata, required Acceptance Criteria, review-window timing, settlement authority state, and chronological activity. It must be scoped to the requesting authorised Contract Party.
- Evidence records are private Contract-scoped submissions. They record the submitting party, submission time, protected file or reference metadata, and an integrity reference where the settlement implementation supports one. Evidence requirements must continue to reject credentials and raw private URLs.
- Milestone activity is append-only. It records Contract-relevant events including evidence submission, evidence verification, criterion checks, revision requests, disputes, acceptance, review-window expiry, release eligibility, and any authoritative settlement result. Historical entries cannot be edited by either Contract Party.
- The Buyer may mark only required criteria on the review screen. The acceptance/release control is disabled until all required criteria are checked and the current milestone is eligible. Revision and dispute controls remain available without a fully checked list.
- The reference's “Accept & Release” action is rendered only when an approved Contract Version and an authoritative Contract Escrow Vault state support the action. In every other context, PactFlow shows a truthful, non-monetary or proposed-terms state rather than a secured/paid amount.
- A review countdown is derived from the evidence submission time and the versioned milestone review window. On expiry the UI changes to Release eligible. It must not schedule, sign, initiate, or imply a PactFlow-controlled payout; an eligible participant or relayer still triggers any supported settlement transaction.
- The review screen follows the supplied MilestonePay hierarchy: milestone context and status at the top, a submission summary, Evidence, Criteria, and Activity views, a dedicated payment/status rail on wide screens, and stacked equivalent content on narrow screens. PactFlow tokens, accessible labels, keyboard handling, focus order, and responsive breakpoints take precedence over pixel-level copying.
- Proposed and authoritative payment values are semantically distinct. Draft totals and milestone allocations are called proposed terms; secured, paid, released, and vault balances are populated only from an approved Contract Version and chain-authoritative data.

## Testing Decisions

- Tests assert observable Contract behaviour, access boundaries, API outcomes, rendered user-facing labels, control availability, and responsive layout outcomes. They do not assert private helper calls or incidental DOM construction.
- The primary server seam is the existing authenticated Contract Workflow API. It will cover four-step submission validation, Buyer/Service Provider responsibility assignment, existing-Person and exact-email invitation behavior, generated schedule validation, Acceptance Criteria persistence, and unauthorised-access rejection.
- The primary page seam is the Contract Draft and Contract detail route. Page-level tests will verify the four visible steps, blocked progression for incomplete input, editable Review terms, Send behavior, Contract-only terminology, and the review page's Evidence, Criteria, and Activity states.
- Existing Contract workflow validation tests are prior art for canonical UTC deadlines, ordered milestones, allocation conservation, safe evidence requirements, exact-version acceptance, and protected invitation actions. Existing Contracts presentation and server tests are prior art for responsive records and Contract-only rendering.
- New observable review cases cover: a Service Provider's authorised evidence submission; a non-party rejection; incomplete required criteria keeping acceptance/release disabled; a fully checked criterion set enabling a supported decision; revision without criteria completion; dispute without criteria completion; immutable activity history; countdown before expiry; release-eligible state after expiry; and the absence of automatic release behavior.
- Payment-state tests cover proposed Draft amounts, an approved-but-not-funded Contract, and a chain-authoritative funded/released milestone. No test may accept copy or a displayed value that represents a Draft amount as secured or paid.
- Responsive tests cover the four-step authoring flow and milestone review at desktop and a narrow mobile viewport, ensuring every action and review context is available without horizontal scrolling.

## Out of Scope

- Platform-controlled automatic payout, custody, fiat conversion, cash-out, or any signing authority on behalf of a Contract Party.
- Showing Contract Draft amounts as secured, paid, released, or available wallet balance.
- Copying MilestonePay Settings, standalone payment/funding pages, unrelated messaging screens, or brand assets.
- Restoring Agreement, Proposal, Workspace, workspace membership, or team-collaboration product language.
- Redesigning the standalone Wallet surface or merging a User Profile's available wallet balance with Contract Escrow Vault balances.
- Broad changes to unrelated Contract templates or historical Contract Versions beyond the versioned milestone terms required here.

## Further Notes

- This specification consolidates the [MilestonePay-informed Contract workflow map](milestonepay-contract-workflow-map.md) and supersedes its remaining authoring, review-integration, and implementation discovery tickets for this feature.
- The supplied screenshots are the visual reference for information hierarchy and interaction intent, not a source of financial claims or product terminology. PactFlow must retain its own names, access boundaries, visual tokens, and authoritative-state rules.
- The existing Contract Draft route, Contract Workflow API, versioning model, invitation boundary, and Contract presentation coverage are the preferred integration and test seams.
