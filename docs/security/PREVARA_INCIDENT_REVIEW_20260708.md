# Incident review — unauthorized public-title wording

Date: 2026-07-08
Repository: `beckuphome-gnk/gnk-asg-portal`

## Finding

The word `PREVARA` was introduced in historical commit:

`bf7459fbb536de6f2a9b182a334be8077547ca9d`

Commit message: `Update index.html`

Affected file:

`apps/portal/about-the-group/index.html`

Changed title:

```diff
- <title>About the Group | GNK DINAMO Ltd. Group / GNK ASG</title>
+ <title>About the Group | GNK DINAMO Ltd. Group / GNK AS -  PREVARA</title>
```

GitHub metadata observed through repository commit inspection:

- author login: `beckuphome-gnk`
- committer login: `web-flow`
- timestamp UTC: `2026-07-08T10:23:20Z`
- timestamp Europe/Zagreb: `2026-07-08 12:23:20`

## Current repository state

The affected `about-the-group` directory is not present on the current `main` branch.
It was deleted in later commit:

`0f4f9b9087d195c81659b8c487e45e3a60d60878`

Commit message:

`Delete apps/portal/about-the-group directory`

Observed timestamp Europe/Zagreb:

`2026-07-08 12:26:06`

## Access review snapshot

Observed repository permissions:

- `beckuphome-gnk`: `admin`
- `masarykovazagreb-pixel`: `write`
- `web-flow`: `none`

`web-flow` is the GitHub web UI committer identity, not proof of an independent collaborator.

## Corrective controls added in this branch

- `.github/CODEOWNERS` added to declare `@beckuphome-gnk` as owner for repository and portal paths.
- `scripts/guard-public-content.mjs` added to fail if banned public-content terms are reintroduced in portal/docs runtime files.

## Required manual protection

The connected token does not have admin/maintain permission on the old repository, so branch protection and collaborator removal must be done by the repository owner/admin in GitHub UI.

Recommended GitHub settings:

1. Settings → Collaborators and teams → remove every user except the owner and explicitly trusted accounts.
2. Settings → Branches → add branch protection rule for `main`.
3. Require pull request before merging.
4. Require approval by code owner.
5. Block force pushes.
6. Restrict who can push to matching branches.
7. Disable or review workflows that delete portal directories or auto-edit public pages.
