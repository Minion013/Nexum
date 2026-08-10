# 04 — Deliver MilestonePay-informed Dashboard

**What to build:** A signed-in participant receives a responsive, action-first Dashboard with the relevant MilestonePay visual direction and PactFlow's authoritative Contract data, without a Recent Activity section.

**Blocked by:** 03 — Deliver focused signed-in navigation and Wallet.

**Status:** in-progress 2026-08-10

- [x] Dashboard uses the agreed visual hierarchy, status treatment, responsive surface treatment, and primary actions.
- [x] Dashboard presents actionable Contract information and only chain-backed monetary values.
- [x] Loading, empty, attention, and populated states lead to clear next actions.
- [x] Recent Activity is absent.
- [ ] Authenticated Dashboard behavior, rendered output, narrow-screen behavior, and regression checks pass.

**Evidence:** The Dashboard now renders authenticated `/api/home` Contract data as action, milestone, summary, and Contract-work surfaces. It never renders monetary data, so it cannot present a non-chain-backed balance. Focused Dashboard presentation, endpoint, and rendered-route tests pass; the full `npm.cmd test` suite passes 63 tests, plus typecheck, production build, and `git diff --check`.

**Remaining gap:** The deliberately local-only `pactflow-wallet-test@local.invalid` fixture now serves an authenticated empty Dashboard at `/api/home`, but this session's in-app browser refused local navigation with `ERR_BLOCKED_BY_CLIENT`; Chrome was unavailable. Desktop and narrow-screen browser acceptance therefore remains unverified and this ticket stays in progress.
