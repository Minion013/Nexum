# 05 — Deliver MilestonePay-informed Contracts experience

**What to build:** A signed-in Contract Party can scan, filter, open, and act on their Contracts through a responsive MilestonePay-informed Contracts list and Contract detail, using PactFlow's authentic lifecycle and Contract-only copy.

**Blocked by:** 02 — Retire legacy Contract authoring and routes; 03 — Deliver focused signed-in navigation and Wallet.

**Status:** complete 2026-08-10

- [x] Contracts list identifies the counterparty, lifecycle state, milestones, relevant action, and only authoritative monetary information.
- [x] Desktop table and narrow-screen records provide equivalent Contract access without overflow.
- [x] Contract detail retains authorized version, acceptance, milestone, evidence, amendment, authority, and escrow context.
- [x] Customer-facing Contracts copy contains no Contract, Contract Draft, retired model, or bilateral party language.
- [x] Authenticated list/detail behavior, responsive rendering, authorization boundaries, and regression checks pass.

**Evidence:** The authenticated Contracts client now renders RLS-scoped `/api/home` Contract records as a table or equivalent narrow-screen record, with lifecycle-filtered actions, counterparty, responsibility, milestone-count/next-deadline, and activity context. It does not render unverified monetary values. The detail retains the existing Contract Draft, Version, acceptance, milestone, evidence, amendment, and authority boundaries, plus an explicit no-deployed-Vault state until a Contract Escrow Vault has authoritative chain data; a private one-party Contract Draft remains editable when its review context is unavailable. Desktop and 390 px authenticated browser checks verified the list, Contract Draft detail, and no horizontal overflow. Focused route/presentation tests, typecheck, production build, `git diff --check`, and `npm.cmd test` (65 passing) pass.

**Remaining gaps:** None for this ticket.
