#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('apps/portal');
const kbPath=path.join(root,'data/knowledge-base.json');
const outPath=path.join(root,'en/knowledge-center/index.html');
const kb=JSON.parse(fs.readFileSync(kbPath,'utf8'));
const group=(kb.skupine||[]).find(g=>String(g.naslov||'').trim()==='English pages');
if(!group||!Array.isArray(group.pitanja)||group.pitanja.length===0) throw new Error('English pages group missing from knowledge-base.json');

const qa=group.pitanja.map((x,i)=>({
  q:String(x.p||'').trim(),
  a:String(x.o||'').trim(),
  i
})).filter(x=>x.q&&x.a);

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonLd=JSON.stringify({
  '@context':'https://schema.org',
  '@type':'FAQPage',
  mainEntity:qa.map(x=>({
    '@type':'Question',
    name:x.q,
    acceptedAnswer:{'@type':'Answer',text:x.a}
  }))
}).replace(/</g,'\\u003c');

const details=qa.map((x,i)=>`<details data-kc-item data-search="${esc((x.q+' '+x.a).toLowerCase())}"><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('');
const html=`<!doctype html>
<html lang="en" class="gnk-unified-shell">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TCCJJVP4P0"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TCCJJVP4P0');</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>FAQ and AI Knowledge Center | GNK ASG</title>
<meta name="description" content="GNK ASG public English knowledge center generated from the shared public knowledge base.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://gnk-asg.hr/en/knowledge-center/">
<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/knowledge-center/">
<link rel="alternate" hreflang="en" href="https://gnk-asg.hr/en/knowledge-center/">
<link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/knowledge-center/">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_US">
<meta property="og:site_name" content="GNK ASG">
<meta property="og:title" content="FAQ and AI Knowledge Center | GNK ASG">
<meta property="og:description" content="Public English answers generated from the shared GNK ASG knowledge base.">
<meta property="og:url" content="https://gnk-asg.hr/en/knowledge-center/">
<meta property="og:image" content="https://gnk-asg.hr/assets/gnk-asg-social-card.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="FAQ and AI Knowledge Center | GNK ASG">
<meta name="twitter:description" content="Public English answers generated from the shared GNK ASG knowledge base.">
<meta name="twitter:image" content="https://gnk-asg.hr/assets/gnk-asg-social-card.png">
<script type="application/ld+json">${jsonLd}</script>
<link rel="stylesheet" href="/assets/style.css?v=20260723-dark-gold-theme-v1">
<link rel="stylesheet" href="/assets/public-sections-v1.css?v=20260721-header-fulltransparent-v1">
<link rel="stylesheet" href="/assets/public-unified-menu-v6.css?v=20260723-header-transparent-v3">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="author" content="Nermin Sefić">
<style>
.faq-search{margin:0 0 18px}.faq-search label{display:block;margin:0 0 6px;color:#b88a2f;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase}.faq-search input{width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(184,138,47,.35);background:rgba(11,18,32,.7);color:#f7f1e5;font-size:.95rem}.faq-search input:focus{outline:none;border-color:#d5ad54}.faq-results{margin:8px 0 0;color:#8d8577;font-size:.82rem;min-height:1em}.faq{display:grid;gap:12px;margin:24px 0}.faq details{border:1px solid #3b3120;border-radius:16px;background:#11100d;padding:0 18px}.faq summary{cursor:pointer;font-weight:800;padding:18px 0;color:#e8cf91}.faq details p{margin:0 0 18px;color:#c9c2b5;line-height:1.65}.faq details[hidden]{display:none}.notice{border-left:4px solid #d8b66a;padding:14px 18px;background:#15120d;border-radius:12px}.kc-meta{color:#8d8577;font-size:.9rem}
</style>
</head>
<body>
<header id="gnk-unified-header" data-gnk-unified-shell="v6-static"><div class="inner"><a class="brand" href="/en/" aria-label="GNK ASG"><img src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG" width="110" height="68" data-gnk-canonical-logo="1"></a><div id="gnk-unified-menu"><div class="actions"><div class="lang"><a href="/knowledge-center/" aria-label="Hrvatski">HR</a><a href="/en/knowledge-center/" aria-label="English" aria-current="page">EN</a></div><button class="toggle" type="button" aria-expanded="false" aria-controls="gnk-unified-nav">MENU</button></div><nav id="gnk-unified-nav"></nav></div></div></header>
<main class="wrap">
<div class="top"><div class="brand">GNK ASG · KNOWLEDGE CENTER</div><nav class="nav"><a href="/en/">Home</a><a href="/en/about/">About</a><a href="/en/projects/">Projects</a><a href="/en/finance/">Finance</a><a href="/en/newsroom/">Newsroom</a><a href="/en/reports/">Reports</a><a href="/media-application/?lang=en">Media</a><a href="/en/contact/">Contact</a></nav></div>
<section class="hero"><p class="eyebrow">Public and verifiable information</p><h1>FAQ and AI Knowledge Center</h1><p class="lead">English Q&A generated from the same shared public knowledge source used by the portal.</p><p class="kc-meta"><strong data-kc-count>${qa.length}</strong> English questions · source: /data/knowledge-base.json</p></section>
<p class="notice"><strong>Important:</strong> this center does not replace official registers, agreements, financial statements, legal advice or direct confirmation by an authorized representative.</p>
<div class="faq-search"><label for="kcSearch">Search the knowledge center</label><input id="kcSearch" type="search" autocomplete="off" placeholder="Search questions and answers"><p class="faq-results" id="kcResults" aria-live="polite"></p></div>
<section class="faq" aria-label="Frequently asked questions" id="kcFaq">${details}</section>
</main>
<script>
(()=>{const input=document.getElementById('kcSearch'),result=document.getElementById('kcResults'),items=[...document.querySelectorAll('[data-kc-item]')];if(!input||!result)return;let timer;input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{const q=input.value.trim().toLowerCase();let visible=0;for(const item of items){const ok=!q||String(item.dataset.search||'').includes(q);item.hidden=!ok;if(ok)visible++;if(!q)item.open=false;}result.textContent=q?(visible+' result'+(visible===1?'':'s')):'';},100);});})();
</script>
<script defer src="/assets/public-floating-menu-v2.js?v=20260711-knowledge"></script>
<script src="/assets/app.js?v=20260728-remove-tech-radar-more-sources-v1" defer></script>
</body>
</html>
`;
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,html,'utf8');
console.log(`Generated EN Knowledge Center with ${qa.length} questions.`);
