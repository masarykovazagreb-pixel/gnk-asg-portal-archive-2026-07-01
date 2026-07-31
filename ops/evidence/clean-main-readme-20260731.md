# Review order

1. Validate the two JSON control files.
2. Run `node scripts/validate-automation-kill-switches.mjs`.
3. Confirm all publishing and mail channels remain disabled.
4. Confirm observation-only telemetry and backup controls remain enabled.
5. Require green CI before any later merge decision.
