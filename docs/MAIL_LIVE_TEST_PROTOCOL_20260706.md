# Mail live test protocol — 2026-07-06

Scope: controlled manual/live validation of GNK ASG mail identities and automatic acknowledgements.

This protocol must be executed only after the mail provider/aliases or Worker live-send mode are explicitly confirmed. It is not a bulk/campaign send protocol.

## Hard rules

1. One test message per address.
2. No attachments in the first round.
3. No campaign list.
4. No media blast.
5. Wait for the acknowledgement before testing the next address when reputation is sensitive.
6. Preserve the full raw message or Gmail thread URL as evidence.

## Inbound test: `beckuphome@gmail.com` to GNK addresses

Send one message from `beckuphome@gmail.com` to each address below.

Subject format:

```text
CONTROLLED INBOUND TEST | <PROFILE> | 20260706
```

Body format:

```text
Dear GNK ASG team,

This is a controlled inbound test from beckuphome@gmail.com to verify mailbox routing, automatic acknowledgement, reference number generation, sender identity and signature for <ADDRESS>.

Please ignore if received by a human operator.

Test reference: GNK-INBOUND-<PROFILE>-20260706

Regards,
beckuphome@gmail.com
```

Addresses:

- `office@gnk-asg.hr`
- `legal@gnk-asg.hr`
- `media@gnk-asg.hr`
- `press@gnk-asg.hr`
- `it@gnk-asg.hr`
- `assistant@gnk-asg.hr`
- `nermin.sefic@gnk-asg.hr`
- `sefic@gnk-asg.hr`
- `ubo@gnk-asg.hr`

## Outbound test: GNK addresses to `beckuphome@gmail.com`

Only after provider/alias/live-send capability is confirmed, send one message from each GNK address to `beckuphome@gmail.com`.

Subject format:

```text
CONTROLLED OUTBOUND TEST | <PROFILE> | 20260706
```

Body requirements:

- English only for Mail Studio compliance.
- Must include the correct display name.
- Must include the correct email in the signature.
- Must not use `assistant@gnk-asg.hr` signature except for `assistant@gnk-asg.hr`.
- Must not include Croatian body text in the outbound Mail Studio test.
- Must not include PDF attachments in the first round.

## Pass/fail checklist per address

| Check | Pass condition |
|---|---|
| Routing | Message reaches the expected mailbox/thread. |
| Auto-reply | Acknowledgement is received within expected time. |
| Sender identity | Display name matches the mailbox role. |
| Signature | Signature email matches the mailbox being tested, except approved shared media identity. |
| Reference number | A unique reference is present. |
| Language | Office/legal may be bilingual; media/press may be English; Mail Studio outbound must be English. |
| No false commitment | Auto-reply must not imply accreditation approval, legal advice, contract acceptance or final decision. |

## Known failures to retest

- `ubo@gnk-asg.hr` previously used the Digital Assistant identity and `assistant@gnk-asg.hr` signature.
- `sefic@gnk-asg.hr` previously used the Digital Assistant identity and `assistant@gnk-asg.hr` signature.

## Acceptance rule

Mail is not considered production-ready until all nine inbound identities and all required outbound identities pass this checklist.
