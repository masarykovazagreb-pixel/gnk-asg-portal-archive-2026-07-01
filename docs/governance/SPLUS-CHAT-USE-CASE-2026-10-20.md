# GNK ASG S+Chat — AI use-case inventory (20.10.2026)

**Status:** preliminary internal screening; not a compliance certificate or proof of production activation.

## Roles and purpose
GNK ASG d.o.o. provides a branded public informational chatbot through `/s-chat/`, using the existing `POST /api/intelligence-desk-chat` service and its server-side configured AI model. Conservatively track potential provider/deployer roles; legal role assignment requires review of service contracts. It answers general/portal questions; it must not make employment, credit, medical, judicial, biometric or other high-risk decisions, publish articles, send email or take business actions.

## Risk screen and transparency
No prohibited Article 5 AI use is intended. Internal provisional risk classification: **not-high-risk for general informational use only**. New features require reassessment. The public interface visibly says that replies are AI-generated and may be wrong. Do not attribute AI replies to Nermin Sefić personally or invent evidence of substantive human editorial review. References: EU Regulation 2024/1689, especially Articles 4, 5, 50; `docs/governance/EU-AI-ACT-2026-POLICY.md`.

## Data, constraints and operation
Messages sent to the legacy API have a **600-character** maximum; its implementation truncates any longer message. Last 16 chat messages are stored in the current browser tab's `sessionStorage`; the API receives only the latest user message. New Chat cancels pending requests and clears that tab's record. The existing operator worker requires server-side `OPENAI_API_KEY` and has a KV-dependent request limiter. Neither the presence of production secrets nor external provider's logging/retention policies has been verified. Warn visitors against submitting sensitive or confidential information. The browser does not grant access to email, payment, publishing or internal tools.

## Release gate
Review sources, copyright, privacy, accessibility, AI disclosure and automated test reports; merge only after required CI. Deploy the exact reviewed main SHA via the authorized production workflow. Independently verify public HTML, CSS, JS and a non-sensitive POST to the real chat API. If the model fails, display the error rather than simulating a successful response.
