# 02 — Signed-in shell and Dashboard

**What to build:** A signed-in User Profile receives a shared, responsive PactFlow application shell and a typed Dashboard at the preserved URL. Dashboard presents only authorised Home data and makes loading, empty, error, and populated states clear.

**Blocked by:** 01 — Typed landing and authentication entry.

**Status:** ready-for-agent

- [ ] Shared signed-in navigation, profile identity, notification indicator, avatar menu, and responsive navigation preserve their existing destinations and accessibility behavior.
- [ ] Dashboard reads the authenticated Home workflow and correctly renders loading, empty, failure, and Contract-action states.
- [ ] Route/API tests prove unauthenticated users are redirected or shown the established state and that the page exposes only the caller's authorised data.
