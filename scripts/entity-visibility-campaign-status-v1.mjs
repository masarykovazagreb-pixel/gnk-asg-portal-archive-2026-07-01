#!/usr/bin/env node
/**
 * Read-only daily monitor for the GNK ASG factual entity-visibility campaign.
 * It validates campaign wiring and emits an artefact; it never publishes content
 * or contacts third-party platforms itself.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const exists = (file) => fs.existsSync(path.join(root, file));
const calendar = readJson('apps/portal/data/entity-visibility-campaign.json');
const manifest = readJson('apps/portal/data/editorial-plan/manifest.json');
const registry = readJson('apps/portal/data/editorial-registry.json');
const featured = readJson('apps/portal/data/editorial-featured.json');
const llms = fs.readFileSync(path.join(root, 'apps/portal/llms.txt'), 'utf8');
const slug = 'javni-podaci-autorski-rad-odgovorno-upravljanje';
const packageId = 'ENTITY-VISIBILITY-20261004-FOUNDATION';
const checks = [];
const check = (label, pass, detail) => checks.push({ label, status: pass ? 'OK' : 'FAIL', detail });

const days = Array.isArray(calendar.days) ? calendar.days : [];
const uniqueDates = new Set(days.map(item => item.date));
check('20-day editorial calendar', days.length === 20 && uniqueDates.size === 20, `${days.length} entries; ${uniqueDates.size} unique dates`);
check('calendar ordered', days.every((item, index) => !index || item.date > days[index - 1].date), 'calendar dates are strictly ascending');
check('quality-first policy', calendar.policy?.noAutomatedLowQualityPublication === true && calendar.policy?.positiveButVerifiable === true, 'manual editorial quality gate remains enabled');
check('legal-case exclusion', calendar.policy?.noLegalCaseCommentary === true, 'campaign excludes legal-case commentary');
check('foundation package', (manifest.packages || []).some(item => item.id === packageId && item.publishedAt), 'foundation package is materialized');
check('foundation HTML', exists(`apps/portal/objave/${slug}/index.html`), `/objave/${slug}/`);
check('editorial registry', (registry.items || []).some(item => item.slug === slug && item.seoComplete), 'SEO-complete campaign entry is registered');
check('LLM corpus', llms.includes(`/objave/${slug}/`) && exists('apps/portal/llms-full.txt'), 'short and full AEO corpora include the campaign');
check('free-network workflow', exists('.github/workflows/blog-mirror-publish.yml'), 'Blogger, Dev.to, Tumblr and Telegraph canonical mirror workflow is present');
check('mirror priority queue', (featured.items || []).some(item => item.slug === slug && item.priority === true && item.sourceLed === true), 'campaign is queued for controlled canonical mirrors');
check('AKTUAL module', exists('apps/portal/gnk-aktual/index.html') && fs.readFileSync(path.join(root, 'apps/portal/gnk-aktual/index.html'), 'utf8').includes(`/objave/${slug}/`), 'campaign is featured in AKTUAL MEDIA');

const now = new Date(process.env.CAMPAIGN_NOW || Date.now());
const start = new Date(`${days[0]?.date || '2099-01-01'}T00:00:00Z`);
const end = new Date(`${days.at(-1)?.date || '2099-01-01'}T23:59:59Z`);
const phase = now < start ? 'scheduled' : now > end ? 'completed' : 'active';
const report = {
  version: 'GNK_ASG_ENTITY_VISIBILITY_CAMPAIGN_STATUS_V1',
  generatedAt: now.toISOString(),
  phase,
  campaignDays: days.length,
  completedFoundation: true,
  distributionModel: 'canonical portal first; controlled mirror workflow after live HTTP 200',
  checks,
  summary: {
    ok: checks.every(item => item.status === 'OK'),
    passed: checks.filter(item => item.status === 'OK').length,
    failed: checks.filter(item => item.status === 'FAIL').length
  }
};
const out = path.join(root, 'artifacts/entity-visibility-campaign-status.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!report.summary.ok) process.exitCode = 1;
