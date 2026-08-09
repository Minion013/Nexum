# 05 — Deliver Profile Settings and discoverability foundation

**Parent:** [PactFlow post-login workspace redesign specification](../post-login-workspace-redesign-spec.md)

**What to build:** A User Profile has an accessible Profile Settings destination from the avatar menu and can control the protected discoverability required to appear in signed-in People discovery. Refine the profile experience so identity, image selection, and notifications are clear and accessible; Workspace Settings remains workspace-owned and is not exposed from personal-profile surfaces.

**Blocked by:** 01 — Establish the responsive signed-in app shell; existing “Profile persistence and access model” decision.

**Status:** complete — re-verified 2026-08-09.

- [x] Avatar initials always meet accessible text contrast against every assigned avatar background colour, including the base-profile avatar. Evidence: the shared presentation helper calculates every assigned colour at WCAG AA contrast or higher.
- [x] The signed-in shell reliably resolves the current Profile: after login, the bottom-left identity control must not remain on the `PF Profile` fallback once profile data is available. Evidence: the shared shell reads `/api/session` and replaces the placeholder with the authenticated Profile.
- [x] The bottom-left signed-in identity control truncates an overlong display name with an ellipsis without breaking its layout or obscuring the accessible full name. Evidence: constrained ellipsis styling retains the full name in the title and profile-menu accessible name.
- [x] Move the notification control beside the username in the bottom-left signed-in identity area, with an accessible name and comfortable target size. Retain the dashboard notification control; remove the separate notification control from Profile Settings. Evidence: the shell adds a labelled 42px sidebar bell and retains the Dashboard bell.
- [x] Profile Settings is reachable from the avatar menu and presents personal identity settings only. Remove Workspace Settings links and sub-links from Profile Settings and the bottom-left profile area; Workspace Settings is configured only inside its owning Workspace. Evidence: served-page coverage verifies the personal menu and Settings copy omit Workspace Settings.
- [x] The private profile-image selector replaces the native-looking `Browse` affordance with a clear image-selection control. Before saving, it previews the selected image (or clearly represents the current image/fallback avatar), identifies the selected file where useful, and lets the user change it. Evidence: the clear Choose/Change control reports the filename and previews a selected image before save.
- [x] Saving a profile image uses the configured authenticated Supabase client and succeeds without a `supabase is not defined` error. If either profile data or image upload fails, communicate the precise outcome and retain the user’s unsaved image selection where possible. Evidence: `workspace.js` imports the configured `supabase` client; save coverage covers protected-save success and upload failure while the UI retains the selection on errors.

## Verification recorded 2026-08-09

- `npm.cmd run typecheck` passes.
- Focused presentation, Profile Settings, authenticated API, and People discovery coverage passes (12 tests).
- `npm.cmd test` passes (51 tests).
- `npm.cmd run build` passes when esbuild is allowed to read its external Node dependencies; the sandbox-only build failure was environmental.
- The linked-project `supabase/tests/durable-access-rls.sql` regression passes, including the new cross-Profile row read/write denial.
- Standards and spec review completed. The authorization evidence gap was resolved; unrelated pre-existing Dashboard and Contracts worktree changes remain outside this ticket's scope.

**Resolution 2026-08-09:**

- [x] The image-selection control is a clear private-image upload card with accepted-format, size, privacy, and selected-file feedback.
- [x] Saved images are resolved only through an authenticated, short-lived private Storage URL and rendered in both the Profile Settings preview and signed-in sidebar identity control; unavailable Storage safely falls back to initials.
- [x] Every avatar has a square aspect ratio, clipped image content, and a 50% border radius, preventing sidebar distortion into an oval.

**Verification recorded 2026-08-09:** `npm.cmd test` passes all 53 tests, including short-lived private-avatar URL and fallback coverage; `npm.cmd run typecheck` and the elevated production client build pass.

**Remaining gaps:** None for this ticket’s acceptance criteria.
- [x] The Discoverability checkbox and the text `Allow signed-in PactFlow users to discover this Profile` are horizontally aligned as one control, with the label activating the checkbox and a usable hit target. Evidence: the labelled flex control has a 42px minimum target.
- [x] Persisted profile fields and discoverability controls use protected storage and authenticated APIs; unavailable future settings are not interactive placeholders. Evidence: authenticated API and private Storage path validation remain covered by `supabase-session.test.mjs`.
- [x] Only opted-in eligible Profiles can be surfaced by future People discovery reads. Evidence: linked-project RLS regression verifies a discoverable Profile appears through `discover_people` and a private Profile does not.
- [x] Authorization tests prove a user can manage only their own Profile settings and cannot infer protected details from another Profile. Evidence: API coverage ignores caller-supplied Profile IDs and the linked-project RLS regression denies another Profile's row reads and updates.
