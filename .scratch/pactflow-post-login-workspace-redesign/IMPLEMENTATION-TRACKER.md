# Post-login workspace redesign continuation tracker

Last foundation commits: `16048d3`, `2454c2a`; the follow-up work is committed.

## Completed

- Responsive Dashboard, Contracts, People, and Profile Settings entry pages with sidebar/bottom navigation styling.
- Canonical `/people` route with `/contacts` compatibility.
- Role-led Proposal command with owning Workspace validation and an explicit later invitation step.
- Opt-in Profile discoverability plus private connection request lifecycle storage/API.
- Proposal-specific Workspace access is separately scoped, preserving existing Contract visibility boundaries.
- Shared runtime app shell now normalizes desktop navigation, complete mobile drawers, bottom navigation, keyboard-operable controls, and sign-out across authenticated pages including Workspace, Authorities, Contract detail, and invitations.
- Contracts read model and table/mobile records now include counterparty, viewer responsibility, authoritative next milestone, and recent activity; Dashboard orders attention actions by stage and derives its timeline/summary counts from the same data.
- Accepted People selection pre-fills the connected Profile's returned email while making clear that it neither invites nor shares a Proposal; Profile Settings hydrates all persisted editable values before saving.
- `20260808111500_add_people_and_role_led_proposals.sql` was corrected, applied to the linked Supabase project, and followed by a successful durable RLS SQL run.

## Remaining before the eight tickets can be marked complete

- Add endpoint/RLS lifecycle coverage for People and Profile Settings, plus browser acceptance for keyboard navigation, responsive breakpoints, filters, error/loading/empty states, and no overflow.
- Add browser-level acceptance coverage for both the accepted-Person and exact-email Proposal paths.
