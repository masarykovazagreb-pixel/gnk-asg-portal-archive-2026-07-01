# Integration readiness — public-source information hub

Status: **planning only**. No third-party repository was installed, no server or agency endpoint was connected, and no external content was posted. Repository and license metadata were reviewed from GitHub on 2026-10-15. “Free” here means source code is available under an open-source license; compute, hosting, support, model weights, and data rights can still carry cost or separate terms.

## Existing baseline

The portal already has a public/RSS source registry, a news refresh pipeline, a 300-item current news pool, editorial provenance checks, a weekly AKTUAL curation workflow, and a draft source-fusion contract. Use those first; a new service should solve a measured gap rather than duplicate ingestion.

## Open-source candidates

| Project | License reported by GitHub | Potential fit | Recommendation / boundary |
|---|---|---|---|
| [Miniflux](https://github.com/miniflux/v2) | Apache-2.0 | Optional self-hosted RSS/Atom/JSON Feed triage UI and REST API for human review. | **Best small pilot candidate** only if editors need a separate review queue. Use feed metadata and documented public feeds; do not enable cookies, proxying, full-article scraping, or anti-bot/bypass features. Keep the existing portal registry as the source of truth. |
| [OpenTelemetry Collector](https://github.com/open-telemetry/opentelemetry-collector) | Apache-2.0 | Vendor-neutral metrics/log/trace routing for the existing worker and refresh pipeline. | Consider after a runtime-compatibility proof. Strip secrets, personal data, article bodies, and access tokens; start with operational metrics in staging and a disable switch. |
| [OpenSearch](https://github.com/opensearch-project/OpenSearch) | Apache-2.0 | Search over a larger, provenance-tagged public-source archive. | **Defer**: current 300-item pool does not justify operating a new search cluster. Reassess only with volume, retention, access-control, backup, and cost requirements. |
| [llama.cpp](https://github.com/ggml-org/llama.cpp) | MIT (code) | Local inference for draft classification or summaries where local processing is justified. | Optional research only. Model weights and datasets have separate licenses; require evaluation, hardware/security review, source citations, and human approval. Never send restricted or personal data to an unapproved model. |
| [FreshRSS](https://github.com/FreshRSS/FreshRSS) | AGPL-3.0 | Alternative self-hosted feed reader. | Functionally overlaps Miniflux and the existing source registry; defer pending AGPL/network-use review and a concrete need. |

License status is a starting point, not an approval to deploy. Before adoption, pin a reviewed release/commit, inspect transitive licenses and permissions, scan dependencies, document data flows, and run a read-only staging pilot.

## Lawful source and server onboarding

1. Prefer documented public feeds/APIs with published terms, rate limits, attribution requirements, and a named source owner. Public availability alone does not grant unrestricted republication rights.
2. For a partner or non-public endpoint, obtain its official name and documentation, named owner, written authorization/agreement, approved data scope, permitted purposes, retention/deletion schedule, jurisdiction, and security contact before any connection.
3. Use read-only credentials with least privilege, host allowlists, HTTPS, bounded payloads/rate/redirects, private-address/SSRF protections, secret-manager storage, audit logs, and a tested disable/rollback path.
4. Keep a provenance record (source URL, timestamps, license/terms, retrieval method, and correction history). Separate internal evidence from public summaries and minimize personal data.
5. Require independent editorial review before publication. Verify article text, claims, image rights/credits, uncertainty, and attribution. No automatic cross-posting, anonymous bulk posting, comment activity, or search-engine notification is authorized here.
6. Before any intelligence-service collaboration, require formal authorization from the service and company-side legal, security, privacy, and executive sign-off. This repository is not connected to an agency and does not request or enable classified access.

## Current gaps / next decision

The present RSS pool gives candidates in animals/nature, travel, sport, food, and culture, but the current snapshot has no eligible fashion/women’s-style or automotive candidates. Expand only with documented public feeds or explicitly licensed sources; maintain human review and rights checks. No source list or endpoint should be treated as an agency relationship.
