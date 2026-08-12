# 13 — Remove interim frontend and verify route/API parity

**What to build:** After every page/workflow slice is complete, PactFlow removes the interim static-page conversion layer and proves that Next routes and the Node API satisfy every preserved frontend/backend contract.

**Blocked by:** 03 — People Directory and Contacts compatibility; 04 — Profile Settings and private avatar workflow; 05 — Private Notifications workflow; 06 — Authority Registry read model and page; 09 — Contract publishing and authoring deep links; 10 — Dynamic Contract detail and exact-version acceptance; 11 — Standalone Wallet; 12 — Invitation acceptance.

**Status:** complete 2026-08-12

- [x] Static page rewrites, direct DOM page modules, unchecked browser modules, generated legacy bundles, and their obsolete build path are removed without restoring backend file serving.
- [x] Every inventory route has a route-to-backend parity test covering its critical success and failure behavior, access boundary, and responsive primary action.
- [x] Frontend type checks, production build, backend checks, API tests, route tests, and combined-start smoke tests pass with Next rendering pages and proxying API/health requests to Node.

## Verification evidence

- Removed the static `.html` pages, all `frontend/src/legacy` direct-DOM modules, the legacy bundle builder, generated legacy bundles, the obsolete optional catch-all route, and all `.html` rewrites. `frontend/middleware.ts` now performs runtime `/api/*` and `/health` rewrites to Node without backend file serving.
- Added typed source ports for the remaining auth, profile, settings, authoring, network, navigation, identity, and avatar workflows. The route inventory covers all 20 preserved URLs and asserts typed routes, API seams, responsive primary actions, removal scans, rendered Next responses, anonymous `401` boundaries, local-fixture success boundaries, invalid-draft `422`, and unauthorized write rejection.
- The local fixture used throughout verification is `pactflow-wallet-test@local.invalid`; it is accepted only through the existing loopback test boundary and does not emulate a wallet or bypass production auth.
- `npm.cmd run typecheck` passed; `npm.cmd run build` passed with only existing upstream Privy/viem optional-dependency warnings; `npm.cmd test` passed 98 tests with 6 intentional skips; `npm.cmd run test:routes --workspace frontend` passed 9 tests; `npm.cmd run contracts:check --workspace backend` passed; `git diff --check` passed.
- Combined-start smoke passed with the root `npm start`: Next and Node opened on ports 3000/3001, `/health` returned `200`, `/api/session` returned `200` with `mode: local-test-auth` for the tracker email, and `/home` rendered `200`. No remaining ticket gaps.
