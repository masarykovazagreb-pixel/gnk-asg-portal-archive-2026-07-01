# Canva + Codex web upgrade plan — 2026-07-09

## Purpose

Stabilize the public web portal first, then improve the public visual layer using Canva-derived assets and controlled code changes.

## Current priority

1. Make deploy verification observable.
2. Identify the exact live endpoint or marker that fails.
3. Keep production safe: no DNS/routes/secrets/token changes.
4. After a clean deploy verification, improve the public visual layer.

## Canva role

Canva is used for visual design assets and presentation/media material, including:

- THE CODE hero visuals
- landing page visual direction
- media kit graphics
- presentation-style visuals for public-facing pages

Canva is not used for deploy control, DNS, worker routing, secrets or mail operations.

## Codex / GitHub role

Codex/GitHub is used for code review and controlled repository changes, including:

- workflow diagnostics
- portal frontend structure
- worker/static asset routing checks
- PR-based improvements
- safe verification before production actions

## Next safe sequence

1. Merge diagnostics PR.
2. Run only `Deploy Public Portal Assets Safe` with the exact confirmation input.
3. Read the grouped verification output.
4. Fix only the failing endpoint if one remains.
5. Then create a separate visual-upgrade PR for public web improvements.

## Guardrails

- No autonomous mail sending.
- No campaigns.
- No DNS changes.
- No Cloudflare route changes.
- No secrets/tokens changes.
- No production deploy except explicit manual safe workflow.
