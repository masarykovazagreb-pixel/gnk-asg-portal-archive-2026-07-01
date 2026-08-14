# Exact-SHA release-race hygiene

`GNK_ASG_RELEASE_FENCE` is the repository-level release critical-section flag.
Set it to `true` before merging an approved release and keep it true until the
exact-SHA deployment, production verification and IndexNow chain completes.
Automatic workflows capable of pushing `main` skip their writer jobs while the
fence is active. The production deployment and retained scheduled writers also
share the `gnk-asg-main-mutation` concurrency group.

After a successful release, set the variable to `false` to resume normal
scheduled writers. Gallery Sync and Public Portal Audit are manual-only.
