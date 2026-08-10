# 09 — Eliminate cross-route profile loading jitter

**Parent:** [PactFlow post-login retired model redesign specification](../post-login-retired model-redesign-spec.md)

**What to build:** Make the signed-in shell’s identity area feel deliberate on every route change. A user should move from a stable loading state straight to their resolved avatar and display name, rather than watching the shell progressively replace `PF Profile`, initials, and then the private profile image.

**Blocked by:** 01 — Establish the responsive signed-in app shell; 05 — Deliver Profile Settings and discoverability foundation.

**Status:** in-progress — authenticated fallback browser acceptance verified 2026-08-10; private-image browser acceptance remains.

- [x] Treat the sidebar/mobile identity area as one resolved unit. While the authenticated Profile and its usable private-avatar URL are loading, render a stable, dimensionally reserved loading treatment; do not expose the generic `PF Profile` identity before real Profile data is ready.
- [x] Once the Profile is resolved, reveal the display name and private profile image together in a single visual transition. Do not progressively replace initials with an image after the name is already visible.
- [x] When the Profile has no image, or its private image cannot be resolved, reveal the deterministic initials/avatar fallback and display name together. This is the only intended non-image identity presentation.
- [x] Apply the same behavior on initial signed-in load and while navigating between all signed-in destinations, including Profile Settings. Loading must not cause layout shifts, avatar shape changes, or a flash of another account’s identity.
- [x] Preserve existing authenticated/private-avatar guarantees: only the current user’s signed avatar URL may be rendered, and an unavailable image must fail safely to the deterministic fallback without blocking navigation.
- [ ] Add focused automated coverage for delayed session/profile/avatar resolution and browser acceptance across signed-in navigation. Verify that the intermediate `PF Profile` then initials then image sequence cannot recur; retain the full test suite, typecheck, and production-build regression gates.

**Out of scope:** Replacing the existing private-avatar storage model, adding cross-account profile-image caching, or redesigning Profile Settings beyond the shared signed-in identity loading behavior.

## Evidence recorded 2026-08-09

- Replaced the signed-in shell's literal `PF / Profile` placeholder with an accessible, dimensionally reserved loading identity on Dashboard, Contracts, People, and Profile Settings. The menu now waits for both the authenticated Profile and a successfully loaded/decoded private avatar before it atomically renders either the image-and-name pair or the deterministic initials-and-name fallback.
- Added a render version per profile menu, so an older asynchronous avatar resolution cannot overwrite a newer Profile update or expose a stale account identity.
- Added the same loading-to-resolved profile identity to the mobile navigation drawer, removed the Dashboard's independent name update, and decoupled Profile loading from the notification request so notification latency cannot hold the identity state open.
- Verification: focused delayed-avatar/fallback/static-markup tests (4), `npm.cmd run typecheck`, production build, `npm.cmd test` (57 passing), and `git diff --check` pass.

## Evidence recorded 2026-08-10

- Local test authentication with `pactflow-wallet-test@local.invalid` exercised Dashboard, Contracts, People, and Profile Settings on `127.0.0.1:3456`. Every desktop route began with the reserved 147.2 × 48 px loading identity, contained no `PF Profile` or stale profile name, and resolved directly to `Local Wallet Tester` plus the deterministic `LW` fallback at the same dimensions.
- At 390 px wide, each route retained no `PF Profile`; the opened mobile drawer resolved to the same current Profile fallback. The delayed-avatar tests separately prove the private image and name resolve atomically, while failed or unavailable private images resolve safely to the deterministic fallback.
- Verification: `npm.cmd test -- test/profile-identity.test.mjs` (4 passing), `npm.cmd run typecheck`, `npm.cmd test` (65 passing), production `npm.cmd run build`, and `git diff --check` pass.

## Remaining gaps

- Verify a signed-in browser run with a current Profile that has a usable private image across Dashboard, Contracts, People, and Profile Settings. The documented local fixture has no private image, so its completed browser run proves only the deterministic-fallback path; the focused resolver tests are not a replacement for live image-path navigation acceptance.
