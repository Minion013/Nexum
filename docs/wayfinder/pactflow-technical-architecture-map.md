# PactFlow technical architecture map

## Destination

Produce a build-ready technical blueprint for PactFlow's Base Sepolia testnet MVP: its system boundaries, contract interfaces, data model, repository layout, and test/deployment approach.

## Notes

This is a planning-only map for the hackathon prototype. Consult `CONTEXT.md`, `docs/project-brief.md`, and `docs/research/prototype-rails.md` before resolving a ticket. Fixed architectural constraints: Base Sepolia; a valueless 6-decimal eUSD ERC-20; a hybrid on-chain/off-chain system; **Supabase Auth and Postgres are the durable participant-account, session, and authorization system of record**; a user-controlled Base Sepolia test wallet is linked to that Supabase account through a nonce-bound ownership signature; Privy is optional; TypeScript monorepo; Next.js, Supabase, Foundry/OpenZeppelin, and Wagmi/Viem. The application must never custody user keys or have authority to move vault funds.

Local tracker convention: ticket dependencies are expressed with the `blocked_by` frontmatter field.

## Decisions so far

- [Monorepo, test, and deployment blueprint](tickets/012-monorepo-test-and-deployment-blueprint.md) - Keep web, contracts, Supabase, and docs as focused areas; verify local seams plus a deterministic two-test-wallet Base Sepolia smoke path and judge-ready seeds.

- [Chain-event index and consistency](tickets/011-chain-event-index-and-consistency.md) - Supabase holds a replayable confirmed-event index, but direct Vault reads govern actions and detail views; disagreement is surfaced as Syncing, never guessed state.

- [Wallet and transaction experience](tickets/010-wallet-transaction-experience.md) - Every chain action exposes the selected Base Sepolia test wallet, exact consequence, signature lifecycle, and confirmed chain refresh; buyer and Service Provider wallet balances remain separate from each Contract Vault.

- [Application boundary and authorisation](tickets/009-application-boundary-and-authorisation.md) - Next.js orchestrates authenticated product workflows; Supabase owns identity and RLS; a verified external Base Sepolia test wallet or disposable browser test wallet is user-controlled; only the Vault decides fund movement and settlement.

- [Off-chain data and privacy model](tickets/008-off-chain-data-and-privacy-model.md) - Supabase holds RLS-protected product records and private object storage holds terms and evidence; public chain records contain only state, events, and matching canonical digests.

- [Vault state machine and interface](DECISIONS.md#vault-state-machine-and-interface) — Per-agreement, non-administered vaults verify jointly signed terms and enforce explicitly funded, sequential, rules-first milestone settlement.

## Not yet specified



## Out of scope

- Production custody, fiat conversion, cash-out, KYC/KYB, licensed-partner operations, and account-abstraction/gas-sponsorship optimisation remain outside this hackathon architecture.
