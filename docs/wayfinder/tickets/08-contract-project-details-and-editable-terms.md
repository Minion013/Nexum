# 08 — Contract project details and editable terms

**What to build:** A Contract initiator can complete typed Project details and Review terms pages, create or restore an authorised Contract Draft, and save a valid editable set of Contract Sections and milestone terms.

**Blocked by:** 07 — Contracts list and authoring entry.

**Status:** complete 2026-08-12

- [x] Project details and Review terms are typed Next routes that retain draft-flow progression, restoration, validation feedback, and responsive behavior.
- [x] The backend validates and persists authorised Contract Draft changes, including responsibility, allocation conservation, ordered UTC deadlines, safe evidence requirements, and required Acceptance Criteria.
- [x] Tests cover new and existing authorised drafts, invalid Terms rejection, valid save/reload, and non-Contract-Party rejection.

## Evidence

- Added typed App Router routes for /contracts/[contractId]/project-details and /contracts/[contractId]/review-terms, plus typed guards for the legacy /contracts/new/project-details and /contracts/new/review-terms entry URLs. Removed the matching static HTML rewrites.
- Replaced the read-only Project-details handoff with a responsive, authenticated editor. Added the complete Review-terms editor for parties, scope, milestones, allocations, UTC deadlines, evidence, Acceptance Criteria, payment, IP, change control, notices, and Resolution Authority selection.
- Preserved the protected PUT /api/contracts/:contractId boundary and its durable Supabase RPC. The backend now preserves a validated counterparty email, maps Contract-Party RPC failures to 403, and mirrors full validation in the loopback fixture used by pactflow-wallet-test@local.invalid.
- Added route/source assertions, local fixture invalid/save/reload coverage, and explicit non-Contract-Party rejection coverage.
- Verified npm.cmd run typecheck, npm.cmd run build --workspace frontend, node --test frontend/test/next-routes.test.mjs, npm.cmd test (88 passing, 6 intentional skips), and git diff --check.

Remaining gaps are outside this ticket: publishing and authoring deep links (Ticket 09), dynamic Contract detail and exact-version acceptance (Ticket 10), standalone Wallet (Ticket 11), and interim frontend removal/parity cleanup (Ticket 13).
