# 12 — Invitation acceptance

**What to build:** An invited authenticated person can open a typed invitation URL, understand its state, and accept an eligible Contract invitation through the existing protected backend workflow.

**Blocked by:** 01 — Typed landing and authentication entry.

**Status:** complete (2026-08-12)

- [x] The parameterized invitation route renders valid, expired/invalid, unauthenticated, already-resolved, failure, and successful acceptance states.
- [x] Acceptance uses the authenticated backend workflow and grants access only to the eligible User Profile under existing Contract Party rules.
- [x] Tests cover valid acceptance, invalid identifier behavior, unauthenticated rejection, repeat acceptance behavior, and non-invitee protection.

## Evidence

- Added the typed Next dynamic route at `frontend/app/invitations/[invitationId]/page.tsx`; it renders loading, eligible, expired, resolved, successful, unauthenticated, invalid, and service-failure states without a static-page rewrite. Successful acceptance is confirmed in place and offers an explicit Contracts link.
- Added `GET /api/invitations/:invitationId` plus the typed browser client. The API validates UUID identifiers, requires a verified session, and calls the protected `get_contract_invitation_acceptance_state` backend workflow. `POST /api/invitations/:invitationId/accept` now validates the same identifier before it calls the established acceptance workflow.
- Added migration `20260812100000_add_invitation_acceptance_state.sql`. Its security-definer read function only returns an invitation state to the exact invited Profile; it returns `eligible`, `expired`, or `resolved` and discloses no Contract data.
- Added API/workflow, rendered-route, and durable-RLS test coverage for invalid identifiers, unauthenticated rejection, valid eligibility, expired/resolved state, repeat acceptance, and non-invitee state-read protection. The explicit loopback fixture email `pactflow-wallet-test@local.invalid` remains the local auth bypass exercised by the backend suite.
- Verification passed: `npm.cmd test` (77 tests, 6 pre-existing skips), `npm.cmd run build --workspace frontend`, `npm.cmd run test:routes --workspace frontend`, `npm.cmd run typecheck`, `git diff --check`, and the linked `supabase/tests/durable-access-rls.sql` regression suite.
- The migration was applied to the linked Supabase project after the explicitly authorised repair of stale remote-only migration-history entry `20260811200000`. `20260812100000_add_invitation_acceptance_state.sql` is now recorded as applied.

## Remaining gaps

None for this ticket.
