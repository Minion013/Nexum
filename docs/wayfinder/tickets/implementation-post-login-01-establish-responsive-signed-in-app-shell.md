# 01 — Establish the responsive signed-in app shell

**Parent:** [PactFlow post-login retired model redesign specification](../post-login-retired model-redesign-spec.md)

**What to build:** Authenticated users navigate every signed-in PactFlow page through one calm, accessible retired model shell: a compact desktop sidebar, mobile drawer and bottom navigation, avatar menu, active-route treatment, and the canonical People destination. Existing Contacts links continue to reach People safely during the route transition.

**Blocked by:** None — can start immediately.

**Status:** complete — verified 2026-08-08.

- [x] Desktop navigation, mobile navigation, and profile-menu controls expose meaningful labels, current state, and keyboard-operable expanded state.
- [x] Navigation uses normal-weight labels with semibold reserved for the active destination and key actions; visible focus and reduced-motion behavior are preserved.
- [x] Authenticated pages render inside the shared shell, with no content obscured by fixed navigation at the supported breakpoints.
- [x] Canonical People and legacy Contacts routes are covered by authenticated route behavior tests.

## Evidence recorded 2026-08-08

- `app-shell.js` now normalises the desktop sidebar, mobile drawer, bottom navigation, and avatar menu across signed-in pages. Drawer and profile controls expose labelled expanded state; closing the drawer by its control or keyboard dismissal restores the collapsed state. The canonical destinations are Dashboard, Contracts, People, retired models, and Settings.
- The responsive shell reserves mobile bottom-navigation space, retains visible focus treatment, uses normal-weight navigation with semibold active/key-action treatment, and disables animation under reduced-motion preferences.
- The route test proves `/contacts` serves exactly the canonical `/people` page, which exposes the People navigation and does not restore the obsolete Contacts-directory content.
- Verified with `npm.cmd run typecheck`, `npm.cmd test` (48 passing), `npm.cmd run build`, and `git diff --check`.

## Remaining gaps

None for this ticket's acceptance criteria.
