# 07 — Deliver My network and Requests

**Parent:** [PactFlow post-login retired model redesign specification](../post-login-retired model-redesign-spec.md)

**What to build:** People provides My network for accepted professional connections and Requests for pending connection activity, allowing a user to send, receive, accept, decline, withdraw, or remove connections while keeping those relationships separate from Contract Party status and Contract Party access.

**Blocked by:** 06 — Deliver People discovery; existing “Connection record and safety model” decision.

**Status:** ready-for-agent

- [ ] Users can complete the agreed connection-request lifecycle through My network and Requests with clear pending and accepted states.
- [ ] Connection actions neither create Contract Party status nor grant Contract access.
- [ ] Requests and network lists remain private to the authorised user and handle empty, loading, and error states.
- [ ] Authorization and lifecycle tests cover accepted, declined, withdrawn, removed, and blocked states defined by the connection safety model.
