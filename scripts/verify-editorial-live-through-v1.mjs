#!/usr/bin/env node
import fs from 'node:fs';

const BASE = process.env.EDITORIAL_LIVE_BASE || 'https://www.gnk-asg.hr';
const CANONICAL_ORIGIN = process.env.EDITORIAL_CANONICAL_ORIGIN || 'https://gnk-asg.hr';
const CUTOFF = new Date((process.env.EDITORIAL_VERIFY_THROUGH || '2026-10-01') + 'T23:59:59.999+02:00');
const CONCURRENCY = Math.max(1, Math.min(30, Number(process.env.EDITORIAL_VERIFY_CONCURRENCY || 20)));
const REGISTRY = 'apps/portal/data/editorial-registry.json';
const OUT = 'artifacts/editorial-live-through-2026-10-01.json';

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const all = Array.isArray(registry.items) ? registry.items : [];
const planned = all.filter(item => {
  if (!item?.path || item.inPlan === false) return false;
  const raw = item.publishedAt || item.datePublished;
  if (!raw) return false;
  const d = new Date(raw);
  return !Number.isNaN(d.getTime()) && d.getTime() <= CUTOFF.getTime();
});

function cleanText(s='') {
  return String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&#x27;/gi,"'").replace(/\s+/g,' ').trim();
}
function attr(html, re) { return (String(html||'').match(re)||[])[1] || ''; }
function tagText(html, re) { const m=String(html||'').match(re); return m ? cleanText(m[1]) : ''; }
function normalizeCanonical(value='') {
  try {
    const u = new URL(value);
    u.hash=''; u.search='';
    u.hostname = u.hostname.toLowerCase().replace(/^www\./,'');
    u.pathname = u.pathname.replace(/\/{2,}/g,'/');
    if (!u.pathname.endsWith('/')) u.pathname += '/';
    return `${u.protocol}//${u.hostname}${u.pathname}`;
  } catch { return ''; }
}

async function verify(item) {
  const expectedCanonical = `${CANONICAL_ORIGIN}${item.path}`;
  const url = `${BASE}${item.path}${item.path.includes('?')?'&':'?'}liveVerify=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const failures=[];
  let status=0, finalUrl='', html='', type='', error='';
  try {
    const r = await fetch(url, {redirect:'follow', headers:{'cache-control':'no-cache','user-agent':'GNK-ASG-Editorial-Live-Verifier/1.0'}, signal:AbortSignal.timeout(30000)});
    status=r.status; finalUrl=r.url; type=r.headers.get('content-type')||''; html=await r.text();
  } catch(e) { error=String(e); failures.push('fetch_error'); }
  if (status !== 200) failures.push(`http=${status}`);
  if (!type.toLowerCase().includes('text/html')) failures.push(`content_type=${type||'missing'}`);
  const title=tagText(html,/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1=tagText(html,/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const description=attr(html,/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || attr(html,/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const canonical=attr(html,/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || attr(html,/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  if (!title) failures.push('title_missing');
  if (!h1) failures.push('h1_missing');
  if (!description) failures.push('meta_description_missing');
  if (!canonical) failures.push('canonical_missing');
  else if (normalizeCanonical(canonical) !== normalizeCanonical(expectedCanonical)) failures.push(`canonical_mismatch=${canonical}`);
  const bodyText=cleanText(html);
  if (bodyText.length < 120) failures.push(`body_too_short=${bodyText.length}`);
  if (/Internal Server Error|Application error|Worker threw exception|Error 1101/i.test(bodyText)) failures.push('server_error_text');
  return {
    path:item.path, url:`${BASE}${item.path}`, expectedCanonical, title:item.title||title, registryTitle:item.title||'', language:item.language||item.lang||'', publishedAt:item.publishedAt||item.datePublished||'', status, finalUrl, canonical, htmlTitle:title, h1, description, textLength:bodyText.length, error, ok:failures.length===0, failures
  };
}

const results = new Array(planned.length);
let next=0;
async function worker(){
  while(true){
    const i=next++; if(i>=planned.length) return;
    results[i]=await verify(planned[i]);
    if ((i+1)%25===0 || i===planned.length-1) console.log(`Verified ${i+1}/${planned.length}`);
  }
}
await Promise.all(Array.from({length:Math.min(CONCURRENCY, planned.length||1)}, worker));

const failures=results.filter(x=>!x.ok);
const languages=results.reduce((acc,x)=>{const k=(x.language||'unknown').toLowerCase(); acc[k]=(acc[k]||0)+1; return acc;},{});
const report={
  version:'GNK_ASG_EDITORIAL_LIVE_THROUGH_V1',
  checkedAt:new Date().toISOString(), cutoff:CUTOFF.toISOString(), base:BASE, canonicalOrigin:CANONICAL_ORIGIN,
  registryTotal:all.length, plannedThroughCutoff:planned.length, verifiedLive:results.length-failures.length, failed:failures.length, languages,
  ok:failures.length===0 && results.length===planned.length,
  failures:failures.map(x=>({path:x.path,title:x.registryTitle,status:x.status,failures:x.failures,error:x.error})),
  results
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ok:report.ok,checkedAt:report.checkedAt,registryTotal:report.registryTotal,plannedThroughCutoff:report.plannedThroughCutoff,verifiedLive:report.verifiedLive,failed:report.failed,languages:report.languages,failures:report.failures.slice(0,25)},null,2));
if(!report.ok) process.exitCode=1;
