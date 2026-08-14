# NEXUM

NEXUM is a testnet workspace for turning a custom-service project into a clear, shared **Contract**. Two people can define the work, divide it into milestones, record evidence and decisions, and accept the same versioned terms.

NEXUM is designed for creative and digital-service engagements such as campaigns, films, design, writing, and digital experiences. It gives the working relationship a durable place to land without pretending that a product workflow is automatically a legally enforceable agreement.

> NEXUM is a test environment. It does not custody real funds, process fiat, provide cash-out services, or operate as a real-money financial product.

## The NEXUM model

### User Profiles

Every authenticated person has one durable **User Profile**. A Profile can participate in many Contracts and can have a different responsibility in each one. Profile Settings contain private identity details, preferences, notifications, security controls, and connected-wallet settings.

### Contracts

A **Contract** is a private, one-to-one, versioned record for one project. It starts as an editable **Contract Draft** owned by one Profile. The initiator chooses the responsibility for each party:

- **Buyer** — engages and funds the Service Provider for the engagement.
- **Service Provider** — delivers the contracted service.

These are Contract-specific responsibilities, not permanent account types. A Profile may be a Buyer in one Contract and a Service Provider in another.

The initial Service Engagement template uses typed Contract Sections for:

- parties, scope, outcomes, and dependencies;
- milestones, allocations, deadlines, evidence, and acceptance criteria;
- payment and testnet settlement terms;
- intellectual property and confidentiality;
- change control and notices; and
- dispute-resolution terms.

A draft gains a counterparty only when it is shared through an explicit invitation. A Contract becomes binding in the NEXUM workflow only when both parties accept the same exact Contract Version.

### Milestones and decisions

A **Milestone Schedule** turns the project into measurable delivery outcomes. Each milestone can define its evidence requirement, canonical UTC deadline, allocation, required Acceptance Criteria, and review window.

During **Milestone Review**, the Buyer evaluates submitted evidence against those criteria. The intended decision trail supports acceptance, a revision request, or a dispute while preserving an append-only record of activity.

### Authorities and disputes

The **Authority Registry** contains recognised Resolution Authorities, their jurisdictions, and available rulesets. A Contract's dispute-resolution terms select an Authority Registry entry; the selected terms belong to the signed Contract Version and can change only through a bilateral amendment.

A **Case Officer** is an authorised representative acting for a Resolution Authority on an assigned dispute case. A Case Officer is not a Contract Party or a user role shared across the platform.

### Wallet and testnet boundary

The Wallet belongs to a User Profile and is separate from Contract data. It supports an externally controlled Base Sepolia test wallet or an explicitly disposable browser test wallet and displays personal test-token balance only.

Personal MockEUSD is never presented as Contract Escrow Vault funds. Contract acceptance uses an exact-version wallet signature, while settlement remains a testnet workflow and is not a real-money payment service.

## Typical workflow

1. Sign in and complete your Profile setup.
2. Discover an accepted Person or enter an exact-email counterparty.
3. Create a private Contract Draft and choose the Buyer and Service Provider responsibilities for that Contract.
4. Complete the project details, milestones, evidence requirements, payment terms, and dispute-resolution terms.
5. Share the draft through an explicit invitation. The invited authenticated Profile receives access only after accepting the invitation.
6. Review and publish an exact Contract Version.
7. Each party reviews and accepts that exact version with the protected acceptance workflow.
8. Use the Wallet for personal Base Sepolia testnet activity, keeping it distinct from Contract Escrow Vault state.

## Current implementation scope

The MVP foundation currently includes:

- typed Next.js App Router pages and a Node.js API;
- Supabase Auth identities with Profile-scoped authorization and Row Level Security;
- Profile Settings, People discovery, connections, notifications, and the signed-in application shell;
- private Contract Draft creation, editing, invitations, dynamic Contract detail, version review, and exact-version acceptance;
- an Authority Registry read model and protected Contract workflows; and
- a separate Base Sepolia Wallet experience with personal MockEUSD test-balance handling.

The remaining testnet work includes Contract-specific Escrow Vault creation, wallet funding, authoritative chain reads, milestone evidence and review activity, settlement paths, and full end-to-end judge verification.

## Technology

- **Frontend:** Next.js App Router, React, and TypeScript.
- **Backend:** Node.js API with authenticated Supabase-backed workflows.
- **Data and access:** Supabase Auth, Postgres, and Row Level Security.
- **Smart contracts:** Solidity contracts for MockEUSD, Escrow Vaults, and the Escrow Vault Factory.
- **Network:** Base Sepolia testnet.
- **Repository shape:** npm workspaces for the `frontend` and `backend` applications.

---

## Run locally

### Requirements

- Node.js 20 or newer
- npm
- A Supabase project for authenticated workflows
- A Privy application ID if you want to exercise the connected browser-wallet path

### Configure the backend

Create `backend/.env` with the public runtime settings:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
PRIVY_APP_ID=your-privy-app-id
```

The Privy setting is optional for local route and API work. Never expose a Supabase service-role key to the browser or commit secrets to the repository.

### Install and start

Run these commands from the repository root:

```powershell
npm.cmd install
npm.cmd run start
```

The combined start command launches the Next.js frontend at `http://localhost:3000` and the Node.js API at `http://localhost:3001`. Next.js proxies browser `/api` and `/health` requests to the API.

### Verification commands

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd --workspace frontend run test:routes
npm.cmd --workspace backend run contracts:check
```

## Repository layout

```text
frontend/   Next.js pages, React components, browser integrations, and public assets
backend/    Node.js API, workflow boundaries, tests, and deployment scripts
contracts/  Solidity sources for the testnet escrow foundation
supabase/   Database migrations, authentication templates, and durable-access tests
```

---

### About

Developed by **Jabier Ho Wei Le and Haley Tan Hui Xin** for the **NTU CCTF SNZ InnovateX 2026 Hackathon**.
