# Mail Studio auto-reply UI safety rules — 2026-07-09

The auto-reply panel is a drafting and lookup layer. It is not a direct sending layer.

## Allowed

- prepare auto-reply preview
- save case reference
- look up case reference
- load prepared reply into compose
- manually review and send through existing Mail Studio flow

## Not allowed

- automatic mass sending
- campaign sending
- bypassing sender profile allow-list
- bypassing mandatory BCC
- bypassing gold-logo signature contract
- bypassing audit/dedupe

## Operational note

This is the final Mail Studio UI layer needed before a controlled safe deploy. If live verification passes, Mail Studio should be usable for individual controlled emails.
