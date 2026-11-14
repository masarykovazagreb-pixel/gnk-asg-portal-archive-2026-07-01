import test from 'node:test';
import assert from 'node:assert/strict';
import { signalMetrics, renderSignalPulse, renderSignalDesk, signalNavLabel } from './signal-desk-v1.mjs';

const NOW = Date.parse('2026-11-14T10:30:00Z');
const item = (source, title, date, slug='news') => ({
  source, sourceName: source, title, date, slug, url: 'https://example.org/'+slug
});
const data={
  updatedAt:'2026-11-14T10:25:00Z',
  items:[
    item('agency-a','News about economic policy','2026-11-14T09:00:00Z','a'),
    item('agency-b','Coverage of infrastructure','2026-11-13T03:00:00Z','b'),
    item('agency-a','Long-running historical story','2026-11-01T09:00:00Z','c')
  ],
  sources:[
    {id:'agency-a',name:'Agency A',ok:true,checkedAt:'2026-11-14T09:20:00Z',fetched:3},
    {id:'agency-b',name:'Agency B',ok:false,checkedAt:'2026-11-14T09:21:00Z',fetched:0},
    {id:'agency-c',name:'Agency C',ok:true,checkedAt:'2026-10-15T09:21:00Z',fetched:10}
  ]
};
const channel={id:'zagreb',lang:'hr',city:'Zagreb',country:'Hrvatska'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

test('timestamps are based on actual articles, not source sync',()=>{
 const x=signalMetrics(data,{now:NOW});
 assert.equal(x.total,3);
 assert.equal(x.within24,1);
 assert.equal(x.within72,2);
 assert.equal(x.distinctSources,2);
 assert.equal(x.successfulChecks,1);
 assert.equal(x.failedChecks,1);
 assert.equal(x.checks,3);
 assert.equal(x.lastArticleISO,'2026-11-14T09:00:00.000Z');
 assert.equal(x.updatedAt,'2026-11-14T10:25:00.000Z');
 assert.equal(x.trend.length,7);
});
test('empty or invalid archives fail gracefully without fake freshness',()=>{
 const x=signalMetrics({updatedAt:'2026-11-14T09:00:00Z',items:[],sources:[]},{now:NOW});
 assert.equal(x.within24,0);
 assert.equal(x.lastArticleISO,'');
 assert.equal(x.successfulChecks,0);
 assert.equal(x.trend.reduce((sum,d)=>sum+d.count,0),0);
});
test('dashboard is generated with search/filters and no external prototype url',()=>{
 const html=renderSignalDesk(channel,data,esc,()=> 'economy');
 assert(html.includes('data-signal-desk'));
 assert(html.includes('data-signal-search'));
 assert(html.includes('data-signal-window'));
 assert(html.includes('data-signal-source'));
 assert(html.includes('signal-desk-backdrop'));
 assert(html.includes('href="../clanak/a/"'));
 assert(html.includes('signal-health-fail'));
 assert(!html.includes('space-z.ai'));
 const pulse=renderSignalPulse(channel,data,esc);
 assert(pulse.includes('href="signal/"'));
 assert.equal(signalNavLabel('hr'),'AKTUAL SIGNAL');
 assert.equal(signalNavLabel('en'),'AKTUAL SIGNAL');
});
test('unsafe source URLs are never rendered, HTML data is escaped',()=>{
 const unsafe={items:[{...item('bad','<svg onload=alert(1)>','2026-11-14T09:00:00Z','bad'),url:'javascript:alert(1)'}]};
 const html=renderSignalDesk(channel,unsafe,esc,()=> 'economy');
 assert(!html.includes('href="javascript:'));
 assert(!html.includes('<svg onload='));
 assert(html.includes('&lt;svg'));
});
test('no false live health claim from stale source-check success',()=>{
 const x=signalMetrics({items:[],sources:[{ok:true,checkedAt:'2026-10-14T10:00:00Z'}]},{now:NOW});
 assert.equal(x.successfulChecks,0);
});
