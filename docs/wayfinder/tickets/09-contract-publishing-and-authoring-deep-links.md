# 09 — Contract publishing and authoring deep links

**What to build:** A Contract initiator can use typed Send pages to publish a valid Contract Draft through the protected invitation workflow, and can return directly to every existing-draft authoring URL with correct authorised state.

**Blocked by:** 08 — Contract project details and editable terms.

**Status:** complete 2026-08-12

- [x] Send and all existing-draft authoring URLs render from typed Next routes and restore the correct authorised draft/step state.
- [x] Publishing performs full server-side validation and protected exact-email invitation behavior; invalid or unshared drafts remain private.
- [x] Tests cover direct-link restoration, successful publish/invitation, incomplete draft rejection, stale/forbidden draft access, and mobile Send behavior.

## Evidence

- Added typed `/contracts/[contractId]/send` and `/contracts/new/send` routes plus `frontend/src/contracts/send.tsx`. Existing-draft Send loads the protected draft, restores the saved Version/counterparty state, and the compatibility route accepts an optional `contractId` query parameter. Static Send rewrites were removed.
- Added the protected `POST /api/contracts/:contractId/invitations` Send boundary. The backend reloads the caller-authorised draft, requires `shareReady`, re-runs complete draft validation, requires a saved exact counterparty email, and requires the invitation email to match it before calling the protected invitation RPC. The local fixture mirrors the same rules and keeps rejected drafts `private_draft`.
- Added migration `20260812110000_harden_contract_invitation_publication.sql` so direct authenticated invitation RPC calls also require an acceptance-ready Version and the exact persisted parties email before changing Contract status.
- Added route/source assertions, Next production route checks, narrow-screen CSS coverage, stale/forbidden API coverage, and loopback coverage using `pactflow-wallet-test@local.invalid` for incomplete rejection, mismatched-email rejection, successful invitation creation, private-to-negotiation transition, and unauthenticated rejection.
- Verified `npm.cmd run typecheck`, `npm.cmd run build` in `frontend`, `npm.cmd --workspace frontend run test:routes` (6 passing), `npm.cmd --workspace backend run test --ignore-scripts` (89 passing, 6 intentional skips), and `git diff --check`.

Environmental follow-up: the linked Supabase migration/RLS command could not be run because this environment has no `SUPABASE_ACCESS_TOKEN`; the migration is committed for the next authenticated linked deployment.
