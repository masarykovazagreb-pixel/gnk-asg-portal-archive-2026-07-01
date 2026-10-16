# Editorial review and publication-readiness gate v1

## Purpose and non-negotiable boundary

This is a human review aid, not a CMS, publisher, or deployment system. It performs no network requests, does not write article content, and never publishes or schedules a page. A successful report means only that the declared checks passed; a human with separate publishing authority still makes the publication decision.

The checks keep these roles distinct:

- **Author** — a named personal author only when the item is genuinely authored and the byline is confirmed; use `null` to explicitly record that no personal author is assigned.
- **Editor** — the person or desk responsible for editing/review.
- **Publisher** — the organization publishing the item.
- **Source** — each factual source cited by the article; it is not the author, editor, or publisher by default.

Syndicated or external material must retain its original author/publisher attribution. A neutral editorial role does not establish personal authorship.

## Read-only World Topics status report

Run from the repository root:

```sh
node scripts/test-world-topics-readiness-v1.mjs
node scripts/audit-world-topics-readiness-v1.mjs
```

The JSON report scans the current World Topics registry and route HTML. It reports publication age separately from an explicit `sourceReviewedAt` date. **Publication date is never substituted for a review date and elapsed time is not source verification.** It lists article-body source links, cover-image creator/license metadata, additional visuals without route-specific rights records, image alt text, and author/editor/publisher metadata. Protected SPT and banking routes are skipped through the repository's route-protection helper.

For a reproducible date in local tests, set `WORLD_TOPICS_REVIEW_AS_OF=YYYY-MM-DD`. In Content Source Governance CI, the same report is added to the workflow summary and uploaded as a 14-day internal artifact. Warnings do not edit or publish the baseline articles; an editor must verify primary sources and image rights before reuse or republication.

**Initial read-only baseline (2026-10-16):** 20 routes scanned; all 20 lack an explicit source-review date and direct external citation links within the article body; all 20 have additional visuals without route-specific rights records. All 20 passed the current author/editor/publisher separation check. The report does not treat their August publication date as a source check. No World Topics page was modified or republished in this work; these items remain editorial follow-up, not verified facts.

## Candidate publication gate

Prepare an editorial candidate JSON outside the public output tree and run:

```sh
node scripts/check-editorial-prepublication-readiness-v1.mjs \
  --candidate /path/to/candidate.json \
  --as-of 2026-10-16 \
  --strict
```

The gate requires:

1. At least one editor-confirmed primary HTTPS source checked within the previous 30 days.
2. Every supplied visual to have an asset reference, descriptive alt text, named creator, license/rights basis, and explicit rights confirmation. Use an empty `visuals` array if there are no visuals.
3. Explicit author confirmation (a verified named author or `null`), a named editor, a named publisher, and confirmation that the roles were reviewed separately.
4. A separate, dated human editorial approval.

A blocked report exits with code `2` in `--strict` mode. It still performs no publication action. The checker never invokes a publisher, CMS, deploy workflow, social account, search-engine API, or third-party AI service.

Expected candidate shape:

```json
{
  "title": "Working editorial title",
  "sources": [
    {
      "title": "Official primary source",
      "url": "https://example.org/primary-record",
      "primary": true,
      "confirmed": true,
      "checkedAt": "2026-10-16"
    }
  ],
  "visuals": [
    {
      "asset": "/assets/editorial/generated/example.webp",
      "alt": "Descriptive text for the original illustration",
      "creator": "GNK ASG d.o.o.",
      "license": "Original GNK ASG artwork; no third-party photograph",
      "rightsConfirmed": true
    }
  ],
  "attribution": {
    "author": null,
    "authorConfirmed": true,
    "editor": "GNK ASG editorial desk",
    "publisher": "GNK ASG d.o.o.",
    "rolesChecked": true
  },
  "editorialApproval": {
    "approved": true,
    "reviewer": "Named editor",
    "approvedAt": "2026-10-16"
  }
}
```

The checker tests the declarations supplied in the candidate; it cannot independently authenticate a source, license, or reviewer. Human evidence review remains mandatory.

## Automated regression checks

```sh
node scripts/test-editorial-prepublication-readiness-v1.mjs
node scripts/test-approved-author-markers-v1.mjs
node scripts/test-ai-reference-accessibility-v1.mjs
node scripts/test-gallery-standalone-seo-v1.mjs
```

The gallery contract test generates temporary fixture pages only. Its separate workflow is read-only (`contents: read`) and does not attach checks to the gallery-sync workflow that writes or pushes assets.
