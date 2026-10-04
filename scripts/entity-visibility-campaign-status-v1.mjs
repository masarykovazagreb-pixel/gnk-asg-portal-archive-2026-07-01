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
const reporting = readJson('apps/portal/data/entity-visibility-campaign-reporting.json');
const mediaAnalysisQueue = readJson('apps/portal/data/media-analysis-review-queue.json');
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
const dailyContentOk = days.every(item => item.image && item.imageAlt && Array.isArray(item.hashtags) && item.hashtags.length >= 6 && item.sourceRequirement && Array.isArray(item.requiredQuality) && item.requiredQuality.includes('attributed image metadata') && item.publicBrief?.visible === true && item.sourceLedger?.state && item.publicationControl?.state && Array.isArray(item.orchestrationLaneIds));
check('daily source-and-image brief contract', dailyContentOk, 'each daily brief has a contextual image, hashtags, source requirement, transparent source/publication state and image metadata gate');
const lanes = Array.isArray(calendar.orchestration?.lanes) ? calendar.orchestration.lanes : [];
const expectedLaneIds = ['source-ledger', 'editorial-quality', 'metadata-discovery', 'visual-accessibility', 'canonical-distribution'];
const cadence = calendar.orchestration?.dailyQualityCadence;
const expectedQualitySignals = ['source-and-date-context', 'claim-boundary-review', 'author-and-editor-attribution', 'canonical-url', 'title-and-meta-description', 'structured-data', 'internal-linking', 'image-alt-and-credit', 'accessibility-and-contrast', 'distribution-readiness'];
const orchestrationOk = calendar.orchestration?.humanApprovalRequired === true
  && calendar.orchestration?.leadId === 'EDITOR-NERMIN-SEFIC-001'
  && calendar.orchestration?.semantics?.includes('not runtime evidence')
  && cadence?.requiredSignalsPerDay === 10
  && expectedQualitySignals.every(signal => cadence?.actions?.includes(signal))
  && expectedLaneIds.every(id => lanes.some(lane => lane.id === id))
  && days.every(item => expectedLaneIds.every(id => item.orchestrationLaneIds?.includes(id)) && item.dailyQualityCadence?.requiredSignals === 10 && item.dailyQualityCadence?.autonomousPosting === false && expectedQualitySignals.every(signal => item.dailyQualityCadence?.actionIds?.includes(signal)));
check('orchestrated human-led workflow', orchestrationOk, `${lanes.length} declared lanes and ten daily quality signals retain human approval and label modeled support as non-runtime evidence`);
const dailyReports = Array.isArray(reporting.dailyReports) ? reporting.dailyReports : [];
const reportingOk = reporting.editorialLeadId === 'EDITOR-NERMIN-SEFIC-001'
  && reporting.summary?.scheduledDailyBriefs === 30
  && reporting.summary?.publishedFoundation === 1
  && reporting.summary?.editorialBriefsAwaitingHumanSourceReview === 29
  && reporting.summary?.autonomousFullPublications === 0
  && reporting.summary?.requiredQualitySignals === 300
  && dailyReports.length === days.length
  && dailyReports.every((report, index) => report.date === days[index]?.date && report.publicDesk?.visible === true && report.sourceLedger?.state && report.publicationControl?.state && report.dailyQualityCadence?.requiredSignals === 10 && report.dailyQualityCadence?.autonomousPosting === false);
check('daily oversight reports', reportingOk, `${dailyReports.length} planned oversight records distinguish the published foundation from briefs awaiting human source review`);
const mediaSourceDesks = Array.isArray(mediaAnalysisQueue.sourceDesks) ? mediaAnalysisQueue.sourceDesks : [];
const expectedPublishers = ['Jutarnji list', 'Večernji list', 'Poslovni dnevnik', 'Index', 'Lider', 'Novosti'];
const mediaAnalysisOk = mediaAnalysisQueue.editorialLead?.id === 'EDITOR-NERMIN-SEFIC-001'
  && mediaAnalysisQueue.policy?.sourceUrlRequired === true
  && mediaAnalysisQueue.policy?.humanApprovalRequired === true
  && mediaAnalysisQueue.policy?.fullTextStorage === false
  && mediaAnalysisQueue.policy?.autonomousPublication === false
  && mediaAnalysisQueue.policy?.externalCommentsOrPosting === 'prohibited-without-account-owner-authorization'
  && mediaAnalysisQueue.modeledWorkforce?.totalProfilesAssignedAcrossDesks === 1573
  && mediaAnalysisQueue.queue?.length === 0
  && mediaSourceDesks.length === expectedPublishers.length
  && expectedPublishers.every((publisher, index) => mediaSourceDesks[index]?.publisher === publisher && mediaSourceDesks[index]?.modeledWorkerCohort && mediaSourceDesks[index]?.externalActions === 'forbidden-without-account-owner-authorization');
check('external media analysis desks', mediaAnalysisOk, `${mediaSourceDesks.length} source-linked review desks cover the requested publishers without external comments, copying, or autonomous publication`);
check('foundation package', (manifest.packages || []).some(item => item.id === packageId && item.publishedAt), 'foundation package is materialized');
check('foundation HTML', exists(`apps/portal/objave/${slug}/index.html`), `/objave/${slug}/`);
check('editorial registry', (registry.items || []).some(item => item.slug === slug && item.seoComplete), 'SEO-complete campaign entry is registered');
check('LLM corpus', llms.includes(`/objave/${slug}/`) && exists('apps/portal/llms-full.txt'), 'short and full AEO corpora include the campaign');
check('free-network workflow', exists('.github/workflows/blog-mirror-publish.yml'), 'Blogger, Dev.to, Tumblr and Telegraph canonical mirror workflow is present');
check('mirror priority queue', (featured.items || []).some(item => item.slug === slug && item.priority === true && item.sourceLed === true), 'campaign is queued for controlled canonical mirrors');
check('AKTUAL module', exists('apps/portal/gnk-aktual/index.html') && fs.readFileSync(path.join(root, 'apps/portal/gnk-aktual/index.html'), 'utf8').includes(`/objave/${slug}/`), 'campaign is featured in AKTUAL MEDIA');
const aktualHr = fs.readFileSync(path.join(root, 'apps/portal/gnk-aktual/index.html'), 'utf8');
const aktualEn = fs.readFileSync(path.join(root, 'apps/portal/en/gnk-aktual/index.html'), 'utf8');
check('AKTUAL daily desk', exists('apps/portal/assets/entity-visibility-campaign-desk-v1.js') && aktualHr.includes('entityVisibilityCampaignDesk') && aktualEn.includes('entityVisibilityCampaignDesk') && aktualHr.includes('data-campaign-governance') && aktualEn.includes('data-campaign-governance'), 'daily campaign desk and human-led governance status are present in HR and EN AKTUAL Media');
check('AKTUAL external-media desk', exists('apps/portal/assets/media-analysis-desk-v1.js') && aktualHr.includes('mediaAnalysisDesk') && aktualEn.includes('mediaAnalysisDesk') && aktualHr.includes('Nema automatskih komentara na tuđim stranicama') && aktualEn.includes('no automated comments on publisher sites'), 'AKTUAL exposes source-linked media-analysis intake with an explicit no-external-comments boundary');
const aktualSeoOk = ['Nermin Sefić', 'GNK ASG', 'GNK DINAMO Ltd.', 'Fina Info.BIZ', 'revizorsko izvješće', 'Poslovni dnevnik', 'Jutarnji list', 'Večernji list', 'Index', 'Novosti', 'NK Sesvete'].every(term => aktualHr.includes(term))
  && aktualHr.includes('Cibona — uredničko sportsko izvještavanje')
  && aktualEn.includes('Cibona — editorial sports reporting')
  && !aktualHr.includes('Cibona kutak')
  && !aktualEn.includes('the Cibona corner');
check('AKTUAL entity SEO and editorial boundary', aktualSeoOk, 'HR/EN metadata cover requested discoverability entities while sports coverage is labelled editorial reporting only');
const workforcePublic = fs.readFileSync(path.join(root, 'workers/gnk-asg-direct-operator/src/digital-workforce-public-read-v1.js'), 'utf8');
const workforceSuite = fs.readFileSync(path.join(root, 'workers/gnk-asg-direct-operator/src/digital-workforce-suite-v1.js'), 'utf8');
check('workforce orchestration contract', workforcePublic.includes('CAMPAIGN_ORCHESTRATION') && workforceSuite.includes('CAMPAIGN_ORCHESTRATION'), 'public Workforce read and suite surfaces expose the same human-led campaign workflow model');

const now = new Date(process.env.CAMPAIGN_NOW || Date.now());
const start = new Date(`${days[0]?.date || '2099-01-01'}T00:00:00Z`);
const end = new Date(`${days.at(-1)?.date || '2099-01-01'}T23:59:59Z`);
const phase = now < start ? 'scheduled' : now > end ? 'completed' : 'active';
const zagrebDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const activeDailyBrief = days.find(item => item.date === zagrebDay) || days.find(item => item.date > zagrebDay) || days.at(-1) || null;
const report = {
  version: 'GNK_ASG_ENTITY_VISIBILITY_CAMPAIGN_STATUS_V3_30_DAY_ORCHESTRATED_EDITORIAL_LED',
  generatedAt: now.toISOString(),
  phase,
  campaignDays: days.length,
  activeDailyBrief: activeDailyBrief ? { day: activeDailyBrief.day, date: activeDailyBrief.date, title: activeDailyBrief.title, status: activeDailyBrief.status, fullPublicationRequiresEditorialApproval: activeDailyBrief.status !== 'published-foundation' } : null,
  completedFoundation: true,
  orchestration: { lanes: lanes.map(lane => ({ id: lane.id, mode: lane.mode, owner: lane.owner })), humanApprovalRequired: calendar.orchestration?.humanApprovalRequired === true, runtimeEvidence: false },
  reporting: reporting.summary,
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
