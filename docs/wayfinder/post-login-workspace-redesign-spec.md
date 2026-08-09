---
parent: ../post-login-workspace-redesign-map.md
status: open
type: spec
labels:
  - ready-for-agent
---

# PactFlow post-login workspace redesign specification

## Problem Statement

After authentication, PactFlow currently presents a collection of page-level headers and panels rather than a coherent workspace. Navigation uses heavy emphasis too broadly, disappears on small screens, and does not distinguish Profile settings from Workspace administration. Home mixes a small summary, contracts, and workspaces without operating as an action-first dashboard. Contracts are visually treated as isolated cards and surface “private draft” language prominently, even though privacy is an access boundary rather than a product identity. The Contacts page is an empty address-book concept rather than a useful way to discover and add the people a user works with.

The result makes it hard for a Buyer, Service Provider, or Workspace member to orient themselves, find collaborators, create a Contract in the right context, and move active work forward from a mobile or desktop device. The redesign must improve the signed-in experience without weakening PactFlow’s existing Profile, Workspace, Contract Party, invitation, or Contract visibility boundaries.

## Solution

PactFlow will provide one responsive signed-in workspace shell. Desktop users navigate through a compact sidebar; mobile users use a drawer for full navigation and a fixed bottom bar for Dashboard, Contracts, People, and creation. Navigation labels use normal weight, with semibold reserved for the active destination and high-importance actions.

Dashboard becomes the default action-first Home: it surfaces urgent contract actions and upcoming milestones first, then shows an active-project timeline and lightweight workspace analytics. Contracts become a table-first Workspace experience, with clear status, role, counterparty, milestone, and recency information. A new Proposal is created in an owning Workspace after the initiator chooses whether they are the Buyer or Service Provider; its privacy remains enforced and is communicated discreetly until it is explicitly shared. The social directory is renamed People and presents Discover, My network, and Requests. Profile Settings is always available from the avatar menu and remains separate from Workspace Settings.

The visual system uses warm off-white surfaces, charcoal text, restrained cobalt primary actions, soft status tints, quiet borders and depth, a dense-but-readable dashboard rhythm, visible focus states, and reduced-motion-safe interactions.

## User Stories

1. As an authenticated User Profile, I want to land on a Dashboard after sign-in, so that I immediately know what needs my attention.
2. As a Workspace member, I want urgent Contract actions to appear before summary analytics, so that I can move an engagement forward without hunting through navigation.
3. As a Contract Party, I want to see upcoming milestones in an active-project timeline, so that I can understand the schedule across my current work.
4. As a Workspace member, I want lightweight counts and trends for active, awaiting-action, and completed Contracts, so that I can understand my workspace context at a glance.
5. As a user with no current Contracts, I want a useful Dashboard empty state and a clear creation path, so that an empty account does not feel broken.
6. As a user with several Workspaces, I want to see which Workspace supplies each Dashboard item, so that I do not confuse unrelated engagements.
7. As a desktop user, I want a compact persistent sidebar, so that primary navigation is always predictable without overpowering page content.
8. As a mobile user, I want a full navigation drawer and an easy-to-reach bottom bar, so that I can use the signed-in experience without a cramped or missing header.
9. As a keyboard user, I want logical focus order, visible focus treatment, and a skip link, so that I can navigate every signed-in page without a pointer.
10. As a user who prefers reduced motion, I want navigation and state changes to remain clear without unnecessary animation, so that the interface is comfortable to use.
11. As a user, I want “People” rather than “Contacts” in navigation, so that the directory feels like a professional working network instead of an address book.
12. As a user looking for a colleague or service partner, I want to search and browse People in Discover, so that I can find someone to work with.
13. As a user, I want My network to show accepted professional connections, so that repeat collaborators are easy to find.
14. As a user, I want Requests to collect pending connection requests and invitations, so that I can act on new working relationships from one place.
15. As a user, I want a People connection to make a counterparty easier to select without granting access, so that networking never changes Workspace or Contract authorization.
16. As a user, I want Profile Settings in my avatar menu, so that I can consistently find my personal information and preferences.
17. As a Workspace administrator, I want Workspace Settings separated from Profile Settings, so that member and workspace administration cannot be mistaken for personal identity controls.
18. As a user, I want Contracts presented in a table, so that I can compare and manage multiple engagements efficiently.
19. As a user, I want to filter Contracts by Workspace, stage, and my role, so that I can locate the relevant engagement quickly.
20. As a mobile user, I want the Contracts table to become a readable, ordered list without horizontal overflow, so that all Contract context stays available on a small screen.
21. As a user starting work, I want to select the owning Workspace before creating a Proposal, so that its ownership is explicit from the first step.
22. As an initiator, I want to choose “I’m hiring a service provider” or “I’m providing a service,” so that PactFlow records the Buyer and Service Provider responsibilities without treating either as a permanent account role.
23. As an initiator, I want the counterparty chooser to favour People while allowing a new exact email address when appropriate, so that I can work with both established and new collaborators.
24. As an initiator, I want to create a Proposal rather than a “private Contract,” so that the language describes the work-in-progress naturally.
25. As an initiator, I want an unshared Proposal to be visible only to authorised members of its owning Workspace, so that confidentiality is preserved by behavior rather than attention-grabbing copy.
26. As an initiator, I want a quiet explanation that a Proposal can be shared when ready, so that I understand the next step without seeing “private draft” repeated throughout the interface.
27. As a Contract Party, I want existing Contract review, version, acceptance, and payment-authority notices to remain available after the redesign, so that clearer navigation does not remove essential contract safeguards.
28. As an authorised user, I want loading, error, empty, and unavailable states to use the same workspace shell, so that application state never breaks orientation.
29. As a user, I want status communicated with text as well as colour, so that I can understand Contract stages regardless of colour perception.
30. As a user, I want the signed-in interface to remain readable at 375px, 768px, 1024px, and 1440px, so that it works across phones, tablets, laptops, and large displays.

## Implementation Decisions

- The existing authenticated server application remains the primary application boundary. Existing session, home, workspace, Contract creation, Contract review, and authorization behavior remain the foundation; presentation work must not create a browser-only authorization source.
- One reusable signed-in application shell owns navigation, active-route treatment, Workspace context, profile-menu entry points, responsive layout, and accessibility primitives. Authenticated pages render inside this shell rather than independently recreating a header.
- The canonical navigation destinations are Dashboard, Contracts, People, Workspaces, and Settings. People replaces the Contacts label and canonical route; an existing Contacts link must continue to reach People safely during the transition.
- On desktop, the shell uses a compact left sidebar. On mobile, full navigation is placed in a controllable drawer and the most frequent destinations appear in a fixed bottom navigation. Controls must expose semantic labels, current state, and expanded/collapsed state.
- The Dashboard read model may be extended with only the RLS-visible Workspace and Contract information required to render action priority, project timeline, and lightweight analytics. It must never make Contracts visible outside their existing Workspace and Contract Party boundaries.
- Dashboard action priority is status-driven. Current attention-worthy Contract stages remain visible, while date-aware milestone data is added only when it can be supplied authoritatively by the existing Contract read model.
- Contracts are presented as a semantic table at wide breakpoints with Contract, counterparty, the viewer’s role, stage, next milestone, last update, and row action information. On narrow breakpoints the same records become labelled summary rows; no information is silently hidden solely because the viewport is small.
- Contract stages use user-facing labels. Internal `private_draft` is rendered as Proposal or In progress; it must not be rendered as “Private Draft” or “Private Contract.” Privacy is explained once in the creation flow and enforced by the existing access model.
- A Proposal belongs to one owning Workspace. Creation requires the user to identify the owning Workspace and choose their engagement role. The create command records Buyer or Service Provider for the initiator and derives the complementary responsibility for the named counterparty; neither choice changes Profile or Workspace authorization outside that Contract.
- Proposal creation uses People selection when a qualifying connection exists and accepts a validated exact-email fallback. Selecting a Person or entering an email does not grant Workspace membership or Contract access; sharing remains the explicit invitation action.
- People is a signed-in directory with Discover, My network, and Requests views. It is a discovery and connection layer, not a public marketplace, message system, or authorization mechanism.
- Profile Settings is a dedicated personal settings area reached from the avatar menu. It groups existing identity data and future-safe sections for preferences, notifications, security, and wallet connection. Workspace Settings remains a Workspace-scoped destination for membership and operating context. Controls may only promise persistence where protected storage and APIs exist; unavailable settings are not presented as functional toggles.
- The existing Project, Contract, Contract Version, Contract Party, Proposal, Workspace, Profile Settings, and People Directory vocabulary in `CONTEXT.md` is canonical. “Seller,” “buyer account,” “private Contract,” and “contacts page” are not user-facing replacement terms.
- Visual tokens use warm off-white backgrounds, charcoal text, cobalt primary actions, neutral borders, and distinct accessible status tints. Component emphasis is restrained: normal-weight navigation, semibold active items and key actions, and no heavy all-bold header treatment.
- Interaction transitions remain subtle and respect reduced-motion preferences. Content must not be obscured by fixed navigation, and every actionable icon or control must have an accessible name.

## Testing Decisions

- A good automated test observes an authenticated user-visible result or an authorization outcome, not CSS selector details, DOM structure, or helper implementation.
- The primary automated seam remains the authenticated server boundary: session, Home, Workspace, and Contract endpoints. Tests must prove that redesigned read models remain RLS-scoped and that Contract creation preserves the existing authenticated-only behavior.
- Existing server route tests are prior art for canonical authenticated page routes. They must expand to cover the People route and safe handling of the former Contacts route.
- Existing authenticated-session tests are prior art for Home data scoping and durable Contract creation. They must expand to cover the role-led Proposal create command, Workspace ownership selection, and the exact inverse Buyer/Service Provider responsibility, while proving that the change does not grant new access.
- The highest practical UI acceptance seam verifies page behavior in a browser: the sidebar/drawer/bottom-navigation state, active navigation, profile-menu navigation, Proposal role selection, table filters, and error/empty/loading states. It must assert accessible names and semantic states rather than layout implementation.
- Responsive acceptance checks run at 375px, 768px, 1024px, and 1440px. They verify that primary navigation remains available, fixed navigation does not cover content, Contract information is still accessible, and no horizontal overflow occurs.
- Accessibility acceptance includes keyboard-only operation, skip-link behavior, visible focus, meaningful labels for icons and menus, status text that does not depend on colour alone, and reduced-motion behavior.
- The full existing Node test suite, client build, and static route checks remain required regression gates. Browser acceptance is additive for interactions not observable at the server seam.

## Out of Scope

- Public unauthenticated profiles, job listings, ratings, marketplace discovery, or direct messaging.
- Changes to Contract invitation, visibility, RLS, acceptance, payment authority, wallet signature, or settlement rules beyond carrying the existing safeguards through the new UI.
- A full analytics warehouse, financial reporting, bulk Contract operations, or team-performance administration.
- People ranking algorithms, rate limits, reporting/moderation policy, or delivery of external notifications.
- Dark mode beyond preserving token compatibility for a later decision.
- Persisting new Profile preference fields that do not yet have a protected data model and API.

## Further Notes

- This specification implements the direction recorded in the PactFlow post-login workspace redesign map. The shared visual token reference is the PactFlow design-system master file.
- The first implementation ticket should establish the responsive shell and enough shared behavior to allow the later Dashboard, People/Profile Settings, and Workspace Contracts slices to remain independently demoable.
- The current application already contains a Home action list and Contract status information. The redesign evolves those capabilities rather than rebuilding the Contract lifecycle or compromising its privacy boundary.
