#!/usr/bin/env node
/**
 * AKTUAL MEDIA newsroom scout V1.
 * Reads existing REGIONAL archives and selects multi-outlet research leads.
 * It does NOT write articles or publish. Same REGION writer owns the output.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_OUT = join(ROOT, 'apps/region/data/_newsroom-candidates-v1.json');
const STOP = new Set(('vijesti vijest naslov hrvatska hrvatske hrvatski srbija srbije beograd zagreb ' +
  'danas sutra jucer jučer nakon prije prema izjava izjavila izjavio rekao rekla ' +
  'novi nova novo novih ovog ovoj samo kako koji koja koje gdje kada zašto ' +
  'jeste nije nisu imao ima imaju biti zbog jedan jedna tome mogu može ' +
  'najnovije najvažnije news report says said after before today about the from ' +
  'will have with what more than their says says').split(/\s+/));
const day = 24 * 60 * 60 * 1000;
const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 14);
const clean = text => String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const tokens = text => new Set((clean(text).match(/[a-z0-9]{4,}/g) || []).filter(w => !STOP.has(w)));
const validHttps = raw => {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)) return null;
    return u;
  } catch { return null; }
};
const publisher = url => url.hostname.toLowerCase().replace(/^www\./, '');
const canonicalLink = raw => {
  const url = validHttps(raw);
  if (!url) return '';
  url.hash = '';
  for (const key of [...url.searchParams.keys()])
    if (/^(utm_|fbclid$|gclid$|mc_)/i.test(key)) url.searchParams.delete(key);
  return url.toString();
};
const overlap = (left, right) => {
  let same = 0;
  for (const token of left) if (right.has(token)) same += 1;
  return same >= 2 && same / Math.max(left.size, right.size, 1) >= 0.32;
};
function record(item, now, horizonMs) {
  const url = canonicalLink(item?.url);
  const published = Date.parse(String(item?.date || ''));
  if (!url || !item?.title || !Number.isFinite(published)) return null;
  const age = now - published;
  if (age < 0 || age > horizonMs) return null;
  const title = String(item.title).trim().slice(0, 180);
  const normalized = tokens(title);
  if (normalized.size < 2) return null;
  return {
    title, url, source: String(item.sourceName || item.source || '').slice(0, 100),
    publisher: publisher(new URL(url)), published_at: new Date(published).toISOString(),
    dateMs: published, normalized,
    source_id: String(item.source || '').slice(0, 64),
    summary: String(item.summary || '').slice(0, 480)
  };
}
export function triage(items, {channel = 'zagreb', now = Date.now(), horizonHours = 72, limit = 10} = {}) {
  const clock = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(clock)) throw Error('invalid-clock');
  const unique = new Map();
  for (const item of items || []) {
    const rec = record(item, clock, horizonHours * 3600 * 1000);
    if (!rec) continue;
    if (!unique.has(rec.url) || unique.get(rec.url).dateMs < rec.dateMs) unique.set(rec.url, rec);
  }
  const sorted = [...unique.values()].sort((a,b) => b.dateMs - a.dateMs || a.url.localeCompare(b.url));
  const groups = [];
  for (const rec of sorted) {
    let group = groups.find(group => overlap(group.anchor.normalized, rec.normalized));
    if (!group) {
      group = {anchor: rec, records: []};
      groups.push(group);
    }
    if (!group.records.some(x => x.publisher === rec.publisher)) group.records.push(rec);
  }
  const result = groups.filter(x => x.records.length >= 2).map(group => {
    const sources = group.records.slice(0, 6).map(x => ({
      publisher: x.publisher, outlet: x.source, title: x.title,
      url: x.url, published_at: x.published_at, source_id: x.source_id
    }));
    const freshnessHours = (clock - Math.max(...group.records.map(x=>x.dateMs))) / 3600000;
    const score = Math.round(25 + Math.min(35, sources.length * 8) + Math.max(0, 30 - freshnessHours / 2));
    const subjectTokens = [...group.anchor.normalized].slice(0, 7).sort();
    return {
      id: 'am-' + channel + '-' + hash(group.anchor.url),
      channel, kind: 'research_lead', status: 'research_required',
      title_hint: group.anchor.title, topic_terms: subjectTokens,
      importance_score: score, distinct_outlets: sources.length,
      sources, verified_claims: 0, publishable: false,
      evidence_level: 'multiple-outlet-headlines-only',
      next_step: 'Check primary documents and actual article claims; write original angle; run independent fact and rights review.'
    };
  });
  return result.sort((a,b) =>
    b.importance_score - a.importance_score || b.distinct_outlets - a.distinct_outlets || a.id.localeCompare(b.id)
  ).slice(0, limit);
}
function argsOf(argv) {
  const value = (flag, fallback) => argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : fallback;
  return {out:value('--out',DEFAULT_OUT),channel:value('--channel',''),limit:Number(value('--limit',10))};
}
export function buildQueue({root = ROOT, now = Date.now(), channel = '', limit = 10} = {}) {
  const registry = JSON.parse(readFileSync(join(root,'apps/region/channels.json'),'utf8'));
  const selected = registry.channels.filter(x=>!channel || x.id===channel);
  if (!selected.length) throw Error('unknown-channel');
  const queues = [];
  for (const ch of selected) {
    let payload;
    try { payload = JSON.parse(readFileSync(join(root,'apps/region/data',ch.id+'.json'),'utf8')); }
    catch { payload = {items:[]}; }
    // Existing archive is newest-first and bounded by the REGION writer.
    const leads = triage((payload.items || []).slice(0,300), {channel:ch.id,now,limit});
    queues.push({channel:ch.id, scanned: Math.min((payload.items || []).length,300),
      leads, eligible_for_publication:0});
  }
  return {
    schema_version:'1.0',
    system:'AKTUAL MEDIA newsroom scout',
    mode:'read-existing-sources-only',
    generated_at:new Date(now).toISOString(),
    publication_enabled:false,
    reviewer_required:true,
    ai_disclosure_required_without_substantive_review:true,
    channels:queues,
    totals:{channels:queues.length, research_leads:queues.reduce((n,q)=>n+q.leads.length,0),
      publishable:0}
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a=argsOf(process.argv.slice(2));
  const queue=buildQueue({channel:a.channel,limit:a.limit});
  if (process.argv.includes('--stdout')) process.stdout.write(JSON.stringify(queue,null,2)+'\n');
  else {
    mkdirSync(dirname(resolve(a.out)),{recursive:true});
    writeFileSync(resolve(a.out),JSON.stringify(queue,null,2)+'\n');
    console.log('AKTUAL newsroom: '+queue.totals.research_leads+' research leads across '+queue.totals.channels+' channels; 0 auto-published.');
  }
}
