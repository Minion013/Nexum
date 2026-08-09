---
parent: ../account-profile-and-connections-map.md
status: closed
type: grilling
assignee: Codex
blocked_by:
  - 017-profile-persistence-and-access-model.md
---

# Profile-photo storage lifecycle

## Question

Which file formats, size limits, transformations, retention rules, replacement behaviour, removal behaviour, and private read path make profile-photo uploads safe, predictable, and honestly represented in Profile Settings?

## Resolution

Accept JPEG, PNG, and WebP uploads up to 5 MB; crop and normalise them client-side to a square WebP avatar without retaining the original. Store the result in the private per-Profile folder and issue a short-lived signed URL only to Profile Settings. People uses the safe generated avatar presentation rather than the private upload. On replacement, upload the new file first, update the profile pointer only after success, then delete the old file. On removal, clear the pointer and delete the stored file; this MVP has no retention or recovery bin.
