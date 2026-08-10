---
parent: ../pactflow-technical-architecture-map.md
status: closed
type: grilling
assignee: Codex
blocked_by:
  - 007-vault-state-machine-and-interface.md
  - 008-off-chain-data-and-privacy-model.md
---

# Application boundary and authorisation

## Question

How should Next.js, **Supabase Auth as the participant-account system of record**, Supabase row-level access, user-controlled EVM test wallets, and server routes divide responsibility so users can coordinate Contracts without the backend becoming a wallet custodian or payment decision-maker?

## Resolution

Next.js provides the interface and server routes that validate the Supabase session, enforce product-level intent, and orchestrate reads and writes, but never sign for a user. Supabase Auth and RLS are the participant identity, session, persistence, and row-level authorisation system. Privy is optional: a participant may connect an externally controlled Base Sepolia test wallet, prove its ownership with a nonce-bound signature, and link the verified address to their signed-in profile. A clearly labelled disposable, browser-generated test wallet is also permitted, but its key remains on that device, has no recovery guarantee, and exists only for valueless testnet activity. The user signs every on-chain action. The chain and Vault are authoritative for funds, milestone state, and settlement rules. Server routes may handle verified metadata, read-only chain data, notifications, and indexing, but must not custody keys, mint authority, or decide payment or release outcomes.
