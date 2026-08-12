# 04 — Profile Settings and private avatar workflow

**What to build:** A User Profile can open typed Profile Settings, view its current private settings, update allowed fields, and safely manage a private avatar through the existing Profile-scoped backend workflow.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** complete (2026-08-12)

- [x] Profile Settings renders as a typed Next route with loading, save, validation, private-avatar fallback, and failure states.
- [x] Profile updates and avatar references remain restricted to the authenticated User Profile and preserve the existing safe-path and signed-URL boundaries.
- [x] Tests cover successful save, malformed input, unauthenticated access, inaccessible avatar fallback, and attempted cross-profile update rejection.

## Evidence

- Replaced the /settings static rewrite with the typed App Router route frontend/app/settings/page.tsx and frontend/src/settings/settings.tsx. The route uses the shared authenticated shell and renders loading, unavailable-session, validation, save-success, upload-failure, and protected-save-failure states.
- Profile Settings hydrates display name, professional headline, bio, avatar colour, discoverability, and the private-avatar/fallback presentation from the caller-owned /api/session Profile. Successful protected saves update the shared shell identity immediately.
- Real authenticated avatar uploads use the configured Supabase profile-images bucket, a caller-owned profileId/avatar.{jpg|png|webp} path, and short-lived signed URLs. The backend PUT /api/profile/settings workflow validates the path against the authenticated Profile and never accepts a client-supplied Profile identity.
- The loopback-only pactflow-wallet-test@local.invalid fixture was used for authenticated session and Profile Settings API coverage; it remains explicitly opt-in, .invalid-only, loopback-only, and production-disabled.
- Verification: frontend production build passed; rendered Next route smoke passed with /settings returning 200; frontend/backend typecheck passed; typed Settings presentation, route parity, authenticated API, malformed-input, unauthenticated, cross-profile, and inaccessible-avatar tests passed; full npm.cmd test passed with 75 passing and 6 pre-existing skips; git diff --check passed.

## Remaining gaps

- The local .invalid fixture intentionally does not emulate Supabase Storage uploads, so its browser path verifies authenticated Settings saves and deterministic-avatar fallback rather than a durable image upload. Real Supabase sessions use the protected Storage and signed-URL path above; this is a test-fixture limitation, not an acceptance gap.
