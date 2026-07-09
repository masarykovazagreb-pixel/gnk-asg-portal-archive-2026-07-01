# Safe public portal deploy shell helper — 2026-07-09

Use this only from an authenticated shell with GitHub CLI access.

```bash
cd gnk-asg-portal
git checkout main
git pull origin main
bash scripts/run-public-portal-safe-deploy.sh
```

What it does:
- triggers `Deploy Public Portal Assets Safe` on `main`;
- passes `confirm_public_assets_deploy=DEPLOY_PUBLIC_PORTAL_SAFE`;
- waits for the run;
- prints run summary;
- performs live HTTP smoke checks for `/`, `/the-code/`, `/contact/`, `/mail-studio/`, `/email-status`, `/campaign-mailer/`, `/company-workers.html`, `/companies/`, `/workers/`, `/finance/`, `/reports/`.

Safety:
- uses the existing safe workflow;
- does not send mail directly;
- does not launch campaigns;
- does not change DNS, Cloudflare routes, secrets, tokens or production bindings.
