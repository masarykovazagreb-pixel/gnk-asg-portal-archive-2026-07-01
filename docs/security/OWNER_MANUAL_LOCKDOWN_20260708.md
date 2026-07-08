# Owner manual lockdown checklist — old repository

Repository:

`beckuphome-gnk/gnk-asg-portal`

## Why this is required

The connected token has `write` permission, but not `admin` or `maintain` permission on this repository. Therefore collaborator removal, branch protection, rulesets and workflow disabling must be completed by the repository owner/admin.

## Immediate steps

1. Open repository settings.
2. Go to Collaborators and teams.
3. Keep only explicitly trusted users.
4. Remove unknown or unnecessary collaborators.
5. Go to Branches or Rulesets.
6. Protect `main`.
7. Require pull request before merge.
8. Require CODEOWNER approval.
9. Restrict who can push to `main`.
10. Block force pushes.
11. Disable or review workflows that delete directories, auto-edit public files or deploy without explicit confirmation.
12. Rotate Cloudflare/API/deploy tokens if there is any suspicion that an untrusted user had write/admin access.

## Confirmed access snapshot from tool-visible checks

- `beckuphome-gnk`: admin
- `masarykovazagreb-pixel`: write
- `web-flow`: none

`web-flow` is GitHub's web UI committer identity and is not itself evidence of a separate collaborator.
