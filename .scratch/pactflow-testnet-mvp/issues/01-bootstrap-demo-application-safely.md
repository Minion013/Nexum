# 01 — Bootstrap the demo application safely

**What to build:** A runnable PactFlow demo shell that a visitor can open safely, with a clear testnet-only boundary and reliable failure handling.

**Blocked by:** None — can start immediately.

**Status:** partial — local evidence. Startup validation, safe public configuration, health reporting, and the smoke test exist locally; deployment and remote Supabase configuration verification remain open.

- [ ] The application starts with validated configuration, a health-check route or screen, and a clear testnet/no-real-funds notice.
- [ ] Secrets and privileged configuration are unavailable to browser code, and user-facing failures are handled without leaking sensitive details.
- [ ] A smoke test verifies that the application can start and render its public entry experience.
