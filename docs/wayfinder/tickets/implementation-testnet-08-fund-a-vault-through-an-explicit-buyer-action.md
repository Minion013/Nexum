# 08 — Fund a Project Escrow Vault through an explicit Buyer action

**What to build:** The Buyer can knowingly move the exact MockEUSD allocation from their linked wallet into one approved, unfunded Project Escrow Vault before its funding window expires. Any card/payment-method experience must follow the test-funding decision in ticket 20; it must not be represented as a real fiat-to-crypto bridge.

**Blocked by:** 07 — Deploy a Project-specific, non-administered Escrow Vault. Ticket 20 has selected the public `MockEUSD` faucet as the sole test-funding source.

**Status:** partial-contract-foundation

- [ ] The Buyer sees their available wallet balance separately from the selected Project Vault’s empty pot, then sees the Contract total, milestone allocations, settlement token, and funding conditions before confirming. Browser and Base Sepolia transaction work remain open.
- [ ] The isolated Vault permits only its fixed Buyer to fund, records the exact allocation once, and exposes its funded state and amount publicly.
- [ ] The funding UI presents one source of test funds: **Get demo eUSD** sends a signed transaction from the Buyer’s connected Base Sepolia wallet to the public `MockEUSD.faucet`. It says that the token is valueless, this is not a payment method or crypto conversion, and Base Sepolia test ETH is separately required for gas. It accurately reports a rejected request, faucet failure, confirmed token receipt, rejected approval, and rejected or confirmed Vault funding; it never uses payment-provider or card-decline wording.
- [ ] Public-interface scenarios reject non-buyers, insufficient balances or allowance, repeated transfers, expired paired acceptances before Vault creation, and attempts after the funding or first-delivery deadline.

**Selected source-of-funds and verification seam:** `MockEUSD.faucet` is the source of valueless demo eUSD. The contract test at `web/test/contracts.test.mjs` verifies token transfer and isolated Vault rules. Before browser funding implementation is accepted, an EIP-1193/Privy wallet test double must verify the visible disclosure, explicit faucet signature, confirmed balance refresh, and separate approve/fund signatures against the configured Base Sepolia contracts. It must also verify that no card field, provider SDK, PaymentIntent, webhook, or server dispense endpoint appears in the flow.

**Evidence:** `web/test/contracts.test.mjs` exercises the isolated `EscrowVault` with the explicitly valueless `MockEUSD` test token. This remains contract-foundation evidence only: there is no Project-specific deployed Vault, browser funding transaction, or chain-authoritative application view.
