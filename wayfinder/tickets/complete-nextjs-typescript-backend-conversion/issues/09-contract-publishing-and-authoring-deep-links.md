# 09 — Contract publishing and authoring deep links

**What to build:** A Contract initiator can use typed Send pages to publish a valid Contract Draft through the protected invitation workflow, and can return directly to every existing-draft authoring URL with correct authorised state.

**Blocked by:** 08 — Contract project details and editable terms.

**Status:** ready-for-agent

- [ ] Send and all existing-draft authoring URLs render from typed Next routes and restore the correct authorised draft/step state.
- [ ] Publishing performs full server-side validation and protected exact-email invitation behavior; invalid or unshared drafts remain private.
- [ ] Tests cover direct-link restoration, successful publish/invitation, incomplete draft rejection, stale/forbidden draft access, and mobile Send behavior.
