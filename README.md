# PactFlow testnet MVP foundation

PactFlow lets two people create and govern a custom digital-service **Contract** with versioned terms, invitations, and later Base Sepolia testnet settlement. Supabase Auth provides user identities and Supabase RLS protects Contract data. PactFlow does not custody funds, convert fiat, cash out, or provide a real-money service.

## Run locally

```powershell
npm.cmd install
npm.cmd test
npm.cmd run typecheck
npm.cmd --workspace backend run contracts:check
npm.cmd run start
```

Configure `SUPABASE_URL` and the publishable key in `backend/.env`. `npm run start` launches the Next.js frontend at `http://localhost:3000` and the Node.js API at `http://localhost:3001`; Next proxies browser `/api` and `/health` requests to the API. The server does not expose a Supabase service-role key.

The client now lives in `frontend/`: route ownership, TypeScript browser modules, public assets, and the Next.js configuration are all there. The API and contract deployment scripts live in `backend/`.

## Current workflow

1. Sign in and complete Profile setup.
2. Create a Contract Draft, choose the Buyer or Service Provider responsibility for that Contract, and name an exact-email counterparty.
3. Share the Contract Draft explicitly. It becomes available to the invited, authenticated counterparty only after acceptance.
4. Use the separate Wallet surface only for a personal Base Sepolia test wallet and its available test-token balance; it is never combined with a Contract Escrow Vault balance.

The active delivery source is the [one-to-one Contract UX migration specification](docs/wayfinder/one-to-one-contract-ux-migration-spec.md). See the [implementation tracker](docs/wayfinder/IMPLEMENTATION-TRACKER.md) for verified evidence and remaining work.
