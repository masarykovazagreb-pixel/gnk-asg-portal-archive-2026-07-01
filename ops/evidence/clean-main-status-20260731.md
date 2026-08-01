# GNK ASG clean-main stabilization status

Date: 2026-07-31
Branch: agent/stabilize-automation-clean-main-20260731
PR: #888

## Completed

- extracted central automation control registry from obsolete PR #852 onto current main;
- added fail-closed per-channel kill switches;
- added validator requiring publication, mail and news-write channels to remain disabled during stabilization;
- removed unauthorized `.github/workflows/deploy-gnk-asg-image-proxy.yml` production deploy path;
- removed completed one-time `.github/workflows/set-pexels-secret.yml` secret mutation workflow;
- replaced the image-proxy deploy workflow with validation-only dry-run workflow;
- preserved all protected AKTUAL and editorial registry files;
- no production deploy and no merge performed.

## Remaining release gate

PR #888 stays draft until GitHub returns actual CI workflow runs and all required checks are confirmed green. An empty status list is not release approval.
