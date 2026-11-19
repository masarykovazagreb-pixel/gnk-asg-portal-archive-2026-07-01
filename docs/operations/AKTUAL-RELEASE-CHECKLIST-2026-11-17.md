# AKTUAL MEDIA — release checklist (2026-11-17)

This checklist is non-executable. It does not authorize deployment or bypass existing gates.

## Before integrating an uploaded ZIP/TAR
- Confirm the archive is actually accessible; inspect paths and sizes without executing its code.
- Reject absolute paths, `../` traversal, symlinks escaping the extraction root, and decompression bombs.
- Inventory and exclude `.env`, database exports, credentials, private keys, tokens and personal data. Rotate any exposed secrets.
- Compare source files with canonical `main` and relevant open PRs; do not overwrite newer changes.
- Preserve the single-writer rule and keep `WRITER_SHA` separate from `PRODUCTION_SHA`.

## Editorial release gate
- No demo/filler/synthetic news or invented attribution on public pages.
- Each news item must have verifiable source URL, original publication timestamp, and claims checked against underlying evidence.
- Multiple domains under one publisher do not constitute independent corroboration.
- Verify rights for photos and excerpts; disclose AI assistance where applicable; route high-risk claims to human review.
- Never interpret RSS availability alone as a licence to republish.

## SEO and design
- Verify responsive layouts, accessible contrast and keyboard navigation across theme variants.
- Ensure canonical URL, title, description, structured data, robots and sitemap correspond to genuinely published pages.
- Exclude unpublished, staged and unavailable articles from the sitemap.
- Prefer useful, editorially relevant internal links; avoid fabricated backlinks and keyword stuffing.

## Release proof
- Targeted tests and repository-wide gates green, or blockers explicitly documented.
- Production deploy requires explicit authorization via the existing exact-SHA workflow.
- Independently verify deployed SHA and live HTTP response; never equate merged with LIVE.
- Document rollback and source/production SHAs in release evidence.

## Current tracked blockers (recheck before release)
- Draft PR #432: cinematic regional channels; not merged, global gates unresolved.
- Draft PR #435: research scout and editorial validation; not merged, publication approval/backend unresolved.
- Availability and completeness of all 201 channels and production parity are not yet independently verified.
