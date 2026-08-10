# 08 — Connect People to Contract Draft creation

**Parent:** [PactFlow post-login retired model redesign specification](../post-login-retired model-redesign-spec.md)

**What to build:** An initiator can select an established Person from their network while creating a Contract Draft, while preserving exact-email creation for a new Person. The selection makes entry easier but does not silently invite, share, add Contract Party status, or change Contract access.

**Blocked by:** 04 — Deliver role-led Contract Draft creation; 07 — Deliver My network and Requests.

**Status:** ready-for-agent

- [ ] Contract Draft creation offers a People-based counterparty selection path alongside the existing exact-email fallback.
- [ ] Selecting a Person pre-fills only the allowed counterparty information and still requires the explicit Contract Draft creation and sharing steps.
- [ ] The UI distinguishes a selected connection from a Contract Party or Contract Party until the existing invitation process completes.
- [ ] End-to-end acceptance proves the selected-Person and exact-email paths create the same protected Contract Draft boundary.
