# 05 — Verify responsive MilestonePay-informed Contract experiences

**What to build:** Contract Parties can complete and govern the new Contract workflow confidently at desktop and mobile widths, with accessible controls, Contract-only language, and protected behaviour verified end to end.

**Blocked by:** 04 — Deliver truthful review-window and payment states.

**Status:** complete 2026-08-16

- [x] Authenticated API coverage verifies four-step creation, invitation boundaries, Acceptance Criteria persistence, evidence access, review decisions, review expiry, and payment-state provenance.
- [x] Contract-page coverage verifies step navigation, editable Review terms, Evidence/Criteria/Activity context, gated decisions, revision and dispute actions, and Contract-only copy.
- [x] Desktop and narrow-screen checks verify equivalent authoring and Milestone Review actions without horizontal overflow.
- [x] Accessibility checks verify labelled controls, keyboard operation, focus order, and clear status announcements for phase and review changes.

## Evidence — 2026-08-16

- Authenticated API coverage passes with `PACTFLOW_LOCAL_TEST_EMAIL=pactflow-wallet-test@local.invalid`: `backend/test/supabase-session.test.mjs` (43/43), `backend/test/milestone-review.test.mjs` (6/6), and `backend/test/next-route-api-parity.test.mjs` (3/3). These cover the four-step durable draft/invitation boundary, Acceptance Criteria persistence, private evidence, gated acceptance, revision/dispute decisions, expiry/release eligibility, and proposed-versus-chain-authoritative settlement provenance.
- Contract-page source and route coverage passes in `frontend/test/milestone-review-accessibility.test.mjs` (3/3), `frontend/test/milestone-review-presentation.test.mjs` (5/5), and route/API parity. The page exposes the Choose Person → Project details → Review terms → Send stepper, editable Review terms, Evidence/Criteria/Activity tabs, Contract-only language, and the protected decision actions.
- Browser verification used the tracker email on a production Next server: at 1280px and 390px, the authoring and Milestone Review routes had no page-level horizontal overflow; the same Evidence, Criteria, Activity, revision, dispute, and acceptance actions remained available. Keyboard ArrowRight moved focus from Evidence to Criteria and updated the selected tab.
- Accessibility verification covers labelled form controls, roving tab focus with ArrowLeft/ArrowRight/Home/End, `role=tabpanel` relationships, phase and decision `aria-live` announcements, and the responsive authoring/review CSS. Frontend full suite passes 34/34; frontend typecheck and production build pass.

## Remaining gaps

- No Ticket 05 acceptance gaps remain. The full backend suite still reports seven unrelated legacy route-conversion assertions expecting a `SignedInShell` string in typed route files; the scoped Ticket 05 suites pass. Production build output retains existing upstream Privy/viem and optional-dependency warnings.
