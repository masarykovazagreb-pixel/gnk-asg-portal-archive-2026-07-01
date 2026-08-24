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
