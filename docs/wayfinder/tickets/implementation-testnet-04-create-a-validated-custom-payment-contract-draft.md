# 04 — Create a Profile-owned Project and standalone Contract Draft

**What to build:** An authorised Contract Party creates a Project within a chosen retired model and drafts its governing payment Contract as a standalone Contract Draft page. The Contract Draft is private to the owning retired model until the initiator deliberately invites a counterparty.

**Blocked by:** 03 — Invite project participants without widening retired access.

**Status:** ready-for-agent

**Product representation:** A retired model owns Projects. In this MVP, each Project has one governing Contract, so the Project detail is the Contract retired model rather than a separate competing “Contracts” area. The retired model navigation may retain a Contracts list as a filtered view of those Projects, but it must preserve the retired model → Project → Contract relationship.

- [ ] The creation entry point asks for an owning retired model (with an in-flow option to create one), then creates a named Project and routes immediately to its standalone Contract Draft page. A Contract Draft never appears as a public card, feed item, or dashboard announcement.
- [ ] The initiator chooses “I’m hiring a service provider” or “I’m providing a service.” The system records the corresponding Buyer or Service Provider responsibility only for that Project and derives the counterparty’s complementary responsibility; neither choice creates a permanent account role.
- [ ] The standalone Contract Draft page lets authorised members define and edit scope, 2–3 milestones, allocations, evidence requirements, UTC deadlines, review windows, disclosed success fee, and Contract-scoped dispute-resolution terms. It retains one UTC canonical deadline while showing local time and rejects incomplete, invalid, or non-conserving terms.
- [ ] Counterparty sharing is an explicit next step on the Contract Draft page. The chooser first offers previous counterparties/People and also accepts a new exact email, using the invitation flow in ticket 03. Until sharing, the Contract Draft is visible only to authorised members of its owning retired model.
- [ ] Resolution Authorities have no post-login navigation, account type, dashboard, or general retired model-management surface. If a Contract includes dispute-resolution terms, its selected authority is shown only inside that Contract and any resulting dispute case.
- [ ] The Contract Draft clearly says it has no payment authority before exact-version approval and funding, without repeatedly labelling it “private draft.”
