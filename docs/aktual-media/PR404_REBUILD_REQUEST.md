# PR404 canonical generated-output rebuild request

**Requested:** 2026-11-09. Only on the existing `feat/aktual-world-ci-release-20261109` branch.

This trigger requests the *official, deterministic* generators:
1. `node apps/sites/build.mjs` for the six independent publications;
2. `node scripts/apply-refresh-v1.mjs` using actual `network-counts-v1.json` data day;
3. `python3 scripts/factory/radio_promo_v1.py` to materialize canonical radio-promo markup.

The runner must pass `tests/test-sites-network-v1.mjs`, `tests/test-refresh-layer-v1.mjs` and radio-promo check before writing its changes. It does **not** merge a PR, publish to production, bypass content gate, or modify the publication system's source policy. Generated diffs must remain inspectable.

Rerun note (2026-11-09): build ignored World/Archive/Daily validation roots before refresh-layer quality test, without tracking ignored outputs. Treat changed site files as generated only.
