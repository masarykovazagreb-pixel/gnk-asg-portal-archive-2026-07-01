# Root index asset routing fix — 2026-07-09

## Problem

Deploy run #17 completed successfully, but the live root page still served the older Worker-generated corporate portal instead of the new `apps/portal/index.html` THE CODE front door from PR #394.

## Cause

The `index-unified-auth-v15.js` wrapper already contained an `assetIndex()` helper, but the root route did not actively call it before falling through to the older app Worker.

As a result, the deploy could be green while `/` still served the older Worker HTML.

## Fix

Route these public paths directly to static asset HTML before falling through to the app Worker:

```text
/
/en
```

The fix also keeps Mail Studio and static assets unchanged.

## Added workflow protection

The safe deploy workflow now validates both locally and live:

```text
THE CODE is now the front door
Official Media Invitation and Detailed Memorandum
```

This prevents another green deploy from passing while the live root still serves the old page.

## Safety

- no DNS changes
- no Cloudflare route changes
- no secrets/tokens/account ID changes
- no KV namespace changes
- no mail sent
- no campaign or bulk send
