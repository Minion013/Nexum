# 02 — Retire legacy Contract authoring and routes

**What to build:** A participant creates, shares, edits, and reviews a Contract Draft directly with another person using Contract-only language, while obsolete retired model, Contract Draft, and Contract routes no longer expose a product experience.

**Blocked by:** 01 — Establish Profile-owned Contract access.

**Status:** complete 2026-08-10

**Evidence (2026-08-10):** Retired `/workspace`, `/workspace-list.html`, and `/api/workspaces` paths now return normal not-found responses. The Contract list and creation flow use Contract Draft, counterparty, and responsibility language without a Workspace selector; Profile-owned review reads only Contract Parties and Profiles. Focused authenticated route/API coverage, typecheck, production build, and the full 59-test suite pass.

**Browser verification:** The local browser harness continued to reject fresh OTP sessions at `/api/session`, independently of the in-app and Chrome browser surfaces. The product behavior implemented by this ticket was subsequently verified by the product owner in their browser; the local harness handoff issue is not a remaining acceptance gap for this ticket.

- [ ] Contract creation selects a counterparty and responsibility without a retired model selector or bilateral party concept.
- [ ] Draft, invitation, review, and acceptance user copy uses Contract only.
- [ ] Every retained Contract action reaches the Profile-owned Contract workflow and remains authorization-protected.
- [ ] Obsolete routes redirect only to a safe equivalent or return normal not-found behavior.
- [ ] End-to-end creation and authorization behavior, terminology, and full regression checks pass.
