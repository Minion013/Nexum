# 03 — Invite project participants without widening Workspace access

**What to build:** An authorised Workspace member can invite a counterparty to one Project’s Proposal or Contract. They can choose a person they have worked with before or invite a new person by exact email. Invitations grant access only to the named Project after acceptance, never broad Workspace membership.

**Blocked by:** 02 — Establish secure profiles, sessions, and workspaces.

**Status:** partial — local participant checks are tested, but durable Supabase records and RLS are required for completion.

**Completion reference:** [Testnet MVP implementation-completion reference](../implementation-completion-reference.md)

- [ ] A proposer can select an existing People/previous-collaborator record or enter one validated exact email to create a durable, expiring counterparty invitation. A new recipient can use the invitation to join PactFlow and accept the invitation into exactly that Project.
- [ ] Existing collaborators are a convenience chooser, not an authorisation shortcut: the invite screen displays the intended Project, responsibility, and email, and the inviter must explicitly send it.
- [ ] RLS policies allow only Project Contract Parties and explicitly delegated members to read or mutate that Project’s private coordination rows and evidence metadata. An invitation does not make the recipient a member of the initiating Workspace.
- [ ] An unrelated authenticated user receives no private row or storage object and cannot gain access by changing identifiers, routes, or API payloads; integration tests prove these denials.
