# GNK ASG Enterprise Review — Recovery Point

Created: 2026-07-05  
Repository: `beckuphome-gnk/gnk-asg-portal`  
Review branch: `enterprise-portal-ui-v3-20260704`  
Pull request: `#329`  
Application snapshot SHA: `8f9573c5b6ecb35f05da2f4412fe2557b9cdcc36`  
Recovery branch: `recovery/enterprise-review-20260705-8f9573c`  
Main baseline at review: `5bee3b4ef6e41915a1d222d5f78da15ccb4792a5`

## Verified snapshot state

- Pull request open, draft and mergeable.
- Isolated preview deployed successfully.
- Preview URL: `https://gnk-asg-enterprise-review-v3.beckuphome.workers.dev`
- Preview merge revision: `03ebf6c2061ecf25ed719400e1ef034f22fc776e`
- `productionRoutes=false`.
- `mailSending=false`.
- Public preview endpoint verification passed.
- Protected Enterprise route verification passed.
- Croatian and English publication route validation passed for 16 detail pages.
- Finance Cockpit uses explicit management-information / non-booking disclosure.
- Public Operations uses the 08:00–09:00 Executive Office review window.

## Recovery rule

Do not force-push `main`, change DNS, alter production routes or expose secrets during recovery.

A recovery must use a reviewable pull request from the recovery branch or a branch created from the recorded application snapshot SHA. Before any production restoration:

1. compare the requested recovery revision with current `main`;
2. run the full CI and isolated preview workflow;
3. verify public health, index, THE CODE, Objave, Publications, Finance, Media Application, Admin authentication boundary and Mail Studio authentication boundary;
4. confirm `productionRoutes=false` and `mailSending=false` in preview;
5. obtain the exact production approval phrase;
6. execute the manual production workflow;
7. run post-deploy smoke tests and preserve the displaced production revision as a new recovery point.

## Production approval lock

Production restoration or deployment remains prohibited without the exact phrase:

`Odobravam kontrolirani deploy - token 1203`

Silence never authorizes merge, deployment, DNS, secrets, payments, contracts, mass email or SMS.
