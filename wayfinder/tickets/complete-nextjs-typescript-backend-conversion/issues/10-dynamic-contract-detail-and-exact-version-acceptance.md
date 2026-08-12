# 10 — Dynamic Contract detail and exact-version acceptance

**What to build:** A Contract Party can open a typed dynamic Contract detail route, see only authorised lifecycle and terms data, and record acceptance only for an exact wallet-signed Contract Version.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** ready-for-agent

- [ ] Dynamic Contract detail and review state render loading, missing, unauthenticated, forbidden, and authorised Contract states distinctly.
- [ ] Contract data and Contract Acceptance use the protected backend workflow, preserving exact-version and wallet-signature checks without exposing server-only credentials.
- [ ] Tests cover Contract Party access, non-party rejection, exact-version success, stale/mismatched signature rejection, and truthful lifecycle presentation.
