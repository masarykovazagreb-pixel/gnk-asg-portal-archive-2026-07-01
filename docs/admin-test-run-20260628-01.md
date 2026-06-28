# GNK ASG Admin test run 01 — 2026-06-28

Branch: `project-50-white-integrated-menu`
Safety branch: `saved-2059` (untouched)
Deployment: not performed
Real e-mail or media invitations: not sent

## Scope

Initial code-level verification of Admin Center module loading, Mail Studio embedding and route inventory.

## Confirmed findings

1. Admin Center core (`admin-center-v2.js`) and the separately injected `admin-module-loader-v3.js` both controlled the same iframe, loading state, watchdog and retry flow. This created a race where one controller could mark a module ready while the other later displayed an error.
2. `admin-module-loader-v3.js` now defers completely to the native Admin Center controller when `window.__GNK_ASG_ADMIN_CENTER_V2__` is present.
3. The Memorandum Studio extension was injected before the Admin Center core script. Both used deferred DOM initialization, which allowed the core navigation renderer to replace the extension button. The extension is now appended after the core document scripts.
4. Mail Studio exists as a static module at `apps/portal/mail-studio/index.html`.
5. Mail Studio currently contains several independent inline layers in one HTML document: base compose/send, signatures, PDF attachments and personalized AI. This is fragile under strict CSP and makes failure isolation difficult.
6. Operator Dashboard, Media Command Center and Auto Editor static module assets are present.
7. Static assets were missing at `apps/portal/news-admin/index.html` and `apps/portal/pdf-publisher/index.html`; isolated read-only module pages and diagnostics have now been added for both routes.
8. The Worker redirects non-embedded module routes to Admin Center and allows `embedded=1` module requests to continue to the underlying module implementation.
9. The user confirmed that the public contact form works. `/contact/` is recorded as PASS and is excluded from corrective changes.

## Commits in this run

- `fd6db91` — prevent duplicate Admin Center iframe controllers.
- `ad95f3b` — load Admin Center extensions after the core controller.
- `57dabaf` — add shared styling for isolated admin modules.
- `0c2a45b` — add isolated News Admin page.
- `9cee9f2` — add read-only News Admin diagnostics.
- `4346ea3` — add isolated PDF Publisher page.
- `83c9177` — add read-only PDF Publisher diagnostics.

## Current route status

- `/contact/`: PASS by user confirmation; no change planned.
- `/admin-center/`: core route exists; iframe controller race fixed on branch.
- `/mail-studio/?embedded=1&hubmodule=mail`: static module exists; modularization and runtime verification remain.
- `/operator-dashboard/?embedded=1&hubmodule=operator`: static module exists.
- `/media-command-center/?embedded=1&hubmodule=media`: static module exists.
- `/auto-editor/?embedded=1&hubmodule=editor`: static module exists.
- `/news-admin/?embedded=1&hubmodule=news`: missing static asset resolved with a read-only module.
- `/pdf-publisher/?embedded=1&hubmodule=pdf`: missing static asset resolved with a read-only module.

## Next test sequence

1. Refactor Mail Studio into an external shell plus isolated core, attachments and AI scripts. Preserve all existing fields, profiles, signatures, draft storage, mailbox views and send API payloads.
2. Add a module-ready/error bridge between embedded admin modules and Admin Center.
3. Make Admin Center validate the iframe's final route, document availability and module identity before showing READY.
4. Verify every module route in both standalone and embedded form.
5. Verify API authentication and cookie behavior for Admin Center, Mail Studio, media applications and media access.
6. Run non-destructive API checks only. Do not call real send endpoints with approved/live payloads.
7. Record HTTP status, content type, redirect target, frame policy and UI boot result for every route.

## Safety

No deployment, D1 migration, e-mail send, SMS send, invitation delivery or destructive data change was performed in this run.
