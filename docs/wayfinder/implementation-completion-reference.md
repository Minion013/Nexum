# PactFlow implementation completion reference

This reference defines the target bar for the active one-to-one Contract MVP. The [one-to-one Contract UX migration specification](one-to-one-contract-ux-migration-spec.md) is the delivery source for product vocabulary and access boundaries.

## Product and access boundary

- A verified person has one durable User Profile.
- A Contract is directly between exactly two User Profile parties. Contract Party membership is the only Contract-access authority.
- A Contract Draft is editable and private until the initiator explicitly shares it with a named counterparty. A Contract becomes binding only after both parties record acceptance of the same Contract Version.
- Contacts and People connections may help choose a counterparty but never grant Contract access.
- Customer-facing copy uses Contract, Contract Draft, Buyer, Service Provider, Resolution Authority, and Case Officer as defined in `CONTEXT.md`.

## Wallet and payment boundary

- Wallet is a personally controlled Base Sepolia test wallet. Its available MockEUSD balance is separate from every Contract Escrow Vault balance.
- The application never receives or stores a private key and never claims real-money, custody, fiat-conversion, or cash-out capabilities.
- Contract funding, evidence, release, refund, and dispute outcomes require confirmed Base Sepolia Vault transactions. Browser state, server responses, or a local simulation are not payment authority.

## Completion evidence

An implementation ticket may be complete only when every acceptance criterion has focused evidence plus relevant automated checks. The final application checks are:

```powershell
npm.cmd --prefix web test
npm.cmd --prefix web run typecheck
npm.cmd --prefix web run build
npm.cmd --prefix web run contracts:check
git diff --check
```

Where a ticket changes durable access, also run the linked Supabase migration, `supabase db lint --linked`, and `supabase/tests/durable-access-rls.sql`. Where it changes a browser workflow, record the authenticated browser result separately; a local harness limitation is evidence, not completion, unless the relevant ticket explicitly records a product-owner verification.
