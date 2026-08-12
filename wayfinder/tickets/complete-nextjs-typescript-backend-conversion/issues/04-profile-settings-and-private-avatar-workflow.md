# 04 — Profile Settings and private avatar workflow

**What to build:** A User Profile can open typed Profile Settings, view its current private settings, update allowed fields, and safely manage a private avatar through the existing Profile-scoped backend workflow.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** ready-for-agent

- [ ] Profile Settings renders as a typed Next route with loading, save, validation, private-avatar fallback, and failure states.
- [ ] Profile updates and avatar references remain restricted to the authenticated User Profile and preserve the existing safe-path and signed-URL boundaries.
- [ ] Tests cover successful save, malformed input, unauthenticated access, inaccessible avatar fallback, and attempted cross-profile update rejection.
