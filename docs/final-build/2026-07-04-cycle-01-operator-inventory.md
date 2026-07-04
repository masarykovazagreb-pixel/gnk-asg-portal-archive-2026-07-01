# GNK ASG Final Build — Cycle 01 Operator Inventory

Status: controlled development note, no deploy, no DNS changes, no secrets, no Cloudflare production route changes, no campaign or mass-mail action.

## Verified repository baseline

- Repository: `beckuphome-gnk/gnk-asg-portal`
- Visibility: private
- Default branch: `main`
- Write capability available, but deployment/merge authority remains user-controlled.
- Current public production safety note in README states that `apps/portal` is the active HR/EN frontend, `workers` contains active Cloudflare Workers without secrets, `packages` is reserved for shared UI/navigation/API/SEO/themes, `contracts` for routes/endpoints/bindings, and `docs` for architecture/project documentation.

## Inventory slice completed in this cycle

### Public / portal surfaces identified

- `apps/portal` — active HR/EN frontend surface.
- `apps/portal/about-the-group/**` and `apps/portal/o-grupi/**` — group/about public structure surfaces referenced by the Digital Workforce public contract.
- `apps/portal/digital-workforce/**` — public Digital Operations / workforce directory surface.
- `apps/portal/the-code/intelligence/**` — THE CODE intelligence/public strategic surface.
- `apps/portal/de/**`, `apps/portal/it/**`, `apps/portal/arabic/**`, `apps/portal/cn/**` — controlled multilingual review surfaces.
- `apps/portal/language-review/**` — multilingual review console/surface.
- `apps/portal/design-review/**` — read-only premium design review console.
- `apps/portal/enterprise/**` — enterprise platform navigation/review surface.
- `apps/portal/admin-center/**` — Operator/Admin shell surface.
- `apps/portal/media-registration-admin/**` and `apps/portal/media-application/**` — internal media applications review plus public media application entry points.

### Data / governance files identified

- `apps/portal/assets/data/operator-os-config.json` — Operator OS / Mission Control configuration registry.
- `apps/portal/assets/data/digital-workforce-blueprint.json` — Digital Operations Team blueprint.
- `apps/portal/assets/data/digital-workforce-governance.json` — governance guardrails for digital workforce presentation.
- `apps/portal/assets/data/seo-entity-registry.json` — SEO/entity metadata registry.
- `apps/portal/assets/data/multilingual-review-manifest.json` — locale review manifest.

### Runtime / script files identified

- `apps/portal/assets/admin-center-v2.js` and `apps/portal/assets/admin-center-v2.css` — Admin Center shell.
- `apps/portal/assets/admin-center-health-v1.js` — Admin Center health/status runtime.
- `apps/portal/assets/admin-media-applications-entry-v1.js` — media applications entry runtime.
- `apps/portal/assets/js/digital-workforce-directory-v1.js` — public digital workforce directory runtime.
- `apps/portal/assets/js/editorial-operations-runtime-v1.js` — editorial operations runtime.
- `apps/portal/assets/public-menu-v18.js` — public navigation/menu runtime.
- `apps/portal/assets/the-code-new-york-countdown-v1.css` and `apps/portal/assets/the-code-new-york-countdown-v1.js` — THE CODE New York countdown component.
- `workers/gnk-asg-direct-operator/src/public-shell-v11.js` — canonical public shell and route isolation layer.
- `workers/gnk-asg-direct-operator/src/editorial-workflow-v1.js` — editorial workflow worker logic.
- `scripts/validate-digital-workforce-public-v2.mjs` — Digital Workforce public contract validator.

### Workflow contracts identified

- Admin Center checks validate JS syntax, single shell structure, module frame/command dialog presence, safe route references, and absence of external runtime asset dependencies.
- Design Review Console checks enforce noindex/noarchive, viewport review widths, read-only behavior, review links, New York countdown contract, and protected public-shell routes.
- Digital Workforce Public Contract checks validate public workforce governance, SEO/entity registry, multilingual review manifest, locale safety, transparent legal entity naming, and noindex status for controlled review locales.

## Risk findings

1. The repo already contains many workflow-triggering surfaces. Any broad edit to `apps/portal/**`, `workers/**`, or `.github/workflows/**` can start checks or deploy-adjacent validation. Small changes must stay scoped.
2. Workflow history shows repeated `Refresh GNK ASG news feed` commits. This is not necessarily dangerous, but it can create noise and should be kept separate from final controlled deployment work.
3. Previous controlled deployment message explicitly says no DNS, Cloudflare route, secret, campaign, or mass-mail changes. That constraint remains valid for the final-build window.
4. Digital workforce / AI manager language must stay transparent: use `Global Operations Center`, `Digital Operations Team`, `AI-assisted operating roles`, and avoid presenting generated/fictional identities as real employees.

## Next smallest technical step

Add or update a read-only Operator OS inventory/status panel that consumes `operator-os-config.json` and exposes a consolidated status matrix for:

- Campaign Mailer
- Mail Studio
- Email Status
- Media Center
- News / Publishing
- Deployment / Recovery
- Registry Center
- SEO / Publishing Engine
- Mobile Admin / approval queue
- Design Review

This should be done without touching DNS, secrets, production routes, campaign send logic, or Cloudflare bindings.
