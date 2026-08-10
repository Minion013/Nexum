# 06 — Deliver People discovery

**Parent:** [PactFlow post-login retired model redesign specification](../post-login-retired model-redesign-spec.md)

**What to build:** Signed-in users can use the Discover view in People to search and browse eligible professional Profiles, then open enough public-in-app context to decide whether to establish a working connection. The directory is never a public marketplace and does not grant retired model or Contract access.

**Blocked by:** 05 — Deliver Profile Settings and discoverability foundation.

**Status:** in-progress — claimed 2026-08-09; local and linked-project RLS checks pass, but authenticated browser verification remains required.

- [ ] Discover returns only opted-in, RLS-safe Profile information and supports the agreed professional lookup fields.
- [ ] Search, empty, error, and loading states work in the shared responsive shell.
- [ ] A profile result clearly communicates that viewing or discovering a person grants no retired model or Contract access.
- [ ] Endpoint authorization tests and browser acceptance prove that uneligible or private Profiles are not revealed.

## Evidence recorded 2026-08-09

- The authenticated People loader now forwards the professional search term only to the signed-in Supabase RPC and whitelists the returned directory payload to `id`, display name, immutable username, and professional headline. Its endpoint test proves no email or bio is exposed even if an RPC response is over-broad.
- The Discover view now describes the access boundary both before search and on each result, supports name/username/headline search wording, and renders accessible loading, empty, and error states without exposing retired model or Contract data.
- Added migration `20260809100000_add_people_discovery_usernames.sql`: durable usernames are generated for existing and future Profiles; `discover_people` searches the agreed display-name, username, and headline fields, returns only safe fields, limits stable alphabetical results to 20, and excludes either party in a blocked relationship.
- Extended `supabase/tests/durable-access-rls.sql` to require username discovery and deny a blocked Profile from a signed-in People result.
- Verification: focused People tests pass; `npm.cmd test` passes all 58 tests; `npm.cmd run typecheck` and the elevated `npm.cmd run build` pass; `git diff --check` passes (line-ending warnings only).
- Applied `20260809100000_add_people_discovery_usernames.sql` to the linked Supabase project and ran `supabase/tests/durable-access-rls.sql` successfully. The linked regression verifies discoverability, username lookup, private-profile denial, and blocked-profile denial under authenticated RLS.
- Attempted the live email-code browser flow on 2026-08-09. OTP verification completed, but the following protected `/api/session` request returned `Supabase authentication is invalid or expired`; the login UI then signed the session out before Discover could load. The temporary tagged browser diagnostic was rebuilt and removed after capture. No browser privacy result is claimed.

## Remaining verification gaps

- Diagnose and repair why the server-side Supabase `getUser(accessToken)` rejects the browser's freshly verified OTP session, then in authenticated browser profiles confirm loading/search/empty/error behavior and prove a private or blocked Profile never appears in Discover. This depends on the linked migration being applied and on test identities/browser sessions outside this local session.
