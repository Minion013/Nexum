# PactFlow decision log

This is the canonical record of current Wayfinder decisions. The active product vocabulary is defined in [`CONTEXT.md`](../../CONTEXT.md).

## Contract and access

PactFlow is a one-to-one Contract product. Each Contract has exactly two User Profile parties, one Buyer and one Service Provider. A Contract Draft is shared only by explicit invitation, and both parties must accept the same Contract Version before it becomes binding. People connections and Contacts do not grant Contract access.

## Wallet and settlement

PactFlow uses a user-controlled Base Sepolia test wallet and a clearly valueless MockEUSD token. Each Contract can have a non-administered Escrow Vault. The Buyer funds the exact allocation; the Vault alone enforces funding, evidence, release, refund, and permitted dispute outcomes. PactFlow does not provide custody, real-money transfer, fiat conversion, cash-out, KYC, or regulated services.

## Authorities

Resolution Authorities are platform-managed registry entries. Case Officers act only on cases assigned to them and are never User Profiles or Contract Parties.

## Product boundaries

Customer-facing product language is Contract only. Profile Settings remains personal; Wallet shows only a personal available test-token balance; Dashboard, Contracts, Wallet, and People are the signed-in primary destinations. The MilestonePay reference remains in the repository until explicit product-owner authorization permits its removal.
