# Mail identity and automatic-reply audit — 2026-07-06

Branch: `recovery/portal-functional-rebuild-20260705`
PR: `#332`
Scope: review-only audit. No production deploy. No live bulk sending.

## Purpose

This audit records the current status of GNK ASG / GNK DINAMO Ltd. Group mail identities, automatic acknowledgements and signature consistency after checking recent mailbox evidence in `beckuphome@gmail.com`.

## Addresses in scope

| Address | Intended identity | Intended use | Expected acknowledgement identity |
|---|---|---|---|
| `office@gnk-asg.hr` | GNK ASG Office | General corporate correspondence | GNK ASG Office |
| `legal@gnk-asg.hr` | GNK ASG Legal & Compliance | Legal/compliance correspondence | GNK ASG Legal & Compliance |
| `media@gnk-asg.hr` | GNK DINAMO Ltd. Group Media Relations & Accreditation Center | Media relations, media application, accreditation | GNK DINAMO Ltd. Group Media Relations & Accreditation Center |
| `press@gnk-asg.hr` | GNK DINAMO Ltd. Group Press Desk | Press desk / newsroom communication | GNK DINAMO Ltd. Group Media Relations & Accreditation Center or Press Desk |
| `it@gnk-asg.hr` | GNK ASG IT | IT / technical support | GNK ASG IT |
| `assistant@gnk-asg.hr` | GNK ASG Digital Assistant | Automated communication support | GNK ASG Digital Assistant |
| `nermin.sefic@gnk-asg.hr` | Nermin Sefić | Director / authorised person | Nermin Sefić |
| `sefic@gnk-asg.hr` | Nermin Sefić | Personal business profile | Nermin Sefić |
| `ubo@gnk-asg.hr` | Ultimate Beneficial Owner Office | Ownership / UBO correspondence | Ultimate Beneficial Owner Office |

## Evidence from recent mailbox review

### Confirmed working acknowledgements

- `office@gnk-asg.hr` replied to a controlled test with a bilingual HR/EN acknowledgement and an Office signature.
- `legal@gnk-asg.hr` replied to a controlled test with a bilingual HR/EN legal-safe acknowledgement and Legal & Compliance signature.
- `press@gnk-asg.hr` replied with an English media acknowledgement and Media Relations & Accreditation Center signature.
- `media@gnk-asg.hr` has multiple recent automatic acknowledgements to `beckuphome@gmail.com` using the Media Relations & Accreditation Center identity.

### Inconsistencies found

- `ubo@gnk-asg.hr` auto-reply used the visible sender name `IT – Osobni digitalni asistent` and ended with `E: assistant@gnk-asg.hr`. This is not acceptable for UBO correspondence.
- `sefic@gnk-asg.hr` auto-reply used the visible sender name `IT – Osobni digitalni asistent` and ended with `E: assistant@gnk-asg.hr`. This is not acceptable for personal/director correspondence.
- Several older subjects were MIME-encoded in the body as raw encoded words. That should be decoded or omitted from the public-facing acknowledgement body.

## Required corrected identities

### `ubo@gnk-asg.hr`

Display name:
`Ultimate Beneficial Owner Office`

Signature:

```text
Ultimate Beneficial Owner Office
GNK ASG d.o.o. / GNK DINAMO Ltd. Group
E: ubo@gnk-asg.hr
W: https://gnk-asg.hr
```

### `sefic@gnk-asg.hr`

Display name:
`Nermin Sefić`

Signature:

```text
Nermin Sefić
GNK ASG d.o.o. / GNK DINAMO Ltd. Group
E: sefic@gnk-asg.hr
W: https://gnk-asg.hr
```

### `nermin.sefic@gnk-asg.hr`

Display name:
`Nermin Sefić | Managing Director`

Signature:

```text
Nermin Sefić
Managing Director / Authorised Representative
GNK ASG d.o.o. / GNK DINAMO Ltd. Group
E: nermin.sefic@gnk-asg.hr
W: https://gnk-asg.hr
```

### `assistant@gnk-asg.hr`

Display name:
`GNK ASG Digital Assistant`

Signature:

```text
GNK ASG Digital Assistant
Automated Communication Support
E: assistant@gnk-asg.hr
W: https://gnk-asg.hr
```

## Test matrix

| Direction | Status | Note |
|---|---:|---|
| `beckuphome@gmail.com` → `office@gnk-asg.hr` | previously confirmed | Auto-reply received 2026-07-04. |
| `beckuphome@gmail.com` → `legal@gnk-asg.hr` | previously confirmed | Auto-reply received 2026-07-04. |
| `beckuphome@gmail.com` → `media@gnk-asg.hr` | previously confirmed | Multiple auto-replies received 2026-07-01. |
| `beckuphome@gmail.com` → `press@gnk-asg.hr` | previously confirmed | Auto-reply received 2026-07-02. |
| `beckuphome@gmail.com` → `assistant@gnk-asg.hr` | previously confirmed | Auto-reply received 2026-07-02, identity acceptable only for assistant mailbox. |
| `beckuphome@gmail.com` → `ubo@gnk-asg.hr` | works but identity mismatch | Auto-reply received 2026-07-02, but sender/signature identity wrong. |
| `beckuphome@gmail.com` → `sefic@gnk-asg.hr` | works but identity mismatch | Auto-reply received 2026-07-02, but sender/signature identity wrong. |
| GNK address → `beckuphome@gmail.com` | not live-tested in this step | Gmail send attempt through assistant tool was blocked; Worker is kept in recorded review mode. |

## Safety decision

No new live mail blasts should be sent until:

1. UBO and Sefić identity mappings are corrected at the live mail provider or Worker email handler.
2. A one-message-per-address test is performed.
3. Each incoming auto-reply is checked for sender name, reply-to, reference number, language and signature.
4. The sending reputation remains stable.

## Current conclusion

The mail system is not dead. Automatic acknowledgements exist and several addresses respond correctly. The main unresolved issue is not routing but identity discipline: UBO and Sefić profiles must not inherit the Digital Assistant identity or `assistant@gnk-asg.hr` signature.
