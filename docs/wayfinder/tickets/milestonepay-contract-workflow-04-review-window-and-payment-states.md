# 04 — Deliver truthful review-window and payment states

**What to build:** Contract Parties see the MilestonePay-style review countdown, release-eligible expiry state, and truthful distinction between proposed terms and authoritative Contract Escrow Vault payment state.

**Blocked by:** 03 — Deliver criteria-gated milestone review decisions.

**Status:** ready-for-agent

- [ ] The review surface calculates and displays the review-window countdown from submitted evidence and versioned milestone terms.
- [ ] When the window expires, the milestone becomes visibly release-eligible without PactFlow scheduling, signing, or initiating a payment.
- [ ] Proposed Contract Draft allocations never appear as secured, paid, released, or wallet funds.
- [ ] Secured, released, and Contract Escrow Vault values appear only when supplied by an approved Contract Version and chain-authoritative state.
- [ ] The wide review rail and narrow stacked layout provide equivalent deadline, settlement, and action context.
