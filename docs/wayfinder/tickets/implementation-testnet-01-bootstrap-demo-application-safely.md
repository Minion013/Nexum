# 01 — Bootstrap the demo application safely

**What to build:** A runnable PactFlow demo shell that a visitor can open safely, with a clear testnet-only boundary and reliable failure handling.

**Blocked by:** None — can start immediately.

**Status:** complete — verified 2026-08-08.

- [x] The application starts with validated configuration, a health-check route or screen, and a clear testnet/no-real-funds notice. Evidence: `runtimeConfigurationFromEnvironment` rejects missing or malformed public configuration; the production-startup smoke test launches `node src/server.mjs` and verifies `/health`; `web/public/index.html` shows “Testnet only. No real funds.”
- [x] Secrets and privileged configuration are unavailable to browser code, and user-facing failures are handled without leaking sensitive details. Evidence: the production-startup smoke test supplies a sentinel `SUPABASE_SERVICE_ROLE_KEY` and proves `/api/auth/config` omits it; `web/test/server.test.mjs`, `web/test/supabase-session.test.mjs`, and magic-link tests verify public configuration and safe failure messages.
- [x] A smoke test verifies that the application can start and render its public entry experience. Evidence: `npm.cmd run test:smoke` passes all 6 tests, including a real `node src/server.mjs` launch, health boundary, public entry testnet notice, and browser configuration boundary.

**Verification run:** `npm.cmd run test:smoke`, `npm.cmd run typecheck`, and `npm.cmd test` (46 passing tests) on 2026-08-08.

**Remaining gaps:** None for this ticket’s acceptance criteria. Deployment and live Supabase behavioural verification belong to subsequent access/session tickets and the judge-ready demo work.
