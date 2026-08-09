---
parent: ../pactflow-technical-architecture-map.md
status: closed
type: task
assignee: Codex
blocked_by:
  - 007-vault-state-machine-and-interface.md
  - 008-off-chain-data-and-privacy-model.md
---

# Chain-event index and consistency

## Question

How should the application derive and reconcile its UI-friendly agreement and milestone status from Base Sepolia reads and events while retaining the vault as the sole source of truth for payment state?

## Resolution

Supabase stores an idempotent, replayable event index keyed by chain, transaction hash, and log index for timelines, notifications, and queries. The application reads the Vault directly for each payment or milestone action and detail view; that chain result overrides a stale index. After a wallet transaction confirms, refresh direct chain state immediately and let the index catch up. Index only confirmed blocks; on a reorganisation or missed cursor, rewind to the last safe block and replay logs. If the index and direct read disagree, show Syncing and use the Vault state rather than a guessed payment status.
