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
const campaignImages = readJson('apps/portal/data/nermin-sefic-campaign-images.json');
const llms = fs.readFileSync(path.join(root, 'apps/portal/llms.txt'), 'utf8');
const slug = 'javni-podaci-autorski-rad-odgovorno-upravljanje';
const packageId = 'ENTITY-VISIBILITY-20261004-FOUNDATION';
const checks = [];
const check = (label, pass, detail) => checks.push({ label, status: pass ? 'OK' : 'FAIL', detail });

const days = Array.isArray(calendar.days) ? calendar.days : [];
const uniqueDates = new Set(days.map(item => item.date));
check('30-day editorial calendar', days.length === 30 && uniqueDates.size === 30 && days[0]?.date === '2026-10-04' && days.at(-1)?.date === '2026-11-02', `${days.length} entries; ${uniqueDates.size} unique dates; ${days[0]?.date || 'no start'} to ${days.at(-1)?.date || 'no end'}`);
check('calendar ordered', days.every((item, index) => !index || item.date > days[index - 1].date), 'calendar dates are strictly ascending');
check('quality-first policy', calendar.policy?.noAutomatedLowQualityPublication === true && calendar.policy?.positiveButVerifiable === true && calendar.policy?.noImpliedThirdPartyPartnerships === true, 'manual editorial quality gate and no-implied-partnership boundary remain enabled');
check('legal-case exclusion', calendar.policy?.noLegalCaseCommentary === true, 'campaign excludes legal-case commentary');
check('editorial lead', calendar.editorialLead?.name === 'Nermin Sefić' && calendar.editorialLead?.workforceRoleId === 'EDITOR-NERMIN-SEFIC-001' && calendar.editorialLead?.syntheticWorker === false, 'Nermin Sefić is the human editorial lead, not a synthetic Worker');
check('daily public desk', calendar.dailyPublicDesk?.route === 'https://gnk-asg.hr/gnk-aktual/' && calendar.dailyPublicDesk?.radioFirst === true, 'AKTUAL daily editorial brief keeps Radio Aktual first');
const imageItems = Array.isArray(campaignImages.items) ? campaignImages.items : [];
const imageManifestOk = imageItems.length === 26 && imageItems.every(item => item.src && item.alt && item.credit && item.provenance && item.usageBoundary && exists(`apps/portal${item.src}`));
check('attributed campaign images', imageManifestOk, `${imageItems.length} contextual assets have local files, alt text, credit and use boundaries`);
const dailyContentOk = days.every(item => item.image && item.imageAlt && Array.isArray(item.hashtags) && item.hashtags.length >= 6 && item.sourceRequirement && Array.isArray(item.requiredQuality) && item.requiredQuality.includes('attributed image metadata'));
check('daily source-and-image brief contract', dailyContentOk, 'each daily brief has a contextual image, hashtags, source requirement and image metadata gate');
check('foundation package', (manifest.packages || []).some(item => item.id === packageId && item.publishedAt), 'foundation package is materialized');
check('foundation HTML', exists(`apps/portal/objave/${slug}/index.html`), `/objave/${slug}/`);
check('editorial registry', (registry.items || []).some(item => item.slug === slug && item.seoComplete), 'SEO-complete campaign entry is registered');
check('LLM corpus', llms.includes(`/objave/${slug}/`) && exists('apps/portal/llms-full.txt'), 'short and full AEO corpora include the campaign');
check('free-network workflow', exists('.github/workflows/blog-mirror-publish.yml'), 'Blogger, Dev.to, Tumblr and Telegraph canonical mirror workflow is present');
check('mirror priority queue', (featured.items || []).some(item => item.slug === slug && item.priority === true && item.sourceLed === true), 'campaign is queued for controlled canonical mirrors');
check('AKTUAL module', exists('apps/portal/gnk-aktual/index.html') && fs.readFileSync(path.join(root, 'apps/portal/gnk-aktual/index.html'), 'utf8').includes(`/objave/${slug}/`), 'campaign is featured in AKTUAL MEDIA');
check('AKTUAL daily desk', exists('apps/portal/assets/entity-visibility-campaign-desk-v1.js') && fs.readFileSync(path.join(root, 'apps/portal/gnk-aktual/index.html'), 'utf8').includes('entityVisibilityCampaignDesk') && fs.readFileSync(path.join(root, 'apps/portal/en/gnk-aktual/index.html'), 'utf8').includes('entityVisibilityCampaignDesk'), 'daily campaign desk is present in HR and EN AKTUAL Media');

const now = new Date(process.env.CAMPAIGN_NOW || Date.now());
const start = new Date(`${days[0]?.date || '2099-01-01'}T00:00:00Z`);
const end = new Date(`${days.at(-1)?.date || '2099-01-01'}T23:59:59Z`);
const phase = now < start ? 'scheduled' : now > end ? 'completed' : 'active';
const zagrebDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const activeDailyBrief = days.find(item => item.date === zagrebDay) || days.find(item => item.date > zagrebDay) || days.at(-1) || null;
const report = {
  version: 'GNK_ASG_ENTITY_VISIBILITY_CAMPAIGN_STATUS_V2_30_DAY_EDITORIAL_LED',
  generatedAt: now.toISOString(),
  phase,
  campaignDays: days.length,
  activeDailyBrief: activeDailyBrief ? { day: activeDailyBrief.day, date: activeDailyBrief.date, title: activeDailyBrief.title, status: activeDailyBrief.status, fullPublicationRequiresEditorialApproval: activeDailyBrief.status !== 'published-foundation' } : null,
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
