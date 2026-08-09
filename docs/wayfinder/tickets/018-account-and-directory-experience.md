---
parent: ../account-profile-and-connections-map.md
status: closed
type: prototype
assignee: Codex
blocked_by:
  - 014-profile-identity-onboarding-and-discovery.md
---

# Account and directory experience

## Question

How should the minimal post-verification profile setup, profile-completion entry point, People directory, profile detail, connection request, and inbox fit into PactFlow's existing workspace without confusing account identity with agreement access?

## Resolution

After verification, collect only display name, immutable username, and discovery consent; defer photo, headline, and bio to Profile Settings. A quiet completion prompt may return later but never blocks a user from their Workspace. People lets signed-in users browse or search opted-in Profiles, open a safe profile detail, and send a connection request. Requests appear in the private notification inbox. Discovery and connections grant no direct messaging, account role, Workspace membership, or Contract access.
