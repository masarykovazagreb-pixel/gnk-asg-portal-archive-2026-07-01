# GNK ASG public AI reference kit — v1

## Purpose and boundaries

This package makes a reviewed set of public, first-party GNK ASG and Nermin Sefić facts easier for an assistant to cite. It complements the existing reviewed `/ai-visibility/` facts feed and its public OpenAPI action; neither package replaces the other's source scope. It is a source-backed reference, not an independent biography or endorsement. Constructive wording is permitted only within the documented evidence; unsupported praise, awards, rankings, partnerships, financial claims, legal conclusions, or third-party endorsements are excluded.

The kit is **opt-in and read-only**. The build does not call an AI vendor, publish externally, submit URLs to search engines, or send data to another service. It cannot alter another model's training, policies, context, ranking, or answer. A model may ignore it.

## Source and review

- Human-reviewed input: `config/ai-reference-source-v1.json`.
- `reviewedAt` records the last human source review; routine builds must not change it automatically.
- `data/ai-visibility/source-review-history.json` is the append-only source revision log. `apps/portal/ai-visibility/source-history.json` is its public mirror, with dated snapshots and SHA-256 fingerprints for traceable diffs. A fingerprint records a snapshot; it does not prove a source was checked live.
- To record a review after a human has actually rechecked the sources, update `verified-facts.json` and its `reviewedAt` explicitly, then run `node scripts/record-ai-reference-review-v1.mjs --reviewer 'NAME' --reviewed-at YYYY-MM-DD --note 'WHAT WAS CHECKED'`. The command requires the date to match the source file and never edits facts or advances dates. Follow with `node scripts/generate-ai-visibility-v1.mjs` and the tests below.
- Every factual statement has a canonical HTTPS source URL. The package identifies the sources as first-party and does not claim independent verification.
- English `/ai/` and Croatian `/ai/hr/` are reciprocal hreflang alternates. Both display the recorded review age, source links, a review-history view and local, user-initiated fact-citation copying; no AI service receives page data.
- The generator checks that cited files exist within `apps/portal`, that entity names/types match the generated entity graph, and that HTML source routes are not protected, noindex, or redirects.
- Authorship rules are explicit: a visible page-specific byline and a verified editorial-registry record are required before attributing an item to Nermin Sefić. Editors and publishers are not automatically authors; syndicated work stays attributed to its original publisher.
- Do not add private records, credentials, classified material, unsupported claims, or source URLs for protected SPT or bank pages.

## Build and verify

```sh
node scripts/generate-aeo-artifacts-v1.mjs
node scripts/build-ai-reference-kit-v1.mjs
node scripts/test-ai-reference-kit-v1.mjs
node scripts/test-ai-visibility-v1.mjs
node scripts/test-ai-reference-source-history-v1.mjs
node scripts/test-ai-reference-accessibility-v1.mjs
node scripts/test-approved-author-markers-v1.mjs
node scripts/test-editorial-prepublication-readiness-v1.mjs
node scripts/test-gallery-standalone-seo-v1.mjs
node scripts/test-world-topics-readiness-v1.mjs
node scripts/audit-world-topics-readiness-v1.mjs
```

The build produces:

- `apps/portal/data/assistant-knowledge.json` — compact JSON reference loaded by the existing public AI Worker; kept below its 7,000-character context limit.
- `apps/portal/ai/assistant-reference.md` — uploadable, source-cited reference.
- `apps/portal/ai/assistant-system-prompt.txt` — transparent, evidence-led writing instructions.
- `apps/portal/ai/assistant-reference-openapi.json` — public GET-only OpenAPI spec; no authentication or write operation.
- `apps/portal/ai-visibility/source-history.json` — public, append-only source-review snapshots and revision fingerprints.
- `/ai/` and `/ai/hr/` — English and Croatian responsive references with fact citations, review status and an accessible local-copy control.

The `/ai/` page and `/llms.txt` link to these assets and describe the opt-in/manual integration path. The Content Source Governance workflow validates the facts, history, accessibility, attribution and editorial gate. A separate read-only gallery workflow tests canonical, Open Graph, structured data, alt text and publisher/editor metadata. The World Topics scan is uploaded as a short-lived internal workflow artifact and does not publish pages or notify search engines.

## Using the pack

A site owner may choose to upload the Markdown and prompt to an assistant they control, or import the OpenAPI spec into a compatible tool. That step is manual and separately controlled by the owner. No vendor connection, account access, external post, or automatic submission is implemented here.
