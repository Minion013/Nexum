# 04 — Create a workspace-owned Project and standalone Proposal

**What to build:** An authorised Workspace member creates a Project within a chosen Workspace and drafts its governing payment Contract as a standalone Proposal page. The Proposal is private to the owning Workspace until the initiator deliberately invites a counterparty.

**Blocked by:** 03 — Invite project participants without widening Workspace access.

**Status:** ready-for-agent

**Product representation:** A Workspace owns Projects. In this MVP, each Project has one governing Contract, so the Project detail is the Contract workspace rather than a separate competing “Contracts” area. The Workspace navigation may retain a Contracts list as a filtered view of those Projects, but it must preserve the Workspace → Project → Contract relationship.

- [ ] The creation entry point asks for an owning Workspace (with an in-flow option to create one), then creates a named Project and routes immediately to its standalone Proposal page. A Proposal never appears as a public card, feed item, or dashboard announcement.
- [ ] The initiator chooses “I’m hiring a service provider” or “I’m providing a service.” The system records the corresponding Buyer or Service Provider responsibility only for that Project and derives the counterparty’s complementary responsibility; neither choice creates a permanent account role.
- [ ] The standalone Proposal page lets authorised members define and edit scope, 2–3 milestones, allocations, evidence requirements, UTC deadlines, review windows, disclosed success fee, and Contract-scoped dispute-resolution terms. It retains one UTC canonical deadline while showing local time and rejects incomplete, invalid, or non-conserving terms.
- [ ] Counterparty sharing is an explicit next step on the Proposal page. The chooser first offers previous collaborators/People and also accepts a new exact email, using the invitation flow in ticket 03. Until sharing, the Proposal is visible only to authorised members of its owning Workspace.
- [ ] Resolution Authorities have no post-login navigation, account type, dashboard, or general Workspace-management surface. If a Contract includes dispute-resolution terms, its selected authority is shown only inside that Contract and any resulting dispute case.
- [ ] The Proposal clearly says it has no payment authority before exact-version approval and funding, without repeatedly labelling it “private draft.”
