# GNK ASG Operations Runbook

Version: `GNK_ASG_OPERATIONS_RUNBOOK_20260627`

## Purpose

This runbook defines the operational sequence for the GNK ASG media programme, newsroom applications, approved travel, accommodation and New York 2026 activation. It is the working control document for Media Relations, Admin and Operations.

## Canonical operational surfaces

- Public media resources: `/media-kit-2026/`
- Newsroom application: `/media-application/`
- Media operations: `/media-command-center/`
- Executive dashboard: `/admin-center/`
- Mail delivery workspace: `/mail-studio/`
- Document publication: `/pdf-publisher/`

## Mandatory business rules

1. Participation is invitation-only.
2. Every newsroom application must be reviewed by an authorized person.
3. An automated receipt is not an approval.
4. Airline tickets must not be purchased before written GNK ASG approval.
5. GNK ASG or its authorized agency arranges and pays approved travel.
6. Accommodation in New York is organized and paid for approved representatives.
7. Passport copies are not accepted through ordinary email or the initial application form.
8. Production outreach remains locked until final recipient, message, attachment and rate-limit validation.
9. Financial, legal and ownership statements must be checked against the relevant source document before publication.
10. Every production change requires a checkpoint and validation evidence.

## Daily operating sequence

### 1. Open Executive Operations Cockpit

Confirm:

- public portal endpoint is available;
- Media Kit manifest is available;
- newsroom application configuration is active;
- D1, R2 and email bindings are active;
- production sending mode is intentionally locked or explicitly approved;
- pending and incomplete application counts are understood.

### 2. Review Media Command attention queue

Process in this order:

1. incomplete applications;
2. applications ready for human review;
3. contacts requiring verification;
4. contacts awaiting approval;
5. approved contacts requiring message preview;
6. suppression and rate-limit checks.

### 3. Review newsroom applications

For each applicant verify:

- invitation reference code;
- newsroom name and official website;
- representative identity and role;
- responsible editor and official contact;
- assignment letter;
- professional credential or published work;
- departure city and preferred airport;
- expected dates;
- proposed flight options;
- requested additional costs;
- final human decision and reason.

### 4. Travel authorization workflow

Status sequence:

`PROPOSED` -> `REVIEWED` -> `WRITTEN_APPROVAL` -> `BOOKED_AND_PAID` -> `ITINERARY_DELIVERED`

No booking may move to `BOOKED_AND_PAID` without `WRITTEN_APPROVAL`.

### 5. Media invitation workflow

Status sequence:

`CONTACT_VERIFIED` -> `MANUALLY_APPROVED` -> `MESSAGE_PREVIEWED` -> `ATTACHMENT_VERIFIED` -> `SUPPRESSION_PASSED` -> `RATE_LIMIT_CONFIRMED` -> `FINAL_SEND_APPROVAL`

The final step is always explicit and human.

## Media Kit governance

Three canonical packages are maintained:

- Corporate Media Kit 2026
- Technology & Product Media Kit
- New York 2026 Press Kit

Every kit must contain:

- approved boilerplate;
- approved key messages;
- official media contact;
- editorial usage rules;
- current official visuals;
- date and version marker;
- relevant source documents;
- HR and EN wording.

## Incident handling

### Public page unavailable

- keep production sending locked;
- verify Worker deployment and asset binding;
- use checkpoint branch for rollback;
- rerun public portal smoke test.

### Application storage failure

- stop new approvals;
- confirm D1 and R2 bindings;
- preserve inbound email and application evidence;
- do not request applicants to resend sensitive documents by ordinary email.

### Email acknowledgement failure

- record the failed acknowledgement event;
- keep the application record;
- send a manual confirmation only after confirming the recipient address;
- do not interpret delivery failure as application rejection.

### Incorrect media or factual claim

- remove or suspend the affected asset;
- identify the authoritative source document;
- publish a corrected version with a new version marker;
- retain the audit record.

## Final activation gate

The programme is operationally ready only when all of the following are true:

- public portal is healthy;
- Media Kit Center is published and verified;
- application portal is active;
- D1, R2 and email bindings are active;
- all selected newsrooms have a recorded human decision;
- approved representatives have approved travel and accommodation;
- final itineraries have been delivered;
- production media recipients are verified and manually approved;
- message and attachment previews are approved;
- suppression and rate-limit checks have passed;
- rollback checkpoint and deployment evidence exist.

## Checkpoint

Pre-work rollback branch: `checkpoint-ops-20260627`
