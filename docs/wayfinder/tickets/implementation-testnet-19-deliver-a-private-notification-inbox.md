# 19 — Deliver a private notification inbox for Project actions

**What to build:** Every signed-in user has a private, durable inbox for actions and state changes relevant to their own Profiles, retired models, Projects, and invitations. The inbox is the in-product source of truth; delivery email is optional and must never expose sensitive Contract details.

**Blocked by:** 02 — Establish secure profiles, sessions, and retired models; 03 — Invite project participants without widening retired access.

**Status:** partial — durable inbox foundation

- [ ] The signed-in shell provides a clearly labelled notification control with unread count and a dedicated inbox. It supports unread/read state, time, source Project/retired model, and a safe deep link.
- [ ] Invitations, Contract Draft shares, approval requests, funding outcomes, evidence submissions, review-window events, dispute updates, amendments, and settlement outcomes create an idempotent notification for every authorised recipient.
- [ ] RLS ensures a user can read and update only their own inbox entries. Notification text and deep links never disclose a Contract Draft, Project, retired model, or counterparty they are not authorised to access.
- [ ] The initial MVP uses in-app notifications. Any email delivery is a separate opt-in enhancement and includes only a minimal alert and safe sign-in link.

## 8 August 2026 update — durable inbox foundation

- [x] `profile_notifications` is a durable, idempotent per-Profile inbox. The signed-in shell exposes an unread-count control and `/notifications` provides read/unread state, timestamps, and safe private-Contract links.
- [x] Exact-email Contract invitations, invitation acceptance, ready-for-review Versions, and wallet-backed Contract acceptances create private, idempotent inbox events for the relevant existing Profile or Contract Party. The event copy does not expose Contract terms or counterparty details.
- [x] Migrations `20260808120000` and `20260808120500` are applied to the linked Supabase project. The rollback-only RLS proof verifies invitation inbox isolation and self-only marking as read; `supabase db lint --linked` reports no schema errors. `npm.cmd --prefix web test` passes 45 tests, and typecheck/client build pass.
- [ ] Ticket 19 remains **Partial — durable inbox foundation**. The current data model has no durable Project source yet, and funding, evidence, review-window, dispute, amendment, and settlement workflows do not exist to emit their required notifications. Browser end-to-end verification is also still open.
