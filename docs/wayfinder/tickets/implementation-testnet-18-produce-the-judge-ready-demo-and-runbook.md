# 18 — Produce the judge-ready demo and runbook

**What to build:** A repeatable Base Sepolia demonstration proves PactFlow’s workspace-owned Project and Contract flow through normal release, buyer silence, missed delivery, dispute, amendment, AI-assisted drafting, and recipient-visible notifications.

**Blocked by:** 06 — Offer co-pilot-assisted agreement drafting; 11 — Release an accepted milestone; 12 — Release after review-window expiry; 13 — Refund a missed-delivery milestone; 14 — Open and resolve a milestone dispute in Contract context; 16 — Present the append-only agreement history; 17 — Index and reconcile chain activity; 19 — Deliver a private notification inbox for Project actions; 20 — Define the testnet payment-method and funding model.

**Status:** ready-for-agent

- [ ] Seeded scenarios cover the designer dispute, creator auto-release, and developer missed-delivery narratives without presenting them as required templates.
- [ ] The runbook lets a presenter deploy or select the configured Base Sepolia environment, provision valueless MockEUSD through the chosen transparent test-funding route, execute the core scenarios, and recover from ordinary demonstration failures.
- [ ] An end-to-end behavioural suite verifies the public factory/Vault payment rules, Project privacy, invitation boundary, and resolution-authority boundaries used in the presentation.
- [ ] The demonstration starts from the account-aware sign-in screen, shows the selected Profile, Workspace, standalone Project Proposal, linked wallet, and Project Vault pot as distinct concepts, then verifies one relevant recipient-visible in-app notification.
