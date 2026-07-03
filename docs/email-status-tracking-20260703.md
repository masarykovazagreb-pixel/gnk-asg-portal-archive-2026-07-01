# Unified email status tracking

## Status semantics

- `SUBMITTING`: the Worker is preparing the message.
- `ACCEPTED`: Cloudflare Email Service accepted the send request and returned a message ID. This is not final delivery.
- `DEFERRED`: temporary delivery problem; the provider can retry.
- `DELIVERED`: the recipient mail server accepted the message.
- `BOUNCED`: delivery permanently failed or retries were exhausted.
- `REJECTED`: the address was blocked or suppressed before delivery.
- `FAILED`: local/provider processing failed before a reliable delivery result.
- `OPENED`: the HTML tracking image was requested. This is a detection signal, not proof that a human read the message.

## Coverage

The tracking proxy is installed at the final Worker gateway, before the individual mail products. It covers:

- Mail Studio and manual sending profiles
- Media Command Center / media outreach
- Campaign Mailer, including its legacy raw MIME messages
- automatic acknowledgements and replies sent through the shared `EMAIL` binding

Each recipient record is stored in D1 with the source system, source ID, recipient, sender, subject, Cloudflare message ID, provider status, delivery/error timestamps, and open counters.

## Protected dashboard

`/email-status`

The dashboard and JSON endpoints use the same operator authorization check as Campaign Mailer. The tracking image endpoint is public and returns only a one-pixel GIF; it does not store IP addresses, user agents, or other request metadata.

## Cloudflare delivery reconciliation

The scheduled Worker queries the zone-level `emailSendingAdaptive` GraphQL dataset and reconciles events by `messageId`.

Required production configuration:

- variable: `CLOUDFLARE_ZONE_ID`
- secret: `CLOUDFLARE_ANALYTICS_TOKEN` with **Analytics Read** permission

Optional variables:

- `EMAIL_STATUS_PUBLIC_ORIGIN` (default: `https://gnk-asg.hr`)
- `EMAIL_OPEN_TRACKING_ENABLED` (default: `true`)
- `EMAIL_STATUS_SYNC_LOOKBACK_HOURS` (default: `48`)
- `EMAIL_STATUS_SYNC_LIMIT` (default: `5000`)

If analytics credentials are absent, sending continues normally and the sync reports `analytics_credentials_missing`. Open tracking and provider-accepted records continue to work.

## Endpoints

- `GET /email-status`
- `GET /api/email-status/records`
- `POST /api/email-status/sync`
- `GET /api/email-status/health`
- `GET /api/email-status/open/:trackingId.gif`
