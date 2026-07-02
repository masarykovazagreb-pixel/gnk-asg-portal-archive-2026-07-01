# Pre-campaign freeze — 2/3 July 2026

## Objective

Preserve the currently running production system while the outbound mail quota is unavailable, then validate a small number of manual messages before any campaign is released.

## Freeze window

Until the manual-send validation is completed:

- Do not deploy a Worker.
- Do not merge deployment, mail, routing, DNS, KV, D1 or R2 changes to `main`.
- Do not start a campaign or scheduled outreach.
- Do not change Cloudflare Email Routing, sender verification or mailbox destinations.
- Do not modify production secrets.
- Do not alter campaign contact data.

All preparation must remain on `stabilization-pre-campaign-20260702` or another non-production branch.

## Manual-send gate after quota reset

Send 3–5 individual messages before enabling a campaign. Use recipients controlled by the organisation where possible.

For each message record:

1. From address and selected profile.
2. To address.
3. Subject.
4. Time submitted in Europe/Zagreb.
5. HTTP/API result.
6. Provider result or error code.
7. Inbox delivery result.
8. Sent-folder or application-history result.
9. HTML rendering result.
10. Attachment and inline-logo result, when applicable.

## Acceptance criteria

A campaign may be considered only when all test messages meet these conditions:

- No HTTP 5xx response.
- No generic error without a stored provider diagnostic.
- Correct From and Reply-To headers.
- Correct subject and language.
- HTML body is visible and not converted into an empty message.
- Required signature and inline logo are visible.
- Required attachment is present and opens correctly.
- No duplicate delivery.
- Message appears in delivery history.
- At least one destination outside the sending provider confirms inbox delivery.

If any test fails, keep `MEDIA_OUTREACH_LIVE` and `MEDIA_OUTREACH_SCHEDULED_LIVE` disabled and diagnose the failure before sending more mail.

## Campaign release gate

Before release confirm:

- Final recipient count and exclusions.
- Only Nedeljnik and Tanjug remain from Serbia, according to the approved list.
- Nacional is excluded.
- Previously mis-sent or attachment-free recipients are explicitly reviewed.
- Final HTML and PDF are the approved English versions.
- Subject, sender, reply-to and BCC rules are approved.
- Deduplication is active.
- Hourly and daily limits are confirmed.
- Automatic retry behaviour is confirmed.
- A stop switch is available and tested.

## Change policy

Prepared fixes may be reviewed in a draft pull request, but must not be merged until the manual-send gate has passed. Production deployment and campaign release are separate decisions.