# 07 — Contracts list and authoring entry

**What to build:** A Contract Party can open typed Contracts, see only authorised Contract records, filter them, and begin a new Contract authoring flow by choosing an existing Person or exact-email counterparty without granting Contract access.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** complete (2026-08-12)

- [x] Contracts and initial authoring routes render through typed Next components and retain responsive list/filter behavior.
- [x] Contract data and counterparty choices come from authorised backend workflows; a selected Person or email alone never gains draft access.
- [x] Tests cover empty/populated/filter states, unauthorised Contract exclusion, Person selection, exact-email validation, and transition into the persisted authoring flow.

## Evidence

- Replaced the `/contracts` static rewrite with the typed App Router Contracts route and client page. It reads the authenticated `GET /api/contracts` workflow, renders loading/error/empty/populated states, applies stage and responsibility filters to the authorised payload, and preserves table/mobile record presentations.
- Added typed `/contracts/new/choose-person` and `/contracts/[contractId]/choose-person` routes. Accepted People are loaded from the protected People workflow; exact emails are normalized and validated; blank input remains a private-draft option. A Person or email is sent only as `counterpartyEmail` to the protected draft-creation workflow, which creates only the initiating Contract Party.
- Added the typed persisted-draft handoff at `/contracts/[contractId]/project-details`. It reads the newly created draft through the protected Contract workflow and exposes truthful private-draft status without creating an invitation or counterparty access.
- Added `createContractsLoader` and `GET /api/contracts`. The Supabase query uses the authenticated caller session and the existing Contract Party RLS boundary; the API test proves unauthenticated rejection and caller-scoped loader invocation.
- Added loopback fixture coverage using `pactflow-wallet-test@local.invalid`: invalid email returns `422`, valid email persists on a private draft, the draft is listed/read back, and no invitation or second Contract Party is created.
- Verification on 2026-08-12: `npm.cmd run build --workspace frontend` passed; `npm.cmd run typecheck` passed; `npm.cmd run test:routes --workspace frontend` passed (5); `npm.cmd test` passed (86, 6 intentional skips); `git diff --check` passed.

## Remaining gaps

None for Ticket 07. Full Project details, editable terms, role selection, and subsequent authoring steps are Ticket 08 and later conversion tickets.
