# 05 — Review, version, and approve Contract terms

**What to build:** Buyer and seller can approve the exact same immutable payment-Contract version, with changes reliably invalidating obsolete consent.

**Blocked by:** 04 — Create a validated custom payment-Contract draft; 02a — Link user-owned wallets to Supabase accounts.

**Status:** ready-for-agent

**Completion reference:** [Testnet MVP implementation-completion reference](../implementation-completion-reference.md)

- [ ] Participants can review a plain-language summary of one numbered Contract version and approve it with their own wallet.
- [ ] The system records consent only for the exact Contract-version hash and shows which party is still required.
- [ ] Any later change creates a new version and clears both prior approvals without silently changing the approved terms.
