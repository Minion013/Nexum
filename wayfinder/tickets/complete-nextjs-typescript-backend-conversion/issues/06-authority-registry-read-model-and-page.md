# 06 — Authority Registry read model and page

**What to build:** Users can open Authorities as a typed signed-in Next route and see a durable, safe Authority Registry read model with Resolution Authorities, jurisdictions, and available rulesets instead of a hard-coded placeholder.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** ready-for-agent

- [ ] The backend provides an authorised, safe Authority Registry read model backed by durable data, including required schema/migration work when it is absent.
- [ ] Authorities renders populated, valid-empty, loading, unavailable, and forbidden states without claiming unavailable registry data exists.
- [ ] Tests cover populated and empty registry behavior, unavailable-service handling, safe response fields, and access policy.
