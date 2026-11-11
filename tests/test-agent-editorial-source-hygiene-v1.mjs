#!/usr/bin/env node
import assert from 'node:assert/strict';
import { sourceIdentity, safeInternalLink, SCHEMA } from '../apps/agents/lib/policy-v1.mjs';
import { selectItems, buildDraft } from '../apps/agents/writer-agent-v1.mjs';
import { reviewDraft, reviewQueue } from '../apps/agents/control-agent-v1.mjs';

const NOW = new Date('2026-10-29T10:00:00Z');
const LONG = 'Gradska uprava objavila je novi plan obnove javnih prostora u središtu grada, uz radove na pješačkim zonama, rasvjeti i zelenim površinama tijekom sljedećih mjeseci. Projekt se financira iz vlastitih sredstava i fondova, a javna rasprava o detaljima otvorena je za sve građane.';
const items = Array.from({ length: 6 }, (_, i) => ({
  title: 'Gradski projekt obnove javnih površina broj ' + (i + 1),
  summary: LONG,
  date: '2026-10-28T09:00:00Z',
  url: 'https://news' + (i + 1) + '.example.hr/articles/' + (i + 1),
  sourceName: 'Izvor ' + (i + 1),
}));
const selected = selectItems({city:'Zagreb',lang:'hr',items},NOW);
assert.equal(selected.length, 6);
const base = buildDraft({city:'Zagreb',lang:'hr'},'zagreb',selected,'2026-10-29');
assert.equal(reviewDraft(base,{now:NOW}).decision,'approved');

assert.equal(
  sourceIdentity('https://News.Example.HR/story/?utm_source=a&fbclid=123'),
  'https://news.example.hr/story'
);
for(const url of [
  'http://news.example.hr/a', 'https://localhost/a', 'https://127.0.0.1/a',
  'https://[::1]/x', 'https://news.example.hr:8443/a',
  'https://user:pass@news.example.hr/a', 'https://bad.test/a',
  'https://news.example.hr/a\nmalicious'
]) assert.equal(sourceIdentity(url),null,'unsafe source must fail: '+url);
for(const url of [
  '//external.example.hr/', '/\\external', '/%2f%2fevil', '/../secret',
  '/vijest/<script>', 'https://gnk-asg.hr/valid'
]) assert.equal(safeInternalLink(url),false,'unsafe internal href must fail: '+url);
assert.equal(safeInternalLink('/gnk-aktual/'),true);

const selectedDup = selectItems({ lang:'hr',items:[
  {...items[0], url:items[0].url+'?utm_campaign=one'},
  {...items[0], url:items[0].url+'?utm_campaign=two'}
]}, NOW);
assert.equal(selectedDup.length,1,'tracking parameters must not count as independent sources');

const duplicate=structuredClone(base);
duplicate.items[1].url=duplicate.items[0].url+'?utm_source=copy';
assert.ok(reviewDraft(duplicate,{now:NOW}).reasons.some(x=>x.includes('ponovljeni izvor')));

const badLink=structuredClone(base);
badLink.links[0]='//third-party.example.com';
assert.ok(reviewDraft(badLink,{now:NOW}).reasons.some(x=>x.includes('internih linkova')));

const badUrl=structuredClone(base);
badUrl.items[0].url='https://root@internal.example.hr/story';
assert.ok(reviewDraft(badUrl,{now:NOW}).reasons.some(x=>x.includes('HTTPS linka')));

const malformed=structuredClone(base);
malformed.items=null;
assert.equal(reviewDraft(malformed,{now:NOW}).decision,'rejected','invalid input must fail closed, not throw');

const stale=structuredClone(base);
stale.run_date='2026-10-28';
assert.ok(reviewDraft(stale,{now:NOW}).reasons.some(x=>x.includes('datum nacrta')));

assert.throws(
  ()=>reviewQueue({schema:SCHEMA,items:[structuredClone(base),structuredClone(base)]},{now:NOW}),
  /dupliciran ID/
);
console.log('PASS: 11 editorial-source safety checks, public URLs, deduplication, route fences and stale dates');
