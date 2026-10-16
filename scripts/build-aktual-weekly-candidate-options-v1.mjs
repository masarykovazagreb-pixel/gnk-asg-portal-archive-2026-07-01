#!/usr/bin/env node
// Builds an internal, source-linked shortlist for editorial review only.
// It never writes to apps/portal and never publishes a story or reuses source imagery.
import fs from 'node:fs';
import path from 'node:path';

const NEWS = 'apps/portal/data/news.json';
const CURATION = 'apps/portal/data/aktual-weekly-curation.json';
const CURRENT = 'apps/portal/data/aktual-weekly.json';
const OUT = 'reports/aktual-weekly-candidate-options.json';
const MAX_PER_SECTION = 3;
const MAX_AGE_DAYS = 14;

const heavy = /\b(war|ukraine|russia|attack|attacker|killed|dies|death|dead|rape|sexual assault|assault|murder|crime|criminal|cancer|disease|poison|poisoned|crisis|accident|injury|injured|hospital|funeral|ceasefire|shooting|bomb|flood|wildfire|lawsuit|trial|court|police|gambling|casino|prediction market|betting|derailment|homeless|abuse|neglect|missing person|missing people|fine|ban|sanction|recall|leak oil|poplava|poginuo|poginula|stravičn|nesreć|rat|ubojstvo|bolnica|ozlijeđen|ozlijeđena)\b/i;
const sections = [
  { id: 'zene-stil', label: 'Women & style', categories: ['fashion', 'lifestyle', 'women'], groups: ['lifestyle'], allow: /\b(women|woman|fashion|beauty|style|styling|designer|wardrobe|jewelry|jewellery|wellness)\b/i },
  { id: 'moda', label: 'Fashion', categories: ['fashion'], groups: ['fashion', 'lifestyle'], allow: /\b(fashion|designer|dress|clothing|runway|collection|jewelry|jewellery|shoes|wardrobe|denim|style|couture)\b/i },
  { id: 'ljubimci', label: 'Animals & nature', categories: ['pets', 'animals'], groups: ['ljubimci'], allow: /\b(pet|pets|dog|dogs|puppy|puppies|cat|cats|kitten|kittens|animal|wildlife|conservation|bird|birds)\b/i },
  { id: 'auto', label: 'Cars', categories: ['auto', 'automotive'], groups: ['auto'], allow: /\b(car|cars|automobile|vehicle|bmw|mercedes|audi|ferrari|porsche|tesla|toyota|suv|roadster|supercar|motoring)\b/i },
  { id: 'putovanja', label: 'Travel', categories: ['travel'], groups: ['turizam', 'travel'], allow: /\b(travel|tourism|destination|hotel|spa|island|city break|hiking|cycling|holiday|escape|road trip|beach|mountain|tourist|explor(?:e|ing))\b/i },
  { id: 'sport', label: 'Sport', categories: ['sport'], groups: ['sport'], allow: /\b(sport|football|soccer|boxing|basketball|tennis|athlete|champion|title|win|wins|victory|medal|stadium|olympic|race|cycling)\b/i },
  { id: 'hrana', label: 'Food & dining', categories: ['food', 'cuisine'], groups: ['food'], allow: /\b(food|recipe|restaurant|chef|cooking|cafe|wine|coffee|dessert|olive oil|gastronomy|vineyard|tasting|kitchen)\b/i },
  { id: 'kultura', label: 'Culture & arts', categories: ['culture', 'arts'], groups: ['kultura'], allow: /\b(culture|film|festival|art|artist|museum|exhibition|music|concert|theatre|theater|book|cinema|heritage|gallery|television|series)\b/i },
  { id: 'dobre-price', label: 'Good stories & discovery', categories: ['pets', 'animals', 'nature', 'travel', 'food', 'culture', 'arts', 'science', 'education'], groups: ['ljubimci', 'turizam', 'food', 'kultura', 'znanost'], allow: /\b(success|celebrate|celebrates|award|honou?r|record|beautiful|discover|discovery|therapy dog|rescue|restored|opens|opening|named among|world leader|good news|joy|community|wildlife photographer)\b/i },
];

function requireJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function normalized(value) {
  return String(value || '').trim().toLowerCase();
}
function isHttpsPublicUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
function textOf(item) {
  return [item.title, item.summary, item.category, item.group, item.source].map((value) => String(value || '')).join(' ');
}
function candidateSection(item, rule, text) {
  if (heavy.test(text) || !rule.allow.test(text)) return false;
  const category = normalized(item.category);
  const group = normalized(item.group);
  if (rule.id === 'dobre-price') {
    if (!rule.allow.test(String(item.title || ''))) return false;
    const lifestyleContext = rule.categories.includes(category) || rule.groups.includes(group);
    const excludedContext = /\b(politic|political|defense|military|army|pentagon|execution|executed|diplomacy|geopolitic|border conflict|ceasefire)\b/i.test(text);
    return lifestyleContext && !excludedContext;
  }
  if (rule.categories.includes(category) || rule.groups.includes(group)) return true;
  return false;
}

const sourceData = requireJson(NEWS);
const sourceItems = Array.isArray(sourceData) ? sourceData : sourceData.items || [];
const curation = requireJson(CURATION);
const current = requireJson(CURRENT);
const curatedUrls = new Set([
  ...(curation.items || []).map((item) => item.url),
  ...(current.sections || []).flatMap((section) => (section.items || []).map((item) => item.url)),
].filter(Boolean));
const validItems = sourceItems.filter((item) => item && item.title && item.source && item.url
  && item.verified !== false && isHttpsPublicUrl(item.url)
  && !curatedUrls.has(item.url)
  && !Number.isNaN(new Date(item.published_at || item.publishedAt || '').getTime()));
if (!validItems.length) throw new Error('No valid source-linked candidates are available.');

const latest = validItems.map((item) => new Date(item.published_at || item.publishedAt))
  .sort((a, b) => b - a)[0];
const windowStart = new Date(latest.getTime() - MAX_AGE_DAYS * 86400000);
const recent = validItems.filter((item) => new Date(item.published_at || item.publishedAt) >= windowStart);
const selected = [];
const selectedUrls = new Set();
const candidatesBySection = [];

for (const rule of sections) {
  const alreadyUsed = new Set();
  const matches = recent.filter((item) => !selectedUrls.has(item.url) && candidateSection(item, rule, textOf(item)))
    .sort((a, b) => new Date(b.published_at || b.publishedAt) - new Date(a.published_at || a.publishedAt));
  const choices = [];
  for (const item of matches) {
    const publisher = normalized(item.source);
    if (!publisher || alreadyUsed.has(publisher)) continue;
    alreadyUsed.add(publisher);
    selectedUrls.add(item.url);
    choices.push({
      title: String(item.title).trim(),
      source: String(item.source).trim(),
      category: String(item.category || '').trim(),
      published_at: item.published_at || item.publishedAt,
      url: item.url,
      review_status: 'candidate_not_approved',
      article_review_required: true,
      image_policy: 'Do not reuse the source image without documented rights; use a locally generated illustration otherwise.',
    });
    if (choices.length >= MAX_PER_SECTION) break;
  }
  if (choices.length) {
    candidatesBySection.push({ id: rule.id, label: rule.label, candidates: choices });
    selected.push(...choices);
  }
}

const sourceCount = new Set(selected.map((item) => item.source)).size;
const snapshotDay = latest.toISOString().slice(0, 10);
const reviewDocument = `reports/aktual-weekly-candidate-options-${snapshotDay}.md`;
const output = {
  version: 'AKTUAL_WEEKLY_CANDIDATE_OPTIONS_V1',
  issue_week: curation.issue_week,
  generated_from: NEWS,
  review_document: reviewDocument,
  source_snapshot_at: latest.toISOString(),
  selection_window: { from: windowStart.toISOString(), to: latest.toISOString(), max_age_days: MAX_AGE_DAYS },
  source_pool: {
    total_items: sourceItems.length,
    eligible_unselected_items: validItems.length,
    recent_unselected_items: recent.length,
    distinct_publishers: new Set(recent.map((item) => String(item.source || '').trim()).filter(Boolean)).size,
    distinct_categories: new Set(recent.map((item) => normalized(item.category)).filter(Boolean)).size,
    distinct_groups: new Set(recent.map((item) => normalized(item.group)).filter(Boolean)).size,
  },
  candidate_count: selected.length,
  distinct_candidate_publishers: sourceCount,
  publish_policy: 'Internal editorial shortlist only. Candidates are not approved, summarized for publication, or automatically posted.',
  image_policy: 'Use source imagery only with documented permission/license and attribution; otherwise generate an original local illustration.',
  coverage_gaps: sections.filter((rule) => !candidatesBySection.some((section) => section.id === rule.id))
    .map((rule) => ({ id: rule.id, label: rule.label, reason: 'No eligible, recent, unselected item matched the conservative feed filters.' })),
  sections: candidatesBySection,
};

const markdownEscape = (value) => String(value || '').replaceAll('[', '\\[').replaceAll(']', '\\]');
const markdown = [
  `# AKTUAL weekly — internal candidate options (${snapshotDay})`,
  '',
  `- Planned issue week: **${output.issue_week}**`,
  `- Feed snapshot: **${output.source_snapshot_at}**`,
  `- Pool: **${output.source_pool.total_items}** feed items, **${output.source_pool.distinct_publishers}** publishers, **${output.source_pool.distinct_categories}** categories, **${output.source_pool.distinct_groups}** groups.`,
  `- Shortlist: **${output.candidate_count}** candidates from **${sourceCount}** publishers.`,
  '',
  '> Internal shortlist only — not approved or published. Feed titles and links are discovery leads, not article-level verification. Read the full source, assess relevance/accuracy, then obtain editorial approval. Do not reuse a source image without documented permission/license and attribution; otherwise use an original generated illustration.',
  '',
  ...candidatesBySection.flatMap((section) => [
    `## ${section.label}`,
    '',
    ...section.candidates.map((item) => {
      const date = new Date(item.published_at).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
      return `- [${markdownEscape(item.title)}](${item.url}) — **${markdownEscape(item.source)}**, ${date}. Human review required.`;
    }),
    '',
  ]),
  ...(output.coverage_gaps.length ? [
    '## Current feed-coverage gaps',
    '',
    ...output.coverage_gaps.map((gap) => `- **${gap.label}:** ${gap.reason}`),
    '',
    'Do not compensate with unlicensed scraping or anonymous bulk posting. Add only documented public feeds or explicitly licensed sources after terms and rate limits are reviewed.',
    '',
  ] : []),
  'No source imagery, copied summaries, external publishing, or search-engine notifications are included in this shortlist.',
  '',
].join('\n');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(reviewDocument, markdown);
console.log(JSON.stringify({ output: OUT, review_document: reviewDocument, candidate_count: output.candidate_count, distinct_publishers: sourceCount, source_pool: output.source_pool }, null, 2));
