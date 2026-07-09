# Post-merge manual steps — 2026-07-09

After this diagnostics branch is merged:

1. Open GitHub Actions.
2. Select `Deploy Public Portal Assets Safe`.
3. Use `Run workflow` on `main`.
4. Enter the exact confirmation input:

```text
DEPLOY_PUBLIC_PORTAL_SAFE
```

5. Wait for the run.
6. Read the grouped `Verify public portal assets` output.
7. If all checks pass, stop. Do not run again.
8. If one route fails, fix only that route in a new PR.

Do not change DNS, Cloudflare routes, secrets, tokens, account IDs, KV namespaces or mail/campaign switches.
