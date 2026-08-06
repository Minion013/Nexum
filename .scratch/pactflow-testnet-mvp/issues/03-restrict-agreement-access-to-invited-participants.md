# 03 — Restrict agreement access to invited participants

**What to build:** A buyer or seller can invite the counterparty into a payment agreement, and only those participants can view or change its private coordination data.

**Blocked by:** 02 — Establish Supabase participant accounts and sessions.

**Status:** partial — local participant checks are tested, but durable Supabase records and RLS are required for completion.

**Completion reference:** [00 — Testnet MVP implementation-completion reference](00-implementation-completion-reference.md)

- [ ] A proposer can create a durable, expiring counterparty invitation and the intended authenticated recipient can accept it into exactly that agreement.
- [ ] RLS policies allow only a buyer or seller to read or mutate that agreement's private coordination rows and evidence metadata; resolver visibility is limited to its operational data.
- [ ] An unrelated authenticated user receives no private row or storage object and cannot gain access by changing identifiers, routes, or API payloads; integration tests prove these denials.
