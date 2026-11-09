import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import worker, {newsroomGenerationGate, pickTopics, runDailyNewsroom, sentenceCount} from '../workers/gnk-asg-ai-newsroom-writer/src/index.js';
import {serveDynamicEditorialImage} from '../workers/gnk-asg-direct-operator/src/dynamic-editorial-image-v1.js';

const originalFetch = globalThis.fetch;
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});
const baseEnv = {
  NEWSROOM_DRAFT_GENERATION_ENABLED: 'true',
  NEWSROOM_CLOUDFLARE_AI_APPROVED: 'true',
  NEWSROOM_AUTOMATION_TOKEN: 'internal-test-service-token',
  NEWSROOM_TRIGGER_TOKEN: 'separate-trigger-token'
};
const sources = Array.from({length: 13}, (_, index) => ({
  title: `Publisher ${Math.floor(index / 3) + 1} source headline ${index + 1}`,
  summary: `This is a short public RSS synopsis for item ${index + 1}. It contains enough context for a source-linked editorial draft without retrieving the full article body or image.`,
  source: `Publisher ${Math.floor(index / 3) + 1}`,
  url: `https://publisher-${Math.floor(index / 3) + 1}.example/story/${index + 1}`,
  publishedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  group: index > 9 ? 'culture' : 'business',
  category: index > 9 ? 'entertainment' : 'business',
  image: `https://publisher-${Math.floor(index / 3) + 1}.example/copyrighted-photo.jpg`
}));
const tenSentences = Array.from({length: 10}, (_, index) => `This is a fact-grounded editorial sentence ${index + 1} for a controlled test.`).join(' ');

try {
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls += 1; throw new Error('network must not run while gates are closed'); };
  const disabled = await runDailyNewsroom({});
  assert.equal(disabled.ok, false);
  assert.equal(disabled.reason, 'draft_generation_disabled');
  assert.equal(disabled.published, 0);
  assert.equal(disabled.externalComments, 0);
  assert.equal(networkCalls, 0, 'closed default gates must make no network calls');
  assert.equal(newsroomGenerationGate({NEWSROOM_DRAFT_GENERATION_ENABLED: 'true'}).reason, 'third_party_ai_approval_required');

  const locked = await worker.fetch(new Request('https://writer.example/trigger', {method: 'POST'}), {});
  assert.equal(locked.status, 423, 'manual trigger must fail closed while generation is disabled');
  assert.equal(networkCalls, 0);
  const status = await worker.fetch(new Request('https://writer.example/'), {});
  const statusBody = await status.json();
  assert.equal(statusBody.mode, 'draft-only');
  assert.equal(statusBody.externalComments, false);

  const noTriggerCredential = await worker.fetch(new Request('https://writer.example/trigger', {method: 'POST'}), {
    NEWSROOM_DRAFT_GENERATION_ENABLED: 'true',
    NEWSROOM_CLOUDFLARE_AI_APPROVED: 'true'
  });
  assert.equal(noTriggerCredential.status, 503, 'manual trigger requires a separate secret from the enqueue token');
  assert.equal(networkCalls, 0);

  let sourceCalls = 0;
  let aiCalls = 0;
  const enqueued = [];
  const aiHeaders = [];
  const serviceHeaders = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    networkCalls += 1;
    if (url === 'https://gnk-asg.hr/api/news-auto-publication/list') {
      serviceHeaders.push(init.headers || {});
      return jsonResponse({ok: true, posts: []});
    }
    if (url === 'https://gnk-asg.hr/api/public-news-feed') {
      sourceCalls += 1;
      return jsonResponse(sources);
    }
    if (url === 'https://gnk-asg.hr/api/ai-assist') {
      aiCalls += 1;
      aiHeaders.push(init.headers || {});
      const requestBody = JSON.parse(init.body);
      return jsonResponse({
        ok: true,
        ai: true,
        provider: 'cloudflare-workers-ai',
        model: 'unit-test-model',
        text: `NASLOV: Evidence before action ${aiCalls}\nTEKST: ${tenSentences}`
      });
    }
    if (url === 'https://gnk-asg.hr/api/news-auto-publication/enqueue') {
      assert.equal(init.headers?.authorization, 'Bearer internal-test-service-token', 'draft enqueue must use the dedicated service token');
      const payload = JSON.parse(init.body);
      enqueued.push(payload);
      return jsonResponse({ok: true, post: {status: 'manual_review'}});
    }
    throw new Error(`unexpected_network_target_${url}`);
  };

  const prepared = await runDailyNewsroom(baseEnv);
  assert.equal(prepared.ok, true, JSON.stringify(prepared.errors));
  assert.equal(prepared.mode, 'draft-only');
  assert.equal(prepared.prepared, 13);
  assert.equal(prepared.news, 10);
  assert.equal(prepared.commentaries, 3);
  assert.equal(prepared.manualReview, 13);
  assert.equal(prepared.queued, 0);
  assert.equal(prepared.published, 0);
  assert.equal(prepared.externalComments, 0);
  assert.equal(sourceCalls, 1);
  assert.equal(aiCalls, 13);
  assert.ok(serviceHeaders.length === 1 && serviceHeaders[0].authorization === 'Bearer internal-test-service-token', 'the review-queue preflight must use the internal service credential');
  assert.ok(aiHeaders.every(headers => (headers['content-type'] || headers['Content-Type'])?.toLowerCase() === 'application/json' && !headers.authorization && !headers.Authorization), 'AI-assist requests must use JSON content type and never receive the downstream queue token');
  assert.equal(enqueued.length, 13);
  assert.ok(enqueued.every(item => item.sourceClass === 'external-publisher-link'));
  assert.ok(enqueued.every(item => item.sourceUrl.startsWith('https://publisher-')));
  assert.ok(enqueued.every(item => item.imageUrl.startsWith('/assets/editorial/generated/')));
  assert.ok(enqueued.every(item => item.imageCredit.includes('izvorna generirana urednička ilustracija')));
  assert.ok(enqueued.every(item => item.aiGovernance.usedAI === true && item.aiGovernance.humanEditorialReview === null));
  assert.ok(enqueued.every(item => item.aiGovernance.prohibitedUse === null && item.aiGovernance.prohibitedUseScreenPassed === false));
  assert.ok(enqueued.every(item => item.aiGovernance.riskClassification === 'unassessed-pending-human-review'));
  assert.ok(enqueued.every(item => item.aiGovernance.disclosure.visible === true));
  assert.ok(enqueued.every(item => item.aiGovernance.privacyAndRightsReviewed === false));
  assert.ok(enqueued.every(item => item.content.startsWith('AI-potpomognuti urednički nacrt')));
  assert.ok(enqueued.every(item => !Object.hasOwn(item, 'author')),'the writer must not claim a personal byline');
  assert.ok(enqueued.every(item => !Object.hasOwn(item, 'sourceImageUrl')),'source images must never be reused');
  assert.equal(enqueued.filter(item => item.category === 'commentary').length, 3);
  assert.ok(enqueued.filter(item => item.category === 'commentary').every(item => sentenceCount(item.content.split('\n\n')[1]) === 10));
  const generatedImage = serveDynamicEditorialImage(new Request(`https://gnk-asg.hr${enqueued[0].imageUrl}`));
  assert.equal(generatedImage.status, 200);
  assert.match(generatedImage.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(await generatedImage.text(), /GNK ASG NEWSROOM/);
  assert.equal(serveDynamicEditorialImage(new Request('https://gnk-asg.hr/assets/editorial/generated/../../secret.svg')), null);
  assert.ok(enqueued.every(item => item.batchSize === 13));
  assert.equal(new Set(enqueued.map(item => item.sourceName)).size, 5, 'daily batch should use a diverse source set');

  const notEnoughSources = sources.slice(0, 8);
  globalThis.fetch = async input => {
    if (String(input) === 'https://gnk-asg.hr/api/public-news-feed') return jsonResponse(notEnoughSources);
    throw new Error('AI and enqueue must not run when there are not enough sources');
  };
  await assert.rejects(() => pickTopics(), /insufficient_safe_topics_8_of_13/);
  const staleSources = sources.map(item => ({...item, publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()}));
  globalThis.fetch = async input => {
    if (String(input) === 'https://gnk-asg.hr/api/public-news-feed') return jsonResponse(staleSources);
    throw new Error('AI and enqueue must not run for stale sources');
  };
  await assert.rejects(() => pickTopics(), /insufficient_safe_topics_0_of_13/);

  let backlogFeedCalls = 0;
  globalThis.fetch = async input => {
    if (String(input) === 'https://gnk-asg.hr/api/news-auto-publication/list') {
      return jsonResponse({ok: true, posts: Array.from({length: 13}, () => ({status: 'manual_review'}))});
    }
    if (String(input) === 'https://gnk-asg.hr/api/public-news-feed') backlogFeedCalls += 1;
    throw new Error('a full human-review queue must stop generation before source/model calls');
  };
  const backlog = await runDailyNewsroom(baseEnv);
  assert.equal(backlog.ok, false);
  assert.equal(backlog.pendingReview, 13);
  assert.equal(backlogFeedCalls, 0);
  assert.ok(backlog.errors.some(item => String(item.error).includes('manual_review_backlog_limit')));

  let fallbackEnqueues = 0;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url === 'https://gnk-asg.hr/api/news-auto-publication/list') return jsonResponse({ok: true, posts: []});
    if (url === 'https://gnk-asg.hr/api/public-news-feed') return jsonResponse(sources);
    if (url === 'https://gnk-asg.hr/api/ai-assist') return jsonResponse({ok: true, ai: false, fallback: true, text: tenSentences});
    if (url === 'https://gnk-asg.hr/api/news-auto-publication/enqueue') fallbackEnqueues += 1;
    throw new Error(`unexpected_network_target_${url}`);
  };
  const fallbackResult = await runDailyNewsroom(baseEnv);
  assert.equal(fallbackResult.ok, false);
  assert.equal(fallbackEnqueues, 0, 'AI fallback output must not be enqueued');
  assert.equal(fallbackResult.published, 0);

  const wrangler = fs.readFileSync('workers/gnk-asg-ai-newsroom-writer/wrangler.toml', 'utf8');
  assert.match(wrangler, /workers_dev = false/);
  assert.match(wrangler, /NEWSROOM_DRAFT_GENERATION_ENABLED = "false"/);
  assert.match(wrangler, /NEWSROOM_CLOUDFLARE_AI_APPROVED = "false"/);
  const reviewPage = fs.readFileSync('apps/portal/admin-center/news-publication/index.html', 'utf8');
  assert.match(reviewPage, /samo pregled nacrta/i);
  assert.match(reviewPage, /safeHttps/);
  assert.match(reviewPage, /safeLocalImage/);
  assert.doesNotMatch(reviewPage, /news-auto-publication\/publish-allowed/);
  assert.match(reviewPage, /Nerminu Sefiću bez potvrđenog autorstva/);
  for (const match of reviewPage.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (match[1].trim()) new vm.Script(match[1]);
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'draft-only',
    closedGateNetworkCalls: 0,
    preparedBatch: 13,
    manualReview: 13,
    published: 0,
    externalComments: 0,
    sourceImageReuse: false,
    thirdPartyAiDefault: 'disabled'
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
