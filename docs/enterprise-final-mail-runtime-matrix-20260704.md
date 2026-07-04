# Enterprise Final Mail Runtime Matrix

Status: prepared, not executed on the review code.

## Safety boundary

- Internal GNK ASG addresses only.
- No Campaign Mailer.
- No external media list.
- No more than seven recipients in the controlled batch.
- No attachment in the first pass.
- Every message must contain a unique test reference.
- A failed signature, logo, sender or reply test stops the sequence.
- Runtime activation and sending require an authorized operator session and the approved review runtime.

## Why this is not a 9 × 9 test

Sending every profile to every internal address would create 81 messages before automatic replies and duplicate checks. That volume provides little additional evidence and creates unnecessary provider and reputation risk. The pairwise cycle below covers every approved sender profile and every internal recipient exactly once in nine messages.

## Approved sender profiles

1. `office@gnk-asg.hr`
2. `legal@gnk-asg.hr`
3. `media@gnk-asg.hr`
4. `press@gnk-asg.hr`
5. `it@gnk-asg.hr`
6. `assistant@gnk-asg.hr`
7. `nermin.sefic@gnk-asg.hr`
8. `sefic@gnk-asg.hr`
9. `ubo@gnk-asg.hr`

## Pass A — individual pairwise cycle

| Test | From | To | Required proof |
|---|---|---|---|
| IND-01 | office@gnk-asg.hr | legal@gnk-asg.hr | Office identity, one institutional signature, logo, audit record |
| IND-02 | legal@gnk-asg.hr | media@gnk-asg.hr | Legal identity, one institutional signature, inbound visibility |
| IND-03 | media@gnk-asg.hr | press@gnk-asg.hr | Gold Media signature, transparent production logo, no generic duplicate |
| IND-04 | press@gnk-asg.hr | it@gnk-asg.hr | Press identity, correct From and Reply-To |
| IND-05 | it@gnk-asg.hr | assistant@gnk-asg.hr | IT identity, correct plain-text fallback |
| IND-06 | assistant@gnk-asg.hr | nermin.sefic@gnk-asg.hr | Assistant identity, HTML and text parity |
| IND-07 | nermin.sefic@gnk-asg.hr | sefic@gnk-asg.hr | Managing Director identity and one Global Service Centre line |
| IND-08 | sefic@gnk-asg.hr | ubo@gnk-asg.hr | Executive Office identity and exact-one-signature rule |
| IND-09 | ubo@gnk-asg.hr | office@gnk-asg.hr | UBO identity, delivery and inbox audit closure |

Subject format: `[GNK REVIEW IND-XX] Signature and delivery verification`.

Body requirements:

- test reference;
- sender profile name;
- expected recipient;
- UTC and Europe/Zagreb timestamps;
- statement that no reply is required unless the test explicitly covers automatic replies.

## Pass B — controlled batch of seven

Sender: `media@gnk-asg.hr`.

Recipients:

1. office@gnk-asg.hr
2. legal@gnk-asg.hr
3. press@gnk-asg.hr
4. it@gnk-asg.hr
5. assistant@gnk-asg.hr
6. nermin.sefic@gnk-asg.hr
7. ubo@gnk-asg.hr

Required proof:

- one provider operation or the documented provider delivery model;
- seven accepted internal recipients;
- no external recipient;
- no duplicate recipient after normalization;
- exactly one gold Media signature;
- correct transparent logo URL;
- one audit reference linked to the seven recipient outcomes;
- no Campaign Mailer queue item created.

Subject format: `[GNK REVIEW BATCH-07] Internal seven-recipient verification`.

## Pass C — personalized automatic replies

### AUTO-HR

Inbound language: Croatian.

Message must contain a reliable sender name in the closing signature. Expected result:

- Croatian response;
- sender name used only when reliably extracted;
- correct recipient unit;
- unique reference preserved;
- exactly one sender-specific signature;
- `Auto-Submitted: auto-replied` or equivalent platform marker;
- no second automatic reply to the automatic reply.

### AUTO-EN

Inbound language: English. Expected result:

- English response;
- subject and message context reflected;
- preliminary-response disclaimer preserved;
- exact-one-signature rule.

### AUTO-DE

Inbound language: German. Expected result:

- German response;
- sender name handling verified;
- deterministic fallback remains valid if the AI binding is unavailable;
- exact-one-signature rule.

## Pass D — rendering clients

For one institutional message and one Media message, inspect:

- Gmail web;
- Gmail mobile;
- Outlook desktop or Outlook web;
- plain-text view;
- images blocked;
- dark mode.

Pass conditions:

- logo has stable dimensions and does not disappear because of a relative URL;
- alt text remains meaningful when images are blocked;
- signature stays readable in dark mode;
- no duplicated contact block;
- links are clickable and point to the correct domain and mailbox;
- body content is not merged into the signature table.

## Pass E — negative and safety tests

- invalid sender profile is rejected;
- more than the allowed controlled batch size is rejected for this test mode;
- duplicate addresses are normalized;
- empty subject is rejected;
- empty body is rejected;
- malformed attachment is rejected;
- automatic-reply loops are suppressed;
- system and bounce messages do not receive automatic replies;
- campaign state is unchanged;
- production release remains locked.

## Evidence package

For every executed test retain:

- test reference;
- platform audit ID;
- sender and normalized recipient list;
- provider result;
- sent timestamp;
- received timestamp;
- screenshot of rendered message;
- raw headers where available;
- signature count;
- logo URL and load result;
- automatic-reply model or deterministic-fallback marker;
- final pass/fail and defect reference.

## Exit criteria

The mail subsystem is not release-ready until all individual profiles, the seven-recipient batch, the three language replies, loop suppression and two-client rendering checks pass on the same candidate runtime that is proposed for release.
