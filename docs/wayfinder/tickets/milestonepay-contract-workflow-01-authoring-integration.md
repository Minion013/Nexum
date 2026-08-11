# 01 - Deliver four-step Contract Draft authoring

**What to build:** An initiator can choose an existing Person or exact-email counterparty, enter Project Details including Buyer or Service Provider responsibility, edit generated terms, and Send a validated Contract Draft through the protected invitation flow.

**Blocked by:** None - can start immediately.

**Status:** complete 2026-08-11

- [x] The Contract Draft creation experience exposes Choose person, Project details, Review terms, and Send as an accessible, navigable stepper.
- [x] Choose person offers existing-Person selection and exact-email entry without granting Contract access before the explicit send action.
- [x] Project details captures the initiator's Contract responsibility and produces an editable two-to-three-milestone schedule with evidence requirements, review windows, and at least one required Acceptance Criterion per milestone.
- [x] Review terms presents the complete editable Contract version and preserves proposal-only wording for unapproved allocations.
- [x] Send uses the protected Contract Draft validation, versioning, and invitation workflow; unauthorised users and invalid schedules remain rejected.

## Evidence

- The Contracts route provides the accessible Choose person, Project details, Review terms, and Send stepper. It lists accepted People as email shortcuts, keeps exact-email entry available, and makes no Contract mutation before Send.
- Project details creates an editable two-milestone schedule. Review terms now directly edits scope, deliverables, allocation, funding deadline, each milestone's title/outcome/allocation/private-safe evidence/required Acceptance Criterion/deadline/review window, and the evidence/change-control rules. The page labels allocations as proposed terms rather than secured or released money.
- Send composes authenticated Contract creation, protected draft validation/versioning, and exact-email invitation endpoints. The client now submits complete Contract Party sections and ordered post-funding deadlines to the protected Version endpoint before invitation. The server rejects missing required Acceptance Criteria before the protected RPC is called; migration `20260810110000_require_milestone_acceptance_criteria.sql` applies the same invariant to direct authenticated RPC calls.
- Focused page-flow coverage verifies the complete two-milestone payload, required criteria, party mapping, ordering, and invitation recipient. `npm.cmd test` passes 68 tests; `npm.cmd run typecheck`, `npm.cmd run build`, and `git diff --check` pass on 2026-08-11.
- A real confirmed Supabase user, `pactflow-contract-authoring-test@local.invalid`, completed the linked-project authenticated create, protected Version update, and exact-email invitation sequence on 2026-08-11. This run exposed and fixed missing excluded-work and initiator-notice fields; it used the ordinary authenticated endpoint path, not a local simulator.
- Review terms now directly renders controls for Contract Party responsibilities, exclusions, dependencies, payment fee terms, IP/confidentiality, notice contacts, and acknowledgement rules, as well as the existing editable two-or-three-milestone schedule.

## Remaining gaps

- **Follow-up 2026-08-11:** The four-step flow now permits an initiator to publish a durable, private Contract Draft without selecting a Person. Selecting a Person remains optional until Send; sending to one creates the shared finalised Contract Version through the protected invitation boundary.
