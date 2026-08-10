# 02 — Deliver the action-first Dashboard

**Parent:** [PactFlow post-login retired model redesign specification](../post-login-retired model-redesign-spec.md)

**What to build:** Authenticated Contract Parties open a Dashboard that prioritises Contract actions, explains each item’s retired model context, shows an active-project milestone timeline when authoritative data is available, and supplies lightweight Contract analytics without exposing information outside existing RLS boundaries.

**Blocked by:** 01 — Establish the responsive signed-in app shell.

**Status:** complete — verified 2026-08-08.

- [x] Dashboard actions are ordered by Contract stage and continue to use only RLS-visible retired model and Contract data.
- [x] Users see useful empty, loading, and error states as well as retired model-aware action context.
- [x] The Dashboard displays active-project timeline and summary analytics only from authoritative available read-model data.
- [x] Endpoint behavior tests preserve Home data scoping; browser acceptance covers the action-first hierarchy at supported breakpoints.

## Evidence recorded 2026-08-08

- The Dashboard now renders its action board before analytics. `negotiation` work is prioritised ahead of unfinished Contract Drafts, every rendered action includes its retired model, responsibility, and counterparty context, and the existing Home loader remains scoped to the caller's Supabase JWT and RLS-visible memberships and Contracts.
- The action board and timeline expose live loading state, useful empty states, a direct Contract Draft creation path for an empty account, and a contained authenticated-error state. No error state drops the signed-in shell or its navigation.
- Timeline items are limited to active Contracts with an authoritative next-milestone deadline. The lightweight analytics are counts derived solely from the same available Home Contract read model: awaiting action, in progress, and completed.
- Verification: `npm.cmd run typecheck`; full `npm.cmd test` (48 passing); focused `npm.cmd test -- test/server.test.mjs` (6 passing); and `git diff --check` pass. The route test locks the visible action-first hierarchy and loading copy, while the Home endpoint tests cover caller-scoped data and RLS-visible Contract fields.
- Local browser acceptance at 375px, 768px, 1024px, and 1440px confirmed no horizontal overflow. At mobile width, the labelled menu opened the navigation drawer and expanded state updated; at tablet and desktop widths the sidebar remained available. The unauthenticated browser path displayed the contained Dashboard error state without exposing protected data.

## Remaining gaps

- None for this ticket. A future signed-in end-to-end fixture may exercise populated Dashboard data in the browser, but current endpoint coverage verifies the authoritative read-model boundary and the browser check verifies the responsive action-first shell.
