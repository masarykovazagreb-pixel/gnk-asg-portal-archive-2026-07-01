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

## Operating chain

President of the Management Board -> AL (Executive Orchestrator / Chief of Staff) -> functional directors -> project leads -> specialised digital workers.

AL converts approved priorities into daily operational orders, gathers exceptions, convenes event-triggered meetings, and prepares the daily management brief. AL cannot approve payments, sign contracts, alter legal records, or publish unverified financial claims.

## Existing-page constraint

The package is designed to feed the existing Digital Workforce, Workers, Operations and Admin Center surfaces. It must not add public sections or expand the public navigation.

## Offline phases

1. Inventory current workforce APIs, datasets, pages and CI contracts.
2. Define canonical company state and event model.
3. Define role-specific voices, KPIs, authority limits and evidence requirements.
4. Generate deterministic daily orders, tasks, meetings, project updates and publication drafts.
5. Run semantic deduplication, contradiction checks and factuality gates.
6. Render drafts only in the existing protected admin surfaces.
7. Run a multi-day shadow simulation.
8. Prepare staged activation switches; all switches default to false.

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
