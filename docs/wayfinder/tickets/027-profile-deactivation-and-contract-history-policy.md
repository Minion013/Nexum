---
parent: ../account-profile-and-connections-map.md
status: closed
type: grilling
assignee: Codex
blocked_by:
  - 017-profile-persistence-and-access-model.md
---

# Profile deactivation and contract-history policy

## Question

When a user with active or historical payment Contracts requests deletion or deactivation, which identity, access, notice, evidence, and agreement-history records remain, and which profile data is removed or anonymised?

## Resolution

Provide two distinct actions. Deactivate now signs the person out, removes them from discovery and connections, disables new invitations, and notifies affected Contract Parties. Existing active Contracts remain intact: their party identity, accepted versions, wallet address, approvals, evidence references, event history, and payment records remain available to authorised Contract participants. Erase personal profile data is available only after no active Contract obligations remain; it deletes photo, bio, headline, preferences, directory presence, and contact data while retaining a stable pseudonymous Contract-Party record and only the historical material needed to explain the Contract and its on-chain payments. No auth-account deletion may automatically cascade into Contract-history deletion.
