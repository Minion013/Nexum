# PactFlow test-wallet MVP

PactFlow is a rules-first escrow simulation for custom digital-service agreements. Supabase Auth provides participant identities; wallet linking is deliberately deferred. Agreement outcomes still use simulated six-decimal eUSD in a local rules engine—there is no live chain settlement, fiat conversion, cash-out, or real-money service.

## Run locally

```powershell
npm.cmd --prefix web test
npm.cmd --prefix web run typecheck
npm.cmd --prefix web run contracts:check
npm.cmd --prefix web start
```

Set the Supabase project URL and publishable key in the existing `web/.env`. The server refuses to start without those public authentication settings; it does not require or expose a Supabase secret/service key. The runnable web application, its tests, dependencies, and local configuration live in `web/`. Open `http://localhost:3000` and use the Supabase email sign-in flow. `GET /health` reports the authenticated local-simulation health.

## Demo runbook

1. Open the app, enter an email address, and complete the Supabase magic-link flow. Then choose **buyer**, **invited seller**, or **resolver** for the local agreement simulation. The browser submits the Supabase access token with authenticated requests; the current local demo assignment remains process-local.
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
- `EscrowVault.sol`: an unfunded, isolated, non-upgradeable, non-administered vault foundation. It contains no owner, pause, rescue, platform-withdrawal, funding, or settlement function.
- `EscrowVaultFactory.sol`: an EIP-712 approval verifier that lets only buyer or seller create one vault for jointly signed terms.

Do not deploy or use the contracts with real value. Any future testnet integration needs separate EVM-level tests and review.

## Implemented scope and remaining integrations

The runnable demo and tested local rules engine cover Supabase-authenticated local sessions, editable validated custom drafts, deterministic co-pilot suggestions, immutable versions with approval and field-difference history, local participant-only data access, buyer-only simulated funding, sequential milestones, private-evidence hashes, acceptance and timeout release, buyer-controlled missed-delivery refunds, resolver-only splits, and activity history.

The demo deliberately omits durable invitation and participant records, a chain reader/indexer, EIP-712 browser signing, Base Sepolia deployment, and a real AI service. It is a test-wallet development mode, not a real-money escrow service.

## Implementation tracking

The implementation tickets use a [testnet-MVP completion reference](.scratch/pactflow-testnet-mvp/issues/00-implementation-completion-reference.md): Supabase owns permanent user accounts, sessions, and row-level access first; Privy supplies only the linked user-controlled wallet capability. Local simulation behavior is evidence, not completion of a Base Sepolia checklist item.
