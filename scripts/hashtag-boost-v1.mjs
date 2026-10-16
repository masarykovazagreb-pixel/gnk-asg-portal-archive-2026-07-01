// Deprecated compatibility command.
// Hashtags stay in the editorial registry for approved social distribution; they
// are not injected into article bodies or used as SEO keywords.
import fs from 'node:fs';

const registry = JSON.parse(fs.readFileSync('apps/portal/data/editorial-registry.json', 'utf8'));
const itemsWithSocialTags = (registry.items || []).filter((item) => Array.isArray(item.hashtags) && item.hashtags.length).length;
console.log(JSON.stringify({
  version: 'GNK_SOCIAL_HASHTAGS_NO_BODY_INJECTION_V1',
  mode: 'read-only',
  itemsWithSocialTags,
  pageWrites: 0,
  policy: 'hashtags-are-social-distribution-data-only',
}, null, 2));
