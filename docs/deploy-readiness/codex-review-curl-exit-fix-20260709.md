# Codex review curl-exit fix — 2026-07-09

## Issue

Codex flagged that the live verification curl commands could ignore non-zero transfer exit codes because `|| true` preserved the HTTP code output while discarding curl failure state.

This could falsely pass a partial transfer if the HTTP status was already written as `200` and the marker appeared before a timeout or stall.

## Fix

The verification helpers now capture `curl_exit` separately and require:

- `curl_exit == 0`
- `HTTP status == 200`
- expected marker match for content checks

PDF/status checks now also require a complete curl transfer, not only an HTTP 200 code.

## Safety

The deploy command remains unchanged. No DNS, route, secret, token, account ID, KV, mail or campaign changes were made.
