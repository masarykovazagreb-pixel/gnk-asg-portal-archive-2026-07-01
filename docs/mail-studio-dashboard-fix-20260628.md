# Mail Studio dashboard loading fix — 2026-06-28

Branch: `project-50-white-integrated-menu`

Safety branch: `saved-2059` untouched

Deployment: not performed

## Reported problem

Mail Studio did not finish loading inside Admin Center / dashboard.

## Root conflict

The current Admin Center already loads and manages `#moduleFrame` through `apps/portal/assets/admin-center-v2.js`.

The Worker wrapper also injected `apps/portal/assets/admin-module-loader-v3.js` into the same Admin Center response. Both scripts listened to the same iframe load lifecycle and independently changed `hidden`, loading, error and retry state. This created a duplicate iframe-controller race.

## Fix

Updated `workers/gnk-asg-direct-operator/src/index-admin-hub-v27-news-status.js`:

- Detects the native `/assets/admin-center-v2.js` loader.
- Does not inject `admin-module-loader-v3.js` when the native loader is present.
- Keeps `admin-module-loader-v3.js` as a legacy fallback only.
- Adds response header `x-gnk-asg-admin-frame-loader` with either `ADMIN_CENTER_V2_NATIVE` or `LEGACY_FALLBACK_V3`.
- Preserves same-origin iframe CSP and removes `x-frame-options` for approved embedded admin modules.
- Keeps `/mail-studio` and `/mail-studio-pro` in the embedded admin-module allowlist.

## Verification

PASS — Admin Center HTML containing `admin-center-v2.js` receives no second module loader.

PASS — Legacy Admin Center HTML without the native loader receives exactly one fallback loader.

PASS — Mail Studio remains in the approved embedded module set.

PASS — Dashboard target remains `/mail-studio/?embedded=1&hubmodule=mail`.

PASS — `saved-2059` remains the merge base; the work branch is ahead only.

## Commit

`1203184977668d510ea40afae933043208ba3d31` — Fix Mail Studio loading race in Admin Center

## Remaining validation

A real browser end-to-end check must be performed after a reviewed preview or production deployment. No deployment was performed in this fix.