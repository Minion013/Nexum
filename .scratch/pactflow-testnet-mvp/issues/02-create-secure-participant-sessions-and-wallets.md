# 02 — Establish Supabase participant accounts and sessions

**What to build:** A buyer or seller has one durable PactFlow account, authenticated by Supabase Auth and authorized to private data by Supabase RLS. Wallet connection is deliberately deferred to ticket 02a.

**Blocked by:** 01 — Bootstrap the demo application safely.

**Status:** partial — local evidence. Supabase sessions, JWT-scoped profile provisioning, and local tests exist; apply and verify the migrations and RLS policies in the linked project before treating this ticket as complete.

**Completion reference:** [00 — Testnet MVP implementation-completion reference](00-implementation-completion-reference.md)

- [ ] A participant can sign in and out with the supported Supabase Auth email or social flow, and a stable `auth.users` identity and public profile are available after refresh and on a different device.
- [ ] Server routes validate the Supabase session; expired or invalid sessions cannot access authenticated actions; no Supabase secret/service key reaches browser code.
- [ ] The Supabase JWT is the sole application identity passed to Supabase Postgres, Storage, and RLS policies. Privy IDs must not be used as participant primary keys or authorization claims.
