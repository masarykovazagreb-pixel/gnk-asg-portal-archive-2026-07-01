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
7. Static assets were not found at `apps/portal/news-admin/index.html` and `apps/portal/pdf-publisher/index.html`. Their routes are declared in the Worker module map, so the next test must verify whether they are dynamically served or currently resolve to missing assets.
8. The Worker redirects non-embedded module routes to Admin Center and allows `embedded=1` module requests to continue to the underlying module implementation.

## Commits in this run

- `fd6db91` — prevent duplicate Admin Center iframe controllers.
- `ad95f3b` — load Admin Center extensions after the core controller.

## Next test sequence

1. Refactor Mail Studio into an external shell plus isolated core, attachments and AI scripts. Preserve all existing fields, profiles, signatures, draft storage, mailbox views and send API payloads.
2. Add a module-ready/error bridge between embedded admin modules and Admin Center.
3. Make Admin Center validate the iframe's final route, document availability and module identity before showing READY.
4. Verify every module route in both standalone and embedded form.
5. Resolve News Admin and PDF Publisher route implementation if their dynamic handlers do not return valid HTML.
6. Verify API authentication and cookie behavior for Admin Center, Mail Studio, media applications and media access.
7. Run non-destructive API checks only. Do not call real send endpoints with approved/live payloads.
8. Record HTTP status, content type, redirect target, frame policy and UI boot result for every route.

## Safety

No deployment, D1 migration, e-mail send, SMS send, invitation delivery or destructive data change was performed in this run.
