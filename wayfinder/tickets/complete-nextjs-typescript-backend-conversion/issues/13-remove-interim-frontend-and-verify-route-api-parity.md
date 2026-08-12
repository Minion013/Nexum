# 13 — Remove interim frontend and verify route/API parity

**What to build:** After every page/workflow slice is complete, PactFlow removes the interim static-page conversion layer and proves that Next routes and the Node API satisfy every preserved frontend/backend contract.

**Blocked by:** 03 — People Directory and Contacts compatibility; 04 — Profile Settings and private avatar workflow; 05 — Private Notifications workflow; 06 — Authority Registry read model and page; 09 — Contract publishing and authoring deep links; 10 — Dynamic Contract detail and exact-version acceptance; 11 — Standalone Wallet; 12 — Invitation acceptance.

**Status:** ready-for-agent

- [ ] Static page rewrites, direct DOM page modules, unchecked browser modules, generated legacy bundles, and their obsolete build path are removed without restoring backend file serving.
- [ ] Every inventory route has a route-to-backend parity test covering its critical success and failure behavior, access boundary, and responsive primary action.
- [ ] Frontend type checks, production build, backend checks, API tests, route tests, and combined-start smoke tests pass with Next rendering pages and proxying API/health requests to Node.
