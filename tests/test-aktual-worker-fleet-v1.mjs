import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateChannel,evaluateEditorialDraft,validateFleet,buildReport,run} from '../scripts/agents/aktual-worker-fleet-v1.mjs';
const fleet=JSON.parse(readFileSync('ops/aktual-worker-fleet-v1.json','utf8'));
const ideas=JSON.parse(readFileSync('content/editorial/aktual-ideas-2026-11-23.json','utf8')).items;
const channels=[{id:'zagreb'}],url='https://gnk-asg.hr/kanal/zagreb/';
const html='<!doctype html><html lang="hr"><head><title>AKTUAL MEDIA KANAL ZAGREB — urednički pregled</title>'+
 '<meta name="description" content="Dnevni pregled izvornika i uredničkog konteksta; sadržaj redovito provjeravamo i jasno razlikujemo potvrđeno od nepotvrđenog.">'+
 '<meta name="robots" content="index,follow"><link rel="canonical" href="'+url+'">'+
 '<link rel="alternate" hreflang="hr" href="'+url+'"><link rel="icon" href="/favicon.svg">'+
 '<meta property="og:title" content="Kanal Zagreb"><meta property="og:url" content="'+url+'">'+
 '<script type="application/ld+json">{"@context":"https://schema.org"}</script></head>'+
 '<body><h1>Zagreb</h1><div data-freshness></div></body></html>';
const index='<loc>'+url+'sitemap.xml</loc>';
const robots='User-agent: *\nSitemap: https://gnk-asg.hr/sitemap-index.xml\n';
test('20 bounded roles are unique and all prohibit publishing',()=>{
 assert.equal(fleet.roles.length,20);
 assert.ok(validateFleet(fleet,channels,ideas));
 assert.equal(ideas.length,60);
 assert.ok(ideas.every(x=>x.publish===false&&x.status==='research_required'));
});
test('real SEO scans examine each channel and never grant release',()=>{
 const report=buildReport({fleet,channels,ideas,pages:{zagreb:html},index,robots,sha:'fixture-sha'});
 assert.equal(report.audits_executed,11);
 assert.equal(report.worker_roles,20);
 assert.equal(report.editorial_ideas_queued,60);
 assert.equal(report.editorial_ideas_publishable,0);
 assert.equal(report.no_publish,true);
 assert.equal(report.no_deploy,true);
 assert.equal(report.verified_live_channels,null);
 assert.equal(report.findings.length,0);
});
test('canonical drift, missing index and noindex are flagged',()=>{
 const bad=html.replace('href="'+url+'"','href="https://example.org/"')
   .replace('index,follow','noindex,follow');
 const report=evaluateChannel(channels[0],bad,{index:'',robots});
 assert.ok(report.findings.some(x=>x.workerId==='canonical'));
 assert.ok(report.findings.some(x=>x.workerId==='sitemap'));
 assert.ok(report.findings.some(x=>x.workerId==='robots'));
});
test('invalid role policy, duplicate pitch, unauthorized identifier fail closed',()=>{
 assert.throws(()=>validateFleet({...fleet,execution:{...fleet.execution,max_ai_model_calls:1}},channels,ideas));
 assert.throws(()=>validateFleet({...fleet,roles:fleet.roles.map(x=>({...x,publish:true}))},channels,ideas));
 assert.throws(()=>validateFleet(fleet,channels,[...ideas,ideas[0]]));
 assert.throws(()=>evaluateChannel({id:'../../secrets'},html,{index,robots}));
});
test('repository inventory audits are read-only and never prove live status',()=>{
 const report=run({writePrivate:false,sha:'fixture-main'});
 assert.ok(report.inspected_channels>=1&&report.inspected_channels<=20);
 assert.equal(report.audits_executed,report.inspected_channels*11);
 assert.equal(report.release_status,'NOT_RELEASE_EVIDENCE');
 assert.equal(report.no_publish,true);
});

test('nine editorial checks examine every draft and never manufacture approval',()=>{
 const drafts=JSON.parse(readFileSync('content/editorial/aktual-original-drafts-2026-11-23.json','utf8')).articles;
 assert.equal(drafts.length,8);
 const checked=drafts.map(evaluateEditorialDraft);
 assert.ok(checked.every(x=>x.checks.length===9&&!x.publishable));
 assert.ok(checked.every(x=>x.checks.some(c=>c.workerId==='fact-evidence'&&c.result.startsWith('needs-'))));
 const report=buildReport({fleet,channels,ideas,drafts,pages:{zagreb:html},index,robots});
 assert.equal(report.editorial_drafts_reviewed_metadata,8);
 assert.equal(report.editorial_checks_executed,72);
 assert.equal(report.editorial_drafts_publishable,0);
 assert.ok(report.roles.find(x=>x.id==='copy-editor').inspected===8);
 assert.ok(report.roles.find(x=>x.id==='source-independence').findings===8);
});
test('unsafe editorial approvals and duplicate draft IDs are rejected',()=>{
 const d=JSON.parse(readFileSync('content/editorial/aktual-original-drafts-2026-11-23.json','utf8')).articles[0];
 assert.throws(()=>evaluateEditorialDraft({...d,publish:true}));
 assert.throws(()=>evaluateEditorialDraft({...d,approved:true}));
 assert.throws(()=>evaluateEditorialDraft({...d,publication_url:'https://gnk-asg.hr/objave/unverified/'}));
 assert.throws(()=>validateFleet(fleet,channels,ideas,[d,d]));
});
