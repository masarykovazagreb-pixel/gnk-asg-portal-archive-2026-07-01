# GNK ASG portal quality gate

Status: staged audit; production is unchanged.

## Purpose

The audit scans `apps/portal` without external dependencies and produces a machine-readable and human-readable report before portal changes are merged.

## Checks

- missing HTML language, title and viewport metadata;
- missing public-page description and canonical URL;
- duplicate canonical URLs;
- administrative routes that are not marked `noindex`;
- broken local links and missing local assets;
- repeated install/app links on one page;
- reused non-brand content images;
- image usage registry for publication planning.

## Run locally

```bash
node tools/portal-quality-gate.mjs \
  --root apps/portal \
  --out reports/portal-quality-gate
```

Audit mode records findings but does not fail the command. Strict mode is available with `--strict`.

## Outputs

- `reports/portal-quality-gate/audit.md`
- `reports/portal-quality-gate/audit.json`
- `reports/portal-quality-gate/image-usage-registry.json`

The GitHub workflow uploads these files as a 30-day artifact and copies the Markdown summary into the workflow summary.

## Controlled enforcement

Strict enforcement remains disabled until the current repository findings are reviewed and an accepted baseline is recorded. To activate strict mode, add the repository marker file `.quality-gate-enforced` in a reviewed pull request.

## Safety and rollback

This package does not deploy Cloudflare, modify production pages, change e-mail signatures, enable mass mail or use secrets. Rollback consists of closing the pull request or deleting the audit workflow and script from the working branch.
