# Auto reply case centers — 2026-07-09

## Purpose

Automatic replies must be personalized, case-numbered, center-assigned and always signed with the official GNK ASG gold-logo signature.

## Rules

Every automatic reply must include:

1. A received/reference number.
2. The same number as the case handling number.
3. A processing center selected from ten global GNK ASG locations.
4. Stable center assignment per sender identity.
5. A search path by case number.
6. Reply language matching the inquiry language where detectable.
7. Personalized greeting when the sender's name/signature is known, for example: `Poštovani Neno,`.
8. Mandatory signature enforcement through the backend signature contract.
9. Mandatory BCC copy enforcement to `beckuphome@gmail.com`.

## Ten centers

The active automatic-reply center rotation uses:

- Zagreb, Croatia
- Toronto, Canada
- Mexico City, Mexico
- Bogotá, Colombia
- São Paulo, Brazil
- Dubai, UAE
- Singapore, Singapore
- Tokyo, Japan
- Casablanca, Morocco
- Boulder / Colorado, USA

## Stability rule

The center is selected by hashing the sender identity. Therefore:

- new identities are distributed across the ten centers
- the same sender is always routed to the same center
- the case number can vary by inquiry, but the assigned center remains stable for that sender

## Case number format

Example:

```text
GNK-20260709-ZAG-8F3A21C4
```

Where:

- `GNK` is the system prefix
- `20260709` is the date
- `ZAG` is the center code
- `8F3A21C4` is the deterministic inquiry fingerprint

## API paths

The backend exposes two protected mail-center paths:

- `POST /api/mail-center/auto-reply-preview`
- `GET /api/mail-center/case-lookup?case=<CASE_NUMBER>`

The preview path prepares a signed auto reply preview and can persist the case if `persist: true` is provided.

## Signature

The active signature contract is:

```text
GNK_ASG_EMAIL_SIGNATURE_CONTRACT_V2_20260709_GOLD_LOGO_CASE_AUTO_REPLY
```

The signature uses the gold logo asset:

```text
https://gnk-asg.hr/assets/brand/media-kit/GNK_ASG_logo_gold_transparent.png
```

## AI communication policy

The auto reply engine is allowed to answer general questions based on public portal facts. Specific legal, financial, contractual or operational questions are acknowledged and routed for human review.

No raw automatic bulk campaign is enabled by this document.
