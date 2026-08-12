# Complete Next.js TypeScript route inventory

This inventory describes the browser surface that must stop relying on public HTML rewrites. It is a tracking asset for the [Complete Next.js TypeScript conversion](complete-nextjs-typescript-conversion-map.md).

| URL contract | Current static page | Current browser behavior | Target Next.js route | Backend completion to define |
| --- | --- | --- | --- |
| `/` | `index.html` | Marketing landing page | `app/page.tsx` | Content-only unless product data becomes required |
| `/login` | `login.html` | Email-code authentication and onboarding | `app/login/page.tsx` | Auth configuration, code verification, onboarding completion |
| `/home` | `home.html` | Signed-in dashboard | `app/home/page.tsx` | Authenticated Home data |
| `/contracts` | `contracts.html` | Contract list and filters | `app/contracts/page.tsx` | Authorized Contract listing and connection data |
| `/contracts/new/choose-person` | `contract-author-choose-person.html` | Contract authoring: counterparty | `app/contracts/new/choose-person/page.tsx` | People lookup and draft state |
| `/contracts/new/project-details` | `contract-author-project-details.html` | Contract authoring: project details | `app/contracts/new/project-details/page.tsx` | Draft creation and validation |
| `/contracts/new/review-terms` | `contract-author-review-terms.html` | Contract authoring: review terms | `app/contracts/new/review-terms/page.tsx` | Draft retrieval, validation, and saving |
| `/contracts/new/send` | `contract-author-send.html` | Contract authoring: publish | `app/contracts/new/send/page.tsx` | Publishing and invitation workflow |
| `/contracts/:contractId/choose-person` | `contract-author-choose-person.html` | Existing-draft authoring: counterparty | `app/contracts/[contractId]/choose-person/page.tsx` | Authorized draft retrieval and people lookup |
| `/contracts/:contractId/project-details` | `contract-author-project-details.html` | Existing-draft authoring: project details | `app/contracts/[contractId]/project-details/page.tsx` | Authorized draft update and validation |
| `/contracts/:contractId/review-terms` | `contract-author-review-terms.html` | Existing-draft authoring: review terms | `app/contracts/[contractId]/review-terms/page.tsx` | Authorized draft update and exact version validation |
| `/contracts/:contractId/send` | `contract-author-send.html` | Existing-draft authoring: publish | `app/contracts/[contractId]/send/page.tsx` | Publishing and invitation workflow |
| `/contracts/:contractId` | `contract.html` | Contract detail | `app/contracts/[contractId]/page.tsx` | Authorized Contract details and lifecycle data |
| `/wallet` | `wallet.html` | Wallet connection and test balance | `app/wallet/page.tsx` | Wallet-safe configuration and Contract acceptance recording |
| `/people` | `people.html` | People Directory | `app/people/page.tsx` | Authorized discovery and connection workflow |
| `/contacts` | `people.html` | Compatibility alias for People Directory | redirect or route alias to `/people` | Same authorized People Directory behavior |
| `/notifications` | `notifications.html` | Private notification inbox | `app/notifications/page.tsx` | Authorized list and read workflow |
| `/settings` | `settings.html` | Profile Settings and avatar upload | `app/settings/page.tsx` | Authorized profile update and private avatar support |
| `/authorities` | `authorities.html` | Authority Registry placeholder | `app/authorities/page.tsx` | Authority Registry read model or an explicitly static product decision |
| `/invitations/:invitationId` | `invitation.html` | Invitation acceptance | `app/invitations/[invitationId]/page.tsx` | Authorized invitation acceptance |

## Existing implementation boundary to retire

- `frontend/next.config.ts` maps all pages above to `.html` files through rewrites.
- `frontend/public/*.html` contains page markup.
- `frontend/src/legacy/*.ts` contains direct DOM manipulation. Twenty-three modules use `@ts-nocheck` and must not remain in the completed conversion.
- Generated client bundles in `frontend/public/*.bundle.js` are an interim build artifact, not application source.
