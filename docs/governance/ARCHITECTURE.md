# ARCHITECTURE OVERVIEW — GNK ASG Portal

```
Repozitorij (GitHub: beckuphome-gnk/gnk-asg-portal)
        │
        ├── apps/portal/          → statičke stranice, sitemapovi, podaci (JSON)
        ├── workers/               → Cloudflare Workeri (gnk-asg-direct-operator i dr.)
        ├── scripts/               → generatori, validatori, publish skripte
        └── .github/workflows/     → CI, cron automatizacije, deploy gate
        │
        ▼
GitHub Actions (cron, 1-2x dnevno po skupini)
        │
        ├── Objava sadržaja (editorial-scheduled-publish)
        ├── Vijesti/Aktual refresh (gnk-news-*, news-*)
        ├── Tržišta/digitalna imovina (market-pulse, macro-market, gnkc-index)
        ├── Mirror sync (Masarykova backup repo)
        └── Blog mirror (Blogger, Dev.to) — nakon objave, ne prije
        │
        ▼
Deploy Admin Auth V6 (ručni gate, potvrđen SHA)
        │
        ▼
Cloudflare Workers (produkcija) → gnk-asg.hr
        │
        ├── Statički sadržaj (ASSETS.fetch fallback)
        ├── API rute (/api/..., noindex)
        ├── Admin (/admin-center/, 401 zaštićeno)
        └── News share redirect (/podijeli/vijest/{id}/)
        │
        ▼
Vanjski kanali: Google Search Console, Blogger, Dev.to, Tumblr, ict.hr (grupno)
```

**Ključna napomena:** dvije odvojene JSON baze za sadržaj — `editorial-registry.json` (HR+EN članci) i `kolumne.json` (samo HR, koristi ga AKTUAL MEDIA widget za kolumnu/komentare/kuhinju — otud EN gap).
