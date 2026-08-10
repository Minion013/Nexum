# 07 — Deploy a Project-specific, non-administered Escrow Vault

**What to build:** A jointly approved Project Contract can create one isolated MockEUSD Escrow Vault with fixed parties and no platform fund-moving authority. Every Project’s Vault is a separate, visible money pot; it is never a balance pooled across a user’s Projects.

**Blocked by:** 05 — Review, version, and approve Contract terms.

**Status:** ready-for-agent

- [ ] The factory verifies Buyer and Service Provider approval of the exact Contract version and allows only either signed participant to create that Project’s unfunded Vault.
- [ ] The Vault fixes buyer, service provider, authority/dispute configuration, token, allocations, version hash, and fee configuration, and provides no owner, pause, upgrade, rescue, or admin-withdrawal path.
- [ ] The Project displays its own Vault address, settlement-token balance, funding state, and milestone allocations. These are chain-authoritative and are not presented as part of either party’s wallet balance.
- [ ] Public-interface scenario tests prove that unrelated callers and platform actors cannot create unauthorised Projects or control Vault funds.
