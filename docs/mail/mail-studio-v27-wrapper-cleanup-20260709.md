# Mail Studio v27 wrapper cleanup — 2026-07-09

## Purpose

Ensure that the active Cloudflare Worker auth wrapper serves Mail Studio as v27 and no longer injects the legacy v26 BCC/UTF-8 hotfix as an active runtime patch.

## Why

Mail Studio source was already upgraded to v27 with clean source-level BCC, and auto-reply case centers with gold-logo signatures were merged. The Worker wrapper still advertised v26 runtime headers and injected a v26 hotfix script. This PR aligns the wrapper with the current Mail Studio source.

## Changes

- `mailStudioV26` renamed to `mailStudioV27`.
- v26 hotfix script injection removed from the active wrapper path.
- wrapper version bumped to V22.
- `/mail-studio` headers now advertise:
  - `GNK_ASG_WEBMAIL_V27_20260709_BCC_SOURCE_CLEANUP`
  - `GNK_ASG_AUTO_REPLY_CASE_CENTER_V1_20260709_PERSONALIZED_AI_SIGNATURES`
  - `GNK_ASG_EMAIL_SIGNATURE_CONTRACT_V2_20260709_GOLD_LOGO_CASE_AUTO_REPLY`
  - signature logo: `gold`
- `portal-version.json` patch now reports v27 routing and inactive v26 hotfix.
- safe deploy validation fails if the active wrapper still contains the legacy v26 wrapper markers.

## Safety

No deploy is triggered by this PR. No DNS, Cloudflare route, secret, token, account ID, KV namespace, mail sending, bulk campaign or production binding changes are made.

## Mail Studio availability plan

If full portal deploy is delayed, Mail Studio should be the minimum next deploy target because user needs to send individual controlled emails. The required live baseline is:

- authenticated `/mail-studio`
- active v27 runtime asset
- manual mail live gate still controlled by backend
- mandatory BCC enforced
- gold-logo signature contract enforced
- no bulk campaign enablement
