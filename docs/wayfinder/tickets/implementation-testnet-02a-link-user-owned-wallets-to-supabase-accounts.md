# 02a — Link and present user-owned wallets

**What to build:** A signed-in PactFlow participant can connect an externally controlled Base Sepolia test wallet, or create a clearly labelled disposable browser test wallet. The profile presents that wallet’s address and test-token balance separately from the balances locked in each Project’s Escrow Vault.

**Blocked by:** 02 — Establish secure profiles, sessions, and retired models.

**Status:** partial — wallet capability follows durable account identity; live browser verification and the wallet/profile presentation remain open.

**Completion reference:** [Testnet MVP implementation-completion reference](../implementation-completion-reference.md)

- [ ] The signed-in Supabase user requests a one-time, session-bound ownership challenge; the application verifies the wallet signature before recording the address-to-profile binding. Privy is not required.
- [ ] A participant can connect an externally controlled **Base Sepolia test wallet** and reconnect it after a Supabase session refresh without creating a second PactFlow participant identity.
- [ ] A participant may create a disposable browser test wallet only after accepting that its key stays on their device, cannot be recovered by PactFlow, and is for valueless testnet use only.
- [ ] Profile Settings shows the linked wallet address, Base Sepolia network, and available MockEUSD/test-token balance with clear testnet wording. It separately links to Project Escrow Vault pots; no combined “balance” may imply that escrowed funds are available to spend.
- [ ] The application can request signatures and Base Sepolia transactions through the linked wallet while never receiving or storing a private key. The UI clearly distinguishes valueless testnet activity from real-money services.
