# GNK ASG S+Chat — production activation

Status: SOURCE / PR, NOT LIVE until each verification step succeeds.

## Architecture
- Static public route: apps/portal/s-chat/index.html → https://gnk-asg.hr/s-chat/
- Assets: apps/portal/assets/s-chat-v1.css and s-chat-v1.js. Scrolling: min-height:0 and overflow-y:auto.
- Conversational backend: existing workers/gnk-asg-ai-assist-worker/src/index.js with separate GET/POST /api/ai-assist/chat. Existing Wrangler route already matches /api/ai-assist* and [ai] binding declares AI. The existing Mail Studio route must remain functional.
- This integrates the uploaded design into the STATIC GNK ASG portal; it does not deploy the full uploaded Next.js runtime or provide Next streaming. Client features: local history, new/delete chat, copy, retry, text export, settings, cancel and proper scrolling.

## Mandatory deployment checks
1. All PR CI checks green, review clear; Bot Ownership Contract and Publication Sitemap Registry Gate must pass. Do not weaken checks to suppress unrelated unauthorized direct-main writer.
2. Respect main canonical writer, release fence and exact-SHA portal deployment; do not assume merge means LIVE.
3. Configure and verify Cloudflare WAF/rate limiting on /api/ai-assist/chat, AI quotas and anonymous request controls. Input caps alone do not limit rate/abuse.
4. Deploy EXISTING gnk-asg-ai-assist-worker using approved Cloudflare account authentication in the authorized environment (controlled Wrangler command: wrangler deploy --config workers/gnk-asg-ai-assist-worker/wrangler.toml). Do not commit secrets. Static portal deploy alone does not deploy Workers code.
5. GET https://gnk-asg.hr/api/ai-assist/chat must return JSON service=GNK ASG S+Chat and aiReady=true. POST application/json with body {"messages":[{"role":"user","content":"Odgovori jednom rečenicom."}],"language":"hr","style":"short"} must return ok:true, ai:true, a nonempty text and HTTP 200. Verify oversized/invalid messages, cross-site origins and missing AI fail closed. Regression test existing Mail Studio API.
6. Following exact-SHA portal deployment verify public HTTP 200 for /s-chat/, /assets/s-chat-v1.js and /assets/s-chat-v1.css and working home button plus global navigation. Test desktop/mobile scrolling, local history, copy, export, retry, cancel and actual AI response.
7. Claim VERIFIED LIVE only after independent URL and production SHA verification. If Cloudflare auth/rate limiting/binding is missing, label BACKEND BLOCKED.

## Privacy and transparency
- AI content is explicitly marked as AI-generated, without pretending that a named person reviewed it.
- Chat history is stored locally in browser localStorage, selected history is transmitted to the AI Worker. Warn against sending confidential information.
- Chat does NOT connect to Gmail, repositories, payments, private files, external ChatGPT tools or live web browsing.
- API rejects arbitrary system instructions supplied by the client and caps conversation input.
