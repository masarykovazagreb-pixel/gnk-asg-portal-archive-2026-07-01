# Worker team handoff — 2026-07-09

## Team split

### Deploy / Codex track

- Keep all code changes PR-based.
- Diagnose live verification failures from Actions logs.
- Avoid direct production edits outside the safe workflow.
- Keep mail/campaign switches locked unless explicitly approved.

### Canva / visual track

- Use existing Canva GNK ASG / THE CODE assets as visual references.
- Prepare visual improvements after deploy verification is stable.
- Do not replace live code directly from Canva output without review.

### Web quality track

- Improve public index clarity.
- Improve THE CODE presentation.
- Keep finance/report/public asset routes stable.
- Preserve protected route map and operational dashboards.

## Current branch

`fix/deploy-verify-diagnostics-20260709`

This branch does not perform deployment. It prepares the workflow to identify the exact failing verification target on the next safe deploy run.
