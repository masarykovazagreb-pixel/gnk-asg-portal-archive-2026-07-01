# AKTUAL MEDIA distribution repair decisions — 22 October 2026

## Decisions

- `global-free-distribution.yml` is the only live Bluesky/Mastodon writer.
  `aktual-global-distribution.yml` retains Pixelfed/WordPress and previews;
  it rejects live Bluesky/Mastodon requests. Both share the existing writer lock.
- Regional plans use the generated portal URL, retaining original source names
  and original-language headlines. A localized introduction is not a translated article.
- No fabricated editorial-desk byline: missing source authorship stays absent.
- Write intent is saved before an external request. Returned IDs and URLs are
  saved before read-back. Unknown outcomes stay pending and are never blindly retried.
- Read-back failure is not reported as a confirmed publication.
- Image uploads must finish processing before status creation; requested images
  are not silently discarded. The complete canonical link takes precedence over
  optional promotional context when a post approaches its character limit.
- Missing, invalid or unreachable receipt storage blocks live publication.
  An absent receipt branch is not automatically treated as a first run.

## First-use and recovery

Before the first live run, initialize the appropriate dedicated receipt branch
deliberately, after confirming there are no earlier provider objects/receipts:

- `automation/global-distribution-state`:
  `apps/portal/data/global-distribution/published.json`
- `automation/aktual-global-distribution-state`:
  `apps/portal/data/aktual-global-distribution/state.json`

Each file must contain a JSON object with a `posted` object. Recover existing
receipts instead of initializing an empty file after deletion or an outage.
For pending entries, reconcile the exact provider object before any retry.
Provider success without a saved remote receipt still requires reconciliation
after a forcibly terminated runner; there is no claim of a cross-service transaction.

## Credentials

No external account is connected or activated by this repair. No live posts,
credential rotation, state bootstrap or history rewrite is performed by tests.
Removing a token from the current source does not revoke historical copies.
The previously reported Telegraph token requires owner-controlled rotation and
updating its active account storage; these changes do not claim that happened.

## Governance and verification

Existing use: AKTUAL MEDIA as deployer of editorial distribution software;
affected parties are readers, credited authors/publishers and account owners.
This repair changes delivery/recovery, not editorial approval, AI authorship,
audience scoring, sensitive profiling or automated business decisions. Source,
rights, AI-origin disclosures and substantive editorial review remain separate
requirements. Passing technical tests is not evidence of human review or legal compliance.

Tests cover all 19 introduction locales through rendered post length/canonical
checks, eight source editions, a missing byline, asynchronous image processing,
accepted-write/read-back timeout, duplicate suppression, real local Git receipt
recovery and missing/corrupt/offline receipt failures. All network publication
tests use mocked providers and temporary repositories.
