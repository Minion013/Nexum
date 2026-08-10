# 01 — Deliver four-step Contract Draft authoring

**What to build:** An initiator can choose an existing Person or exact-email counterparty, enter Project Details including Buyer or Service Provider responsibility, edit generated terms, and Send a validated Contract Draft through the protected invitation flow.

**Blocked by:** None — can start immediately.

**Status:** in-progress 2026-08-10

- [ ] The Contract Draft creation experience exposes Choose person, Project details, Review terms, and Send as an accessible, navigable stepper.
- [ ] Choose person offers existing-Person selection and exact-email entry without granting Contract access before the explicit send action.
- [ ] Project details captures the initiator's Contract responsibility and produces an editable two-to-three-milestone schedule with evidence requirements, review windows, and at least one required Acceptance Criterion per milestone.
- [ ] Review terms presents the complete editable Contract version and preserves proposal-only wording for unapproved allocations.
- [ ] Send uses the protected Contract Draft validation, versioning, and invitation workflow; unauthorised users and invalid schedules remain rejected.

## Evidence (2026-08-10)

- The Contracts route now provides the accessible Choose person, Project details, Review terms, and Send stepper. It lists accepted People as email shortcuts, keeps exact-email entry available, and makes no Contract mutation before Send.
- Project details generates two editable milestones. Each has private-safe evidence requirements, an explicit review window, ordered editable deadlines, and required Acceptance Criteria. The Review terms copy labels allocations as proposed terms rather than secured or released money.
- Send composes the existing authenticated Contract creation, protected draft validation/versioning, and exact-email invitation endpoints. The server rejects missing required Acceptance Criteria before the protected RPC is called; the new database migration applies the same invariant to direct authenticated RPC calls.
- Verified locally: focused tests and the full 67-test suite, typecheck, production build, and `git diff --check` pass. The linked migration dry run selects only `20260810110000_require_milestone_acceptance_criteria.sql`.

## Remaining gaps

- The required linked Supabase migration has not been applied: applying it mutates the shared remote database and requires explicit user approval. Until it is applied, direct authenticated RPC calls are not database-enforced for the new Acceptance Criteria invariant.
- The local test-email fixture is intentionally limited to profile/navigation fixtures and has no durable Contract Party in the linked project, so it cannot verify the authenticated Send flow in a browser. A linked-project browser run with a real Contract Party remains required after the migration is approved.
- Review terms currently keeps Project details editable through Back navigation rather than rendering every typed Contract Section as directly editable in the Review terms panel. The primary page seam also needs mocked coverage for step gating, generated-schedule edits, and the successful create → version → invitation sequence.
