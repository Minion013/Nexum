# 11 — Standalone Wallet

**What to build:** A User Profile can use a typed Wallet page to understand and manage its Base Sepolia test-wallet connection state and personal test-token balance while preserving the strict separation from Contract Escrow Vault funds.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** ready-for-agent

- [ ] Wallet renders disconnected, connecting, connected, local-test, error, and safe-balance states from typed client integrations.
- [ ] Wallet never displays Contract Escrow Vault funds as personal balance and uses the protected backend workflow wherever a Contract Acceptance record is required.
- [ ] Tests cover wallet-state presentation, testnet safety copy, local-test constraints, server-only credential absence, and personal-versus-Contract-fund separation.
