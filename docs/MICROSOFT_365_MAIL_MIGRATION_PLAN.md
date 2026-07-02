# Microsoft 365 mail migration plan

## Goal

Move human-operated `@gnk-asg.hr` mailboxes to Microsoft 365 while retaining the website, Cloudflare Worker applications and controlled transactional sending.

## Safety principle

Do not change the production MX record until:

- The Microsoft 365 tenant exists.
- Domain ownership has been verified with TXT.
- Every required user mailbox, shared mailbox, alias and group exists.
- Administrators can sign in with MFA.
- Test delivery to the temporary `onmicrosoft.com` addresses succeeds.
- Existing mail has been inventoried and an export or migration path is available.

Verifying the domain with TXT must not interrupt the website or current mail flow. The MX cutover is a separate final step.

## Proposed mailbox structure

### Licensed user mailboxes

- `nermin.sefic@gnk-asg.hr`
- One administrative/operations user mailbox, if required.

### Shared mailboxes

- `media@gnk-asg.hr`
- `legal@gnk-asg.hr`
- `privacy@gnk-asg.hr`
- `it@gnk-asg.hr`
- `ubo@gnk-asg.hr`
- `contact@gnk-asg.hr`

### Aliases or routing addresses

- `press@gnk-asg.hr` -> `media@gnk-asg.hr`
- `info@gnk-asg.hr` -> `contact@gnk-asg.hr`
- `sefic@gnk-asg.hr` -> `nermin.sefic@gnk-asg.hr`
- `assistant@gnk-asg.hr` -> the approved user or shared mailbox

The final mapping must be confirmed against Cloudflare Email Routing and the portal configuration before MX cutover.

## Migration stages

### Stage 1 — inventory and backup

Record for every address:

- Current destination.
- Whether it receives, sends or both.
- Current provider.
- Approximate mailbox size.
- Required historical messages.
- Required delegates.
- Required aliases.
- Required application or Worker use.

Export existing important mail before changing MX.

### Stage 2 — tenant and identity

- Create the Microsoft 365 tenant.
- Create the first Global Administrator and a separate emergency administrator.
- Enable MFA.
- Add `gnk-asg.hr` and verify ownership using the Microsoft TXT record.
- Do not change MX yet.

### Stage 3 — mailboxes and permissions

- Create licensed users.
- Create shared mailboxes.
- Assign Full Access and Send As only to approved users.
- Enable copies of sent messages in the relevant shared mailbox Sent Items.
- Test Outlook on the web and Outlook mobile.

### Stage 4 — old-mail migration

Where the current provider supports IMAP:

- Create an IMAP migration batch or perform controlled exports/imports.
- Confirm that source folders and message dates are preserved as far as the selected migration method supports.
- Record any data that IMAP does not migrate, such as contacts, calendars, rules or signatures, and migrate those separately.

### Stage 5 — DNS readiness

Before changing MX:

- Record the existing MX, SPF, DKIM and DMARC values.
- Reduce DNS TTL only when operationally appropriate.
- Prepare the Microsoft MX and required DNS records.
- Design one valid SPF record rather than publishing multiple competing SPF records.
- Configure DKIM in Microsoft 365 after the required CNAME records are available.
- Start DMARC conservatively and review reports before increasing enforcement.
- Preserve website A/AAAA/CNAME and Cloudflare Worker routes.

### Stage 6 — cutover

- Change MX to Microsoft 365.
- Add the required Autodiscover and related DNS records.
- Confirm inbound and outbound delivery for every mailbox class.
- Confirm external replies, attachments and shared-mailbox Sent Items.
- Keep the previous provider accessible during the observation window when possible.

### Stage 7 — applications and Cloudflare

Human mailboxes should use Microsoft 365. Portal-generated mail may remain on the controlled Cloudflare sending path if the sender-domain authentication and operational separation are correct.

Confirm:

- Which addresses are allowed as Worker senders.
- Reply-To destinations.
- Bounce handling.
- Transactional versus campaign traffic separation.
- SPF/DKIM/DMARC alignment for every sending platform.
- No Cloudflare route loops after MX cutover.

## Client setup

Preferred client for shared mailboxes:

- Outlook desktop or Outlook on the web on computers.
- Outlook for Android/iOS on phones.

Thunderbird can be retained as an additional desktop client for ordinary user mailboxes, but the primary shared-mailbox workflow should first be validated in Outlook.

## Rollback record

Before cutover store:

- Previous MX records and priorities.
- Previous SPF/DKIM/DMARC records.
- Previous routing destinations.
- Existing mailbox exports.
- Named person authorised to execute rollback.

A rollback changes mail routing only. It must not alter the website, GitHub repository or Cloudflare Worker routes.