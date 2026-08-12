# 11 — Standalone Wallet

**What to build:** A User Profile can use a typed Wallet page to understand and manage its Base Sepolia test-wallet connection state and personal test-token balance while preserving the strict separation from Contract Escrow Vault funds.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** complete 2026-08-12

- [x] Wallet renders disconnected, connecting, connected, local-test, error, and safe-balance states from typed client integrations.
- [x] Wallet never displays Contract Escrow Vault funds as personal balance and keeps Contract Acceptance on the protected exact-Version review workflow.
- [x] Tests cover wallet-state presentation, testnet safety copy, local-test constraints, server-only credential absence, and personal-versus-Contract-fund separation.

## Implementation evidence

- Added typed `/wallet` App Router rendering through `frontend/app/wallet/page.tsx` and removed the `/wallet` static-page rewrite from `frontend/next.config.ts`.
- Added typed client-only Privy wallet creation/linking, Base Sepolia chain enforcement, MockEUSD balance reads, local-test rendering, and truthful loading/error states in `frontend/src/wallet/wallet.tsx` and `frontend/src/wallet/presentation.tsx`.
- Added responsive Wallet styling and the explicit personal-balance / Contract Escrow Vault boundary in `frontend/public/wallet.css`.
- The loopback fixture `pactflow-wallet-test@local.invalid` authenticates only through the existing local-test header on loopback; its Wallet state is intentionally disconnected and does not emulate a wallet provider or private key. Public auth configuration strips `serviceRoleKey` and exposes only safe client configuration.
- Focused rendered-route/state/provider tests pass: `frontend/test/next-routes.test.mjs` (9 passing). Backend conversion and local-test configuration tests pass: `backend/test/next-conversion.test.mjs` (13 passing).
- Required gates pass: `npm.cmd test` (95 passing, 6 intentional skips), `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run contracts:check --workspace backend`, and `git diff --check`.

## Remaining gaps

- Manual connected-wallet interaction requires a configured `PRIVY_APP_ID` and an available browser wallet; the loopback fixture deliberately does not emulate that provider. This is an environment prerequisite, not an acceptance gap for this ticket.
- Legacy `wallet.html` and generated legacy bundles remain until Ticket 13 performs the coordinated interim-frontend cleanup.
