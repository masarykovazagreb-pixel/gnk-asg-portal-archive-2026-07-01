# GNK ASG Enterprise Platform — Final Pre-Production Recovery Point

Created: 2026-07-05  
Repository: `beckuphome-gnk/gnk-asg-portal`  
Review branch: `enterprise-portal-ui-v3-20260704`  
Pull request: `#329`  
Final reviewed head: `51ed44e3076e2c69135913a9e4bfd72d2b4968d0`  
Production status: NOT MERGED / NOT DEPLOYED

## Verified state

- Pull request open, draft and mergeable.
- Full release, Enterprise Runtime, Admin, Mail, Media, Company Operations, Digital Workforce, SEO, Design Review and publication-route checks pass.
- Isolated preview deploy passes.
- Public health and Public Operations checks pass.
- Protected Enterprise route authentication boundary passes.
- Croatian and English publication catalogues and 16 detail routes pass.
- Finance Cockpit has explicit management-information / non-booking disclosure.
- THE CODE desktop and mobile evidence is readable and complete.
- Objave/Publications desktop and mobile evidence is readable and complete.
- Responsive evidence includes 16 screenshots across 8 public routes and 2 viewports.
- Review preview has no production routes and mail sending is disabled.

## Final recovery rule

Use this exact reviewed SHA as the pre-production recovery baseline. Do not force-push `main`, change DNS, production routes or secrets. Recovery or production deployment must use a reviewable branch and the full CI / isolated-preview sequence.

## Production lock

Production remains prohibited without the exact phrase:

`Odobravam kontrolirani deploy - token 1203`

Silence never authorizes merge, deploy, DNS, secrets, payments, contracts, mass email or SMS.
