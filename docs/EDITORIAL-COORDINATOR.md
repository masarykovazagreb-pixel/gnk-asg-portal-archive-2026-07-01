# Editorial coordinator

The coordinator runs inside the existing Workforce Supervisor workflow. It writes an internal handoff report, not public content, and never starts a competing publisher or deployment. One report covers every registered language and article, commentary, column and weekly type; it also lists unpublished packages and their actual holds.

Run `node scripts/editorial-coordinator-v1.mjs`. Inspect `artifacts/workforce-supervisor/editorial-coordinator.json`. The existing workflow uploads it even when the separate production health check fails.

## Operating contract

- Domain: source research → writing/commentary → editorial review → topic imagery/gallery → SEO/social → canonical publisher → exact-SHA deployment → live verification → authorized distribution.
- Read paths: editorial registry, visual gallery, editorial manifest/holds and public HTML/assets.
- Write path: `artifacts/workforce-supervisor/editorial-coordinator.json` only.
- Frequency: inherited from Workforce Supervisor; no additional cron.
- Gate: corrupt/missing input fails. Holds remain holds. An approved package still requires canonical validation. Registered HTML never becomes verified production by inference.
- Handoff: use each task's route, issue, owner and nextAction with the existing canonical writer. It does not generate prose or images or dispatch these writers by itself.
- Forbidden: duplicate writers, secret/database edits, invented licences, fabricated human review, automatic claims of publication or independent processes.

## Uniform media requirements

Daily AKTUAL, weekly AKTUAL, commentary, analyses and columns use the same image policy. Reuse source images only with documented rights. Otherwise commission an original topic illustration, inspect its visual quality, retain provenance and provide meaningful alt text. A generic social card is flagged for replacement. Pixel size alone is not a quality review.

Approved images belong in `apps/portal/data/visual_gallery.json` and are materialized by `scripts/build_gallery_standalone_pages.py` with canonical HTML, ImageObject, OG and Twitter metadata. Existing and future article images missing from this registry are explicit gallery handoffs, never silently called complete. Retain the larger catalog's quarantine rules; do not bulk publish unreviewed assets or copy third-party photographs.

The same gallery writer automatically includes existing local `/assets/editorial/generated/` covers referenced by the canonical article registry. Each deduplicated cover gets a stable gallery URL and a backlink to its article. These original covers are 1200×630; their detail metadata reflects that size. This covers HR/EN article routes without inventing translations of image pages. Other sources retain manual rights/quality review. Both existing publication workflows call this writer before committing; sitemap updates are additive and preserve other URLs. The gallery index preserves existing standalone pages outside the manifests.

Use Nermin Sefić as author/editor only with a truthful role; transliteration Nermin Sefic can support approved sharing, but is not permission to fabricate authorship or stuff image descriptions with name variants. Do not infer that an English page is translated merely because a URL exists.

## AI system inventory

GNK ASG is the operator of this deterministic read-only orchestration helper. Purpose: internal handoff and evidence inventory for editors/operators. Inputs are repository metadata, public assets and HTML; it does not transmit data to an external model, rank people, make financial/legal decisions or create public-interest text. Human editors remain responsible for source, rights and substantive review. Separate AI-created candidates must pass the existing strict governance validator with truthful evidence before release.
