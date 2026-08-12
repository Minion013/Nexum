# 03 — People Directory and Contacts compatibility

**What to build:** A signed-in User Profile can use typed People Directory pages to discover Profiles, view connection state, and perform permitted connection actions. The preserved Contacts URL safely reaches the same experience without duplicating product behavior.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** complete (2026-08-12)

- [x] People Directory and Contacts compatibility routes render through Next components and retain responsive discovery, network, and request behavior.
- [x] Discovery and connection actions use the authenticated backend workflow, show actionable validation/service failures, and never expose non-permitted Profile data.
- [x] Tests cover authorised results, unauthenticated rejection, permitted and forbidden connection transitions, and Contacts compatibility behavior.

## Evidence

- Replaced the `/people` and `/contacts` static-page rewrites with typed App Router routes. `/contacts` reuses the canonical People route and the shared signed-in shell maps its active navigation to `/people` without duplicating directory behavior.
- Added the typed People client in `frontend/src/people/people.tsx`: authenticated search over display name, username, and professional headline; opt-in discovery results; explicit no-Contract-access wording; accepted network and pending request lists; permitted send, accept, decline, withdraw, remove, and block controls; loading, empty, service, validation, and action-failure states; and responsive narrow-screen action layouts.
- The backend People response keeps the discovery projection explicit and routes all non-fixture reads/actions through the authenticated Supabase RPC boundary. The loopback-only `pactflow-wallet-test@local.invalid` fixture now supports local discovery, request creation, and truthful forbidden-transition responses without enabling the fixture in production.
- Added typed route/source parity assertions plus API tests for unauthenticated rejection, caller-scoped discovery, safe discovery fields, authenticated actions, Contacts compatibility, local-fixture discovery/request behavior, and a forbidden connection transition. Existing linked `supabase/tests/durable-access-rls.sql` coverage continues to verify permitted and forbidden connection lifecycle transitions and that connections do not grant Contract access.
- Verification on 2026-08-12: `npm.cmd run build --workspace frontend` passed; `npm.cmd run typecheck` passed; `npm.cmd run test:routes --workspace frontend` passed (1); `npm.cmd test` passed (73, 6 intentionally skipped); focused conversion/People tests passed (38); `git diff --check` passed.

## Remaining gaps

None for this ticket. Removal of the remaining interim static pages and legacy client bundles belongs to Conversion Ticket 13 after the subsequent route migrations are complete.
