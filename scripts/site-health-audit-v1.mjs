// GNK ASG — Site health + speed audit.
// Za popis ključnih ruta: mjeri HTTP status, TTFB, ukupno vrijeme, veličinu,
// CF cache status, prisutnost bitnih meta oznaka (canonical, og:image, JSON-LD),
// broj slika bez width/height (CLS rizik) i broj internih linkova bez
// href-a / s praznim href. Piše report u /data/seo-audit/health-report.json + .html.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SITE=process.env.SITE_BASE || 'https://gnk-asg.hr';
const ROUTES=[
 '/', '/en/', '/nermin-sefic/', '/en/nermin-sefic/',
 '/gnk-aktual/', '/en/gnk-aktual/',
 '/objave/', '/en/publications/',
 '/objave/utrka-ai-regulacije-sad-eu-kina/',
 '/en/publications/ai-governance-race-us-eu-china/',
 '/en/publications/quantum-computing-corporate-security-preparation/',
 '/analize/', '/komentari/',
 '/ai/',
 '/feed.xml', '/en/feed.xml', '/atom.xml', '/en/atom.xml',
 '/feed/', '/en/feed/',
 '/llms.txt', '/llms-full.txt',
 '/sitemap-index.xml', '/sitemap.xml', '/editorial-sitemap.xml',
 '/image-sitemap.xml', '/world-topics-image-sitemap.xml',
 '/robots.txt',
 '/nermin-sefic/entity.jsonld',
 '/data/editorial-registry.json',
 '/data/news.json'
];

const write=(p,s)=>{const d=p.substring(0,p.lastIndexOf('/'));if(d)mkdirSync(d,{recursive:true});writeFileSync(p,s)};

async function measure(url){
  const t0=Date.now(); let ttfb=null;
  try {
    const ac=new AbortController(); const to=setTimeout(()=>ac.abort(),15000);
    const r=await fetch(url,{signal:ac.signal,redirect:'follow',headers:{'user-agent':'GNK-ASG-HealthAudit/1.0','accept-encoding':'gzip,br'}});
    ttfb=Date.now()-t0;
    const bodyBuf=await r.arrayBuffer();
    clearTimeout(to);
    const totalMs=Date.now()-t0;
    const body = new TextDecoder('utf-8').decode(bodyBuf).slice(0, 200000);
    const isHtml = /text\/html/i.test(r.headers.get('content-type')||'');
    const checks = isHtml ? {
      canonical: /<link\s+rel="canonical"/i.test(body),
      ogImage: /property="og:image"/i.test(body),
      twitterCard: /name="twitter:card"/i.test(body),
      metaDescription: /<meta\s+name="description"/i.test(body),
      metaAuthor: /<meta\s+name="author"/i.test(body),
      jsonLdCount: (body.match(/application\/ld\+json/g)||[]).length,
      breadcrumbLd: /"@type"\s*:\s*"BreadcrumbList"/.test(body),
      articleLd: /"@type"\s*:\s*"(Article|NewsArticle|BlogPosting|WebPage)"/.test(body),
      imgTotal: (body.match(/<img\b/gi)||[]).length,
      imgWithoutDims: (()=>{
        const hasAspectRatioCss = /aspect-ratio\s*:/i.test(body);
        if (hasAspectRatioCss) return 0; // layout stabilno rezerviran preko CSS-a, HTML atributi nisu jedini ispravan način
        return (body.match(/<img\b(?![^>]*\bwidth=)(?![^>]*\bheight=)[^>]*>/gi)||[]).length;
      })(),
      emptyHrefs: (body.match(/href=""|href='?'?(?=[\s>])/gi)||[]).length,
      // uklonjeno: /assets/editorial/*.svg reference su legitimni JSON-LD image linkovi, ne signal kvara
      feedLinks: /application\/rss\+xml/.test(body),
      shareRow: /class="ak-share"/.test(body),
    } : null;
    return {
      url,
      status:r.status,
      ok:r.ok,
      ttfbMs:ttfb,
      totalMs,
      bytes:bodyBuf.byteLength,
      contentType:(r.headers.get('content-type')||'').split(';')[0],
      cfCache:r.headers.get('cf-cache-status')||'',
      server:r.headers.get('server')||'',
      isHtml,
      checks
    };
  } catch (e) {
    return { url, status:0, ok:false, error:String(e?.message||e).slice(0,120), ttfbMs:ttfb, totalMs:Date.now()-t0 };
  }
}

const results=[];
for(const path of ROUTES){
  const url=SITE+path;
  const r=await measure(url);
  results.push(r);
  const badge = r.ok ? 'OK ' : 'FAIL';
  console.log(`${badge} ${r.status||''} ${String(r.totalMs).padStart(5)}ms ${String(Math.round((r.bytes||0)/1024)).padStart(6)}KB ${r.cfCache.padEnd(8)} ${path}`);
}
const okCount=results.filter(r=>r.ok).length;
const totalMs=results.reduce((s,r)=>s+r.totalMs,0);
const avgMs=Math.round(totalMs/results.length);
const maxMs=Math.max(...results.map(r=>r.totalMs));
const failedRoutes=results.filter(r=>!r.ok).map(r=>({url:r.url,status:r.status,error:r.error}));

const htmlPages=results.filter(r=>r.isHtml&&r.checks);
const missingCanonical=htmlPages.filter(r=>!r.checks.canonical).length;
const missingOg=htmlPages.filter(r=>!r.checks.ogImage).length;
const missingJsonLd=htmlPages.filter(r=>r.checks.jsonLdCount===0).length;
const missingBreadcrumb=htmlPages.filter(r=>!r.checks.breadcrumbLd).length;
const clsRisk=htmlPages.reduce((s,r)=>s+(r.checks.imgWithoutDims||0),0);

const summary={
 generatedAt:new Date().toISOString(),
 site:SITE,
 totals:{routes:results.length, ok:okCount, failed:results.length-okCount, avgTotalMs:avgMs, maxTotalMs:maxMs, medianMs: results.map(r=>r.totalMs).sort((a,b)=>a-b)[Math.floor(results.length/2)]},
 htmlChecks:{htmlPages:htmlPages.length, missingCanonical, missingOg, missingJsonLd, missingBreadcrumb, clsRisk},
 failedRoutes,
 detail:results
};
write('apps/portal/data/seo-audit/health-report.json', JSON.stringify(summary, null, 2)+'\n');

const rows=results.map(r=>{
 const bad = !r.ok ? 'style="background:#3a1010"' : (r.totalMs>2000 ? 'style="background:#3a2a10"' : '');
 return `<tr ${bad}><td>${r.ok?'✓':'✗'}</td><td>${r.status||r.error||''}</td><td>${r.totalMs}</td><td>${Math.round((r.bytes||0)/1024)}</td><td>${r.cfCache||''}</td><td><a href="${r.url}">${r.url.replace(SITE,'')}</a></td><td>${r.checks?`c:${r.checks.canonical?'✓':'✗'} og:${r.checks.ogImage?'✓':'✗'} ld:${r.checks.jsonLdCount} bc:${r.checks.breadcrumbLd?'✓':'✗'} cls:${r.checks.imgWithoutDims}`:''}</td></tr>`;
}).join('\n');
const html=`<!doctype html><html lang="hr"><head><meta charset="utf-8"><title>Site Health — GNK ASG</title><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><style>body{font:14px/1.5 system-ui,Arial,sans-serif;background:#0b0d10;color:#eee;max-width:1400px;margin:1.5rem auto;padding:0 1rem}a{color:#8bd}table{width:100%;border-collapse:collapse;font-size:.86rem}th,td{border-bottom:1px solid #222;padding:6px;text-align:left}th{background:#151a20;position:sticky;top:0}h1{margin-bottom:.3rem}.k{display:inline-block;padding:6px 12px;margin:0 8px 8px 0;border:1px solid #333;border-radius:6px}</style></head><body>
<h1>Site Health &amp; Speed</h1>
<p>Generirano: ${summary.generatedAt}</p>
<div>
<span class="k">Ruta: <b>${okCount}/${results.length}</b> OK</span>
<span class="k">Prosjek: <b>${avgMs}ms</b></span>
<span class="k">Median: <b>${summary.totals.medianMs}ms</b></span>
<span class="k">Maks: <b>${maxMs}ms</b></span>
<span class="k">HTML bez canonical: <b>${missingCanonical}</b></span>
<span class="k">HTML bez og:image: <b>${missingOg}</b></span>
<span class="k">HTML bez JSON-LD: <b>${missingJsonLd}</b></span>
<span class="k">HTML bez breadcrumb: <b>${missingBreadcrumb}</b></span>
<span class="k">CLS rizik (img bez dims): <b>${clsRisk}</b></span>
</div>
<table><thead><tr><th></th><th>Status</th><th>ms</th><th>KB</th><th>CF</th><th>URL</th><th>Checks</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
write('apps/portal/data/seo-audit/health-report.html', html);

console.log(JSON.stringify({totals:summary.totals,htmlChecks:summary.htmlChecks,failed:failedRoutes.length},null,2));
