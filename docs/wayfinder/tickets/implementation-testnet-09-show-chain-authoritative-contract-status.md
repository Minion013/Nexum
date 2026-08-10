# 09 — Show Project and Escrow Vault status from the chain

**What to build:** Participants can understand a Project’s funding and sequential milestone status from chain-authoritative information, including the independent balance of that Project’s Escrow Vault after refresh.

**Blocked by:** 08 — Fund a Project Escrow Vault through an explicit Buyer action.

**Status:** ready-for-agent

- [ ] The Project shows unfunded, funded, and expired state; its Vault address and token pot; the one active milestone; and locked future milestones.
- [ ] Wallet actions show pending, confirmed, rejected, and failed outcomes, and the rendered state remains correct after refresh.
- [ ] The display never treats application state as authoritative when it disagrees with the Escrow Vault, and never confuses the Vault pot with a participant’s available wallet balance.
