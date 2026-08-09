# 02 — Establish secure profiles, sessions, and workspaces

**What to build:** Each person has one durable PactFlow User Profile, authenticated by Supabase Auth and authorised by Supabase RLS. The account experience must make it clear which profile is being used, while keeping profile information private on shared devices. A new user receives a personal Workspace and can create additional named Workspaces. Wallet connection remains ticket 02a.

**Blocked by:** 01 — Bootstrap the demo application safely.

**Status:** blocked — deferred for later live-browser verification on 2026-08-09. Do not select this ticket again until the linked local server can be restarted or its Workspace-creation failure is diagnosed; do not mark complete until the remaining real-browser, multi-account checks pass.

**Completion reference:** [Testnet MVP implementation-completion reference](../implementation-completion-reference.md)

- [ ] A participant can sign in and out through the supported Supabase email or social flow. A stable `auth.users` identity and durable User Profile are available after refresh and on another device.
- [ ] Entry is account-aware without leaking a profile to an unauthenticated or shared-device visitor: an active session may offer “Continue as <name>” and “Use a different account”; otherwise the visitor enters their email first and sees only the matching, minimal profile confirmation after authentication is established. Choosing a different account signs out the current session before starting its sign-in flow.
- [ ] The Supabase email-code message uses PactFlow branding, clear testnet-only wording, an accessible six-digit sign-in code, and expiry guidance. The template contains no sensitive profile, Contract, or Workspace information.
- [ ] Profile Settings lets the authenticated user edit their display name and bio, then either upload a private profile image or select a deterministic colour/avatar fallback. Image storage and reads are RLS-scoped to the Profile; the UI never claims that an upload persisted when it did not.
- [ ] On first provisioning, the participant receives a personal Workspace. From the Workspace switcher they can create another named Workspace and land in it; the creating Profile is its initial member. Workspace creation never grants membership in another person’s Workspace.
- [ ] Server routes validate the Supabase session; expired or invalid sessions cannot access authenticated actions; no Supabase secret or service key reaches browser code.
- [ ] The Supabase JWT is the sole application identity passed to Supabase Postgres, Storage, and RLS policies. Privy IDs must not be used as participant primary keys or authorisation claims.

## Evidence recorded 2026-08-08

- Implemented account-aware sign-in: a verified session shows only its minimal authenticated Profile confirmation and offers **Continue** or **Use a different account**; the latter signs out before the email flow resumes. The unauthenticated entry remains email-first.
- Implemented protected Profile Settings for display name, bio, deterministic avatar colour, and optional JPEG/PNG/WebP private image upload. The client reports upload success only after Supabase Storage succeeds, and the server accepts only an image path rooted at the authenticated Profile ID.
- Added named collaborative Workspace creation through an authenticated route. The route ignores caller-supplied profile IDs; the linked RLS policy and workspace-owner trigger create the authenticated Profile's owner membership only.
- Applied linked-project migration `20260808140000_add_private_profile_media_and_bio.sql`, creating the private `profile-images` bucket and per-Profile Storage RLS policy.
- Deployed the PactFlow-branded testnet-only email-code template to linked Supabase Auth. A final `supabase config push` reported Auth **up to date** after the pre-existing Auth settings (redirects, MFA, confirmations, rate limit, and OTP length) were restored.
- Verification: `npm.cmd run typecheck`, `npm.cmd test` (48 passing), `npm.cmd run build`, and `git diff --check` all pass. The test suite covers Supabase-session route protection, Profile provisioning, protected Workspace creation, caller-owned avatar path validation, and public-config secret exclusion.

## Evidence refreshed 2026-08-09

- Re-ran `npm.cmd run typecheck` and `npm.cmd test`: all 48 tests pass. `npm.cmd run build` also passes when the build process is permitted to read its Node/esbuild dependencies outside the workspace sandbox; the initial sandbox-only failure was environmental rather than a source failure.
- Ran the linked-project `supabase/tests/durable-access-rls.sql` suite successfully. It verifies that an unrelated authenticated Profile cannot read or alter another Profile's protected records, access their private profile-media storage path, or acquire membership in their Workspace by changing identifiers.
- Initial Auth-template hardening removed the raw token-bearing URL and added a template regression test; it was superseded by the email-code update below.
- Replaced the link flow with Supabase email OTP: Auth now sends a six-digit `{{ .Token }}` code, and the browser verifies it through `verifyOtp` without a token-bearing callback URL. The published subject is **Your PactFlow sign-in code (test environment)**. Typecheck, production build, and the full 47-test suite pass, including code-request, code-verification, invalid-code, and template checks.
- Tested an OTP subject template, but the magic-link subject does not reliably interpolate `{{ .Token }}` in the hosted Auth flow. The supported deployed subject is **Your PactFlow sign-in code**; the six-digit code is in the email body. A dynamic subject requires a custom Send Email Auth Hook/provider.
- Configured the Supabase **confirmation** template as well as the magic-link template to use the same six-digit code email. This covers first-time Profile provisioning, which previously used Supabase's default “Confirm your email address” link. Typecheck and all 47 tests pass.
- Fixed Profile Settings so an optional private-image upload failure no longer prevents display name, headline, bio, avatar colour, and discoverability from saving through the authenticated Profile route. The UI now clearly reports that details were saved while the image was not, so it never claims an unsuccessful upload persisted.
- Redesigned Profile Settings into responsive Identity, Avatar, and Discoverability sections; replaced the textual Notifications control with an accessible bell icon button and unread badge. The focused regression test (2), typecheck, production build, and full suite (49) pass.
- Live linked-project OTP verification succeeded for `pacificsleepershark1123@altmail.kr`: a fresh six-digit code provisioned its Supabase Auth user and durable Profile, then a second code established a returning session that was rehydrated with its refresh token. Its authenticated `ensure_profile` call returned one personal Workspace owner membership.
- A separate live OTP session for `anchor1882@dontsp.am` provisioned a second Profile. Under that session, RLS returned zero rows for the first Profile and Workspace, and rejected an attempted `workspace_memberships` insert into the first account's Workspace (`P0001`). No unauthorized membership was created.
- Verification refreshed: `npm.cmd run typecheck`, `npm.cmd test` (58 passing; Ganache used its non-native fallback), and the elevated `npm.cmd run build` all pass.

## Remaining verification gaps

- In two browser profiles, verify a second account cannot read or upload another account's private profile image. The live session confirmed Profile/Workspace isolation and rejected a membership escalation; the linked SQL RLS suite covers private Storage, but the final browser confirmation remains.
- Confirm that Gmail receives the six-digit Auth code. The supplied AltMail and dontsp.am inboxes received usable codes; Gmail deliverability and any sender-domain SPF, DKIM, DMARC, or SMTP-provider remediation remain outside this repository.
- In a signed-in deployed browser, save Profile Settings once with no image and once with an image upload deliberately rejected by Storage; confirm the first saves all profile fields and the second saves the fields while showing the explicit image-upload warning.
- In a signed-in browser, create a second named Workspace through the Workspace switcher and confirm the new Workspace opens with only the creating Profile as its initial member.

## Verification refreshed 2026-08-09 (current session)

- Claimed and continued this in-progress ticket according to the tracker order. The rendered local sign-in flow presented the PactFlow account entry, six-digit OTP instructions, and the minimal email-specific code-entry state after a code request; no profile details were exposed before authentication.
- Against an unrestricted local server connected to the linked Supabase project, `pacificsleepershark1123@altmail.kr` completed six-digit OTP sign-in and saw only **Continue as pacificsleepershark1123?**. It continued to an authenticated Dashboard, reloaded Profile Settings and rehydrated the same durable Profile, then returned to that minimal account-aware confirmation. **Use a different account** signed the session out and returned to the email-only entry without exposing the Profile.
- The same signed-in browser saved a test bio and deterministic avatar colour, received the explicit saved confirmation, then restored the bio and original Slate colour. Its private avatar remained owner-only in the rendered Settings page.
- `npm.cmd test` passed all 58 tests (Ganache used its documented non-native fallback), `npm.cmd run typecheck` passed, and `git diff --check` passed after the browser verification.

## Verification refreshed 2026-08-09 (OTP continuation pending)

- A fresh local browser session loaded the safe public entry and the email-first PactFlow sign-in page. Requesting a code for `pacificsleepershark1123@altmail.kr` transitioned only to the email-specific **Check your inbox** screen with a labelled six-digit-code control; it exposed no Profile, Contract, or Workspace information.
- The first user-provided code authenticated with Supabase on the pre-existing port-3000 server, but that server then rejected `/api/session` and signed the browser out. This is consistent with the tracker evidence for the stale local-server boundary and cannot prove the authenticated acceptance criteria.
- A fresh six-digit code was requested from the known linked-project server on port 3456. Its verification is awaiting the user-provided code, after which the remaining authenticated browser checks are: create and land in a named Workspace, verify the owner-only initial membership, and exercise the private-avatar boundary from a second authenticated account.
- Regression verification remains green: `npm.cmd run typecheck`, `npm.cmd test` (58 passing; Ganache used its non-native fallback), and `git diff --check`.

## Verification refreshed 2026-08-09 (linked Workspace creation gap)

- A fresh linked-project OTP for `pacificsleepershark1123@altmail.kr` verified successfully and showed the minimal **Continue as pacificsleepershark1123?** confirmation. Continuing reached the authenticated Dashboard and Workspace switcher.
- The browser exposed the personal Workspace as owner. Submitting the named `Wayfinder verification 2026-08-09` Workspace produced the safe user-facing failure **We could not create this Workspace.** The same browser therefore neither landed in the new Workspace nor demonstrated its owner-only initial membership.
- A privileged linked-database diagnostic confirmed that the schema trigger can create that collaborative Workspace and its sole owner membership. This demonstrates the schema trigger but is not browser acceptance evidence; the application request failure remains open. The pre-existing local server process could not be restarted because the host denied termination, so it may be serving stale behavior.
