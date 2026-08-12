# 06 — Authority Registry read model and page

**What to build:** Users can open Authorities as a typed signed-in Next route and see a durable, safe Authority Registry read model with Resolution Authorities, jurisdictions, and available rulesets instead of a hard-coded placeholder.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** complete (2026-08-12)

- [x] The backend provides an authorised, safe Authority Registry read model backed by durable data, including required schema/migration work when it is absent.
- [x] Authorities renders populated, valid-empty, loading, unavailable, and forbidden states without claiming unavailable registry data exists.
- [x] Tests cover populated and empty registry behavior, unavailable-service handling, safe response fields, and access policy.

## Evidence

- Added `GET /api/authorities`, which authenticates the caller, reads the existing durable `resolution_authorities` table through the caller's Supabase session, filters to published entries, and returns only the safe `id`, display name, jurisdiction label, ruleset version, and simulation marker projection. The existing `20260806170000_create_durable_access_graph.sql` migration provides the durable table and published-authority RLS read policy; no additional schema was required.
- Replaced the `/authorities` static rewrite with typed `frontend/app/authorities/page.tsx` and client/presentation modules. The route visibly renders loading, published populated, valid-empty, service-unavailable, and forbidden states, including a clear simulated-environment disclaimer and no claim that unavailable data exists.
- The loopback-only `pactflow-wallet-test@local.invalid` fixture can read the deterministic Authority Registry entry only with the exact configured email from loopback; unauthenticated and wrong-email requests remain rejected. Production fixture behavior remains disabled by the existing `.invalid` and `NODE_ENV` guards.
- Verification on 2026-08-12: `npm.cmd run build --workspace frontend` passed and lists `/authorities` as a real App Router route; `npm.cmd run typecheck` passed; focused backend Authority Registry tests passed (4); rendered frontend route/state tests passed (3); full `npm.cmd test` passed (83 tests, 6 intentional skips); `git diff --check` passed.

## Remaining gaps

- None for this ticket's acceptance criteria. The interim `frontend/public/authorities.html` and generated legacy artifacts remain intentionally deferred to Conversion Ticket 13, which removes interim frontend paths only after the remaining route migrations and parity checks are complete.
