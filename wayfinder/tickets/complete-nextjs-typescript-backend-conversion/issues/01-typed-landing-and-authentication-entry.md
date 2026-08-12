# 01 — Typed landing and authentication entry

**What to build:** Visitors can use the preserved landing and login URLs as real Next.js TypeScript routes. Prospective User Profiles can request and verify an email code, select an existing session, complete onboarding, use explicitly enabled local-test behavior, and receive truthful authentication or configuration failures.

**Blocked by:** None — can start immediately.

**Status:** complete (2026-08-12)

- [x] Landing and login render from typed Next routes without static page rewrites or direct DOM page scripts.
- [x] Email-code sign-in, existing-session choice, onboarding completion, and explicit local-test behavior preserve current outcomes through the authenticated backend boundary.
- [x] Route/API tests cover valid, expired, unauthenticated, unavailable-configuration, and invalid-route behavior.

## Evidence

- Replaced the `/` and `/login` HTML rewrites with typed App Router pages. The landing page preserves the public messaging and links; the login page owns email-code request/verification, existing-session choice, onboarding continuation, safe account switching, and the loopback-only local fixture.
- Added the typed frontend auth client in `frontend/src/auth/client.ts`, including response/status handling, Supabase session attachment, and the explicitly enabled local fixture header. The fixture remains production-refused and supports operation when Supabase public configuration is unavailable.
- Corrected the legacy build script's working-directory resolution so the required frontend build can run after the `web` to `frontend` conversion. Future signed-in routes and their interim legacy modules remain intentionally deferred to tickets 02–13.
- Added rendered Next route coverage in `frontend/test/next-routes.test.mjs` and API/source boundary coverage in `backend/test/next-conversion.test.mjs`; these verify public routes, invalid-route 404, valid/expired/unauthenticated/unavailable configuration, and the configured local identity.
- Browser verification on `127.0.0.1:3000` confirmed `/` and `/login` render as Next routes, an invalid URL renders Next 404, and `pactflow-wallet-test@local.invalid` reaches the signed-in Wallet through the auth boundary.
- Verification on 2026-08-12: `npm.cmd run build --workspace frontend` passed; `npm.cmd run typecheck` passed; `npm.cmd run test:routes --workspace frontend` passed (1); `npm.cmd test` passed (68, 6 intentionally skipped); `git diff --check` passed.

## Remaining gaps

None for this ticket. The remaining signed-in, directory, Contract, wallet, notification, authority, invitation, and interim-frontend removal work belongs to the subsequent conversion tickets.
