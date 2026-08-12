# 02 — Signed-in shell and Dashboard

**What to build:** A signed-in User Profile receives a shared, responsive PactFlow application shell and a typed Dashboard at the preserved URL. Dashboard presents only authorised Home data and makes loading, empty, error, and populated states clear.

**Blocked by:** 01 — Typed landing and authentication entry.

**Status:** complete (2026-08-12)

- [x] Shared signed-in navigation, profile identity, notification indicator, avatar menu, and responsive navigation preserve their existing destinations and accessibility behavior.
- [x] Dashboard reads the authenticated Home workflow and correctly renders loading, empty, failure, and Contract-action states.
- [x] Route/API tests prove unauthenticated users are redirected or shown the established state and that the page exposes only the caller's authorised data.

## Evidence

- Replaced the /home static HTML rewrite with the typed App Router route frontend/app/home/page.tsx, a reusable signed-in shell, and a typed Dashboard client.
- The shell preserves Dashboard, Contracts, Wallet, and People destinations; maps /contacts to People for active navigation; provides profile identity with private-avatar URL fallback, live aria-expanded avatar-menu state, and sign-out; includes the private notification unread indicator with an explicit unavailable state; and supplies desktop sidebar, mobile drawer, and bottom navigation with labelled controls and focus-visible styling.
- Added the typed browser auth seam for Supabase sessions and the loopback-only fixture stored by the existing login flow. The shell loads /api/session and /api/notifications; the Dashboard loads /api/home and renders loading, empty, failure, attention, active, and completed Contract states without presenting unverified money.
- Removed the /home rewrite and corrected the legacy build entrypoint resolution so the required frontend production build runs on Windows.
- Added rendered /home route coverage, typed shell/Dashboard source coverage, and an unauthenticated /api/home rejection assertion. Existing backend Home-loader and RLS tests continue to prove that Home data is scoped to the authenticated Profile.
- Verification on 2026-08-12: npm.cmd run build --workspace frontend passed; npm.cmd run typecheck passed; npm.cmd run test:routes --workspace frontend passed (1); npm.cmd test passed (72, 6 intentionally skipped); git diff --check passed.

## Remaining gaps

None for this ticket. People, Profile Settings, Notifications, Authorities, Contracts, Wallet, invitation, and interim-frontend removal work belongs to subsequent conversion tickets.
