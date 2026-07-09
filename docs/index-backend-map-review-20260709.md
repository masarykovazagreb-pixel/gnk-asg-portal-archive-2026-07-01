# Public index backend map review — 2026-07-09

Scope:
- public `apps/portal/index.html` becomes the actual portal landing page instead of a minimal THE CODE link;
- THE CODE is visible on index as a full visual code/live-preview module without internal iframe scrolling;
- finance cards show GNK ASG d.o.o. and GNK DINAMO Ltd. Group separately;
- 45 active locations and 1537 workers are shown with selectors;
- 9 projects, news, publications, markets, gallery, reports and media application are linked;
- admin, Mail Studio, Email Status, Campaign Mailer and security/backend modules are visible as protected route entries.

Safety:
- no deploy in this PR;
- no mail sent;
- no campaign or bulk action;
- no DNS, Cloudflare route, token, secret or production binding change;
- protected routes remain linked as protected/locked entry points only.
