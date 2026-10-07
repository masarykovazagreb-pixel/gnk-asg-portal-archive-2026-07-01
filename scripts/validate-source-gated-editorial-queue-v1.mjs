import fs from 'node:fs';

const FILE = process.env.SOURCE_GATED_QUEUE || 'apps/portal/data/editorial-plan/20261005-20261103-source-gated-300.json';
const EXPECTED_SCHEMA = 'gnk-asg-source-gated-editorial-queue/v1';
const HUMAN_GATE = 'Nermin Sefić';
const ALLOWED = new Set(['draft','source-review','approved-for-own-site','published']);
const SOURCE_REQUIRED = ['source_url','publisher','source_title','source_date','attribution','original_link'];
const TYPE_MIN_WORDS = { komentar: 300, objava: 500, analiza: 1500 };
const errors = [];

const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
const words = value => (String(value || '').match(/\p{L}[\p{L}\p{N}’'\-]*/gu) || []).length;
const validDate = value => nonEmpty(value) && !Number.isNaN(new Date(value).getTime());
const validHttps = value => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

if (!fs.existsSync(FILE)) throw new Error('Missing source-gated queue: ' + FILE);
const queue = JSON.parse(fs.readFileSync(FILE,'utf8'));

if (queue.schema !== EXPECTED_SCHEMA) errors.push('unexpected schema: ' + queue.schema);
if (!Array.isArray(queue.items)) errors.push('items must be an array');
if (!queue.period || queue.period.total !== 300 || queue.period.days !== 30) errors.push('period contract must be 30 days / 300 items');
if (!queue.governance?.own_site_only) errors.push('governance.own_site_only must be true');
if (queue.governance?.human_editorial_gate !== HUMAN_GATE) errors.push('human editorial gate must remain ' + HUMAN_GATE);
if (queue.governance?.no_scraping !== true || queue.governance?.no_full_text_copy !== true) errors.push('no-scraping/no-full-text-copy governance must remain enabled');
if (queue.governance?.no_external_media_platform_comments !== true) errors.push('external media platform comments must remain prohibited');

const ids = new Set();
const byStatus = {};
const byType = {};
const byDate = {};
let sourcePacketsComplete = 0;
let sourcePacketsMissing = 0;
let approvedReady = 0;
let published = 0;

function validatePublication(item) {
  const pub = item.publication;
  if (!pub || typeof pub !== 'object') {
    errors.push(item.id + ': approved/published item lacks publication object');
    return false;
  }
  let ok = true;
  for (const key of ['type','slug','title','section','description','seoTitle','summary','author','image','publishAt']) {
    if (!nonEmpty(pub[key])) { errors.push(item.id + ': publication.' + key + ' missing'); ok = false; }
  }
  if (!['komentar','objava','analiza'].includes(pub.type)) { errors.push(item.id + ': publication.type invalid'); ok = false; }
  if (pub.author !== HUMAN_GATE) { errors.push(item.id + ': publication.author must be ' + HUMAN_GATE); ok = false; }
  if (!validDate(pub.publishAt)) { errors.push(item.id + ': publication.publishAt invalid'); ok = false; }
  if (!Array.isArray(pub.paragraphs) || pub.paragraphs.length < 3) { errors.push(item.id + ': publication.paragraphs must contain at least 3 paragraphs'); ok = false; }
  const count = words((pub.paragraphs || []).join(' '));
  const min = TYPE_MIN_WORDS[pub.type] || 3000;
  if (count < min) { errors.push(item.id + ': publication body has ' + count + ' words; minimum ' + min); ok = false; }
  const links = [...new Set(Array.isArray(pub.links) ? pub.links : [])];
  if (links.length < 5 || links.some(link => typeof link !== 'string' || !link.startsWith('/'))) {
    errors.push(item.id + ': publication requires at least 5 unique internal links');
    ok = false;
  }
  if (!Array.isArray(pub.keywords) || pub.keywords.length < 3) { errors.push(item.id + ': publication requires at least 3 keywords'); ok = false; }
  if (!/^[-a-z0-9]+$/.test(String(pub.slug || ''))) { errors.push(item.id + ': publication.slug invalid'); ok = false; }
  return ok;
}

function validateApproval(item) {
  const a = item.approval;
  if (!a || a.approved_by !== HUMAN_GATE || a.scope !== 'own-site' || !validDate(a.approved_at)) {
    errors.push(item.id + ': explicit Nermin Sefić own-site approval is required');
    return false;
  }
  return true;
}

function inspectSourcePacket(item) {
  const gate = item.source_gate;
  if (!gate || gate.source_packet_required !== true) {
    errors.push(item.id + ': source_gate/source_packet_required missing');
    return { complete:false, partial:false };
  }
  const stringValues = SOURCE_REQUIRED.map(key => gate[key]);
  const facts = Array.isArray(gate.verified_facts) ? gate.verified_facts.filter(nonEmpty) : [];
  const hasAny = stringValues.some(nonEmpty) || facts.length > 0 || Array.isArray(gate.source_hashtags);
  const completeStrings = SOURCE_REQUIRED.every(key => nonEmpty(gate[key]));
  const complete = completeStrings && facts.length > 0 && Array.isArray(gate.source_hashtags)
    && validHttps(gate.source_url) && validHttps(gate.original_link);
  if (hasAny && !complete) errors.push(item.id + ': partially populated source packet must be completed or cleared');
  if (complete) {
    if (!item.fact_comment_separation || !nonEmpty(item.fact_comment_separation.facts) || !nonEmpty(item.fact_comment_separation.commentary)) {
      errors.push(item.id + ': complete source packet requires fact/comment separation');
    }
    if (gate.source_hashtags.some(tag => typeof tag !== 'string' || !tag.startsWith('#'))) {
      errors.push(item.id + ': source hashtags must be literal hashtags from the source packet');
    }
  }
  return { complete, partial:hasAny && !complete };
}

for (const item of queue.items || []) {
  if (!item || !nonEmpty(item.id)) { errors.push('queue item without id'); continue; }
  if (ids.has(item.id)) errors.push('duplicate id: ' + item.id);
  ids.add(item.id);
  if (!ALLOWED.has(item.status)) errors.push(item.id + ': invalid status ' + item.status);
  byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  byType[item.type] = (byType[item.type] || 0) + 1;
  byDate[item.date] = (byDate[item.date] || 0) + 1;
  if (item.editorial_gate !== HUMAN_GATE) errors.push(item.id + ': editorial_gate must remain ' + HUMAN_GATE);

  if (Array.isArray(item.editorial_hashtags) && item.editorial_hashtags.some(tag => typeof tag !== 'string' || !tag.startsWith('#'))) {
    errors.push(item.id + ': editorial_hashtags must contain literal hashtags');
  }

  let packet = null;
  if (item.type === 'source-linked-media-commentary') {
    packet = inspectSourcePacket(item);
    if (packet.complete) sourcePacketsComplete++;
    else sourcePacketsMissing++;
  }

  if (item.status === 'approved-for-own-site' || item.status === 'published') {
    const approvalOk = validateApproval(item);
    const publicationOk = validatePublication(item);
    const sourceOk = item.type !== 'source-linked-media-commentary' || packet?.complete;
    if (approvalOk && publicationOk && sourceOk) approvedReady++;
  }
  if (item.status === 'published') {
    published++;
    if (!nonEmpty(item.public_url) || !validDate(item.published_at)) {
      errors.push(item.id + ': published status requires public_url and published_at');
    }
  }
}

if (ids.size !== 300) errors.push('queue must contain exactly 300 unique items; got ' + ids.size);
const dates = Object.keys(byDate).sort();
if (dates.length !== 30) errors.push('queue must cover exactly 30 dates; got ' + dates.length);
for (const [date,count] of Object.entries(byDate)) if (count !== 10) errors.push(date + ': expected 10 items, got ' + count);
for (const [type,count] of Object.entries(queue.counts || {})) {
  if ((byType[type] || 0) !== count) errors.push('type count mismatch for ' + type + ': expected ' + count + ', got ' + (byType[type] || 0));
}

const report = {
  ok: errors.length === 0,
  schema: queue.schema,
  queueFile: FILE,
  totalItems: ids.size,
  dates: dates.length,
  byStatus,
  byType,
  sourcePacketsComplete,
  sourcePacketsMissing,
  approvedReady,
  published,
  humanEditorialGate: HUMAN_GATE,
  ownSiteOnly: queue.governance?.own_site_only === true,
  errors
};
console.log(JSON.stringify(report,null,2));
if (errors.length) process.exit(1);
