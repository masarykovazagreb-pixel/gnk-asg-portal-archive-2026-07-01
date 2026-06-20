# GNK ASG — Live Site Technical Check Summary

Status: locked preparation. This file is not part of the public portal build.

## Checked items

### Homepage file

Result: homepage file exists and contains current public structure.

Key points:

- Title and metadata include GNK ASG, GNK DINAMO Ltd. and Nermin Sefic/Sefić.
- Visual page structure remains primarily corporate.
- Navigation currently links to existing sections and the public profile page.
- Hero section remains GNK ASG focused.

Technical note:

The personal name is already strong in metadata, but visually discreet on the page. If later desired, metadata can be adjusted to make the homepage even more corporate-first without changing design.

### Activation configuration

Result: public activation is disabled and system mode is locked preparation.

Decision: safe.

### Sitemap

Result: sitemap contains existing public pages and does not include new Insights article routes.

Decision: safe for draft preparation.

### PWA manifest

Result: manifest shortcuts point only to existing homepage sections:

- Intelligence Desk
- Market Monitor
- Business News

Decision: safe. No unfinished publication route is exposed through PWA shortcuts.

### Daily publication workflow

Result: no workflow found at the checked daily publication path.

Decision: safe. No automatic daily publication should run from that path.

## Remaining technical checks before public release

- Create first article as preview-only.
- Check article page in browser.
- Check mobile rendering.
- Check preview image.
- Check canonical URL.
- Check share preview.
- Check all links.
- Add to sitemap only after final approval.
- Add menu item only after article page is complete and approved.

## Recommendation

Do not change the homepage now. Prepare the first article package separately and review it before adding any public menu item or homepage card.
