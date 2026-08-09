# 20 — Define the testnet payment-method and funding model

**Decision:** The MVP uses the public, clearly disclosed on-chain `MockEUSD` faucet as its sole source of test funds. A connected Base Sepolia wallet invokes `MockEUSD.faucet` itself, then uses the resulting valueless test balance to fund an Escrow Vault. No payment provider is in the funding path.

**Blocked by:** Browser funding work remains blocked by 07 — Deploy a Project-specific, non-administered Escrow Vault.

**Status:** decision-recorded; browser funding implementation pending

**Required decision boundary:** Stripe test-card charges and Base Sepolia test tokens are both valueless simulations; there is no real bridge or currency conversion between them. Base Sepolia remains useful because it proves the separate on-chain escrow, signature, transaction, and event lifecycle. The selected design must never present Stripe test payments as real money or as automatic cryptocurrency conversion.

- [x] The MVP source of test funds is the public mock-token faucet/dispenser. PayPal, Stripe, and every other payment provider are out of scope for the funding path.
- [x] The Stripe-test PaymentIntent option is deliberately not selected. PactFlow creates no PaymentIntent, receives no Stripe webhook, stores no payment credential, and has no dispensing service. A Stripe test charge is not a crypto bridge, a token purchase, a custody flow, a redemption right, or an exchange-rate promise.
- [x] Profile Settings has no payment-method surface in this MVP because no payment provider is configured. It may show the participant’s linked wallet address only. A future provider requires a new decision before its provider-confirmed metadata or simulated test-funding relationship can be implemented.
- [x] Ticket 08 documents the selected faucet source, its UX, and its automated verification seam before browser implementation begins.

## Recorded MVP funding path

1. The Buyer connects or creates their own Base Sepolia wallet through the existing Privy capability and independently obtains Base Sepolia test ETH for gas.
2. From the wallet balance surface, the Buyer chooses **Get demo eUSD**. The UI says that eUSD has no monetary value, the faucet is not a payment method, and the action does not convert fiat or deliver cryptocurrency.
3. The wallet signs the public `MockEUSD.faucet` transaction at `0xEcF583DcC9CA0c6E59b14df86412E4C0ED96FF3c`. The contract permits at most `10_000_000_000` six-decimal units (10,000 demo eUSD) per call. It does not have an off-chain account, card, webhook, or credit ledger.
4. After the receipt is confirmed, PactFlow refreshes the wallet’s token balance. The Buyer separately approves the Project Vault and signs its exact-allocation funding transaction. A wallet balance and a Vault balance are always shown as separate values.

The faucet is intentionally permissionless and valueless. Its per-call limit is a contract guard, not a real-money rate limit or an anti-abuse guarantee. A faucet failure, rejected wallet request, or insufficient Base Sepolia test ETH means no eUSD is dispensed and no Project Vault is funded; the UI must report that state without suggesting a payment failure or a conversion retry.

## Implementation and verification boundary

- The contract seam is the public `MockEUSD.faucet` call and its `Transfer(address(0), buyer, amount)` event. `web/test/contracts.test.mjs` must continue to prove the exact token transfer, Vault allowance, exact Buyer-only funding, and deadline/duplicate rejection behaviour.
- The future browser seam must use an EIP-1193/Privy wallet test double against the Base Sepolia deployment configuration. It must prove the Buyer sees the valueless disclosure, explicitly signs the faucet transaction, receives a confirmed balance refresh, and then explicitly signs the separate approve/fund transaction.
- Browser tests must also prove there is no card-field, payment-provider SDK, PaymentIntent, webhook, server dispense endpoint, or wording that describes the faucet as a fiat-to-crypto conversion.
