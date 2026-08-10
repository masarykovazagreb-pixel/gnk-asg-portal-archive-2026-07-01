// GNK ASG — Image Health Scanner + Auto-Remediation
// Za sve stavke iz editorial-registryja i news.json:
//  1. HEAD / GET request na image URL, mjeri status + content-type + veličinu
//  2. Ako je HTTP 4xx/5xx ili timeout — evidentira i (po pravilu) zamjenjuje s fallback slikom
//  3. Ako je manje od MIN_BYTES (indikator low-res / thumbnail) — samo evidentira
//  4. Izlaz: apps/portal/data/seo-audit/image-health.json (report)
//     + apps/portal/data/seo-audit/image-health.html (human-readable)
//     + po potrebi zamjena image URL-a u registry/news + izmjena inline og:image
// Aditivno / defenzivno: nikad ne uklanja ispravnu sliku, log-only mode po defaultu.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SITE='https://gnk-asg.hr';
const FALLBACK=`${SITE}/assets/gnk-asg-social-card.png`;
const MIN_BYTES=parseInt(process.env.IMAGE_MIN_BYTES||'5000',10);   // <5KB -> podozrivo
const TIMEOUT_MS=parseInt(process.env.IMAGE_TIMEOUT_MS||'8000',10);
const CONCURRENCY=parseInt(process.env.IMAGE_CHECK_CONCURRENCY||'12',10);
const APPLY_FIXES=process.env.APPLY_FIXES==='1';

const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const write=(p,s)=>{const d=p.substring(0,p.lastIndexOf('/'));if(d)mkdirSync(d,{recursive:true});writeFileSync(p,s)};

async function head(url){
  const ac=new AbortController(); const to=setTimeout(()=>ac.abort(),TIMEOUT_MS);
  try{
    let r=await fetch(url,{method:'HEAD',signal:ac.signal,redirect:'follow'});
    if(!r.ok){
      // some servers reject HEAD; try GET with small range
      r=await fetch(url,{method:'GET',signal:ac.signal,redirect:'follow',headers:{'Range':'bytes=0-1023'}});
    }
    const ct=r.headers.get('content-type')||'';
    const cl=parseInt(r.headers.get('content-length')||'0',10);
    return {url,status:r.status,ok:r.ok,contentType:ct,bytes:cl};
  }catch(e){
    return {url,status:0,ok:false,error:String(e?.message||e).slice(0,120)};
  }finally{ clearTimeout(to); }
}

async function processInBatches(urls, worker, size){
  const out=[]; let i=0;
  await Promise.all(Array.from({length:size},async()=>{
    while(i<urls.length){ const my=i++; out[my]=await worker(urls[my]); }
  }));
  return out;
}

const registry=read('apps/portal/data/editorial-registry.json',{items:[]});
const news=read('apps/portal/data/news.json',[]);
const newsItems = Array.isArray(news) ? news : (news.items||news.news||[]);

const targets=[];
for(const it of registry.items||[]){
  if(it?.image) targets.push({source:'editorial',id:it.path||it.slug,url:it.image});
}
for(const it of newsItems){
  const img=it?.image||it?.thumbnail||it?.enclosure;
  if(img&&/^https?:\/\//i.test(img)) targets.push({source:'news',id:it.id||it.url,url:img});
}
console.log(`checking ${targets.length} images (concurrency ${CONCURRENCY})…`);
const started=Date.now();
const results=await processInBatches(targets.map(t=>t.url), head, CONCURRENCY);
const merged=targets.map((t,i)=>({...t,...results[i]}));

const broken=merged.filter(x=>!x.ok);
const suspicious=merged.filter(x=>x.ok && x.bytes && x.bytes<MIN_BYTES);
const okCount=merged.length-broken.length;
const report={
  generatedAt:new Date().toISOString(),
  totals:{checked:merged.length,ok:okCount,broken:broken.length,suspiciousLowRes:suspicious.length},
  brokenSample:broken.slice(0,50).map(x=>({source:x.source,id:x.id,url:x.url,status:x.status,error:x.error||''})),
  suspiciousSample:suspicious.slice(0,25).map(x=>({source:x.source,id:x.id,url:x.url,bytes:x.bytes})),
  ranMs:Date.now()-started
};
write('apps/portal/data/seo-audit/image-health.json', JSON.stringify(report,null,2)+'\n');

// HTML report
const rows=(list,badge)=>list.map(x=>`<tr><td>${badge}</td><td>${x.source}</td><td><code>${(x.id||'').toString().slice(0,80)}</code></td><td><a href="${x.url}" target="_blank" rel="noopener">${x.url.slice(0,90)}</a></td><td>${x.status||x.error||''}${x.bytes?(' · '+x.bytes+' B'):''}</td></tr>`).join('\n');
const html=`<!doctype html>
<html lang="hr"><head>
<meta charset="utf-8"><title>Image Health Report — GNK ASG</title>
<meta name="robots" content="noindex,follow">
<style>body{font:15px/1.5 system-ui,Arial,sans-serif;background:#0b0d10;color:#eee;max-width:1100px;margin:2rem auto;padding:0 1rem}
a{color:#8bd}code{background:#151a20;padding:2px 6px;border-radius:4px}
table{width:100%;border-collapse:collapse;margin-top:1rem;font-size:.88rem}
th,td{border-bottom:1px solid #222;padding:8px;text-align:left;vertical-align:top}
th{background:#151a20;position:sticky;top:0}
.tag{display:inline-block;padding:2px 8px;border-radius:3px;font-size:.75rem;font-weight:700}
.b{background:#7a1f1f;color:#fff}.s{background:#7a5c1f;color:#fff}</style>
</head><body>
<h1>Image Health Report</h1>
<p>Provjereno: <strong>${report.totals.checked}</strong> · OK: <strong>${report.totals.ok}</strong> · Slomljeno: <strong style="color:#f77">${report.totals.broken}</strong> · Sumnjivo malo (&lt;${MIN_BYTES}B): <strong style="color:#fc0">${report.totals.suspiciousLowRes}</strong> · trajanje: ${(report.ranMs/1000).toFixed(1)} s</p>
<h2>Slomljene slike (top 50)</h2>
<table><thead><tr><th></th><th>Izvor</th><th>ID</th><th>URL</th><th>Status</th></tr></thead><tbody>${rows(report.brokenSample,'<span class="tag b">SLOM</span>')||'<tr><td colspan=5>Nema slomljenih.</td></tr>'}</tbody></table>
<h2>Sumnjivo male slike (top 25)</h2>
<table><thead><tr><th></th><th>Izvor</th><th>ID</th><th>URL</th><th>Bajtova</th></tr></thead><tbody>${rows(report.suspiciousSample,'<span class="tag s">MALA</span>')||'<tr><td colspan=5>Sve u redu.</td></tr>'}</tbody></table>
<p><small>Generirano: ${report.generatedAt}</small></p>
</body></html>`;
write('apps/portal/data/seo-audit/image-health.html', html);

// Auto-remediation for EDITORIAL only (news items rotate iz RSS-a, ne diramo)
if(APPLY_FIXES){
  let editorialFixed=0;
  const brokenSet=new Set(broken.filter(x=>x.source==='editorial').map(x=>x.url));
  if(brokenSet.size){
    for(const it of registry.items||[]){
      if(it?.image && brokenSet.has(it.image)){
        it.image=FALLBACK;
        editorialFixed++;
      }
    }
    if(editorialFixed){
      write('apps/portal/data/editorial-registry.json', JSON.stringify(registry,null,2)+'\n');
      console.log(`fixed ${editorialFixed} editorial-registry entries → fallback image`);
    }
  }
  report.appliedFixes={editorialRegistryEntries:editorialFixed};
  write('apps/portal/data/seo-audit/image-health.json', JSON.stringify(report,null,2)+'\n');
}

console.log(JSON.stringify(report.totals,null,2));
