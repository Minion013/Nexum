---
parent: ../post-login-contract-ux-migration-map.md
status: closed
type: task
assignee:
blocked_by:
---

# Post-login shell and design system

## Question

How should PactFlow establish the shared responsive shell, visual tokens, typography hierarchy, desktop sidebar, mobile drawer and bottom navigation so every signed-in page is coherent and accessible?

## Resolution

Use one responsive signed-in information architecture across devices: a persistent desktop sidebar, a mobile drawer, and a mobile bottom navigation expose the same primary destinations rather than a separate mobile navigation model. Build shared semantic design tokens, typography, and component styling around the established quietly confident Contract-focused direction. Keep navigation labels normal weight; reserve semibold for the active destination and high-importance actions.
