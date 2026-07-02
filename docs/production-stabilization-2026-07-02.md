# Production stabilization checklist

This change set intentionally remains a draft until the following checks pass:

- the canonical production workflow validates gateway v2 with `wrangler.runtime.toml`;
- obsolete gateway v1 and one-off publication deployment workflows remain removed;
- public portal, contact, media application, THE CODE, publications and protected application routes pass smoke tests;
- internal routes are excluded from sitemap, `llms.txt` and search indexing;
- `MEDIA_OUTREACH_LIVE` and scheduled outreach remain disabled during validation;
- the recovery repository `main` SHA matches the source `main` SHA;
- the fixed restore branch matches on both repositories;
- all branches, tags and Git LFS objects are mirrored without ignored errors.

No production email is sent by the validation workflow.
