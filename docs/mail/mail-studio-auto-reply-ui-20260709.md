# Mail Studio auto-reply UI panel — 2026-07-09

## Purpose

Expose the auto-reply case center engine inside Mail Studio without enabling blind bulk sending.

## What it adds

- UI panel inside authenticated Mail Studio.
- AI-assisted auto-reply preview.
- Case persistence option through protected backend endpoint.
- Case lookup by reference number.
- Load prepared reply into compose for human review before SEND.

## Backend endpoints used

- `POST /api/mail-center/auto-reply-preview`
- `GET /api/mail-center/case-lookup?case=<CASE_NUMBER>`

## Safety model

The panel does not send mail directly. It only prepares or loads content into compose. Final sending still goes through the existing manual send path with:

- backend confirmation
- allowed sender profile
- recipient validation
- mandatory BCC
- attachment validation
- dedupe
- audit
- gold-logo signature contract

## Integration

The panel is served as:

```text
/apps/portal/assets/mail-studio-auto-reply-panel-v1.js
```

The Worker auth wrapper injects it only into authenticated `/mail-studio` HTML.

## Deploy validation

The safe deploy workflow validates:

- panel asset exists
- panel asset contains the expected version marker
- panel asset references auto-reply preview and case lookup endpoints
- wrapper injects the panel
- wrapper advertises the `x-gnk-asg-auto-reply-panel` header
