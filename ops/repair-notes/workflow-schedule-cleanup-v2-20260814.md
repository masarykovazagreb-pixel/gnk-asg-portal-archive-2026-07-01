# Workflow schedule cleanup V2

Actions remain disabled at repository level. The allowlist gate reports 17 scheduled workflow owners and rejects any unlisted workflow or cron drift.

Schedules removed and retained as manual-only where applicable:

- AKTUAL World Topic Daily Promotion
- Puni audit 2
- Dev.to Mirror Publish
- Free Image Mirror
- GNK News Refresh and both legacy V14 lifecycle variants
- LinkedIn preview rotation
- Worker route probe
- Scheduled Production Deploy (also removed push trigger)
- SEO Audit Refresh and SEO/News Visibility Audit
- Siroki smoke and Site Health & Speed Audit
- Social Distribution
- Telegraph Mirror Publish

Cadence reductions:

- Weather: hourly to four times daily.
- World Monitor: hourly to four times daily.
- Automation SLA watchdog: hourly to twice daily.
- Image Health Scan: daily to weekly.

The exact-SHA `Deploy Admin Auth V6` release workflow remains manual-only. SOCIAL LIVE remains off.
