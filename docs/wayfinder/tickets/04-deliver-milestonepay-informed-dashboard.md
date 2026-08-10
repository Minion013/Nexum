# 04 — Deliver MilestonePay-informed Dashboard

**What to build:** A signed-in participant receives a responsive, action-first Dashboard with the relevant MilestonePay visual direction and PactFlow's authoritative Contract data, without a Recent Activity section.

**Blocked by:** 03 — Deliver focused signed-in navigation and Wallet.

**Status:** complete 2026-08-10

- [x] Dashboard uses the agreed visual hierarchy, status treatment, responsive surface treatment, and primary actions.
- [x] Dashboard presents actionable Contract information and only chain-backed monetary values.
- [x] Loading, empty, attention, and populated states lead to clear next actions.
- [x] Recent Activity is absent.
- [x] Authenticated Dashboard behavior, rendered output, narrow-screen behavior, and regression checks pass.

**Evidence:** The Dashboard now renders authenticated `/api/home` Contract data as action, milestone, summary, and Contract-work surfaces. It never renders monetary data, so it cannot present a non-chain-backed balance. Focused Dashboard presentation, endpoint, and rendered-route tests pass; the full `npm.cmd test` suite passes 63 tests, plus typecheck, production build, and `git diff --check`. On 2026-08-10, the product owner independently verified authenticated Dashboard rendering at desktop and 390 px widths with the local test fixture.

**Remaining gaps:** None for this ticket.
