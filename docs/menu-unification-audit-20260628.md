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
- Removed the older separately injected Memorandum menu extension from the Admin Center response to prevent duplicate navigation entries.

## Safety

- No D1 migration.
- No KV, R2 or database mutation.
- No mail send.
- No media invitation dispatch.
- No queue approval or delivery endpoint call.
- No change to `saved-2059`.

## Validation

- JavaScript syntax checks for all new and updated assets.
- Targeted menu parity regression test: 4 tests passed, 0 failed.
- The regression verifies item order, HR/EN labels, canonical destinations, direct Admin Center routing, duplicate Memorandum removal and absence of live-delivery calls in the Admin Center extension.
- Wrangler dry-run is required before production deployment.
- Production workflow only performs GET verification of public pages, assets, Admin Center HTML and portal status JSON.
