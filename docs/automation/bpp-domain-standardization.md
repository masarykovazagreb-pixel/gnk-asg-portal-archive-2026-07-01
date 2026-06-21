# BPP domain standardization

Status: staged on the draft branch; production is unchanged.

## Canonical identity

- Product: Bitcoin Payment Processor
- Short name: BPP
- Official domain: `bpp.is`
- Official URL: `https://bpp.is/`
- Display label: `BPP.IS`

## Applied files

- `apps/portal/bpp/index.html`
- `apps/portal/en/bpp/index.html`
- `apps/portal/data/bpp-domain.json`
- `contracts/bpp-domain.json`
- `packages/config/bpp-domain.mjs`
- `workers/gnk-asg-direct-operator/src/config/bpp-domain.mjs`

## Enforcement

`tools/portal-quality-gate.mjs` inventories BPP references and reports deprecated aliases. `tools/build-bpp-domain-patch.mjs` prepares reviewed replacements for the existing homepage metadata, BPP cards, SEO generator, tests and Worker HTML snapshots.

## Safety

No Cloudflare deployment, production change, secret change, e-mail signature change or automatic public publication is part of this change set.
