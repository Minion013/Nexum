# 05 — Private Notifications workflow

**What to build:** A signed-in User Profile can use a typed Notifications page to view only its private notification entries, see unread state, and mark an allowed entry read through the authenticated backend workflow.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** ready-for-agent

- [ ] Notifications renders loading, valid-empty, populated, error, and read-transition states through Next components.
- [ ] List and read operations use the authenticated backend contract and preserve Profile-scoped notification privacy.
- [ ] Tests cover unread count, valid read state changes, unauthenticated rejection, and rejection of another Profile's notification identifier.
