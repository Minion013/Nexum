# 02 — Create secure participant sessions and wallets

**What to build:** A buyer or seller can sign in, receive or connect a self-custodial test wallet, and end their session without exposing wallet authority to PactFlow.

**Blocked by:** 01 — Bootstrap the demo application safely.

**Status:** partial; local session expiry is implemented, real authentication and wallets remain open

- [ ] A new participant can use the supported sign-in path to create a user-owned embedded test wallet or connect an existing wallet.
- [x] A participant can sign out, and expired or invalid sessions cannot access authenticated actions.
- [ ] The application never receives a participant's private key and clearly distinguishes testnet wallet actions from real-money services.
