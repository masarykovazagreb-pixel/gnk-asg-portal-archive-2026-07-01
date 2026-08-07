# Legacy digital-asset refresh — production hold

The historical PowerShell refresh scripts in this directory are retained only for forensic/history purposes.

They are **not an approved production writer** under the current GNK ASG architecture. The canonical production data writer is `.github/workflows/refresh-index-live-data.yml`, scheduled twice daily.

Do not register or run `refresh-digital-assets-only.ps1` or `refresh-market-only.ps1` as a Windows scheduled production task, and do not use their historical direct `wrangler deploy` path. Any future reactivation requires a reviewed pull request, single-writer analysis, current freshness tests and the normal protected production deploy guardrails.
