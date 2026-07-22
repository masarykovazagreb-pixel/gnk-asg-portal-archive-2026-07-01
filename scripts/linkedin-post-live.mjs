/**
 * Real LinkedIn posting script — NOT YET ACTIVE.
 *
 * Requires two GitHub Actions secrets to be set before this can run:
 *   LINKEDIN_ACCESS_TOKEN  — OAuth 2.0 access token with the w_organization_social scope,
 *                            obtained after LinkedIn approves the Community Management API
 *                            application (Development tier, then Standard tier) for the
 *                            registered GNK ASG d.o.o. LinkedIn Developer App.
 *   LINKEDIN_ORG_URN       — the organization URN for the GNK ASG / GNK DINAMO Ltd. company
 *                            page, e.g. "urn:li:organization:12345678".
 *
 * Until both secrets exist, this script exits early and does nothing destructive.
 * See apps/portal/data/linkedin-content/rotation-v1.json for the content rotation,
 * and scripts/linkedin-daily-rotation.mjs for how "today's post" is picked.
 *
 * Reference: LinkedIn Posts API, POST https://api.linkedin.com/rest/posts
 * Required headers: Authorization: Bearer <token>, LinkedIn-Version: <YYYYMM>,
 * X-Restli-Protocol-Version: 2.0.0, Content-Type: application/json
 */
import fs from 'node:fs';
import path from 'node:path';

const QUEUE_FILE = path.resolve('apps/portal/data/linkedin-content/today.json');
const LINKEDIN_VERSION = '202506';

async function main() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgUrn = process.env.LINKEDIN_ORG_URN;

  if (!token || !orgUrn) {
    console.log(JSON.stringify({
      ok: false,
      skipped: true,
      reason: 'LinkedIn API credentials not configured yet (LINKEDIN_ACCESS_TOKEN / LINKEDIN_ORG_URN missing). No post was attempted.',
    }, null, 2));
    return;
  }

  if (!fs.existsSync(QUEUE_FILE)) {
    throw new Error('today.json not found — run scripts/linkedin-daily-rotation.mjs first');
  }
  const queued = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));

  const payload = {
    author: orgUrn,
    commentary: queued.postText,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': LINKEDIN_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(payload),
  });

  const postIdHeader = response.headers.get('x-restli-id');
  const bodyText = await response.text();

  if (!response.ok) {
    console.error(JSON.stringify({ ok: false, status: response.status, body: bodyText }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({
    ok: true,
    postId: postIdHeader,
    projectId: queued.projectId,
    postedAt: new Date().toISOString(),
  }, null, 2));
}

await main();
