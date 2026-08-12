# 10 — Dynamic Contract detail and exact-version acceptance

**What to build:** A Contract Party can open a typed dynamic Contract detail route, see only authorised lifecycle and terms data, and record acceptance only for an exact wallet-signed Contract Version.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** complete 2026-08-12

- [x] Dynamic Contract detail and review state render loading, missing, unauthenticated, forbidden, and authorised Contract states distinctly.
- [x] Contract data and Contract Acceptance use the protected backend workflow, preserving exact-version and wallet-signature checks without exposing server-only credentials.
- [x] Tests cover Contract Party access, non-party rejection, exact-version success, stale/mismatched signature rejection, and truthful lifecycle presentation.

## Evidence

- Added the typed Next App Router route `/contracts/[contractId]` and removed the legacy `/contracts/:contractId` rewrite. The page loads protected `/api/contracts/:id/detail` and `/api/contracts/:id/review` data and renders distinct loading, missing, unauthenticated, forbidden, review-unavailable, and authorised states.
- Added typed lifecycle and terms presentation for private drafts, shared negotiation, active, and complete Contracts. Proposed allocations remain explicitly separate from personal wallet funds and chain-authoritative settlement.
- Added client-only Base Sepolia EIP-712 signing through the existing Privy wallet capability. The browser posts only the wallet address, signature, and exact Version hash to the protected acceptance endpoint; the Node API remains responsible for exact Version, signature ownership, Profile/Contract Party authorization, and durable acceptance checks.
- The loopback fixture `pactflow-wallet-test@local.invalid` can create, save, and read private detail/review state. It intentionally refuses to fake wallet-backed acceptance; the real protected acceptance path is covered with Ethers-signed exact-Version requests.
- Verification on 2026-08-12: `npm.cmd test` passed 93 tests with 6 intentional skips; `npm.cmd --prefix frontend run test:routes` passed 7 tests; `npm.cmd run typecheck` passed; `npm.cmd run build` passed; `npm.cmd --prefix backend run contracts:check` passed; `git diff --check` passed.

## Remaining gaps

- None for Ticket 10 acceptance. The production build still reports upstream Privy/viem warnings, including the optional `@farcaster/mini-app-solana` resolution warning and a dynamic-dependency warning; these do not fail the build or affect the protected Contract workflow.
- A real browser wallet happy-path requires a configured Privy App ID, authenticated Supabase session, and connected Base Sepolia wallet. The loopback fixture deliberately does not emulate that external wallet; server-side exact-version success and stale/mismatched/wrong-signer rejection are verified in the focused API/workflow tests.
