# 07 — Contracts list and authoring entry

**What to build:** A Contract Party can open typed Contracts, see only authorised Contract records, filter them, and begin a new Contract authoring flow by choosing an existing Person or exact-email counterparty without granting Contract access.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** ready-for-agent

- [ ] Contracts and initial authoring routes render through typed Next components and retain responsive list/filter behavior.
- [ ] Contract data and counterparty choices come from authorised backend workflows; a selected Person or email alone never gains draft access.
- [ ] Tests cover empty/populated/filter states, unauthorised Contract exclusion, Person selection, exact-email validation, and transition into the persisted authoring flow.
