# 03 — Restrict agreement access to invited participants

**What to build:** A buyer or seller can invite the counterparty into a payment agreement, and only those participants can view or change its private coordination data.

**Blocked by:** 02 — Create secure participant sessions and wallets.

**Status:** complete locally; production authentication and durable storage remain open

- [x] A proposer can invite a buyer or seller and the invitee can accept into the intended payment agreement.
- [x] Only the buyer and seller can read, edit, approve, or submit private agreement material for that agreement.
- [x] An unrelated signed-in participant receives no agreement data and cannot act by modifying identifiers or requests.
