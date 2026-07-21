# Digital Workforce Automation — offline package

Status: OFFLINE ONLY  
Target readiness date: 2026-09-15  
Timezone: Europe/Zagreb

## Hard safety boundaries

- No production deploy.
- No active cron or scheduler.
- No public route changes.
- No changes to the index page.
- No real email, payment, contract, legal statement, or external publication.
- No synthetic value may be presented as actual financial data.
- All generated outputs remain drafts until an explicit activation phase.
- Generated shadow, review and admin files are local/CI artifacts and must not be committed.

## Operating chain

President of the Management Board -> AL (Executive Orchestrator / Chief of Staff) -> functional directors -> project leads -> specialised digital workers.

AL converts approved priorities into daily operational orders, gathers exceptions, convenes event-triggered meetings, and prepares the daily management brief. AL cannot approve payments, sign contracts, alter legal records, or publish unverified financial claims.

## Existing-page constraint

The package is designed to feed the existing Digital Workforce, Workers, Operations and Admin Center surfaces. It must not add public sections or expand the public navigation.

## Package structure

- `config/company-operating-model.json` — authority, quality and activation contract.
- `config/daily-publication-windows.json` — disabled draft-only operating windows.
- `data/seed-company-state.json` — deterministic offline seed state.
- `src/engine.mjs` — daily event, task, meeting, comment and draft generator.
- `src/review-gate.mjs` — editorial and safety decisions.
- `src/run-shadow.mjs` — multi-day deterministic shadow run.
- `src/render-review-preview.mjs` — machine-readable review output.
- `src/render-admin-summary.mjs` — readable admin summary and JSON index.
- `src/validate-package.mjs` — package integrity and safety validation.
- `test/` — engine, review and package-contract regression tests.

## Local commands

Run from `offline/digital-workforce-automation`:

```bash
npm test
npm run validate
npm run shadow:14
npm run shadow:30
npm run verify
```

`npm run verify` performs the full offline gate in this order:

1. validate package structure and safety switches;
2. run all Node tests;
3. generate a deterministic 14-day shadow cycle;
4. review every generated draft;
5. generate admin Markdown and JSON summaries.

## Generated artifacts

The following directories are generated locally or in isolated CI and are ignored by Git:

- `generated-shadow/` — one complete offline company cycle per day plus manifest;
- `generated-review/` — review decision per draft and aggregate index;
- `generated-admin/` — readable management summary and machine summary.

All generated items must retain these controls:

- `mode: OFFLINE`;
- `publicReleaseAllowed: false` where present;
- `publicPublishingEnabled: false`;
- `productionWritesEnabled: false`;
- `cronEnabled: false`;
- publication status `DRAFT_ONLY`;
- `publishAt: null`;
- `public: false`.

## Offline phases

1. Inventory current workforce APIs, datasets, pages and CI contracts.
2. Define canonical company state and event model.
3. Define role-specific voices, KPIs, authority limits and evidence requirements.
4. Generate deterministic daily orders, tasks, meetings, project updates and publication drafts.
5. Run semantic deduplication, contradiction checks and factuality gates.
6. Render drafts only in the existing protected admin surfaces.
7. Run a multi-day shadow simulation.
8. Prepare staged activation switches; all switches default to false.

## Merge-readiness gate

This branch is not ready for merge merely because tests pass. Before any future merge, all of the following are required:

1. explicit user approval for the merge step;
2. controlled synchronization with the current `main` branch;
3. conflict review, especially for workflows and existing Digital Workforce routes;
4. successful offline verification after synchronization;
5. confirmation that no generated artifact is included in the diff;
6. confirmation that no production, cron, mail, secret, DNS or public publishing path is introduced;
7. a separate explicit decision for any activation beyond offline shadow mode.

## Activation order after approval

1. Admin-only draft preview.
2. Internal activity feed.
3. Public non-financial operational summaries.
4. Project updates and differentiated lead commentary.
5. Meeting decisions and task outcomes.
6. AL daily brief.
7. Verified financial operational snapshot.
8. Limited automatic publication.
9. Full scheduled mode only after stable shadow operation.

No activation stage is authorized by this package or branch.
