---
parent: ../pactflow-technical-architecture-map.md
status: closed
type: task
assignee: Codex
blocked_by:
  - 007-vault-state-machine-and-interface.md
  - 008-off-chain-data-and-privacy-model.md
  - 009-application-boundary-and-authorisation.md
  - 010-wallet-transaction-experience.md
  - 011-chain-event-index-and-consistency.md
---

# Monorepo, test, and deployment blueprint

## Question

What package layout, environment boundaries, local/testnet test strategy, deployment sequence, seeded demo data, and runbook make the agreed PactFlow architecture repeatable for a hackathon presentation?

## Resolution

Keep the compact repository shape: web for UI, API routes, browser and server tests, and public chain configuration; contracts for Solidity source, ABI or artifact generation, local scenarios, and deployment scripts; supabase for migrations, RLS tests, and seed data; and docs for decisions and the demo runbook. Use distinct local and testnet environment files, with Supabase service credentials and deployer keys restricted to server or CLI execution. Verify locally through unit, RLS, contract, and wallet-provider-mock tests, then run a scripted Base Sepolia smoke path with two test wallets: create Contract, faucet eUSD, approve and fund the Vault, submit evidence, release, and verify events. Seed the same deterministic demo users and Contracts for the judge runbook.
