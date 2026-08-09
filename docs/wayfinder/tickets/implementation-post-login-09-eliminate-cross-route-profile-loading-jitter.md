# 09 — Eliminate cross-route profile loading jitter

**Parent:** [PactFlow post-login workspace redesign specification](../post-login-workspace-redesign-spec.md)

**What to build:** Make the signed-in shell’s identity area feel deliberate on every route change. A user should move from a stable loading state straight to their resolved avatar and display name, rather than watching the shell progressively replace `PF Profile`, initials, and then the private profile image.

**Blocked by:** 01 — Establish the responsive signed-in app shell; 05 — Deliver Profile Settings and discoverability foundation.

**Status:** in-progress — claimed 2026-08-09.

- [ ] Treat the sidebar/mobile identity area as one resolved unit. While the authenticated Profile and its usable private-avatar URL are loading, render a stable, dimensionally reserved loading treatment; do not expose the generic `PF Profile` identity before real Profile data is ready.
- [ ] Once the Profile is resolved, reveal the display name and private profile image together in a single visual transition. Do not progressively replace initials with an image after the name is already visible.
- [ ] When the Profile has no image, or its private image cannot be resolved, reveal the deterministic initials/avatar fallback and display name together. This is the only intended non-image identity presentation.
- [ ] Apply the same behavior on initial signed-in load and while navigating between all signed-in destinations, including Profile Settings. Loading must not cause layout shifts, avatar shape changes, or a flash of another account’s identity.
- [ ] Preserve existing authenticated/private-avatar guarantees: only the current user’s signed avatar URL may be rendered, and an unavailable image must fail safely to the deterministic fallback without blocking navigation.
- [ ] Add focused automated coverage for delayed session/profile/avatar resolution and browser acceptance across signed-in navigation. Verify that the intermediate `PF Profile` then initials then image sequence cannot recur; retain the full test suite, typecheck, and production-build regression gates.

**Out of scope:** Replacing the existing private-avatar storage model, adding cross-account profile-image caching, or redesigning Profile Settings beyond the shared signed-in identity loading behavior.

## Evidence recorded 2026-08-09

- Replaced the signed-in shell's literal `PF / Profile` placeholder with an accessible, dimensionally reserved loading identity on Dashboard, Contracts, People, and Profile Settings. The menu now waits for both the authenticated Profile and a successfully loaded/decoded private avatar before it atomically renders either the image-and-name pair or the deterministic initials-and-name fallback.
- Added a render version per profile menu, so an older asynchronous avatar resolution cannot overwrite a newer Profile update or expose a stale account identity.
- Added the same loading-to-resolved profile identity to the mobile navigation drawer, removed the Dashboard's independent name update, and decoupled Profile loading from the notification request so notification latency cannot hold the identity state open.
- Verification: focused delayed-avatar/fallback/static-markup tests (4), `npm.cmd run typecheck`, production build, `npm.cmd test` (57 passing), and `git diff --check` pass.

## Remaining verification gap

- Perform signed-in browser acceptance on Dashboard, Contracts, People, and Profile Settings with a private image and without one. Confirm that every route starts with the reserved loading treatment and resolves directly to the current Profile's image-and-name or initials-and-name fallback, with no layout shift or stale-account flash. This session could not start the local server because PowerShell's inherited environment contains conflicting `Path` and `PATH` entries; no authenticated browser session was available.
