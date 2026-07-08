# Working repository policy — 2026-07-08

## Active working repository

Primary safe working repository:

`masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01`

## Old repository status

Old repository:

`beckuphome-gnk/gnk-asg-portal`

Use the old repository only as a source of truth, forensic reference, backup source, and comparison source. Do not use it as the primary working area unless the owner gives a new explicit instruction.

## Safety rules

- No production deploy without explicit owner instruction.
- No email sending.
- No campaign, bulk mail, scheduled outreach or test-send activation.
- No DNS changes.
- No Cloudflare route, binding or secret changes.
- No direct production workflow runs.
- Admin/operator/mail tools must remain protected.
- Public index may expose only public data and protected-entry links.

## Current working approach

All further recovery, premium index work, frontend/backend public mapping, documentation, tests and review branches should be prepared in the Masarykova repository first.

The old `beckuphome-gnk/gnk-asg-portal` repository remains a reference and fallback source only.
