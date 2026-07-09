# Live verify diagnostics — 2026-07-09

This note documents the safe deploy workflow diagnostics update.

## Reason

The previous `Verify public portal assets` step failed with `exit code 1` after the deploy had already completed successfully. The failure did not identify which live endpoint failed.

## Change

The workflow now prints grouped diagnostics for every live verification target:

- Google verification file
- THE CODE page
- Mail Studio v26 runtime asset
- Finance KPI JSON
- GNK ASG audited PDF
- GNK DINAMO consolidated PDF

Each check now includes:

- label
- target URL
- HTTP status
- short body preview on failure
- six retry attempts with delay

## Safety

No DNS changes.
No Cloudflare route changes.
No secrets or token changes.
No mail sending.
No campaign or bulk action launch.
No production binding changes.

The deployment command remains unchanged. The change only makes the final verification step observable and less brittle against short CDN/edge propagation delay.
