# GNK ASG menu unification and deployment audit — 2026-06-28

Branch: `project-50-white-integrated-menu`
Safety branch: `saved-2059` — not modified

## Scope

- Unified the native HR/EN index menu and the shared public shell around one 11-item navigation contract.
- Preserved the approved public menu order: THE CODE, Financials/Financije, Network/Mreža, News/Vijesti, Publications/Objave, Markets/Tržišta, Gallery/Galerija, AI, Admin, Contact/Kontakt and language switch.
- Changed Admin destinations to the direct `/admin-center/` route.
- Corrected the English Contact destination to `/en/contact/`.
- Added reciprocal language routing for news, publications, markets, assistant, contact, downloads and legal routes.
- Added identical desktop typography, spacing, active states, focus states, border treatment and mobile two-column menu behaviour to the index and shared public shell.
- Added the native index mobile menu controller with Escape handling and hash-aware active state.
- Extended the Admin Center navigation with Memorandum Studio, Social Share, WhatsApp Center and Review Center without enabling mail dispatch or media invitation delivery.
- Removed the older separately injected Memorandum menu extension from the authenticated Admin Center response to prevent duplicate navigation entries.

## Production route correction

- The first deploys created valid Worker versions but did not update `gnk-asg.hr` because `routes` were accidentally nested inside the `[assets]` TOML table.
- Wrangler reported `Unexpected fields found in assets field: "routes"`.
- Commit `46bd668a07d5c1ccce7627766ee93b547d42fce9` moved `routes` to the root of `wrangler.toml`.
- Commit `0a494497baa4def28ea3e2e7417d6679a11850ae` added a permanent regression test that fails if routes are placed inside `[assets]` again.

## Safety

- No D1 migration.
- No KV, R2 or database mutation.
- No mail send.
- No media invitation dispatch.
- No queue approval or delivery endpoint call.
- No change to `saved-2059`.
- Admin verification used the expected unauthenticated `401` login isolation plus a separate GET check of the Admin extension asset.

## Validation and deployment result

- JavaScript syntax checks passed for all new and updated assets.
- Targeted regression suite: 5 tests passed, 0 failed.
- Wrangler dry-run passed with root-level production routes.
- Cloudflare deploy passed.
- Production GET verification passed for HR index, EN index, Vijesti, Publications, protected Admin login, public shell JS, unified menu CSS, Admin Center extension JS and portal version JSON.
- HR and EN index responses expose `UNIFIED_PUBLIC_MENU_V16`, 11 menu items and the V30 release header.
- News and Publications load the V16 public shell.
- `/admin-center/` remains protected by `401` login isolation; `/assets/admin-center-extensions-v2.js` is live and returns the V2 Admin extension bundle.
- Successful workflow run: `28317664347`.
- Recorded deployment source commit: `5c46600fb17a7acdbccead6fd1ae89cbe4ed2e3c`.
- Deployment record: `docs/deployments/unified-menu-v16-live.json`.
- Diagnostic record: `docs/deployments/unified-menu-v16-diagnostic.json`.
- All deployment and diagnostic PRs were closed without merge.
