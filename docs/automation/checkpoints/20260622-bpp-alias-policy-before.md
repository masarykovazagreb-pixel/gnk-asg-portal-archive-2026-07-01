# Checkpoint — BPP deprecated alias policy before audit refinement

- Branch: `automation-nightly-20260622-0035-quality-gate`
- Head before change: `eb7428c7667ffd12679582036b6b00ac4bd41609`
- Target file: `tools/portal-quality-gate.mjs`
- Scope: refine audit classification so declared deprecated aliases in `contracts/bpp-domain.json` stay visible in the BPP inventory but are not counted as active forbidden frontend/backend links.
- Production: unchanged
- Rollback: restore `tools/portal-quality-gate.mjs` from commit `eb7428c7667ffd12679582036b6b00ac4bd41609` or reset this branch to that commit.
