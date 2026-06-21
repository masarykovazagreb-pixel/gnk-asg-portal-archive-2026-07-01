Status: code ready on branch `github-ui-security-fixes-20260621`.

Implemented:
- operator token session headers;
- secure admin gate;
- Mail Agent token forwarding repair;
- Resend/Brevo outbound provider;
- Contact API V4;
- contact autoresponder through outbound provider;
- Mail Studio external delivery through outbound provider.

Pending manual runtime setup:
- one outbound provider API key as Cloudflare secret;
- deploy both mail workers;
- live delivery test.
