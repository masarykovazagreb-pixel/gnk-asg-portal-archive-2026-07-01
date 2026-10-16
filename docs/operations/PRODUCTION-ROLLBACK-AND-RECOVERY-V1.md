# Production exact-SHA verification and rollback runbook v1

## Scope and safeguards

This runbook is for an authorized operator. Reading it does not authorize a production deployment, rollback, search-engine notification, email, social post, or other external action. Do not change protected SPT or banking pages as part of a general rollback.

The production workflow is `.github/workflows/deploy-admin-auth-v6.yml`. It accepts a production dispatch only from `main`, requires the explicit phrase `DEPLOY_ADMIN_AUTH_V6`, requires a full 40-character lowercase SHA, verifies that the checked-out commit and `origin/main` both equal that SHA, rejects a dirty checkout, and reconfirms the exact SHA immediately before deploy. A branch or stale SHA is not a bypass for those safeguards.

**Keep `notify_search_engines=false`.** This suppresses the IndexNow and Google/Bing sitemap-notification job. Search-engine notifications, external messages, content publication, and social distribution require separate authorization.

## Before an authorized deployment

1. Review and merge the exact approved changes through the normal pull-request checks. Do not deploy from a feature branch.
2. Fetch `main` and capture its complete commit SHA:

   ```sh
   git fetch origin main --no-tags
   git rev-parse origin/main
   ```

3. Independently confirm that this is the reviewed SHA and that the working tree is clean:

   ```sh
   git status --short
   git rev-parse HEAD
   ```

   The workflow repeats these checks; do not weaken them or substitute a short SHA.
4. In GitHub Actions, dispatch **Deploy Admin Auth V6** from `main` with the exact full SHA and the explicit approval phrase. Set `notify_search_engines` to `false` explicitly.
5. Record the Actions run URL, requested SHA, deployed Worker/version IDs, run timestamp, and verification artifact. Do not record secrets or tokens.

## Verify the deployed release

The workflow sets `DEPLOY_SOURCE_SHA` to the approved 40-character SHA and runs `scripts/verify-production-release-v38.sh deploy-verification`. The verifier checks production responses for the matching `x-gnk-deploy-revision` and release-specific health markers.

After the run:

1. Confirm the deployment and verification jobs completed successfully for the same SHA.
2. Confirm the live release-revision response header equals the approved SHA and inspect the uploaded verification/preflight evidence.
3. Confirm the `indexnow-notify` job is **skipped** because `notify_search_engines=false`.
4. If any exact-SHA or smoke-test check fails, stop; do not retry a different SHA or trigger notifications to make the run appear successful.

## Roll back an affected Cloudflare Worker

A Cloudflare Worker-version rollback is an operational action; obtain the required incident and production approval before executing it.

1. Identify the affected Worker and its last-known-good deployment. Record the current active version, target version ID, associated source SHA (when available), and incident time from Cloudflare's Deployments/Versions view and the corresponding GitHub Actions run.
2. Confirm that the target version belongs to the correct Worker and environment. Do not copy a version ID between Workers.
3. Use Cloudflare's deployment rollback for that Worker (Dashboard: **Workers & Pages → Worker → Deployments/Versions → Roll back**) or, in the authorized Worker project and credentialed deployment environment, run:

   ```sh
   npx wrangler rollback <VERSION_ID>
   ```

   A rollback activates code from a selected prior Worker version as a new active deployment. It does **not** roll back connected resources or data. Do not place credentials in a command transcript or chat.
4. Record the rollback run/deployment ID and resulting active version. Verify the Worker and any separately served static assets independently; do not assume a Worker code rollback restores an independently deployed asset store.
5. Run the release verifier only when the restored deployment exposes the expected exact release revision. Set `DEPLOY_SOURCE_SHA` to the verified restored SHA; never claim success based only on an HTTP 200.
6. Keep `notify_search_engines=false`. A rollback is not permission to submit URLs, email users, publish an explanation, or post on social media.

## Recovery when a previous version is not suitable

- Do not reset, force-push, or rewrite `main` to imitate a rollback.
- Preserve the failed SHA, logs, screenshots/responses, deployment IDs, and verification artifacts.
- Prepare a minimal recovery change from the current repository state, review it as a pull request, run the applicable tests, merge it through the protected path, and dispatch the resulting exact `main` SHA only after separate production approval.
- Restore code separately from data: do not modify D1, KV, R2, secrets, bindings, routing, email, or external integrations unless the incident plan expressly approves that distinct action.
- If verification remains inconclusive, leave notifications and external publication disabled and escalate to the responsible production operator.

## Close-out record

Document: incident/change reference; previous and restored full SHA; Worker names and version IDs; Actions/Cloudflare run URLs; exact verifier results; whether the search-notification job was skipped; any separately approved data recovery; and final owner sign-off. Never include credentials, private customer data, or unnecessary personal information.
