# Post-login workspace redesign continuation tracker

Last implementation commits: `16048d3`, `2454c2a`.

## Completed

- Responsive Dashboard, Contracts, People, and Profile Settings entry pages with sidebar/bottom navigation styling.
- Canonical `/people` route with `/contacts` compatibility.
- Role-led Proposal command with owning Workspace validation and an explicit later invitation step.
- Opt-in Profile discoverability plus private connection request lifecycle storage/API.
- Proposal-specific Workspace access is separately scoped, preserving existing Contract visibility boundaries.

## Remaining before the eight tickets can be marked complete

- Replace duplicated page shell markup and move the remaining authenticated routes (`/workspace`, authorities, Contract detail, invitation) into it; populate every mobile drawer with complete navigation.
- Enrich the Contracts read model with counterparty, real viewer responsibility, authoritative next milestone, and last activity; implement those filters and the identical labelled mobile record fields.
- Use authoritative milestone data to order Dashboard actions by stage and render its timeline and completed/awaiting analytics.
- Finish the accepted-Person Proposal path by safely pre-filling the connected Profile's permitted counterparty email (or make the confirmed-email handoff explicit), then add acceptance coverage.
- Hydrate existing Profile Settings (`professional_headline`, `discoverable`) before saving so an untouched submission never clears persisted values.
- Add endpoint/RLS lifecycle coverage for People and Profile Settings, plus browser acceptance for keyboard navigation, responsive breakpoints, filters, error/loading/empty states, and no overflow.
- Apply the migration to the linked Supabase project and run the durable RLS SQL test after the above database changes are covered.
