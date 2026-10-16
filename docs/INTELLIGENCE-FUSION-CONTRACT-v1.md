# GNK ASG Intelligence Fusion Contract v1

Status: DRAFT IMPLEMENTATION CONTRACT
Parent: #25 MASTER OSINT FUSION

## Purpose
Define the minimum machine-verifiable contract for fusing public official, institutional and reputable OSINT signals with the existing World Monitor / World Incident data layer.

## Event lifecycle
`INGESTED -> NORMALIZED -> CORRELATED -> ASSESSED -> CONFIRMED|UNCONFIRMED|CONTRADICTED -> PUBLISHED_INTERNAL -> OPTIONAL_PUBLIC -> RETROSPECTIVE`

No event may skip provenance, freshness and confidence assessment.

## Required event fields
- `event_id`: stable internal identifier
- `correlation_id`: shared identifier for reports believed to represent the same underlying event
- `event_type`: normalized taxonomy value
- `title`
- `summary`
- `first_seen_at`
- `last_seen_at`
- `event_time`
- `location`: country/region/lat/lon when available
- `entities`: normalized people/orgs/assets/locations
- `source_records[]`
- `freshness_state`: `fresh|aging|stale|unknown`
- `confidence`: 0-100
- `severity`: 0-100
- `impact_domains[]`: operations, cyber, finance, market, legal, geopolitical, infrastructure, safety, environment, reputation
- `verification_state`: `unverified|partially_corroborated|confirmed|contradicted|retracted`
- `contradictions[]`
- `evidence_count`
- `updated_at`

## Required source record fields
- `source_id`
- `source_name`
- `source_url`
- `source_class`: `official|institutional|reputable_osint|media|unverified_signal`
- `retrieved_at`
- `published_at` when available
- `content_fingerprint`
- `claim_fingerprint`
- `source_reliability`: 0-100
- `independence_group`: identifies sources that may share the same upstream origin

## Confirmation guardrail
An event is not `confirmed` merely because two URLs report it. Corroboration counts only when sources are materially independent or one is an authoritative primary source for the event class.

Minimum default rule:
- one authoritative primary source may confirm directly for its own domain; OR
- two materially independent high-quality sources with compatible claims; OR
- explicit human/master override with recorded reason.

## Freshness
Freshness thresholds are event-type specific. A stale source may remain evidence but must not raise confidence and may reduce it.

## Deduplication
Deduplicate using a weighted combination of:
- normalized entity overlap
- geographic proximity
- event-time proximity
- event-type compatibility
- title/claim similarity
- source upstream independence

Never merge events solely on title similarity.

## Contradictions
Contradictory values are first-class data. Preserve both claims, source, timestamp and confidence. Do not silently overwrite earlier values.

## Severity and impact
Severity is separate from confidence. A low-confidence high-impact signal may require internal escalation without being represented publicly as fact.

## Public vs internal output
Internal record retains full evidence and contradiction trail. Public output must expose only fields approved for public presentation and must preserve uncertainty wording.

## Learning loop
Every false positive, false negative, missed correlation, stale-data error and retraction must create a learning input containing:
- failure class
- affected worker/capability
- root cause
- proposed new test
- expected capability delta

## Safety / authorization boundary
Only legally public sources and explicitly authorized connected sources may be ingested. No classified, private, access-controlled or bypassed data source is permitted.

## Acceptance tests
1. Existing `world-monitor.json` records can be normalized without data loss.
2. Two reports of the same incident produce one `correlation_id` while retaining separate `source_records`.
3. Two dependent reports sharing one upstream source do not count as two independent confirmations.
4. A stale source cannot independently raise confidence.
5. Contradictory claims remain visible in machine-readable form.
6. `severity` can be high while `confidence` is low.
7. Public output contains no unsupported `confirmed` state.
8. Every retrospective failure can be transformed into a worker learning task.

## Legal integration-readiness gates (no agency connection implied)

This section is a preparation checklist, not legal advice and not evidence of an agency relationship. No intelligence-service affiliation, private-server connection, or classified-data access is established by this contract.

A new source may enter a live connector only after all applicable gates are recorded:

1. **Authority and purpose:** named data owner, documented business purpose, jurisdiction, data classes, and written authorization from the source owner. Publicly accessible does not automatically mean unrestricted reuse.
2. **Legal review:** counsel confirms the lawful basis, source terms/license, permitted retention and onward use, privacy impact, and any applicable Croatian/EU obligations. Execute required agreements (for example, an API/data-use agreement or DPA) before integration.
3. **Official endpoint:** use a documented public API/feed or a specifically authorized endpoint. No credential bypass, private-account scraping, leaked data, classified network access, or scanning of third-party servers.
4. **Security boundary:** read-only by default; allowlisted HTTPS hosts; bounded redirects, payload size and request rate; SSRF/private-address protections; isolated staging; least-privilege service identity; secrets stored only in approved GitHub/Cloudflare secret stores, never in Git or chat.
5. **Data governance:** preserve source URL, retrieved/published times, license, attribution, fingerprints and confidence; minimize personal data; set retention/deletion rules; keep contradictions and corrections; separate internal evidence from public summaries.
6. **Publication control:** no automatic external posting. A human editor approves every public item, image rights/credit and uncertainty language. Editorial approval is separate from technical ingestion.
7. **Operational readiness:** security review, dependency/license review, audit logging, incident contact, rollback/disable switch, monitoring, and documented owner sign-off before production.

### GitHub Free / open-source intake
- Only public repositories with a clear, compatible license and an identified maintainer/source are candidates.
- Pin dependencies and actions to reviewed immutable versions/SHAs; review provenance, permissions and transitive dependencies; run vulnerability/license checks and create an SBOM where appropriate.
- Start in a read-only sandbox. Do not add a third-party repo as a production writer or grant broad `contents: write`/secret access without a separate approval and threat review.

### Server and agency onboarding
- Start with existing public feeds/APIs and the public-source registry. For a non-public or partner endpoint, require the official service name, owner, endpoint documentation, written authority/agreement, allowed data scope, retention rules and a security contact. Do not send credentials in chat; provision them through the approved secret-management channel after review.
- Any proposed intelligence-service integration remains **blocked** until the agency itself provides formal authorization and the company completes counsel, security and data-protection review. This contract does not request, imply or enable access to classified systems.
