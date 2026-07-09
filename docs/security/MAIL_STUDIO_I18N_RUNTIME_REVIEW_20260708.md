# Mail Studio multilingual runtime review — 2026-07-08

## Scope

Branch: `fix/mail-studio-i18n-runtime-20260708`

This is a code-only repair for `/mail-studio/`. It does not deploy production, does not enable GitHub Actions, does not send email, does not run campaigns, and does not touch DNS, Cloudflare routes, secrets or production bindings.

## Problem found

1. The active page loaded `mail-studio-webmail-v25.js`.
2. The v25 client enforced English-only subject/body validation through a Croatian-word detector.
3. That made Croatian and other-language messages fail client-side before the backend could process them.
4. The UI offered folders and sender profiles, but the backend currently exposes real data only for:
   - `sent`
   - `outbox`
   - `drafts`
   - review-safe `inbox` empty state
5. Inbound mailbox reading is not connected in `manual-mail-service-v1.js`; the API returns `inboundConnected:false` for Inbox.
6. The old client had attachment handling split between v25 and a secondary safe-attachments patch script, which made the runtime harder to reason about.

## Fix applied

1. `/mail-studio/` now loads `mail-studio-webmail-v26.js`.
2. v26 removes English-only validation.
3. v26 adds multilingual template support for:
   - HR
   - EN
   - DE
   - IT
   - SR
   - SL
   - HU
   - FR
   - ES
   - AR
   - ZH
4. v26 keeps required validation only for:
   - valid recipient
   - subject present
   - body present
   - safe attachment count/size/type
5. v26 loads sender profiles from `/api/mail-sync/health` when available, so frontend profiles stay aligned with backend-allowed sender profiles.
6. v26 handles supported attachments directly:
   - PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, CSV, TXT, PNG, JPG, JPEG, WEBP
7. v26 shows a clear Inbox warning when `inboundConnected:false`, instead of pretending real inbox sync exists.

## Known limitation

Inbox is not a true external mailbox yet. The backend explicitly returns:

`inboundConnected:false`

Connecting real inbox reading would require an approved mailbox/inbound-mail design and may require Cloudflare/email binding changes. That is intentionally outside this safe branch.

## Safety status

- No production deploy.
- No GitHub Actions enabled.
- No mail sent.
- No campaign/bulk/scheduled outreach.
- No DNS change.
- No Cloudflare route/binding/secret change.
- No direct push to `main`.
