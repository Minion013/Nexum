# 05 — Private Notifications workflow

**What to build:** A signed-in User Profile can use a typed Notifications page to view only its private notification entries, see unread state, and mark an allowed entry read through the authenticated backend workflow.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** complete (2026-08-12)

- [x] Notifications renders loading, valid-empty, populated, error, and read-transition states through Next components.
- [x] List and read operations use the authenticated backend contract and preserve Profile-scoped notification privacy.
- [x] Tests cover unread count, valid read state changes, unauthenticated rejection, and rejection of another Profile's notification identifier.

## Evidence

- Replaced the `/notifications` static rewrite with `frontend/app/notifications/page.tsx` and the typed `frontend/src/notifications/notifications.tsx` client. The page renders loading, valid-empty, populated, service-error, unread, read, and mark-read transition states; successful reads update both the inbox count and the shared signed-in shell indicator.
- Real authenticated sessions continue through `GET /api/notifications` and `POST /api/notifications/:id/read`, backed by `list_my_notifications` and `mark_my_notification_read`. The Supabase RPC path derives Profile scope from the authenticated session and does not accept a client Profile identifier.
- The loopback-only `pactflow-wallet-test@local.invalid` fixture now provides one private unread entry and a stateful read transition for local browser/API verification. A different notification identifier is rejected, the configured email is required, and the fixture remains `.invalid`-only, loopback-only, and production-disabled.
- Added typed route/source parity assertions, rendered Next route smoke coverage, visible notification-state rendering coverage, authenticated API coverage, two-Profile RPC ownership coverage, and local-fixture coverage. On 2026-08-12: `npm.cmd run build --workspace frontend` passed; `npm.cmd run typecheck` passed; `npm.cmd run test:routes --workspace frontend` passed (2); focused conversion and notification tests passed (44); full `npm.cmd test` passed (79 tests, 6 intentional skips); `git diff --check` passed.

## Remaining gaps

- None for this ticket. Legacy notification HTML/CSS/bundle artifacts remain intentionally deferred to Conversion Ticket 13, which removes the interim frontend only after the remaining conversion routes have parity coverage.
