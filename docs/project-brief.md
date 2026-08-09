# PactFlow — hackathon project brief

> **Working name.** PactFlow is a rules-first escrow orchestration prototype for custom, cross-border digital-service agreements. It is a testnet demo: no real funds, fiat conversion, cash-out, custody service, or claim of production regulatory readiness.

## Project details: short description

**PactFlow helps a Singapore client and a Southeast-Asian freelancer turn their own agreed scope into a pre-funded, milestone-based payment rulebook.** Either party proposes a custom agreement; both approve the exact same version; the buyer funds one dedicated Escrow Vault; and the vault releases, refunds, or freezes each milestone only under those pre-agreed rules.

The project is not a marketplace, bank, or AI quality judge. It is a portable payment-agreement layer for parties who already found each other outside a platform.

## Problem

Cross-border freelance and creator work has a bilateral trust gap:

- A seller risks starting work without confidence that payment is secured.
- A buyer risks paying before delivery, or arguing over whether a vague deliverable was met.
- Scope changes, deadlines, evidence, and payment decisions often live across chats, invoices, cloud drives, and payment apps.
- Existing marketplaces provide valuable protection inside their platforms, but independent client–freelancer pairs need an agreement and payment process that travels with their relationship.

The problem is not merely money transfer. It is the lack of an **executable shared process** for payment, evidence, time, and exceptions.

## Proposed solution

PactFlow makes the commercial agreement executable at the payment-process level:

1. A buyer or seller creates a **custom** agreement from plain language.
2. An AI co-pilot drafts milestones, acceptance criteria, evidence requirements, and deadlines; both people review and edit it.
3. Buyer and seller approve the exact same numbered version.
4. The buyer funds all milestone allocations into one temporary, self-custodial **Escrow Vault** for that agreement.
5. For each milestone, the seller submits evidence before the agreed UTC deadline.
6. The buyer accepts, disputes, or does nothing within the configured review window.
7. The vault enforces the objective outcome: release to the seller, refund to the buyer after missed delivery, or freeze for the pre-bound resolver.

## Core product rules

| Rule | Product behaviour |
|---|---|
| Agreement initiation | Either buyer or seller can propose. The proposer has no funding privilege. |
| Custom terms | Every agreement has its own scope, 2–3 milestones, evidence, UTC deadlines, review windows, and resolver. Examples are inspiration, not fixed templates. |
| Finalization | Both parties approve the same immutable agreement version. Any edit creates a new version and invalidates earlier approvals. |
| Funding | Only the buyer funds. Funding is a separate wallet confirmation and must occur within 48 hours of joint approval; expiry permits reinitiation. |
| Escrow | One independent Escrow Vault holds the entire agreement's allocated demo-token amount. Funds are not pooled in a platform balance. |
| Delivery | The seller submits a required evidence link/hash before each milestone's deadline. |
| Review | Each milestone has a configurable 24-hour to 7-day review window, with a 72-hour default. |
| Normal release | Buyer acceptance releases immediately. Buyer silence makes the milestone release-eligible when the review window expires. |
| Missed delivery | No required evidence by the deadline creates a visible missed-delivery state. The buyer can explicitly cancel and recover that milestone's funds. |
| Dispute | A dispute freezes only the affected milestone. The resolver fixed in the agreement may release, refund, or split that amount only. |
| Amendments | Changes to future work require a mutually approved new agreement version. |
| AI | AI drafts and structures terms; it never releases money, assesses creative quality, or adjudicates disputes. |

## Key features

- **Custom agreement co-pilot:** converts a plain-language brief or proposal into editable milestones and rules.
- **Dedicated vault per agreement:** one clear, inspectable payment container per client–seller relationship.
- **Pre-funded milestones:** the seller can see funding before starting; the buyer sees exactly what is locked.
- **Rules-first release:** objective dates, evidence submission, acceptance, and review periods govern normal outcomes.
- **Evidence-linked milestone history:** evidence references, timestamps, approvals, and decisions are associated with the relevant milestone.
- **Configurable cross-border timing:** contract times are enforced as UTC while each person sees their own local time.
- **Bound dispute authority:** the agreement limits the resolver to the affected milestone and three permitted outcomes.
- **Versioned mutual amendments:** no unilateral scope, deadline, or resolver change after funding.
- **Low-friction Web2-style entry:** email/social sign-in creates a user-owned embedded test wallet, with optional existing-wallet connection.
- **Transparent commercial model:** a provisional success fee applies only to a seller release; refunds have no platform fee. The percentage/cap is to be validated after the hackathon.

## Target users and use cases

### Primary launch corridor

**Singapore-based small businesses and clients hiring freelancers or digital creators across Southeast Asia.** They have already found each other and need a clear payment process—not job discovery or payroll administration.

### Demonstration use cases

| Custom agreement example | Risk made visible | Product response |
|---|---|---|
| Singapore SME × Indonesian product designer: US$1,500-equivalent checkout redesign | Final developer handoff is contested | Freeze only the final milestone; resolver sees structured evidence and may release, refund, or split. |
| Singapore brand × Filipino video creator: US$600-equivalent campaign | Buyer goes silent after delivery | Evidence starts the 72-hour review window; silence makes release eligible. |
| Singapore startup × Vietnamese web developer: US$2,400-equivalent landing page | Seller misses deadline without evidence | Buyer receives a clear missed-delivery state and can recover that milestone’s funds. |

These are examples only. The product is custom-agreement-first and can later serve consultants, agencies, tutors, and other bilateral services with objective milestone evidence.

## Why this is differentiated

PactFlow does **not** claim that existing products lack milestones, payments, or dispute systems. Instead, it combines useful patterns into a different boundary: an **off-marketplace, per-agreement, rules-execution layer** for a relationship the parties already have.

| What users use today | What it does well | PactFlow’s narrow wedge |
|---|---|---|
| Upwork / Fiverr | Marketplace-native milestone funding, delivery review, and support flows | Works for external pairs with a visible custom rulebook and one pre-funded, isolated agreement vault; it does not replace marketplace discovery or protection operations. [Upwork](https://support.upwork.com/hc/en-us/articles/211063718-How-payments-for-milestones-and-fixed-price-contracts-work) · [Fiverr](https://help.fiverr.com/hc/en-us/articles/37552729722129-Milestones) |
| Wise / Deel | Cross-border transfer, FX, contractor administration, and payout operations | Adds delivery evidence and payment-release rules; future production integrations would complement, not compete with, licensed payout rails. [Wise](https://wise.com/gb/business/payments) · [Deel](https://help.letsdeel.com/hc/en-gb/articles/4407745459985-How-to-Create-a-Contractor-Contract-on-Deel) |
| Kleros Escrow | On-chain ERC-20 escrow and decentralised dispute resolution | Focuses the demo on guided, multi-milestone digital-service agreements, configurable review rules, and Web2-like onboarding. [Kleros](https://docs.kleros.io/products/escrow/kleros-escrow-specifications) |

### Pitch-safe differentiated claim

> For off-marketplace cross-border digital-service work, PactFlow converts a mutually approved brief into a per-agreement, pre-funded milestone rulebook. It makes payment status and evidence traceable, executes mock-token release only under agreed objective conditions, and confines human resolution to a frozen milestone and three pre-authorised outcomes.

## Planned technology for the functional demo

The following is a testnet implementation direction, not a production architecture commitment:

- **Chain:** Base Sepolia, an EVM public testnet.
- **Demo token:** a clearly valueless 6-decimal ERC-20 such as `Escrow Demo USD (eUSD)`. Do not label it USDT or imply an affiliation with Tether.
- **Vault model:** one agreement-specific `EscrowVault`, created via a small factory using OpenZeppelin clone patterns.
- **Wallets:** Privy-style user-owned embedded EVM wallets for email/social onboarding, with optional external-wallet connection.
- **Contract safety:** isolated buyer, seller, and resolver roles; `SafeERC20`; reentrancy protection; no platform withdrawal authority.
- **On-chain records:** agreement version/hash, milestone amounts, deadlines, states, evidence hashes, and events.
- **Off-chain records:** human-readable agreement text and private evidence links; no creative work files or personal data on the public testnet.

Base documents Base Sepolia as a public testnet, and OpenZeppelin documents the clone and token-safety primitives behind the proposed demo pattern. [Base network details](https://docs.base.org/base-chain/quickstart/connecting-to-base) · [OpenZeppelin Clones](https://docs.openzeppelin.com/contracts/5.x/api/proxy) · [OpenZeppelin ERC-20 safety](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20)

## MVP: real versus simulated

### Must work on testnet

- Create a custom 2–3 milestone agreement.
- Record both parties’ approval of the same agreement version.
- Fund one dedicated Escrow Vault with eUSD.
- Submit milestone evidence.
- Release a milestone on buyer acceptance and demonstrate auto-release eligibility.
- Cancel/refund a missed-delivery milestone.
- Freeze a disputed milestone and execute a resolver release, refund, or split.

### Shown as high-fidelity prototype or future integration

- AI drafting and parsing quality;
- email/push notifications;
- live FX rates and local-currency conversion;
- KYC/KYB and risk screening;
- fiat top-up, cash-out, and licensed payout partnerships;
- production evidence storage, human dispute operations, appeals, and arbitration.

## Supporting materials

- **End-to-end user and funds flow:** [escrow agreement lifecycle](escrow-agreement-lifecycle.md)
- **Interactive visual prototype:** [C = Trust flow](../prototypes/escrow-supporting-materials-prototype.html?variant=C) and [B = Rules workspace](../prototypes/escrow-supporting-materials-prototype.html?variant=B)
- **Market research:** [competitive landscape](research/competitive-landscape.md)
- **Prototype technology research:** [testnet prototype rails](research/prototype-rails.md)
- **Decision record:** [Wayfinder map](wayfinder/escrow-hackathon-map.md)

## Explicit non-claims and roadmap

The hackathon demo does not hold real funds, guarantee work quality, provide a bank account, operate a fiat conversion service, or resolve disputes like a court or licensed escrow agent. A production path would first select a launch jurisdiction and work with licensed on/off-ramp and payment partners for KYC/KYB, screening, safeguarding, fiat movement, and customer support.

Physical-goods escrow is a future profile, not an MVP: courier delivery alone does not prove item quality or conformity. It would need shipping, inspection, return, and dispute evidence rules.
