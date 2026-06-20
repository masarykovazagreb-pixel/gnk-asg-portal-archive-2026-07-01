const VERSION = "3.1.9-autopilot-zip-pack";

const MODULES = {
  operator: "ACTIVE",
  autopublish: "ACTIVE",
  todayMinimumArticles: 8,
  dailySchedule: ["09:00", "14:00", "20:00"],
  seoMetaSchema: "ACTIVE",
  googleScript: "ACTIVE_IF_SECRET_EXISTS",
  imageCatalog: "ACTIVE_GENERATED_SVG",
  authorHub: "ACTIVE_NERMIN_SEFIC",
  mailOps: "ACTIVE_BASIC",
  assistant: "ACTIVE_FREE_KNOWLEDGE_BASE",
  homepageIndex: "NOT_TOUCHED",
  github: "DISABLED"
};

const FORBIDDEN_ROUTES = ["gnk-asg.hr/*", "www.gnk-asg.hr/*"];

function nowIso(){ return new Date().toISOString(); }
function todayKey(){ return new Date().toISOString().slice(0,10); }
function uuid(){ return crypto.randomUUID(); }
function pathOf(url){ return url.pathname.replace(/\/+$/, "") || "/"; }

function json(data, status = 200){
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
function html(body, status = 200){
  return new Response(String(body), {
    status,
    headers: {"content-type":"text/html; charset=utf-8","cache-control":"no-store"}
  });
}
function text(body, status = 200, type = "text/plain; charset=utf-8"){
  return new Response(String(body), {
    status,
    headers: {"content-type":type,"cache-control":"no-store"}
  });
}
function xml(body, status = 200){
  return new Response(String(body), {
    status,
    headers: {"content-type":"application/xml; charset=utf-8","cache-control":"no-store"}
  });
}
function esc(v){
  return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function slugify(value){
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}
async function readJson(request){ try { return await request.json(); } catch { return {}; } }
function expectedToken(env){ return String(env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || env.ADMIN_TOKEN || "").trim(); }
function reqToken(request){
  const url = new URL(request.url);
  return String(request.headers.get("x-operator-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i,"") || url.searchParams.get("token") || "").trim();
}
function authorized(request, env){ const expected = expectedToken(env); return !!expected && reqToken(request) === expected; }
function unauthorized(env){ return json({ok:false,error: expectedToken(env) ? "UNAUTHORIZED" : "OPERATOR_TOKEN_SECRET_MISSING",version:VERSION,at:nowIso()}, expectedToken(env) ? 401 : 503); }

async function kvGet(env, key, fallback = null){
  try { if (!env.GNK_ASG_CONFIG_KV) return fallback; const v = await env.GNK_ASG_CONFIG_KV.get(key, "json"); return v ?? fallback; } catch { return fallback; }
}
async function kvPut(env, key, value){
  try { if (!env.GNK_ASG_CONFIG_KV) return false; await env.GNK_ASG_CONFIG_KV.put(key, JSON.stringify(value, null, 2)); return true; } catch { return false; }
}
async function d1Exec(env, sql, binds = []){
  try { if (!env.GNK_ASG_D1) return null; return await env.GNK_ASG_D1.prepare(sql).bind(...binds).run(); } catch { return null; }
}
async function d1All(env, sql, binds = []){
  try { if (!env.GNK_ASG_D1) return null; return await env.GNK_ASG_D1.prepare(sql).bind(...binds).all(); } catch { return null; }
}
async function ensureD1(env){
  if (!env.GNK_ASG_D1) return false;
  await d1Exec(env, `CREATE TABLE IF NOT EXISTS operator_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, type TEXT, ok INTEGER, message TEXT, payload TEXT)`);
  await d1Exec(env, `CREATE TABLE IF NOT EXISTS operator_checkpoints (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, reason TEXT, version TEXT, payload TEXT)`);
  await d1Exec(env, `CREATE TABLE IF NOT EXISTS published_articles (id INTEGER PRIMARY KEY AUTOINCREMENT, article_id TEXT, at TEXT NOT NULL, published_at TEXT, status TEXT, author TEXT, title TEXT, slug TEXT, summary TEXT, body TEXT, category TEXT, image_url TEXT, seo_title TEXT, seo_description TEXT, canonical_url TEXT, payload TEXT)`);
  return true;
}
async function logEvent(env, event){
  const item = {id:uuid(), at:nowIso(), version:VERSION, ok:event.ok !== false, type:event.type || "event", message:event.message || "", ...event};
  const old = await kvGet(env, "operator:logs", []);
  const arr = Array.isArray(old) ? old : [];
  arr.unshift(item);
  await kvPut(env, "operator:logs", arr.slice(0, 500));
  await ensureD1(env);
  await d1Exec(env, `INSERT INTO operator_logs (at, type, ok, message, payload) VALUES (?, ?, ?, ?, ?)`, [item.at,item.type,item.ok ? 1 : 0,item.message,JSON.stringify(item)]);
  return item;
}
async function getLogs(env, limit = 100){
  await ensureD1(env);
  const d1 = await d1All(env, `SELECT id, at, type, ok, message, payload FROM operator_logs ORDER BY id DESC LIMIT ?`, [limit]);
  if (d1 && Array.isArray(d1.results)) return d1.results;
  const logs = await kvGet(env, "operator:logs", []);
  return Array.isArray(logs) ? logs.slice(0, limit) : [];
}
function googleHead(env){
  const raw = env.GOOGLE_SITE_SCRIPT || "";
  const tagId = env.GOOGLE_TAG_ID || "";
  if (raw && String(raw).includes("<script")) return String(raw);
  if (tagId) {
    const id = esc(tagId);
    return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`;
  }
  return "<!-- GOOGLE_SITE_SCRIPT / GOOGLE_TAG_ID nije postavljen -->";
}
function orgSchema(){ return {"@context":"https://schema.org","@type":"Organization","name":"GNK ASG d.o.o.","url":"https://gnk-asg.hr","sameAs":["https://gnk-asg.hr/media-kit"]}; }
function personSchema(){ return {"@context":"https://schema.org","@type":"Person","name":"Nermin Sefić","url":"https://operator.gnk-asg.hr/nermin-sefic","worksFor":{"@type":"Organization","name":"GNK ASG d.o.o.","url":"https://gnk-asg.hr"}}; }

function imageSvg(slug){
  const title = slug === "default" ? "GNK ASG" : slug.replaceAll("-"," ").slice(0,80);
  const safe = esc(title.toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><radialGradient id="g" cx="30%" cy="20%" r="80%"><stop offset="0%" stop-color="#c7a24a" stop-opacity="0.42"/><stop offset="48%" stop-color="#07101f"/><stop offset="100%" stop-color="#03050a"/></radialGradient><linearGradient id="line" x1="0" x2="1"><stop offset="0%" stop-color="#c7a24a"/><stop offset="100%" stop-color="#27c46b"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="980" cy="120" r="210" fill="none" stroke="#c7a24a" stroke-opacity="0.24" stroke-width="2"/><circle cx="1020" cy="180" r="150" fill="none" stroke="#27c46b" stroke-opacity="0.22" stroke-width="2"/><path d="M120 480 C260 340, 360 610, 520 430 S760 290, 1080 470" fill="none" stroke="url(#line)" stroke-width="8" stroke-linecap="round" opacity="0.75"/><rect x="70" y="70" width="1060" height="535" rx="32" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/><text x="90" y="135" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">GNK ASG</text><text x="90" y="190" fill="#c7a24a" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">AUTOMATED CORPORATE INTELLIGENCE</text><text x="90" y="565" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">${safe}</text><text x="90" y="610" fill="rgba(255,255,255,0.72)" font-family="Arial, Helvetica, sans-serif" font-size="20">SEO image · generated visual · ${esc(todayKey())}</text></svg>`;
}
function articleTemplates(){
  const day = todayKey();
  return [
    {category:"business-intelligence", title:`GNK ASG poslovni signal za ${day}`, summary:"Dnevni poslovni pregled s fokusom na stabilnost portala, javne informacije, dokumente i digitalnu infrastrukturu.", angle:"Korporativni portal mora odvojiti brze javne informacije od težih sustava koji rade kroz poddomene i strukturirane JSON slojeve."},
    {category:"ai-operations", title:`AI operativni sloj i automatizacija portala – ${day}`, summary:"Pregled AI asistenta, knjige znanja i automatizacije rutinskih operacija bez opterećenja glavne stranice.", angle:"Javni AI asistent mora čitati samo javne podatke, dok administrativni operator ostaje odvojen i zaštićen."},
    {category:"media-kit", title:`Media Kit kao javna točka za GNK ASG materijale – ${day}`, summary:"Media Kit postaje centralna točka za factsheetove, brand materijale, press informacije i javne download datoteke.", angle:"Trećim stranama treba omogućiti uredno preuzimanje materijala bez ručnog slanja i bez opterećenja homepagea."},
    {category:"market-intelligence", title:`Market intelligence i digital assets snapshot – ${day}`, summary:"Market sloj se izdvaja na posebnu poddomenu uz jasne statuse podataka: live, delayed, snapshot ili fallback.", angle:"Podaci o tržištu moraju biti transparentno označeni i ne smiju se prikazivati kao real-time ako nemaju stvarni live izvor."},
    {category:"seo", title:`SEO, meta i schema režim za GNK ASG objave – ${day}`, summary:"Svaka nova objava dobiva meta naslov, opis, canonical, OpenGraph, Twitter card i Article schema podatke.", angle:"Automatsko objavljivanje mora biti povezano s tehničkim SEO slojem, slikama i strukturiranim podacima."},
    {category:"author", title:`Nermin Sefić author hub i dnevne objave – ${day}`, summary:"Author hub povezuje javni autorski profil, dnevne objave, SEO podatke i strukturirani Person schema sloj.", angle:"Autorske objave moraju biti uredno strukturirane, pretražive i povezane s javnim korporativnim kontekstom."},
    {category:"cloudflare", title:`Cloudflare-native operator bez GitHuba – ${day}`, summary:"Operator sloj radi kroz Cloudflare Worker, KV i D1, bez GitHuba i bez diranja glavnog indexa.", angle:"Rutinske promjene treba voditi kroz zaštićeni operator, logove, checkpoint i rollback logiku."},
    {category:"image-catalog", title:`Katalog slika i SEO vizuali za automatske objave – ${day}`, summary:"Svaki tekst dobiva vlastiti vizual, alt tekst, caption, credit i image metadata zapis.", angle:"Slike moraju biti katalogizirane, povezane s člankom i dostupne kroz image catalog za SEO i budući image sitemap."}
  ];
}
function buildArticle(template, index){
  const publishedAt = nowIso();
  const slug = slugify(template.title);
  const imageUrl = `https://operator.gnk-asg.hr/images/articles/${slug}.svg`;
  const canonical = `https://operator.gnk-asg.hr/articles/${slug}`;
  const body = [
    `Ovo je automatski objavljen GNK ASG tekst iz kategorije ${template.category}. Sustav ga objavljuje izvan glavne index stranice kako bi homepage ostao brz, lagan i stabilan.`,
    template.angle,
    `Objava je povezana s tehničkim SEO slojem: meta naslovom, opisom, canonical adresom, OpenGraph podacima, Twitter card zapisom, Article JSON-LD schema oznakom i zasebnim vizualom.`,
    `Vizual za ovu objavu nalazi se u katalogu slika i generira se kao profesionalni korporativni SVG prikaz. Kada se kasnije spoji R2 galerija ili licencirani image API, isti katalog može preuzeti stvarne fotografije ili odobrene brand vizuale.`,
    `Autor i korporativni kontekst povezani su kroz Nermin Sefić author hub i GNK ASG organizacijski schema sloj. Ova automatizacija ne mijenja produkcijski homepage, ne koristi GitHub i ne šalje osjetljive poruke trećim stranama.`,
    `Svrha objave je stvaranje urednog, indeksabilnog i tehnički konzistentnog javnog sadržaja koji treće strane, tražilice i AI sustavi mogu lakše razumjeti kroz strukturirane podatke.`,
    `Napomena: tržišni i financijski podaci na portalu služe isključivo informativno i ne predstavljaju financijski, investicijski ili pravni savjet.`
  ].join("\n\n");
  return {
    id: uuid(), index, status:"PUBLISHED_AUTO", autoPublished:true, publishedAt, date:todayKey(), author:"Nermin Sefić", title:template.title, slug, category:template.category, summary:template.summary, body,
    image:{url:imageUrl, alt:`GNK ASG vizual za temu: ${template.title}`, caption:`Automatski generirani GNK ASG korporativni vizual za objavu ${template.category}.`, credit:"GNK ASG automated visual system", type:"image/svg+xml"},
    seo:{title:`${template.title} | GNK ASG`, description:template.summary, canonical, robots:"index,follow", keywords:["GNK ASG","Nermin Sefić","korporativni portal","AI asistent","Media Kit","SEO","Cloudflare",template.category]},
    schema:{"@context":"https://schema.org","@type":"Article","headline":template.title,"description":template.summary,"datePublished":publishedAt,"dateModified":publishedAt,"author":{"@type":"Person","name":"Nermin Sefić","url":"https://operator.gnk-asg.hr/nermin-sefic"},"publisher":{"@type":"Organization","name":"GNK ASG d.o.o.","url":"https://gnk-asg.hr"},"image":imageUrl,"mainEntityOfPage":canonical}
  };
}
async function getArticles(env){ return await kvGet(env, "articles:published", []); }
async function saveArticles(env, articles){ await kvPut(env, "articles:published", articles); await kvPut(env, "articles:last-updated", {ok:true,count:articles.length,at:nowIso(),version:VERSION}); return true; }
async function publishAutoArticles(env, minimumToday = 8){
  await ensureD1(env);
  const existing = await getArticles(env);
  const list = Array.isArray(existing) ? existing : [];
  const day = todayKey();
  const todayArticles = list.filter(a => a.date === day);
  const needed = Math.max(0, minimumToday - todayArticles.length);
  const templates = articleTemplates();
  const created = [];
  for (let i=0; i<needed; i++){
    const template = templates[(todayArticles.length + i) % templates.length];
    const article = buildArticle(template, todayArticles.length + i + 1);
    created.push(article);
    await d1Exec(env, `INSERT INTO published_articles (article_id, at, published_at, status, author, title, slug, summary, body, category, image_url, seo_title, seo_description, canonical_url, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [article.id,nowIso(),article.publishedAt,article.status,article.author,article.title,article.slug,article.summary,article.body,article.category,article.image.url,article.seo.title,article.seo.description,article.seo.canonical,JSON.stringify(article)]);
  }
  const all = [...created, ...list].slice(0, 500);
  await saveArticles(env, all);
  const imageCatalog = all.map(a => ({articleId:a.id,title:a.title,slug:a.slug,url:a.image.url,alt:a.image.alt,caption:a.image.caption,credit:a.image.credit,type:a.image.type,articleUrl:a.seo.canonical}));
  await kvPut(env, "images:catalog", {ok:true,version:VERSION,updatedAt:nowIso(),count:imageCatalog.length,images:imageCatalog});
  await logEvent(env, {type:"auto-publish-articles", ok:true, message:`Created ${created.length} automatic articles`, created:created.length, total:all.length});
  return {ok:true,version:VERSION,date:day,requestedMinimum:minimumToday,existingToday:todayArticles.length,createdToday:created.length,totalArticles:all.length,created};
}
function pageShell(env, meta, body){
  const title = meta.title || "GNK ASG";
  const description = meta.description || "GNK ASG corporate portal.";
  const canonical = meta.canonical || "https://gnk-asg.hr";
  const image = meta.image || "https://operator.gnk-asg.hr/images/articles/default.svg";
  const schema = meta.schema ? `<script type="application/ld+json">${JSON.stringify(meta.schema)}</script>` : "";
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${meta.ogType || "website"}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(image)}">${googleHead(env)}${schema}<style>:root{--bg:#070910;--panel:#111827;--panel2:#151d2b;--text:#f7f8fb;--muted:#aeb8c8;--gold:#c7a24a;--line:rgba(255,255,255,.12)}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0%,#23304b 0,#090b10 46%,#050608 100%);color:var(--text);font-family:Arial,Helvetica,sans-serif}main{max-width:1160px;margin:0 auto;padding:18px}.header{border:1px solid rgba(199,162,74,.42);border-radius:24px;padding:20px;background:linear-gradient(135deg,#111827,#070a10);margin-bottom:14px}h1{font-size:31px;margin:0 0 8px}h2{font-size:19px;margin:0 0 10px}p{color:var(--muted);line-height:1.58}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 10px 28px rgba(0,0,0,.22)}a.btn,button{display:inline-flex;align-items:center;justify-content:center;width:100%;margin:6px 0;padding:12px 14px;border-radius:14px;border:1px solid rgba(199,162,74,.45);background:#0f1520;color:#fff;text-decoration:none;font-weight:700;cursor:pointer}input{width:100%;border:1px solid var(--line);background:#070a10;color:#fff;padding:12px;border-radius:14px;margin:6px 0}pre{white-space:pre-wrap;word-break:break-word;background:#070a10;border:1px solid var(--line);border-radius:14px;padding:12px;color:#dce7ff;max-height:480px;overflow:auto}.badge{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:5px 9px;color:var(--muted);font-size:12px}.heroimg{width:100%;border-radius:18px;border:1px solid var(--line);background:#0a0f19}.small{font-size:13px;color:var(--muted)}@media(max-width:900px){.grid,.grid2{grid-template-columns:1fr}main{padding:14px}h1{font-size:24px}}</style></head><body><main>${body}</main></body></html>`;
}
function articleListPage(env, articles){
  const cards = articles.map(a => `<section class="card"><img class="heroimg" src="${esc(a.image.url)}" alt="${esc(a.image.alt)}"><h2>${esc(a.title)}</h2><p>${esc(a.summary)}</p><p class="small">${esc(a.author)} · ${esc(a.publishedAt)} · ${esc(a.category)}</p><a class="btn" href="/articles/${esc(a.slug)}">Otvori tekst</a></section>`).join("");
  return pageShell(env, {title:"GNK ASG Articles",description:"Automatske GNK ASG objave s meta, SEO, schema i image catalog slojem.",canonical:"https://operator.gnk-asg.hr/articles",image:"https://operator.gnk-asg.hr/images/articles/default.svg",schema:{"@context":"https://schema.org","@type":"CollectionPage","name":"GNK ASG Articles","url":"https://operator.gnk-asg.hr/articles"}}, `<section class="header"><span class="badge">Automatske objave</span><h1>GNK ASG Articles</h1><p>Automatski objavljeni tekstovi. Homepage nije mijenjan i ostaje brz.</p></section><div class="grid">${cards}</div>`);
}
function singleArticlePage(env, article){
  return pageShell(env, {title:article.seo.title,description:article.seo.description,canonical:article.seo.canonical,image:article.image.url,ogType:"article",schema:article.schema}, `<article><section class="header"><span class="badge">${esc(article.category)} · ${esc(article.publishedAt)}</span><h1>${esc(article.title)}</h1><p>${esc(article.summary)}</p></section><img class="heroimg" src="${esc(article.image.url)}" alt="${esc(article.image.alt)}"><p class="small">${esc(article.image.caption)} · ${esc(article.image.credit)}</p><section class="card">${article.body.split("\n\n").map(p => `<p>${esc(p)}</p>`).join("")}</section><section class="grid2" style="margin-top:12px"><section class="card"><h2>SEO</h2><pre>${esc(JSON.stringify(article.seo, null, 2))}</pre></section><section class="card"><h2>Schema</h2><pre>${esc(JSON.stringify(article.schema, null, 2))}</pre></section></section></article>`);
}
function appPage(env){
  return pageShell(env, {title:"GNK ASG Operator App",description:"Zaštićeno sučelje za autopublish, SEO, slike i status.",canonical:"https://operator.gnk-asg.hr/app",schema:orgSchema()}, `<section class="header"><h1>GNK ASG Operator App</h1><p>Autopilot objave, SEO i status. Homepage se ne dira.</p></section><div class="grid2"><section class="card"><h2>Token</h2><input id="token" type="password" placeholder="Operator token"><button onclick="saveToken()">Spremi lokalno</button></section><section class="card"><h2>Naredbe</h2><button onclick="cmd('autopublish-run')">Objavi / dopuni 8 tekstova danas</button><button onclick="cmd('speed-test')">Speed test</button><button onclick="snapshot()">Checkpoint</button></section></div><section class="card"><h2>Izlaz</h2><pre id="out">Spremno.</pre></section><script>const out=document.getElementById('out');const tokenInput=document.getElementById('token');tokenInput.value=localStorage.getItem('GNK_ASG_OPERATOR_TOKEN')||'';function token(){return tokenInput.value.trim()}function saveToken(){localStorage.setItem('GNK_ASG_OPERATOR_TOKEN',token());out.textContent='Token spremljen lokalno.'}async function api(path,opt={}){opt.headers=opt.headers||{};if(token())opt.headers['x-operator-token']=token();const r=await fetch(path,opt);const t=await r.text();try{return JSON.parse(t)}catch{return t}}async function cmd(command){out.textContent=JSON.stringify(await api('/operator/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({command})}),null,2)}async function snapshot(){out.textContent=JSON.stringify(await api('/operator/checkpoint',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reason:'manual-autopublish-checkpoint'})}),null,2)}cmd('status');</script>`);
}
function menuPage(env){
  return pageShell(env, {title:"GNK ASG Operator Menu",description:"Navigacijski sloj za operator, članke, AI, SEO, slike i MailOps.",canonical:"https://operator.gnk-asg.hr/menu",schema:orgSchema()}, `<section class="header"><h1>GNK ASG Operator Menu</h1><p>Autopilot – automatske objave, SEO, slike i AI.</p></section><div class="grid"><section class="card"><h2>Articles</h2><a class="btn" href="/articles">Otvori članke</a></section><section class="card"><h2>Author Hub</h2><a class="btn" href="/nermin-sefic">Nermin Sefić</a></section><section class="card"><h2>Image Catalog</h2><a class="btn" href="/data/image-catalog.json">Slike JSON</a></section><section class="card"><h2>Sitemap</h2><a class="btn" href="/sitemap-autopilot.xml">Autopilot sitemap</a></section><section class="card"><h2>MailOps</h2><a class="btn" href="/mailops">MailOps</a></section><section class="card"><h2>Status</h2></section></div>`);
}
function defaultMailSignatures(){return {ok:true,version:VERSION,signatures:{assistant:{text:"IT – Osobni digitalni asistent\nAI asistent za javne informacije i operativne upite\nGNK ASG d.o.o.\n\nE: assistant@gnk-asg.hr\nW: https://gnk-asg.hr\nMedia Kit: https://gnk-asg.hr/media-kit"},press:{text:"GNK ASG Press Office\nMediji i javne informacije\nGNK ASG d.o.o.\n\nE: press@gnk-asg.hr\nW: https://gnk-asg.hr\nMedia Kit: https://gnk-asg.hr/media-kit"}}};}
function defaultAutoReplies(){return {ok:true,version:VERSION,replies:{contact:{subject:"GNK ASG – zaprimili smo vaš upit",body:"Poštovani,\n\nhvala na poruci. Vaš upit je zaprimljen.\n\nMedia Kit: https://gnk-asg.hr/media-kit\n\nSrdačno,\nGNK ASG Kontakt"},press:{subject:"GNK ASG Press Office – zaprimljen medijski upit",body:"Poštovani,\n\nhvala na medijskom upitu. Media Kit je dostupan na https://gnk-asg.hr/media-kit.\n\nSrdačno,\nGNK ASG Press Office"}}};}
function defaultKnowledgeBase(){return {ok:true,version:VERSION,topics:[{id:"media-kit",keywords:["media kit","press","mediji","logo"],answer:"Media Kit je dostupan na https://gnk-asg.hr/media-kit i https://media.gnk-asg.hr."},{id:"articles",keywords:["clanci","članci","articles","objave","nermin"],answer:"Automatske objave dostupne su na https://operator.gnk-asg.hr/articles. Sustav danas održava najmanje 8 objava, a zatim 3 dnevno."},{id:"ai",keywords:["ai","asistent","chat"],answer:"AI asistent koristi besplatnu knjigu znanja i nema administratorske ovlasti."}]};}
function answerKnowledge(kb, q){const s=String(q||"").toLowerCase();let best=null,score=0;for(const t of kb.topics||[]){let x=0;for(const k of t.keywords||[]) if(s.includes(String(k).toLowerCase())) x+=2;if(x>score){score=x;best=t;}}return best?{ok:true,matched:true,topic:best.id,answer:best.answer}:{ok:true,matched:false,answer:"Nema preciznog odgovora u knjizi znanja."};}
async function publicStatus(env){return {ok:true,version:VERSION,checkedAt:nowIso(),modules:MODULES,rules:{homepage:"NOT_TOUCHED",forbiddenRoutes:FORBIDDEN_ROUTES,autoPublish:"ENABLED",todayMinimumArticles:8,dailySchedule:["09:00","14:00","20:00"]},links:{app:"https://operator.gnk-asg.hr/app",articles:"https://operator.gnk-asg.hr/articles",authorHub:"https://operator.gnk-asg.hr/nermin-sefic",imageCatalog:"https://api.gnk-asg.hr/data/image-catalog.json",sitemapAutopilot:"https://operator.gnk-asg.hr/sitemap-autopilot.xml",mailops:"https://operator.gnk-asg.hr/mailops",assistant:"https://assistant.gnk-asg.hr"},articlesCount:(await getArticles(env)).length,logs:(await getLogs(env,8))};}
async function speedTest(env){const targets=["/health","/app","/menu","/articles","/data/articles.json","/data/image-catalog.json","/sitemap-autopilot.xml"];const results=[];for(const p of targets){const started=Date.now();try{const r=await fetch("https://operator.gnk-asg.hr"+p+"?cb="+Date.now());const body=await r.text();const ms=Date.now()-started;results.push({path:p,ok:r.ok,status:r.status,ms,length:body.length,fast:ms<2000});}catch(e){results.push({path:p,ok:false,status:0,ms:Date.now()-started,error:String(e.message||e),fast:false});}}const report={ok:results.every(r=>r.ok),fastOk:results.filter(r=>r.ok).every(r=>r.fast),at:nowIso(),version:VERSION,results};await kvPut(env,"operator:last-speed-test",report);await logEvent(env,{type:"speed-test",ok:report.ok,fastOk:report.fastOk});return report;}
async function checkpoint(env, reason){await ensureD1(env);const item={ok:true,reason,at:nowIso(),version:VERSION,status:await publicStatus(env)};await kvPut(env,"operator:last-checkpoint",item);await d1Exec(env,`INSERT INTO operator_checkpoints (at, reason, version, payload) VALUES (?, ?, ?, ?)`,[item.at,reason,VERSION,JSON.stringify(item)]);await logEvent(env,{type:"checkpoint",ok:true,message:reason});return item;}
async function commandHandler(request,env){if(!authorized(request,env)) return unauthorized(env);const payload=await readJson(request);const command=String(payload.command||"").trim();if(command==="status")return json(await publicStatus(env));if(command==="autopublish-run")return json(await publishAutoArticles(env,8));if(command==="speed-test")return json(await speedTest(env));if(command==="checkpoint")return json(await checkpoint(env,payload.reason||"operator-command-checkpoint"));if(command==="logs")return json({ok:true,logs:await getLogs(env,100)});return json({ok:false,error:"COMMAND_NOT_ALLOWED",command},400);}
async function sitemapAutopilot(env){const articles=await getArticles(env);const urls=["https://operator.gnk-asg.hr/articles","https://operator.gnk-asg.hr/nermin-sefic","https://operator.gnk-asg.hr/data/image-catalog.json",...articles.map(a=>a.seo.canonical)];return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${esc(u)}</loc><lastmod>${todayKey()}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`).join("\n")}</urlset>`;}
async function scheduledRun(event, env){const result=await publishAutoArticles(env,3);await logEvent(env,{type:"scheduled-autopublish",ok:true,cron:event.cron,result});}
export default {
  async fetch(request, env, ctx){
    const url = new URL(request.url);
    const path = pathOf(url);
    const host = url.hostname;
    if(path==="/health") return json({ok:true,version:VERSION,host,at:nowIso()});
    if(path==="/" && host==="operator.gnk-asg.hr") return html(appPage(env));
    if(path==="/" && host==="api.gnk-asg.hr") return json(await publicStatus(env));
    if(path==="/" && host==="assistant.gnk-asg.hr") return html(pageShell(env,{title:"GNK ASG AI Assistant",description:"Javni AI asistent iz knjige znanja.",canonical:"https://assistant.gnk-asg.hr",schema:orgSchema()},`<section class="header"><h1>GNK ASG AI Assistant</h1><p>Besplatna knjiga znanja, bez admin ovlasti.</p></section>`));
    if(path==="/" && host==="news.gnk-asg.hr") return html(articleListPage(env, await getArticles(env)));
    if(path==="/" && host==="status.gnk-asg.hr") return json(await publicStatus(env));
    if(path==="/app"||path==="/admin"||path==="/operator") return html(appPage(env));
    if(path==="/menu") return html(menuPage(env));
    if(path==="/mailops") return html(pageShell(env,{title:"GNK ASG MailOps",description:"Potpisi i automatski odgovori.",canonical:"https://operator.gnk-asg.hr/mailops",schema:orgSchema()},`<section class="header"><h1>GNK ASG MailOps</h1><p>Potpisi i automatski odgovori ostaju aktivni.</p></section><div class="grid"><section class="card"><h2>Potpisi</h2><a class="btn" href="/data/mail-signatures.json">JSON</a></section><section class="card"><h2>Auto replies</h2><a class="btn" href="/data/auto-replies.json">JSON</a></section></div>`));
    if(path==="/articles") return html(articleListPage(env, await getArticles(env)));
    if(path.startsWith("/articles/")){const slug=path.split("/").pop();const article=(await getArticles(env)).find(a=>a.slug===slug);if(!article)return json({ok:false,error:"ARTICLE_NOT_FOUND",slug},404);return html(singleArticlePage(env,article));}
    if(path==="/nermin-sefic") return html(pageShell(env,{title:"Nermin Sefić – Author Hub",description:"Autorski i korporativni hub za automatske GNK ASG objave.",canonical:"https://operator.gnk-asg.hr/nermin-sefic",schema:personSchema()},`<section class="header"><h1>Nermin Sefić – Author Hub</h1><p>Automatske objave: najmanje 8 danas, zatim 3 dnevno. Svaka objava ima SEO, meta, schema i image catalog zapis.</p></section><section class="card"><a class="btn" href="/articles">Otvori objave</a><a class="btn" href="/data/articles.json">Articles JSON</a></section>`));
    if(path.startsWith("/images/articles/")){const slug=path.split("/").pop().replace(".svg","");return text(imageSvg(slug),200,"image/svg+xml; charset=utf-8");}
    if(path==="/data/articles.json") return json({ok:true,version:VERSION,count:(await getArticles(env)).length,articles:await getArticles(env)});
    if(path==="/data/image-catalog.json") return json(await kvGet(env,"images:catalog",{ok:true,count:0,images:[]}));
    if(path==="/data/operator-public.json"||path==="/data/status.json"||path==="/operator/status") return json(await publicStatus(env));
    if(path==="/data/mail-signatures.json") return json(defaultMailSignatures());
    if(path==="/data/auto-replies.json") return json(defaultAutoReplies());
    if(path==="/data/knowledge-base.json") return json(defaultKnowledgeBase());
    if(path==="/data/seo-config.json") return json({ok:true,version:VERSION,googleScript:"GOOGLE_SITE_SCRIPT or GOOGLE_TAG_ID",schemas:{organization:orgSchema(),person:personSchema()}});
    if(path==="/data/search-index.json") return json({ok:true,version:VERSION,articles:(await getArticles(env)).map(a=>({title:a.title,url:a.seo.canonical,tags:a.seo.keywords}))});
    if(path==="/data/light-index-summary.json") return json({ok:true,rule:"Lagani sažetak za homepage bez teških feedova.",latest:(await getArticles(env)).slice(0,3)});
    if(path==="/sitemap-autopilot.xml") return xml(await sitemapAutopilot(env));
    if(path==="/assistant/ask" && request.method==="POST"){const payload=await readJson(request);return json(answerKnowledge(defaultKnowledgeBase(),payload.question));}
    if(path==="/operator/command") return commandHandler(request,env);
    if(path==="/operator/autopublish/run" && request.method==="POST"){if(!authorized(request,env))return unauthorized(env);return json(await publishAutoArticles(env,8));}
    if(path==="/operator/speed-test"){if(!authorized(request,env))return unauthorized(env);return json(await speedTest(env));}
    if(path==="/operator/checkpoint"){if(!authorized(request,env))return unauthorized(env);const payload=await readJson(request);return json(await checkpoint(env,payload.reason||"manual-checkpoint"));}
    if(path==="/operator/logs"){if(!authorized(request,env))return unauthorized(env);const logs=await getLogs(env,Number(url.searchParams.get("limit")||100));return json({ok:true,count:logs.length,logs});}
    return json({ok:false,error:"NOT_FOUND",path,host,version:VERSION},404);
  },
  async scheduled(event, env, ctx){ ctx.waitUntil(scheduledRun(event, env)); }
};