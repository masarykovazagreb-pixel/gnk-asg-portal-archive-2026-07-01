# Hotfix status — mail, index, menu, workers

Branch: `fix-mail-index-menu-workers`

## Autopsy

- Index was not operational enough: THE CODE was not embedded strongly enough on the first page.
- Mail Studio recorded messages, but recorded is not delivered.
- Public menu was too wide and too noisy.
- Worker locations, countries and cities were not exposed as a clean map.

## Changed

- HR index now includes embedded THE CODE HTML show.
- Mail Studio wrapper adds live-send readiness and provider diagnostics.
- Public menu is reduced to four groups.
- Worker location JSON adds 33 primary + 12 extended locations.
- `wrangler.toml` now points to the hotfix wrapper.
- Bulk/campaign sending is locked by default.

## Mail truth

Live send needs all of this:

- `MAIL_STUDIO_LIVE=true`
- `MAIL_MANUAL_LIVE=true`
- `EMAIL` send binding available in the deployed Worker
- verified Cloudflare Email Routing / sender setup

If one item is missing, status remains `RECORDED_REVIEW_ONLY` with reason `live_send_not_enabled_or_binding_missing`.

## Not done by this PR

- No production deploy.
- No mass mail.
- EN index parity still needs final review if the blocked update is not applied separately.
