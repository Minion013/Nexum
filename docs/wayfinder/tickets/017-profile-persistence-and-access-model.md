---
parent: ../account-profile-and-connections-map.md
status: closed
type: grilling
assignee: Codex
blocked_by:
  - 014-profile-identity-onboarding-and-discovery.md
  - 016-verified-user-profile-recovery.md
---

# Profile persistence and access model

## Question

Which Supabase tables, constraints, private storage rules, and row-level policies preserve the resolved profile identity and visibility boundaries while safely provisioning an authenticated user who is missing a profile?

## Resolution

Use one profile row per authenticated Supabase user, keyed by auth.users.id. Keep email, preferences, private avatar path, and wallet bindings owner-only. Require a display name and a normalised, unique, immutable username for identity. Make discovery opt-in and expose only approved directory-safe fields such as display name, headline, and avatar presentation through a narrow RLS-safe function or view; never grant broad direct profile reads. The auth trigger creates the initial profile, while ensure_profile() repairs an authenticated user missing one and sends them to setup rather than blocking login.
