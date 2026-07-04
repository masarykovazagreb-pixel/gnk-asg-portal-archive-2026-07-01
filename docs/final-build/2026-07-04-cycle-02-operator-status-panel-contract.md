# GNK ASG Final Build — Cycle 02 Operator Status Panel Contract

Status: controlled development note, no deploy, no DNS changes, no secrets, no Cloudflare production route changes, no campaign or mass-mail action.

## Objective completed in this cycle

Define the smallest safe implementation contract for a read-only Operator OS / Mission Control status panel that consumes the existing `apps/portal/assets/data/operator-os-config.json` registry and presents consolidated operational readiness without triggering sending, deployment, DNS, Cloudflare route, or secret changes.

## Source registry verified

The existing Operator OS configuration already declares:

- `status`: `controlled-review`
- Safety gates for mass email sending, production deployment, DNS changes, Cloudflare route changes, secrets changes, and production merge.
- Group baseline: GNK DINAMO Ltd. Group / GNK ASG Enterprise Digital Platform, HQ Boulder, Colorado, GNK ASG d.o.o. Zagreb as regional connected company, THE CODE as strategic project, and planned entity count of 43.
- Mission Control roles, status model, and dashboard card names.
- Monitored modules for campaign, mail, media, publishing, deployment, registry, mobile admin, SEO, design review, and enterprise hub.

## Read-only panel contract

The panel must be a supervision layer only. It must not call any send, deploy, DNS, Cloudflare, secrets, merge, or production route mutation endpoint.

### Required sections

1. **Safety Gates**
   - Show each `safetyGates` value exactly as declared.
   - Render blocked/disabled/forbidden values as locked states.
   - Do not provide action buttons for forbidden gates.

2. **System Readiness Matrix**
   - Render all `monitoredModules` as rows.
   - Columns: label, route, risk, approval required, mode/cap/access where present, status.
   - Default status is derived, not operationally asserted:
     - `approvalRequired: true` → `approval-required`
     - `risk: critical` → `locked`
     - `sendCap: manual-only` → `manual-only`
     - otherwise → `controlled-review`

3. **Mission Control Cards**
   - Render configured `dashboardCards` as placeholder cards until live evidence is wired.
   - Each card must show `evidence: pending-controlled-activation` unless there is a verified runtime endpoint.

4. **Mail Sync Health**
   - Show `mailSync.mode`, `statusSource`, access mode, retention policy, and runtime evidence.
   - Do not enable historical capture, R2 attachment storage, or automatic deletion from this panel.

5. **Registry Center Preview**
   - Render `trackedRegistries` and `requiredFields`.
   - Deadline entries remain empty until manually entered or imported through a separate approval flow.

6. **SEO / Publishing Gate**
   - Render `seoPublishing.requiredChecks` as a checklist.
   - Do not change robots, sitemap, canonical, hreflang, or schema output from this panel.

7. **Digital Operations Transparency**
   - Show the governance language from `digitalOperations.description`.
   - All AI Manager / AI Director / worker profile displays must use transparent wording: `Global Operations Center`, `Digital Operations Team`, `AI-assisted operating roles`, and `operational identities`.
   - Do not describe generated profiles as verified physical employees.

8. **Premium Redesign Preview**
   - Render proposed components from `premiumRedesign.components` as design inventory only.
   - No replacement of current production UI, routing, or mail/admin functions in this step.

## Implementation boundary for next cycle

The next safe code step is one static/read-only frontend module under the existing portal assets, for example:

- `apps/portal/assets/js/operator-os-status-panel-v1.js`
- optional CSS only if an existing Operator/Admin page already references a compatible stylesheet

The script should:

1. Fetch `/assets/data/operator-os-config.json`.
2. Validate that required top-level keys exist.
3. Render into an existing inert container only if present, such as `[data-operator-os-status-panel]`.
4. Fail closed with a visible read-only error message if the JSON cannot be loaded.
5. Avoid global side effects except attaching one namespaced object such as `window.GNKOperatorOSStatusPanel` for diagnostics.

## Acceptance checklist

- No workflow/deploy route touched.
- No Cloudflare binding, route, secret, or DNS change.
- No campaign send or mail-send function called.
- No new approval bypass.
- No fictional employee language.
- Status matrix renders entirely from existing config.
- Missing runtime evidence is marked as pending, not invented.

## Brutal risk note

The biggest current product risk is not lack of features; it is accidental overclaiming. The platform already contains ambitious concepts: AI Director, AI Manager, thousands of worker profiles, global organization, THE CODE, registry and publishing control. The safe version must make these look like a controlled operating architecture, not a fake staff directory or uncontrolled production system.
