# 03 — Deliver focused signed-in navigation and Wallet

**What to build:** A signed-in participant navigates through Dashboard, Contracts, Wallet, and People on desktop and mobile, manages Profile Settings from the avatar menu, and can inspect a standalone personal Base Sepolia test wallet without confusing it with Contract escrow.

**Blocked by:** 01 — Establish Profile-owned Contract access.

**Status:** ready-for-agent

- [ ] Desktop sidebar, mobile drawer, and bottom navigation expose Dashboard, Contracts, Wallet, and People only.
- [ ] Notifications is absent from primary navigation, and Profile Settings is reachable from the avatar menu.
- [ ] Wallet presents connection state, address, Base Sepolia context, available test-token balance, and clear testnet safety guidance.
- [ ] Wallet never combines available balance with a Contract Escrow Vault balance and does not show wallet-wide transaction history.
- [ ] Responsive navigation, Wallet access, loading/empty/connected states, and regression checks pass.
