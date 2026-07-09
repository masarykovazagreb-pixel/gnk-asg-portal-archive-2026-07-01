# Mail Studio reference code guard — 2026-07-09

## Purpose

Every Mail Studio email must receive a GNK reference code before sending so it can later be searched and matched in sent mail, replies, status views and audit records.

## Reference format

```text
GNK-YYYYMMDD-CITY-HASH
```

Example:

```text
GNK-20260709-ZAG-8F3A21C4
```

## Behavior

The frontend guard runs immediately before the Mail Studio SEND action.

It automatically:

- generates a reference code if the subject/body does not already contain one
- prepends the code to the subject
- inserts `Broj predmeta: <code>` into the body
- stores a local browser-side lookup record for quick reference
- uses stable center selection based on recipient identity

## Centers

The guard currently rotates across:

- Zagreb
- Toronto
- Mexico City
- Bogotá
- São Paulo
- Dubai
- Singapore
- Tokyo
- Casablanca
- Boulder

## Why frontend first

The preferred long-term implementation is backend-enforced storage in D1 on every manual send. The direct backend send patch was blocked by safety controls, so this PR implements a safe first layer that does not alter the live mail-send backend.

## Safety

- no email is sent by this PR
- no campaign or bulk sending is enabled
- no DNS, Cloudflare route, secret, token, account ID or KV namespace is changed
- existing BCC, signature, dedupe and audit safeguards remain active

## Next step

After this PR is deployed, a controlled test send should confirm that the subject and body contain the reference code before delivery.
