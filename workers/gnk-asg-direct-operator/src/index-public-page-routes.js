import app from './index-dark-market-recovery.js';

const VERSION = 'GNK_ASG_PUBLIC_PAGE_ROUTES_V4';

const sharedStyle = `
:root{--gold:#d4af37;--text:#f7f9fc;--muted:#b8c5d8;--line:rgba(212,175,55,.34)}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 12% 0,#18345e 0,#071426 42%,#03070e 100%);color:var(--text);font-family:Arial,sans-serif}
a{color:inherit}header{position:sticky;top:0;z-index:5;background:rgba(3,8,17,.94);border-bottom:1px solid var(--line)}
.top,main{width:min(1120px,calc(100% - 28px));margin:auto}.top{min-height:70px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.brand{color:#f3d36d;font-weight:900;text-decoration:none;letter-spacing:.1em}.top nav{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.top nav a,.btn{display:inline-flex;align-items:center;justify-content:center;color:#fff;text-decoration:none;border:1px solid var(--gold);border-radius:999px;padding:9px 12px;font-size:12px;font-weight:900;background:#0b2b5a}
main{padding:38px 0 70px}.hero,.status,.card{border:1px solid var(--line);background:linear-gradient(145deg,rgba(11,28,52,.96),rgba(5,14,28,.96));border-radius:24px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
h1{font:700 clamp(2.6rem,7vw,5.2rem)/.96 Georgia,serif;margin:0}.hero p,.card p,.card li{color:var(--muted);line-height:1.65}.eyebrow{color:var(--gold);font-weight:900;text-transform:uppercase;letter-spacing:.12em}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:16px}.status{margin:16px 0;color:var(--muted)}
.card h2{font:700 1.65rem/1.1 Georgia,serif}.meta{color:var(--gold);font-size:12px;font-weight:900;text-transform:uppercase}.card details{border-top:1px solid rgba(212,175,55,.2);padding-top:12px}.card summary{color:#f3d36d;font-weight:900;cursor:pointer}
.fact{padding:10px;border:1px solid rgba(212,175,55,.18);border-radius:12px;margin:7px 0}.fact strong{display:block;color:#f3d36d;font-size:12px;text-transform:uppercase}
@media(max-width:700px){.brand{width:100%}.top nav{margin-left:0}}
`;

const AUTO_EDITOR_HTML = `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Auto Editor | GNK ASG</title><meta name="description" content="GNK ASG Auto Editor – javni pregled objava."><link rel="canonical" href="https://gnk-asg.hr/auto-editor/"><style>${sharedStyle}</style></head><body><header><div class="top"><a class="brand" href="/">GNK ASG</a><nav><a href="/">Početna</a><a href="/objave/">Objave</a><a href="/vijesti/">Vijesti</a><a href="/visual-index/">Visual Index</a></nav></div></header><main><section class="hero"><p class="eyebrow">GNK ASG Intelligence Desk</p><h1>Auto Editor</h1><p>Javni pregled sadržaja iz strukturiranog GNK ASG Auto Editor feeda.</p><div class="actions"><button class="btn" id="refresh" type="button">Osvježi prikaz</button><a class="btn" href="/data/auto-editor.json" target="_blank" rel="noopener">Otvori JSON feed</a></div></section><div class="status" id="status">Učitavanje Auto Editor feeda…</div><section class="grid" id="items"></section></main><script>(function(){var s=document.getElementById('status'),box=document.getElementById('items');function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]})}function body(v){var a=Array.isArray(v)?v:String(v||'').split(/\\n{2,}/);return a.filter(Boolean).map(function(x){return '<p>'+esc(x)+'</p>'}).join('')}async function load(){s.textContent='Učitavanje Auto Editor feeda…';box.innerHTML='';try{var r=await fetch('/data/auto-editor.json?cb='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);var d=await r.json();var a=Array.isArray(d)?d:(d.articles||d.items||[]);s.textContent='Učitano zapisa: '+a.length+'.';box.innerHTML=a.length?a.map(function(x){return '<article class="card"><div class="meta">'+esc(x.slot||'')+' · '+esc(x.entity||x.focus||'')+'</div><h2>'+esc(x.title||x.titleHr||'Auto Editor')+'</h2><p>'+esc(x.excerpt||x.summary||'')+'</p><details><summary>Pročitaj cijeli zapis</summary>'+body(x.body)+'</details></article>'}).join(''):'<article class="card"><p>Trenutačno nema dostupnih zapisa.</p></article>'}catch(e){s.textContent='Auto Editor feed trenutačno nije dostupan: '+e.message}}document.getElementById('refresh').onclick=load;load()})();</script></body></html>`;

const MEDIA_KIT_HTML = `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Media Kit | GNK ASG</title><meta name="description" content="Službeni GNK ASG Media Kit."><link rel="canonical" href="https://gnk-asg.hr/media-kit/"><style>${sharedStyle}</style></head><body><header><div class="top"><a class="brand" href="/">GNK ASG</a><nav><a href="/">Početna</a><a href="/visual-index/">Visual Index</a><a href="/contact/">Kontakt</a></nav></div></header><main><section class="hero"><p class="eyebrow">Službeni medijski resursi</p><h1>Media Kit</h1><p>Centralno mjesto za korporativne podatke, vizualne materijale, službene poveznice i kontakt s GNK ASG d.o.o. i GNK DINAMO Ltd.</p><div class="actions"><a class="btn" href="/visual-index/">Otvori vizualnu bazu</a><a class="btn" href="/contact/">Kontakt za medije</a><a class="btn" href="/objave/">Objave i analize</a></div></section><section class="grid"><article class="card"><h2>GNK ASG d.o.o.</h2><div class="fact"><strong>Sjedište</strong>Zagrebačka cesta 130, Zagreb</div><div class="fact"><strong>OIB</strong>75227917632</div><div class="fact"><strong>MBS</strong>081512375</div><div class="fact"><strong>Direktor</strong>Nermin Sefić</div></article><article class="card"><h2>GNK DINAMO Ltd.</h2><div class="fact"><strong>Sjedište</strong>Boulder, Colorado, USA</div><div class="fact"><strong>Entity ID</strong>20238180649</div><div class="fact"><strong>Okvir</strong>Poslovanje, sport, tehnologija i governance</div></article><article class="card"><h2>Vizualni materijali</h2><p>Logotipi, fotografije i odobreni vizualni materijali dostupni su kroz Visual Index.</p><a class="btn" href="/visual-index/">Visual Index</a></article><article class="card"><h2>Medijski upiti</h2><p>Za izjave, provjeru činjenica ili dopuštenje za uporabu materijala koristite javnu kontaktnu formu.</p><a class="btn" href="/contact/">Pošalji upit</a></article></section></main></body></html>`;

const pages = new Map([
  ['/auto-editor', AUTO_EDITOR_HTML],
  ['/auto-editor/', AUTO_EDITOR_HTML],
  ['/auto-editor/index.html', AUTO_EDITOR_HTML],
  ['/media-kit', MEDIA_KIT_HTML],
  ['/media-kit/', MEDIA_KIT_HTML],
  ['/media-kit/index.html', MEDIA_KIT_HTML]
]);

function servePublicPage(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const html = pages.get(new URL(request.url).pathname);
  if (!html) return null;
  return new Response(request.method === 'HEAD' ? null : html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'x-gnk-asg-public-page-routes': VERSION
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const publicPage = servePublicPage(request);
    if (publicPage) return publicPage;
    return app.fetch(request, env, ctx);
  },
  async scheduled(event, env, ctx) {
    if (typeof app.scheduled === 'function') return app.scheduled(event, env, ctx);
  },
  async email(message, env, ctx) {
    if (typeof app.email === 'function') return app.email(message, env, ctx);
  }
};
