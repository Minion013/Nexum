# 03 — People Directory and Contacts compatibility

**What to build:** A signed-in User Profile can use typed People Directory pages to discover Profiles, view connection state, and perform permitted connection actions. The preserved Contacts URL safely reaches the same experience without duplicating product behavior.

**Blocked by:** 02 — Signed-in shell and Dashboard.

**Status:** ready-for-agent

- [ ] People Directory and Contacts compatibility routes render through Next components and retain responsive discovery, network, and request behavior.
- [ ] Discovery and connection actions use the authenticated backend workflow, show actionable validation/service failures, and never expose non-permitted Profile data.
- [ ] Tests cover authorised results, unauthenticated rejection, permitted and forbidden connection transitions, and Contacts compatibility behavior.
