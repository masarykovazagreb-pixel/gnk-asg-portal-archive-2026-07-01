# Final Build Review-Only Policy

Status: active during final build window.

Core rule:
All new development remains offline, review-only and parallel to the existing production-facing portal until the user reviews Office, design, modules and workflows and gives explicit replacement/deploy approval.

Allowed before final approval:
- create new review pages and preview modules
- create data/config manifests
- create email signature and autoresponder templates for preview
- improve Mission Control, Digital Workforce, Entity Slots and Enterprise Hub
- prepare SEO, schema, print and PDF-ready structures
- prepare deployment checklist and recovery notes

Not allowed before final approval:
- replace existing homepage or existing public pages
- remove existing working modules
- deploy to production
- merge final build as production replacement
- change DNS
- change Cloudflare production routes
- change secrets
- enable mass email sending
- send campaign emails

Approval rule:
The token 1203 may be used for internal final-build review actions only. It is not a deploy approval by itself.

Replacement/deploy wording required:
"Odobravam kontrolirani deploy - token 1203"

Recovery reference:
Use branch `recovery-point-20260704-1000-before-finalbuild` if later changes must be compared or rolled back.
