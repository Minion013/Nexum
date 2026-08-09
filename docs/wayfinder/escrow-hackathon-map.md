## Destination

Produce a fixed, hackathon-ready product brief for a Singapore-to-Southeast-Asia digital-service escrow prototype: a concise project overview, evidence-backed market comparison, and supporting product/flow materials. The brief must be clear enough to choose architecture and build a working testnet prototype next.

## Notes

Primary user: Singapore-based clients hiring freelancers and digital creators across Southeast Asia. The MVP is a self-custodial testnet prototype with one Escrow Vault per payment agreement, mock-USDT settlement, and rules-first milestone release. Consult `CONTEXT.md` for the agreed domain language. Avoid claims of live custody, real cash-out, or legal compliance.

## Decisions so far

- [Initial product-boundary decisions](DECISIONS.md#initial-product-boundary) - Digital-service milestones are the MVP; escrow is per agreement, self-custodial on testnet, rules-first, and AI drafts rather than decides.
- [Competitive landscape and differentiated wedge](DECISIONS.md#competitive-landscape-and-differentiated-wedge) - The wedge is portable off-marketplace payment rules for custom bilateral service work; existing products solve adjacent, not identical, jobs.
- [Testnet prototype rails](DECISIONS.md#testnet-prototype-rails) - A credible testnet-only technical route exists, while final architecture selection remains deliberately deferred.
- [Golden demo narrative](DECISIONS.md#golden-demo-narrative) - Custom agreements are primary; three illustrative scenarios demonstrate dispute, auto-release, and missed-deadline refund paths.
- [Supporting materials for the product brief](DECISIONS.md#supporting-materials-for-the-product-brief) - Pair the Trust flow pitch view with the Rules workspace agreement-detail view.
- [Agreement lifecycle and initiation](DECISIONS.md#agreement-lifecycle-and-initiation) - Either party proposes, the buyer funds, and the complete custom-agreement lifecycle is now fixed.
- [MVP build boundary](DECISIONS.md#mvp-build-boundary) - The core payment rules must be real on testnet; external money, identity, and convenience rails are deferred or simulated.

## Not yet specified



## Out of scope

- Physical-goods escrow is a roadmap extension because courier evidence cannot reliably establish item condition or conformity in the MVP.
- Production custody, fiat conversion/cash-out, real USDT transfers, and direct regulatory operation are excluded from this testnet prototype.
- Live-launch compliance and licensed-partner design belong to a separately scoped post-hackathon effort.
