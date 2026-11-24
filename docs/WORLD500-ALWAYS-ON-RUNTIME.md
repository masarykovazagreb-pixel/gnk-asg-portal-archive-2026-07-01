# WORLD 500 — always-on runtime

Production target, not evidence of deployment. No ChatGPT schedule or GitHub Actions loop as production executor. No Vercel.

## Runtime
Use managed event-driven queue consumers with durable database state, object storage, and independent watchdog. Cloudflare Queues/Workers/D1/R2 are candidate bindings, subject to account and quota verification. Ingest permitted RSS/API sources on source-specific schedules or webhooks. Each stage enqueues the next stage immediately: research, writing, localization, rights/visual, SEO, editorial decision, publish, public verification. Use per-edition fairness, bounded concurrency, idempotency key (edition, story, revision), durable outbox, lease expiry, exponential retry and dead-letter queue. Keep private credentials in secret bindings only. Never publish unverified allegations or unlicensed imagery; hold only affected item. No rebuild per article.

## Acceptance
201+ local-language editions; 50 distinct original published articles per edition/day target; 10050/day; 500 days, 12000 hours. Measure completed draft to externally verified public URL, p95 <=180 seconds for eligible articles, report failures and holds separately. Never claim virtual slots as provisioned agents. Test duplicate delivery, interrupted execution, queue recovery, source outage, rate limits, rollback, image rights and public cache freshness. Require durable metrics, daily backups and restoration drill; independent probes and alerting; scale only after load and cost tests. Reports at 08:00/14:00/20:00 Europe/Zagreb; night routine logs internal. Hourly ChatGPT task may audit, never substitute for production runtime. Separate mail management from editorial runtime. Deploy infrastructure through protected exact-SHA release, not individual articles. No private information in public repository.

## Rollout
Inventory current bindings and publisher API; provision isolated staging queues and database; implement authenticated model and publication adapters; pilot 3 editions with live URL verification; expand to 20 then 201+ based on measured throughput, budget and quality. Do not claim LIVE until production deployment and independent public proof. This contract alone does not provision any resources.
