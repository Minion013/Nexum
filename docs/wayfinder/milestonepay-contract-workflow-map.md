---
labels:
  - wayfinder:map
---

# MilestonePay-informed Contract workflow map

## Destination

Deliver a PactFlow Contract experience whose Contract Draft creation follows **Choose person → Project details → Review terms → Send**, and whose active milestones use the supplied MilestonePay review hierarchy for evidence, criteria, activity, and release decisions.

## Notes

This map carries execution as explicitly authorised by the product owner after its decisions are resolved. Customer-facing terminology is **Contract** and **Contract Draft**; “Agreement” is a retired synonym. Reuse the MilestonePay visual hierarchy and interaction patterns while applying PactFlow tokens, responsive behaviour, access control, and chain-authoritative payment boundary.

Confirmed product direction:

- Choose the initiating Buyer or Service Provider responsibility in **Project details**.
- **Review terms** produces an editable generated milestone schedule before it is sent.
- Each milestone retains its evidence requirements, Acceptance Criteria, review window, and append-only activity trail.
- Every required Acceptance Criterion must be checked before acceptance and release are enabled; revision and dispute remain independently available.
- Review-window expiry makes a milestone release-eligible, never platform-released automatically.
- Proposed Draft allocations are labelled as such; secured, paid, and vault values appear only when approved and chain-authoritative.

## Decisions so far

<!-- the index is populated as decision tickets close -->

## Not yet specified

- Exact component-level composition and responsive breakpoint rules after the existing Contract authoring and detail surfaces are inventoried.
- The precise schema/API migration shape after the current milestone, evidence, and approval write paths are traced.

## Out of scope

- A platform-controlled automatic payout or any custodial payment authority.
- Treating a Contract Draft allocation as secured, paid, or released money.
- Restoring customer-facing Agreement, Proposal, Workspace, or team terminology.
- Copying MilestonePay's Settings or standalone payment pages.
