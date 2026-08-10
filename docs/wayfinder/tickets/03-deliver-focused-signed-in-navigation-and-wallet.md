# 03 — Deliver focused signed-in navigation and Wallet

**What to build:** A signed-in participant navigates through Dashboard, Contracts, Wallet, and People on desktop and mobile, manages Profile Settings from the avatar menu, and can inspect a standalone personal Base Sepolia test wallet without confusing it with Contract escrow.

**Blocked by:** 01 — Establish Profile-owned Contract access.

**Status:** complete — verified 2026-08-10.

- [x] Desktop sidebar, mobile drawer, and bottom navigation expose Dashboard, Contracts, Wallet, and People only.
- [x] Notifications is absent from primary navigation, and Profile Settings is reachable from the avatar menu.
- [x] Wallet presents connection state, address, Base Sepolia context, available test-token balance, and clear testnet safety guidance.
- [x] Wallet never combines available balance with a Contract Escrow Vault balance and does not show wallet-wide transaction history.
- [x] Responsive navigation, Wallet access, loading/empty/connected states, and regression checks pass.

**Evidence:** Route-level acceptance covers `/wallet` and the four primary destinations. Browser checks verified desktop and 390 px navigation with no horizontal overflow, plus the signed-in Wallet empty and connected presentation fixtures. `npm.cmd test` passes 61 tests; typecheck, production build, and `git diff --check` pass.

**Temporary local-test auth cleanup:** Remove this deliberately local-only bypass once the normal `/api/session` flow is reliable. It is disabled unless `PACTFLOW_LOCAL_TEST_EMAIL` explicitly names one exact `.invalid` address, is refused in production, and is accepted only from `127.0.0.1`, `localhost`, or `::1`. Verified fixture addresses: `pactflow-wallet-test@local.invalid` (empty wallet) and `pactflow-wallet-connected-test@local.invalid` (connected presentation). Neither is an email inbox nor a real wallet.
