# 03 — Deliver table-first retired model Contracts

**Parent:** [PactFlow post-login retired model redesign specification](../post-login-retired model-redesign-spec.md)

**What to build:** Contract Parties browse multiple Contracts in a filterable, table-first view showing the Contract, counterparty, their responsibility, stage, next milestone, and recent activity. On a small screen, the same context is presented as labelled rows without horizontal overflow.

**Blocked by:** 01 — Establish the responsive signed-in app shell.

**Status:** blocked / check later — 2026-08-09. Implementation and non-authenticated browser responsiveness are verified, but authenticated Contracts and Dashboard reads now return a generic request failure after a durable caller-visible Contract Draft is created. Do not select again until that read failure is diagnosed.

- [ ] Table filters support retired model, stage, and viewer responsibility while retaining the existing Contract visibility boundary.
- [ ] Contract stages use user-facing labels; an internal private-draft stage appears as Contract Draft or In progress, never “Private Draft” or “Private Contract.”
- [ ] Desktop table and mobile record views expose the same relevant information with accessible row actions and text-based status meaning.
- [ ] Existing authenticated Contract read behavior stays protected by regression tests, and browser acceptance verifies filters and responsive rendering.

## Evidence recorded 2026-08-08

- The authenticated Home read model continues to use the caller's Supabase session and RLS-visible `contracts` query. It now maps the existing latest-version scope title for the Contracts table without widening that query or returning non-visible rows.
- The Contracts screen has accessible retired model, stage, and viewer-responsibility controls; desktop exposes the Contract title, retired model, counterparty, responsibility, text-labelled stage, next milestone, recent activity, and an Open row action. The narrow record view carries the same labelled context.
- Internal `private_draft` maps to **Contract Draft** in the filter and rendered status. The page contains no user-facing “Private Draft” or “Private Contract” copy.
- Browser checks against the local application verified no horizontal overflow at 375, 768, 1024, and 1440px. The labelled record view renders at 375/768px; the semantic table renders at 1024/1440px.
- Verification: `npm.cmd test` (48 passing), `npm.cmd run typecheck`, `npm.cmd run build`, and `git diff --check` pass. Regression tests assert the RLS-scoped Home loader returns the Contract title and the Contracts page has semantic table headers, accessible filter controls, mobile records, and user-facing stage labels.

## Remaining verification gap

- Automated regression evidence refreshed 2026-08-09: `npm.cmd test` (58 passing), `npm.cmd run typecheck`, production `npm.cmd run build`, and `git diff --check` pass. (The first sandboxed build attempt was denied source-directory access; the permitted retry passed.)
- Authenticated browser verification is blocked: the supplied test account successfully completed OTP sign-in on 2026-08-09 and exposes two RLS-visible retired models. With explicit approval, it created one Buyer Contract Draft in the first retired model; an equivalent linked-project RLS query confirms that durable Contract Draft is visible to the caller and retains its retired model, Contract Draft stage, and Buyer responsibility. Immediately after creation, however, the client reports only `Request failed.` for both the Contracts and Dashboard authenticated reads, leaving no retired model options or rows to filter; the client also surfaces `Cannot read properties of null (reading 'reset')` after the successful Contract Draft response. Do not create further test data or mark this ticket complete until that authenticated read failure is diagnosed. Once fixed, create or recover visible Contracts in both retired models and verify every retired model/stage/responsibility filter changes the desktop table and labelled mobile records while retaining the caller's visibility boundary.
