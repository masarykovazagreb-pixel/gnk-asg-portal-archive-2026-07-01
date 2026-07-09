# No-touch register — 2026-07-09

The following areas are explicitly outside this diagnostics branch:

- Cloudflare DNS
- Cloudflare routes
- Cloudflare account ID
- Cloudflare API tokens
- GitHub secrets
- KV namespace IDs
- D1 database bindings
- R2 bucket bindings
- email provider credentials
- campaign sending controls
- scheduled outreach controls

This branch only improves verification logs after the existing safe deploy workflow has already run its unchanged deploy command.
