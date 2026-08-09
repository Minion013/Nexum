---
labels:
  - wayfinder:map
---

# PactFlow account profile and connections map

## Destination

Produce a build-ready MVP specification for reliable verified-user provisioning, personal profiles, the signed-in People directory, and professional connections, so the current sign-in failure is eliminated and a user can establish a portable PactFlow identity.

## Notes

Planning-only map. Consult `CONTEXT.md` for the account, profile, and connection language. Buyer, seller, and resolver are agreement-scoped access roles, never account types. The linked Supabase project must receive the local migrations before sign-in can be verified end-to-end.

## Decisions so far

- [Connection handoff to Proposal creation](tickets/028-connection-handoff-to-proposal-creation.md) - Accepted connections can pre-fill an optional Proposal counterparty selector, but access and invitation remain wholly explicit; manual Contact entry continues.

- [Profile deactivation and contract-history policy](tickets/027-profile-deactivation-and-contract-history-policy.md) - Immediate deactivation stops presence and new access; erasure waits for active obligations to end and removes personal data while retaining a pseudonymous, authorised Contract-history record.

- [People directory operations and safety policy](tickets/026-people-directory-operations-and-safety-policy.md) - The opt-in directory uses stable relevance-free search, cursors and rate limits, applies connection safety before exposure, and records private reports for minimal operations review.

- [Profile-photo storage lifecycle](tickets/025-profile-photo-storage-lifecycle.md) - Photos are normalised square WebP files in private Profile storage, served only through short-lived owner URLs and deleted on replacement or removal; People uses generated avatars instead.

- [Connection record and safety model](tickets/019-connection-record-and-safety-model.md) - One unordered Profile-pair record governs requests; request and retry limits reduce harassment, while a blocker-controlled terminal state prevents further discovery or requests.

- [Account and directory experience](tickets/018-account-and-directory-experience.md) - Minimal setup captures identity and discovery consent; People supports opted-in discovery and connection requests without granting Workspace or Contract authority.

- [Profile persistence and access model](tickets/017-profile-persistence-and-access-model.md) - A profile is tied one-to-one to Supabase Auth; private fields remain owner-only, directory fields are opt-in and narrowly exposed, and missing profiles recover into setup rather than blocking sign-in.

- [Profile identity, onboarding, and discovery](DECISIONS.md#profile-identity-onboarding-and-discovery) — One user profile has a required display name and immutable username, optional private photo and personalisation, and opt-in signed-in discovery.
- [Professional connection lifecycle](DECISIONS.md#professional-connection-lifecycle) — Connections are accepted requests with an optional note, in-app notifications, and safety controls; they do not gate agreement invitations.
- [Verified-user recovery](DECISIONS.md#verified-user-profile-recovery) — Authenticated users missing a profile must receive an incomplete profile and setup route rather than a login-blocking error.

## Not yet specified



## Out of scope

- Direct messaging and email notification delivery.
- Public unauthenticated profiles, job listings, marketplace ratings, or a freelancer marketplace.
