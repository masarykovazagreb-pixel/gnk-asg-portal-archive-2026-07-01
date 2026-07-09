# Branch summary — fix/deploy-verify-diagnostics-20260709

## Summary

This branch turns the final live deploy verification from a blind `exit code 1` into an actionable diagnostic report.

## Main workflow change

The `Verify public portal assets` step now has helper checks for:

- marker-based content checks
- status-only checks for PDFs
- grouped log output
- six retry attempts
- HTTP status output
- short response preview on failure

## Why

The previous failed run showed successful deploy but failed after deploy in the verify step. The old verify script did not expose which target failed.

## Risk level

Low. The deployment command is unchanged. The change only affects post-deploy verification visibility.
