---
parent: ../pactflow-technical-architecture-map.md
status: closed
type: prototype
assignee: Codex
blocked_by:
  - 007-vault-state-machine-and-interface.md
  - 009-application-boundary-and-authorisation.md
---

# Wallet and transaction experience

## Question

What screens, transaction prompts, pending/confirmed/error states, and external-wallet fallback make Contract approval, eUSD funding, evidence submission, release, refund, and resolver actions understandable to Web3-new demo users?

## Resolution

Use one consistent transaction flow for every on-chain action: show the action, exact token amount or state change, selected Base Sepolia test wallet, and a no-real-funds notice; prompt for the user signature; then show distinct wallet-request, submitted, confirmed, and failed or rejected states, with an explorer link where available. Refresh chain-backed status only after confirmation. Funding is three explicit actions: Get demo eUSD, approve the exact Vault allowance, then fund the Vault. Buyer and Service Provider personal wallet balances are each presented separately from the Contract Vault balance; no combined balance is shown.
