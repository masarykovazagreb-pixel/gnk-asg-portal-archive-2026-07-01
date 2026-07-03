# Run 01 - Inventory and Guardrails

Date: 2026-07-03
Branch: operator-os-safe-work
Scope: non-production, non-destructive documentation checkpoint

## Verified repository facts

The repository README defines the current safe structure:

- `apps/portal` - active HR/EN frontend validation area
- `workers` - active Cloudflare Workers without secrets
- `packages` - future shared UI, navigation, API, SEO and themes
- `contracts` - routes, endpoints and bindings
- `docs` - architecture and project documentation

`apps/portal/package.json` currently identifies the portal package as `gnk-asg-public-portal-validation` and exposes only one script:

```json
{
  "test:e2e": "playwright test"
}
```

This means the safest first implementation path is to protect the existing portal with route and E2E inventory before adding new Operator OS application code.

## Production guardrails

No production deploy is authorized in this run.

Do not change:

- DNS
- Cloudflare production routes
- secrets
- mass mail sending settings
- protected admin routes
- public legal, financial or reputational claims without approval

## First implementation sequence

1. Add a route inventory for public portal, admin, media, campaign mailer and future Operator OS routes.
2. Add E2E smoke checks for stable public pages and non-invasive admin availability checks.
3. Add Operator OS shell only after route inventory exists.
4. Add mobile admin shell only after token and permission contract exists.
5. Add Inbox/Outbox only as an approval-based model, not as live mass sending.

## Rollback point

This file is documentation-only. Rollback is safe by deleting this document from `docs/operator-os/`.

## Current blocker

Public portal direct open from the runtime failed due URL safety restrictions in the browsing tool, and web search did not return indexed results for `site:gnk-asg.hr GNK ASG`. This does not prove the portal is down; it only means external validation from this runtime is limited. Repository-side validation should therefore become the immediate source of truth until a successful HTTP check is available.

## Next safe change

Create `contracts/routes.operator-os.json` with non-destructive route definitions and required auth/approval levels before writing any application code.
