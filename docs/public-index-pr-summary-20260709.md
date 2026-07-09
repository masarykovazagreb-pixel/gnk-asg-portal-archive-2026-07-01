# PR summary — Public index backend map

This PR prepares the public portal root page.

Main change:
- `apps/portal/index.html` becomes a full public portal dashboard.

Additional shells/data:
- companies page;
- workers page;
- company-workers page;
- finance page;
- reports page;
- protected backend/security/audit/settings shells;
- route and readiness JSON markers.

Operational constraints preserved:
- no deployment;
- no mail delivery;
- no campaign launch;
- no DNS/Cloudflare route/secrets/token/production binding changes.
