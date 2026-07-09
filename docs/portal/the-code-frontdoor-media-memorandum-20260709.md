# THE CODE front door and media memorandum — 2026-07-09

## Goal

Make `www.gnk-asg.hr` a strong public front door for THE CODE while preserving the existing public Media Application link.

## Changes

- Replaces the root public index with a focused GNK ASG / THE CODE front door.
- Adds a dedicated THE CODE media memorandum page:

```text
/the-code/media-memorandum/
```

- Keeps the existing public media application route:

```text
/media-application/?lang=en
```

- Adds menu links to:
  - THE CODE section
  - media memorandum
  - media application
  - cinematic THE CODE
  - finance
  - Mail Studio

## Memorandum page content

The page summarises the uploaded official THE CODE memorandum:

- Official media invitation and detailed memorandum
- New York programme, 6–8 October 2026
- Central activation, 7 October 2026 at 11:30 a.m. ET
- Up to 3 delegates per media organisation
- EUR 0.00 approved official programme cost
- 45 entities, 5 continents
- media application deadline, 20 July 2026 at 23:59 CEST
- secure document channel warning

## Important limitation

The local file path supplied by the operator was a Windows-only path and cannot be fetched by the GitHub connector:

```text
file:///C:/Users/GNK/Downloads/THE_CODE_COMPLETE_CLICKABLE_MEDIA_EMAIL_EN_CORRECTED.html
```

The uploaded PDF was used as the authoritative source for the new page. If the exact corrected HTML email must be embedded verbatim, it needs to be uploaded into the chat or repository as a file.

## Safety

- no mail sent
- no campaign launched
- no DNS changes
- no Cloudflare route changes
- no secrets, tokens, account ID or KV namespace changes
- deploy remains manual through the safe workflow only
