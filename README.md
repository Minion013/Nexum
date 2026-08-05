# PactFlow local MVP

PactFlow is a fully local, rules-first escrow simulation for custom digital-service agreements. It uses simulated six-decimal eUSD and does not connect to a chain, create or custody wallets, transfer money, or use a hosted database or identity provider. Its local co-pilot uses deterministic drafting suggestions; it is not an AI service and has no agreement or payment authority.

## Run locally

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run contracts:check
npm.cmd start
```

Open `http://localhost:3000`. `GET /health` reports the local-only demo health. No configuration, account, RPC, or external-service credentials are required.

## Demo runbook

1. Open the app and select **buyer** to establish a local simulated session. The server stores the session in memory and issues an HTTP-only cookie; it never requests a private key. Create the one-time local invitation, then sign out and choose **invited seller** to accept that code. The invitation and session records exist only while the local server runs.
2. To demonstrate drafting, enter a plain-language brief and select **Suggest from brief**. Review and edit the scope, milestone allocations, evidence requirements, local-time deadlines, and review windows. The preview shows the retained UTC deadline. Suggestions remain drafts and cannot approve terms, release funds, judge quality, or resolve disputes.
3. Save the editable draft. Earlier versions stay read-only with their approvals and field-level changes in **What changed and who approved**.
4. Approve the same agreement version as buyer and seller; funding stays unavailable until both signatures are represented.
5. As buyer, select **Fund local agreement**. The demo marks the first milestone active and shows the simulated eUSD allocation.
6. As seller, submit an evidence record. It records only a demo hash and starts a 72-hour review window.
7. For the normal path, sign in as buyer, accept the evidence, then release it from any role. The activity record shows that the payment decision is rule-driven.
8. For a dispute, fund and submit evidence, then open a dispute as buyer. Switch to the resolver local role and select **Resolve 50/50 split**. The resolver receives only operational status, not private agreement terms, approvals, or evidence hashes.
9. To show missed delivery, select **Simulate missed-delivery refund** as buyer while a milestone is active. This local-only shortcut advances the simulated clock for that action; it never makes a real transfer.
10. Use **Extend future deadline** to propose an amendment. The rules engine leaves a funded amendment inert until both local participant roles approve it.

## Reference contracts

`contracts/` contains a compiled Solidity 0.8.30 reference foundation. It is not used by local mode:

- `MockEUSD.sol`: an explicitly valueless, six-decimal demo token with a capped public faucet.
- `EscrowVault.sol`: isolated, non-upgradeable, non-administered milestone settlement logic. It contains no owner, pause, rescue, or platform-withdrawal function.
- `EscrowVaultFactory.sol`: an EIP-712 approval verifier that lets only buyer or seller create one vault for jointly signed terms.

Do not deploy or use the contracts with real value. Any future testnet integration needs separate EVM-level tests and review.

## Implemented scope and remaining integrations

The runnable demo and tested local rules engine cover editable validated custom drafts, deterministic co-pilot suggestions, immutable versions with approval and field-difference history, local participant-only data access, buyer-only simulated funding, sequential milestones, private-evidence hashes, acceptance and timeout release, buyer-controlled missed-delivery refunds, resolver-only splits, activity history, and local server sessions.

The demo deliberately omits Privy authentication, real self-custodial wallets, durable invitation and participant records, Supabase, a chain reader/indexer, EIP-712 browser signing, Base Sepolia deployment, and a real AI service. It is a local development mode, not a secure production integration.
