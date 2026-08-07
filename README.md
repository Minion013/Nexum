# PactFlow testnet MVP foundation

PactFlow is a private workspace for structuring custom digital-service projects through durable Contracts, invitations, and versioned terms. Supabase Auth provides participant identities and Supabase RLS scopes private coordination data. Wallet linking and Base Sepolia settlement are deliberately deferred: PactFlow currently has no payment authority, escrow custody, fiat conversion, cash-out, or real-money service.

## Run locally

```powershell
npm.cmd --prefix web test
npm.cmd --prefix web run typecheck
npm.cmd --prefix web run contracts:check
npm.cmd --prefix web start
```

Set the Supabase project URL and publishable key in the existing `web/.env`. The server refuses to start without those public authentication settings; it does not require or expose a Supabase secret/service key. The runnable web application, its tests, dependencies, and local configuration live in `web/`. Open `http://localhost:3000` and use the Supabase email sign-in flow. `GET /health` reports the application boundary and confirms that payment authority is not configured.

## Current workflow

1. Open the app, enter an email address, and complete the Supabase magic-link flow.
2. Finish onboarding to provision your durable Profile and personal Workspace.
3. Create a private Contract with a scope and exact counterparty email address. The server creates the Contract and its expiring invitation under the caller's Supabase identity.
4. The Contract is private until the invited, authenticated recipient accepts that exact invitation. Payment, approval, evidence, disputes, and on-chain settlement are not yet available in the browser.

## Reference contracts

`contracts/` contains a compiled Solidity 0.8.30 reference foundation. It is not connected to the browser workflow:

- `MockEUSD.sol`: an explicitly valueless, six-decimal demo token with a capped public faucet.
- `EscrowVault.sol`: an unfunded, isolated, non-upgradeable, non-administered vault foundation. It contains no owner, pause, rescue, platform-withdrawal, funding, or settlement function.
- `EscrowVaultFactory.sol`: an EIP-712 approval verifier that lets only buyer or seller create one vault for jointly signed terms.

Do not deploy or use the contracts with real value. Any future testnet integration needs separate EVM-level tests and review.

## Implemented scope and remaining integrations

The application includes durable Profile and Workspace provisioning, authenticated Home data, durable private Contract creation, and exact-email invitation acceptance through Supabase. The previous process-local rules engine, local roles, simulated agreement actions, and local browser pages have been removed.

The linked schema also provides the Contract Party, delegation, version, authority, Case Officer, and private-evidence foundations with RLS proof. A Contract-specific browser detail page now presents the latest immutable Version, its canonical terms hash, missing template sections, and each Party's Acceptance state. It blocks Acceptance until a Version is complete and is not a wallet signature or payment approval. Completing the typed builder, wallet linking, EIP-712 signatures, Base Sepolia deployment, chain reconciliation, evidence/dispute workflows, and a real AI service remain incomplete.

## Implementation tracking

The implementation tickets use a [testnet-MVP completion reference](.scratch/pactflow-testnet-mvp/issues/00-implementation-completion-reference.md): Supabase owns permanent user accounts, sessions, and row-level access first; Privy supplies only the linked user-controlled wallet capability. A Base Sepolia payment path is required before any settlement functionality can be claimed.
