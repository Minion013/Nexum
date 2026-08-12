---
labels:
  - ready-for-agent
---

# PactFlow complete Next.js TypeScript and backend conversion specification

## Problem Statement

PactFlow starts through Next.js but its pages are still static HTML files reached through rewrite rules and driven by unchecked legacy TypeScript modules. The Node.js backend is separate from static-file serving, but some page workflows lack an explicit complete backend contract. The application therefore appears to be a Next.js TypeScript product without yet receiving its route architecture, type guarantees, or end-to-end workflow guarantees.

The product owner requires every existing frontend URL to become a real Next.js TypeScript route while preserving its behavior. Every interactive page also needs the API, validation, persistence, authorization, and error behavior required to make that feature complete. Node.js remains the API backend and never serves pages.

## Solution

PactFlow will replace public HTML page rewrites and direct DOM-driven browser modules with typed Next.js App Router pages, layouts, client components, and shared domain/view-model modules. Every existing URL remains valid, including `/contacts`, Contract authoring pages, dynamic Contract pages, and invitation pages.

The Node.js backend will be the explicit data and workflow boundary for every interactive page. Existing authenticated workflows are retained and completed where a page currently relies on placeholder or incomplete support. Authorities becomes a durable, readable Authority Registry feature. Public marketing content may remain content-only, but all identity-bound, Contract, wallet, directory, notification, profile, Authority Registry, and invitation pages must work end to end.

## User Stories

1. As a visitor, I want the landing page to load through a Next.js route, so that public PactFlow uses the same frontend architecture as the application.
2. As a visitor, I want the existing landing-page URL and messaging preserved, so that existing links remain useful.
3. As a prospective User Profile, I want the existing login URL to support email-code sign-in, existing-session choice, local test behavior, and onboarding, so that authentication stays complete after migration.
4. As a signed-in User Profile, I want Dashboard to load my authorised Contract data, so that next actions reflect durable backend records.
5. As a signed-in User Profile, I want Dashboard loading, empty, error, and populated states, so that unavailable data is never mistaken for no work.
6. As a Contract Party, I want Contracts to list and filter only Contracts I may access, so that bilateral Contract privacy survives the frontend conversion.
7. As a Contract initiator, I want each Contract authoring step to be a Next.js page, so that draft creation, validation, restoration, and update behavior no longer depend on static scripts.
8. As a Contract initiator, I want Person selection and exact-email invitation inputs to be validated and protected, so that selecting a person never grants Contract access.
9. As a Contract initiator, I want Project details, terms review, and Send to use backend validation, so that invalid Contract Sections, milestones, allocations, deadlines, and Acceptance Criteria cannot persist.
10. As a Contract Party, I want a dynamic Contract URL to show only my authorised Contract detail and lifecycle data, so that route migration cannot leak another Contract.
11. As a Contract Party, I want wallet-backed Contract Acceptance to record only an exact signed Contract Version, so that page changes do not bypass signature or version validation.
12. As a User Profile, I want Wallet to use typed client integrations and backend-safe Contract Acceptance recording, so that personal wallet funds are never confused with a Contract Escrow Vault.
13. As a signed-in User Profile, I want People Directory discovery and connection workflows to succeed or show an actionable failure, so that every directory control has backend support.
14. As a signed-in User Profile, I want `/contacts` to remain a safe compatibility route to People Directory, so that old links work without duplicate permissions or data.
15. As a signed-in User Profile, I want Notifications to retrieve only my private notifications and mark only my entries read, so that inbox privacy is enforced end to end.
16. As a User Profile, I want Profile Settings and private avatar handling to load and save through authorised durable workflows, so that my personal data remains private.
17. As a user interested in Resolution Authorities, I want Authorities to show an actual Authority Registry read model, so that the page is not an empty placeholder.
18. As an invited person, I want an invitation URL to load its authenticated acceptance workflow in Next.js, so that invitation outcomes retain the existing access rules.
19. As a mobile user, I want every migrated page and workflow to remain usable at narrow widths, so that complete functionality is not desktop-only.
20. As a user who is unauthenticated, forbidden, on an invalid URL, or affected by validation or service failure, I want a truthful page-level state, so that an incomplete backend flow is never hidden.
21. As a maintainer, I want every browser module to be type-checked without `@ts-nocheck`, so that the conversion provides genuine TypeScript guarantees.
22. As a maintainer, I want Node.js to be API-only and Next.js to own page rendering, so that frontend and backend retain a clear deployment boundary.
23. As a maintainer, I want every preserved route and workflow to have parity tests, so that end-to-end completion is demonstrable.
24. As a product owner, I want interim static pages, rewrite-layer page routes, generated legacy bundles, and obsolete browser sources removed after verification, so that no partial conversion path remains.

## Implementation Decisions

- Next.js App Router is the sole page-rendering mechanism. Every inventory URL receives a typed page route; layouts and route groups organise public, authentication, signed-in, Contract-authoring, and dynamic-resource experiences.
- Existing URLs and user-visible behavior are preserved. `/contacts` safely reaches People Directory, all Contract authoring/dynamic Contract/invitation routes remain directly addressable, and unknown URLs use the normal Next not-found response.
- No page route may rewrite to static HTML. Public static files are limited to genuine assets, not page markup or page behavior.
- Browser sources are type-checked TypeScript. Direct document querying and imperative page construction are replaced by typed component state, handlers, and shared view models. `@ts-nocheck` is prohibited for application source.
- A typed frontend API client is the common authenticated integration seam. It owns session token attachment, explicitly enabled local-test fixture headers, response parsing, and conversion of API errors into page-safe states.
- Supabase sign-in remains client-owned where the email-code flow needs it. The backend verifies authenticated sessions, enforces Profile and Contract Party access, and alone owns server-only credentials. Privy wallet integration stays client-side; the backend verifies and records wallet-backed Contract Acceptance.
- The Node.js API remains responsible for authenticated session, onboarding, Home, People, connections, notifications, Profile Settings, Contract Drafts, Contract detail/review, invitations, and Contract Acceptance. Each operation validates input, returns truthful status codes, and preserves established authorization.
- Contract authoring uses a typed, recoverable flow state shared by new and existing Contract routes. It preserves the four stages, protected invitation boundary, Contract Section validation, allocation conservation, ordered UTC deadlines, safe evidence requirements, Acceptance Criteria, and exact-version rules.
- Dynamic Contract routes receive typed route parameters and separately render loading, unauthenticated, forbidden, missing, invalid, and valid states.
- Wallet remains distinct from Contract Escrow Vaults. It may expose safe test-wallet connection/balance state, while Contract Acceptance uses the protected backend workflow.
- Authority Registry completion introduces durable, authorised read behavior for Resolution Authorities, jurisdictions, and rulesets. Empty data is a valid state; unavailable data is surfaced. Any required data schema, migration, and read endpoint are part of this work.
- Every interactive page has a defined read/write API, authorised actor, input validation, persistence effect, and error state. The public marketing page is content-only and therefore needs no dedicated product API.
- Existing Supabase RLS and Profile/Contract Party access rules remain authoritative. No route may accept client-supplied identity, expose service-role credentials, or broaden private Profile, evidence, avatar, notification, or Contract data access.
- Shared signed-in navigation, profile identity, notification count, and responsive application shell become typed reusable components.
- Static pages, rewrite rules, legacy DOM scripts, generated legacy bundles, and their build pipeline are removed only after their replacement routes and parity tests pass. Node never regains file-serving duties.

## Testing Decisions

- Tests assert route availability, visible states, accessible controls, navigation, API responses, authorization outcomes, workflow side effects, and responsive usability—not component internals or CSS implementation details.
- The frontend seam is the rendered Next route with controlled backend responses. Every inventory URL is tested for expected content plus relevant loading, empty, error, authentication, authorization, and not-found states.
- The backend seam is the authenticated Node API. Endpoint tests cover session validation, payload validation, Profile ownership, Contract Party access, safe response shapes, status codes, and durable workflow effects.
- A route-to-backend contract matrix records each interactive route's read/write operations, actor, validation failure, authentication failure, authorization failure, unavailable-service result, and side effect.
- Contract authoring coverage includes new and existing-draft URLs, stage restoration, counterparty selection, exact-email invitation, responsibility selection, draft validation, allocation conservation, deadline order, Acceptance Criteria, save, publication, and unauthorised rejection.
- Contract detail and acceptance coverage includes authorised reads, exact Contract Version retrieval, signature validation, stale/mismatched version rejection, and the absence of server-only wallet credentials in browser responses.
- People, Notifications, Settings, private avatar, Wallet, onboarding, invitations, and Authority Registry tests cover page-visible success and failure behavior plus their Profile or Contract-scoped authorization boundaries.
- Authority Registry tests cover populated, valid-empty, unavailable, and unauthorized scenarios, proving the page no longer relies on hard-coded placeholder content.
- Existing authenticated session, Contract workflow, Contract presentation, People, notification, Profile Settings, and deployment tests are prior art. Their assertions move to Next route and API seams rather than retaining public-file tests.
- Responsive browser acceptance covers public, auth, signed-in, authoring, Contract, Wallet, Authorities, and invitation routes at desktop and narrow mobile widths, including no horizontal overflow for critical controls.
- Required gates are frontend type checking with no unchecked application modules, frontend production build, backend checks, API tests, route-parity tests, and a combined-start smoke test proving Next renders pages while proxying API and health requests to Node.

## Out of Scope

- Intentional visual redesign, URL renaming, workflow simplification, or product-copy changes beyond preserving current behavior in typed components.
- Reintroducing static-file serving to Node or adopting another frontend framework.
- Changes to Contract settlement authority, custody rules, wallet-signature semantics, Base Sepolia safety posture, or the bilateral User Profile and Contract Party access model.
- Restoring retired Workspace, Proposal, Agreement, membership, or team-collaboration behavior.
- Authority Registry authoring or Case Officer operations beyond the read model needed by Authorities.

## Further Notes

- The [Complete Next.js TypeScript conversion map](../../wayfinder/complete-nextjs-typescript-conversion-map.md) and its route inventory are planning artifacts. This specification supersedes them as the build-ready delivery source.
- The runtime topology is unchanged: Next.js owns browser rendering and proxies API/health requests; Node owns API behavior.
- An intentionally public, content-only page is complete without a dedicated backend endpoint. Every page that reads or mutates product state requires complete backend support.
