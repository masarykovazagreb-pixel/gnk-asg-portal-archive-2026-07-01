# Cleanup status — public title wording

## Current status

The affected page path is not present on current `main`:

`apps/portal/about-the-group/index.html`

The offending wording therefore is not present as a current file on `main`. It remains visible only in Git history, which cannot be erased safely without destructive history rewrite.

## Historical origin

The wording was introduced in commit:

`bf7459fbb536de6f2a9b182a334be8077547ca9d`

Timestamp:

- UTC: `2026-07-08T10:23:20Z`
- Europe/Zagreb: `2026-07-08 12:23:20`

Committer:

`web-flow`

Author:

`beckuphome-gnk`

## Historical removal from current tree

The affected folder was deleted in commit:

`0f4f9b9087d195c81659b8c487e45e3a60d60878`

Timestamp Europe/Zagreb:

`2026-07-08 12:26:06`

## Added controls in this branch

- CODEOWNERS file.
- Public-content guard script.
- Pull-request-only guard workflow.
- Owner manual lockdown checklist.

## Production note

No production deployment was performed by this branch.
If the live website still shows stale content, the cause is an old deployment/cache, not the current file tree alone.
