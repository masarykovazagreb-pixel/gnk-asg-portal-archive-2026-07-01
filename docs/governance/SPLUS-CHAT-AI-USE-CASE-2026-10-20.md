# GNK ASG S+Chat — AI use-case review (20.10.2026)

## Nature of the system and roles
Public multilingual conversational assistant branded GNK ASG S+Chat. GNK ASG integrates and makes the system available through its portal. Model inference executes with a server-side Cloudflare Workers AI binding; model IDs currently configured in the existing worker include Cloudflare-hosted GLM and Gemma. For caution, project metadata records GNK ASG as role BOTH (potential provider/deployer). Final EU AI Act legal classification depends on service arrangements, placing-on-market and model obligations and requires qualified review before claiming certification.

## Use and people affected
Users are visitors of gnk-asg.hr and operators configuring this service. Permitted purpose: general information and writing assistance. Not deployed to recruitment scoring, education admissions, credit eligibility, justice, migration, biometric processing or other Annex III uses; if scope changes, STOP and reassess risk. No autonomous authority to send e-mail, open banking, operate business systems, deploy code or publish news. The worker has no such credentials, APIs or tool grants.

## Fundamental-rights and prohibited use screen
No prohibited profiling, sensitive biometric processing, manipulation targeting vulnerable persons, forbidden emotion recognition, covert persuasion, social scoring or deepfake creation is an intended service function. AI model output might nevertheless be wrong, biased or unsafe, so clear disclosure and content review are important. Current classification is not-high-risk FOR THE STATED PURPOSE only.

## Article 50 AI transparency and attribution
- Visible page and message footer: Razgovor vodi umjetna inteligencija; odgovori mogu biti pogrešni.
- Server API uses `disclosure: "AI-generated response"`; client labels assistant replies distinctly as AI.
- No attribution of chatbot speech to Nermin Sefić or claim that he personally reviews conversations.
- Machine-readable source/provenance is limited to UI roles, HTML labels and JSON/API declarations; these are **not asserted to be a legal certification** of all technical marking obligations. Any new media output requires additional marking review.

## Data flow and privacy
- Input: visitor's last bounded message history, language and style preferences, sent over HTTPS to the domain's AI Worker.
- Rate binding: Cloudflare per-edge per-client limit (5 requests per 60 seconds); missing limiter causes a 503 before invoking any model. Additional Cloudflare WAF/account cost controls should be verified independently.
- Max 12 messages and 12,000 characters total, 5,000 per message. Server controls system instructions; rejects disallowed roles and invalid origin/JSON. General anonymous clients still need abuse monitoring.
- Storage: browser localStorage history; server does not write user conversations to a database in the code reviewed. Provider/edge logs and model data retention require review of Cloudflare contract/configuration; do not promise zero logging or confidential treatment.
- Client provides erase/delete/export controls; data not automatically encrypted by this JavaScript beyond browser/storage and HTTPS transit.
- Visitors warned not to send confidential, personal, financial or sensitive information. No child-specific service claims or targeting.

## Oversight, literacy and release
Human product/service owner: GNK ASG editorial/technical operations; individual named reviewer is NOT asserted. Operators should understand AI limitations, hallucination risks, data minimization, privacy, copyright, WAF/rate limiting, monitoring and corrections. No blanket human review of chatbot output is claimed.
Deployment needs existing source governance CI, Bot Ownership Contract, Publication Sitemap Registry Gate, PR review, exact-SHA production portal deployment, separately authorized Cloudflare Worker deploy and independent HTTP GET/POST tests.

References: EU Regulation 2024/1689; internal docs/governance/EU-AI-ACT-2026-POLICY.md; config/eu-ai-act-governance-v1.json; Cloudflare official Workers AI and Rate Limiting documentation.

This is a source-backed internal operational risk record, not external counsel's binding legal opinion.
