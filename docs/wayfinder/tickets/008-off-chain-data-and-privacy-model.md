---
parent: ../pactflow-technical-architecture-map.md
status: closed
type: task
assignee: Codex
blocked_by:
  - 007-vault-state-machine-and-interface.md
---

# Off-chain data and privacy model

## Question

Given the vault's authoritative fields and events, which Contract, invitation, approval, evidence, user, and index records belong in Supabase Postgres or private storage, and how are they cryptographically bound to the public on-chain record?

## Resolution

Keep Profiles, retired models, invitations, Contract and version metadata, approvals, permissions, notifications, and chain read-models in Supabase Postgres behind RLS. Keep human-readable Contract documents and evidence files or links in private object storage, available only to the relevant Contract Parties and assigned Case Officer. Base Sepolia holds only canonical version hashes, evidence digests, milestone and payment state, timestamps, and events. Canonicalise each immutable version and evidence record, hash it, store the digest on-chain, and retain the matching digest plus chain transaction reference in its private record.
