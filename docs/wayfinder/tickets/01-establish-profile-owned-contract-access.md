# 01 — Establish Profile-owned Contract access

**What to build:** A signed-in participant can create, invite to, and access a durable Contract directly as one of exactly two User Profile parties, with previously valid Contract records preserved through the migration and no retired model or Contract Draft access path remaining authoritative.

**Blocked by:** None — can start immediately.

**Status:** complete (2026-08-10)

- [x] A Contract has exactly two User Profile parties, and a signed-in party can complete the existing Contract lifecycle without a retired model.
- [x] Existing durable Contract records are safely backfilled before the new access representation becomes authoritative.
- [x] Authenticated access proves that a Contract Party can read and act on its Contract while a non-party cannot.
- [x] Contract Party status and Contract Draft access no longer grant Contract access.
- [x] Migration, RLS, application route/API behavior, and full-regression checks pass.

## Evidence — 2026-08-10

- Applied migration `20260810100000_establish_profile_owned_contract_access.sql` to the linked Supabase project. It backfills creator and legacy Workspace-owner parties into direct User Profile parties, revokes legacy delegated access, limits a Contract to two Profile parties, requires two parties before binding status, and makes Profile-party membership the sole Contract RLS authority.
- The authenticated `/api/contracts` boundary now ignores the legacy `workspaceId` request field and creates through `create_profile_owned_contract`; the Home loader reads only RLS-visible Profile-party Contracts. Focused server tests cover both changes.
- Linked-project preflight found one private draft with one existing Profile party, no Workspace parties, no active delegations, no oversized Contracts, and one legacy `proposal_workspace_access` row. Post-deployment verification found zero invalid Contract Parties, zero active delegations, and zero Contracts missing their creator Profile party; the one legacy access row remains only as retired data and cannot authorize a Contract request.
- Verified: rollback-only linked `supabase/tests/durable-access-rls.sql` passes, including denial for a non-party who belongs to a retained `proposal_workspace_access` Workspace; `supabase db lint --linked` reports no schema errors, and locally `npm.cmd test` (61 passing), `npm.cmd run typecheck` (passing), and `npm.cmd run build` (passing).

## Remaining gaps

None for this ticket. Legacy routes and repository removal remain deliberately scoped to tickets 02 and 06; they no longer grant Contract access.
