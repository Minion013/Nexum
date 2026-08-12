# Complete Next.js TypeScript conversion

Labels: `wayfinder:map`

## Destination

Every PactFlow browser URL is rendered by a Next.js App Router TypeScript page or route component, with the Node.js API, data access, and workflow support required for that page to be complete. The migration preserves the existing URL contract and user-visible behavior.

## Notes

- Existing route compatibility is a confirmed requirement: preserve every current URL, including `/contacts`, all Contract-authoring URLs, Contract detail URLs, and invitation URLs.
- End-to-end completion is a confirmed requirement: each frontend page must have its required backend support, rather than relying on unimplemented or placeholder workflow behavior.
- The current implementation uses `frontend/public/*.html` rewrites and TypeScript modules under `frontend/src/legacy/`; this is an interim state, not the destination.
- Page inventory: [Complete Next.js TypeScript route inventory](complete-nextjs-typescript-route-inventory.md).
- This map uses the repository-local Markdown tracker. Each file in `wayfinder/tickets/` is a child issue of this map. `Blocked by` records native-dependency-equivalent edges for this tracker.

## Decisions so far

- [Preserve the PactFlow URL contract](tickets/001-preserve-pactflow-url-contract.md) — the conversion retains all current URLs and their user-visible behavior.

## Not yet specified

- Exact component-level decomposition after page patterns, shared application shell needs, and client-only identity integrations have been examined.
- The practical migration order once route/component architecture and verification gates are decided.
- The required API, persistence, authorization, and workflow behavior for each route, especially where the current UI is informational or a placeholder.

## Out of scope

- Backend domain/API redesigns, database migrations, and intentional visual or workflow redesigns are not part of this conversion.

## Further Notes

This map has been converted into the build-ready [PactFlow complete Next.js TypeScript and backend conversion specification](../docs/wayfinder/complete-nextjs-typescript-and-backend-conversion-spec.md).
