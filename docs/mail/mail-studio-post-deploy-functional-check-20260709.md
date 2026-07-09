# Mail Studio post-deploy functional check — 2026-07-09

## Goal

Confirm that Mail Studio is operational after safe deploy #10.

## Check order

### 1. Authenticated route

Open:

```text
https://gnk-asg.hr/mail-studio
```

Expected:

- login required if not authenticated
- Mail Studio opens after authentication
- no public indexing
- no unauthenticated access to operational UI

### 2. Runtime assets

Expected loaded assets:

```text
/assets/mail-studio-webmail-v27.js
/assets/mail-studio-auto-reply-panel-v1.js
```

### 3. Auto-reply panel

Prepare a preview with:

```text
Sender name: Neno
Subject: Test upita
Question: Poštovani, molim informaciju o THE CODE.
```

Expected:

- greeting uses `Poštovani Neno,`
- answer contains a GNK case number
- assigned center is shown
- reply is not sent automatically

### 4. Persist and lookup

Use Save case, then search by generated case number.

Expected:

- case is found
- same case number is returned
- center and sender data are retained

### 5. Controlled individual send

Send exactly one controlled test email to a safe internal recipient.

Expected:

- only individual send
- no campaign
- no bulk send
- mandatory BCC enforced
- official gold-logo signature present
- audit/dedupe active

## Failure rule

If any of these checks fail, do not proceed with cosmetic portal work. Fix Mail Studio first.
