# Deploy attempt definition — 2026-07-09

Target: prepare for a safe public portal deploy attempt in the next 3 hours.

Definition of ready before running the safe workflow:

1. Main branch contains latest merged portal work:
   - public index;
   - THE CODE integration;
   - finance pages and reports;
   - companies and workers;
   - operations center;
   - audit dashboard;
   - queues;
   - portal map;
   - safe deploy shell helper.

2. Only approved workflow may be used:
   - `Deploy Public Portal Assets Safe`;
   - workflow file: `.github/workflows/deploy-public-portal-assets-safe.yml`;
   - confirm input: `DEPLOY_PUBLIC_PORTAL_SAFE`.

3. Shell command:

```bash
cd gnk-asg-portal
git checkout main
git pull origin main
bash scripts/run-public-portal-safe-deploy.sh
```

4. Expected post-deploy smoke checks:
   - `/`
   - `/the-code/`
   - `/contact/`
   - `/mail-studio/`
   - `/email-status`
   - `/campaign-mailer/`
   - `/company-workers.html`
   - `/companies/`
   - `/workers/`
   - `/finance/`
   - `/reports/`
   - `/operations/`
   - `/audit/`
   - `/queues/`
   - `/portal-map/`

5. Safety constraints:
   - no mail send during deploy attempt;
   - no campaign launch;
   - no DNS change;
   - no Cloudflare route change;
   - no secret/token/production binding change;
   - no old red workflow rerun.

6. Definition of success:
   - workflow exits successfully;
   - root `/` no longer behaves as old minimal THE CODE-only landing;
   - THE CODE works;
   - contact works;
   - protected mail/admin routes do not become publicly open;
   - finance/report PDFs are reachable;
   - new operational pages are reachable if included in deployed static assets.

7. Definition of stop:
   - workflow fails validation;
   - wrangler dry-run fails;
   - actual deploy fails;
   - protected route becomes publicly open;
   - finance/report public files fail verification;
   - unexpected Cloudflare/account/binding/secrets prompt appears.
