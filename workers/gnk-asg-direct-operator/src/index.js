import legacy from './index.legacy.before_publish_20260618_142510.js';

const GNK_ASG_PUBLISH_ENDPOINTS_V1 = true;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function slugify(input) {
  return String(input || 'objava')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'objava';
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getToken(request) {
  const h = request.headers;
  const bearer = h.get('authorization') || '';
  return h.get('x-operator-token') || h.get('x-admin-token') || bearer.replace(/^Bearer\s+/i, '') || '';
}

function expectedToken(env) {
  return env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || env.ADMIN_TOKEN || env.GNK_ASG_ADMIN_TOKEN || env.SECRET_TOKEN || '';
}

function authorized(request, env) {
  const exp = expectedToken(env);
  const got = getToken(request);
  return !!exp && !!got && got === exp;
}

async function getList(env, key) {
  if (!env.GNK_ASG_KV) return [];
  const raw = await env.GNK_ASG_KV.get(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function putList(env, key, list) {
  if (!env.GNK_ASG_KV) return false;
  await env.GNK_ASG_KV.put(key, JSON.stringify(list.slice(0, 200), null, 2));
  return true;
}

async function handlePublish(request, env, kind) {
  if (request.method !== 'POST') return json({ ok:false, error:'method_not_allowed' }, 405);
  if (!authorized(request, env)) return json({ ok:false, error:'unauthorized_or_missing_token' }, 401);
  if (!env.GNK_ASG_KV) return json({ ok:false, error:'GNK_ASG_KV_missing' }, 500);

  const body = await readJson(request);
  const now = new Date().toISOString();
  const title = String(body.title || '').trim();

  if (!title) return json({ ok:false, error:'missing_title' }, 400);

  const id = kind + '-' + now.replace(/[^0-9]/g, '').slice(0, 14) + '-' + slugify(title).slice(0, 36);

  const item = {
    id,
    kind,
    lang: body.lang || 'hr',
    title,
    slug: slugify(title),
    summary: body.summary || '',
    body: body.body || '',
    category: body.category || kind,
    sourceUrl: body.sourceUrl || '',
    image: body.image || '',
    status: 'published',
    createdAt: now,
    updatedAt: now
  };

  if (kind === 'news') {
    item.url = String(body.url || body.sourceUrl || '').trim();
    item.sourceUrl = item.url;
    item.source = String(body.source || 'GNK ASG').trim();
    item.region = String(body.region || item.source || 'GNK ASG').trim();
    item.group = String(body.group || body.category || 'business').trim();
    item.category = String(body.category || body.group || 'business').trim();
    item.published_at =
      body.published_at ||
      body.publishedAt ||
      now;
    item.share_url =
      body.share_url ||
      `/podijeli/vijest/${encodeURIComponent(id)}/`;
  }

  const listKey = kind === 'news' ? 'data:news:items' : 'data:articles:items';
  const itemKey = kind + ':' + id;

  const list = await getList(env, listKey);
  const next = [item, ...list.filter(x => x && x.id !== id)].slice(0, 200);

  await env.GNK_ASG_KV.put(itemKey, JSON.stringify(item, null, 2));
  await putList(env, listKey, next);

  return json({ ok:true, id, item, total: next.length });
}

async function handleData(env, kind) {
  if (kind === 'news') {
    item.url = String(body.url || body.sourceUrl || '').trim();
    item.sourceUrl = item.url;
    item.source = String(body.source || 'GNK ASG').trim();
    item.region = String(body.region || item.source || 'GNK ASG').trim();
    item.group = String(body.group || body.category || 'business').trim();
    item.category = String(body.category || body.group || 'business').trim();
    item.published_at =
      body.published_at ||
      body.publishedAt ||
      now;
    item.share_url =
      body.share_url ||
      `/podijeli/vijest/${encodeURIComponent(id)}/`;
  }

  const listKey = kind === 'news' ? 'data:news:items' : 'data:articles:items';
  const items = await getList(env, listKey);
  return json({
    ok: true,
    source: 'GNK_ASG_KV',
    generatedAt: new Date().toISOString(),
    items
  });
}

const GNK_ASG_NEWS_DATA_BRIDGE_V1 = true;

function GNK_NEWS_TIME(item) {
  const value =
    item?.published_at ||
    item?.publishedAt ||
    item?.createdAt ||
    item?.updatedAt ||
    '';

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function GNK_NEWS_NORMALIZE(item) {
  if (!item || typeof item !== 'object') return null;

  const id = String(
    item.id ||
    `news-${GNK_NEWS_TIME(item)}-${slugify(item.title || 'vijest')}`
  );

  const url = String(
    item.url ||
    item.sourceUrl ||
    ''
  ).trim();

  return {
    ...item,
    id,
    title: String(item.title || '').trim(),
    url,
    sourceUrl: url,
    summary: String(item.summary || '').trim(),
    source: String(item.source || 'GNK ASG').trim(),
    region: String(item.region || item.source || 'GNK ASG').trim(),
    group: String(item.group || item.category || 'business').trim(),
    category: String(item.category || item.group || 'business').trim(),
    published_at:
      item.published_at ||
      item.publishedAt ||
      item.createdAt ||
      new Date().toISOString(),
    share_url:
      item.share_url ||
      `/podijeli/vijest/${encodeURIComponent(id)}/`
  };
}

async function GNK_READ_STATIC_NEWS(request, env) {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') return [];

  try {
    const assetUrl = new URL('/data/news.json', request.url);
    const response = await env.ASSETS.fetch(
      new Request(assetUrl.toString(), {
        method: 'GET',
        headers: {
          accept: 'application/json'
        }
      })
    );

    if (!response.ok) return [];

    const parsed = await response.json();

    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;

    return [];
  } catch {
    return [];
  }
}

async function GNK_HANDLE_NEWS_DATA(request, env) {
  const stored = await getList(env, 'data:news:items');
  const fallback = await GNK_READ_STATIC_NEWS(request, env);
  const seen = new Set();

  const items = [...stored, ...fallback]
    .map(GNK_NEWS_NORMALIZE)
    .filter(item => {
      if (!item || !item.title) return false;

      const key = String(
        item.id ||
        item.url ||
        item.title
      ).toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .sort((a, b) => GNK_NEWS_TIME(b) - GNK_NEWS_TIME(a))
    .slice(0, 500);

  return new Response(JSON.stringify(items, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'x-gnk-asg-news-source':
        stored.length > 0 ? 'kv-and-static' : 'static-fallback',
      'x-gnk-asg-news-kv-count': String(stored.length),
      'x-gnk-asg-news-total-count': String(items.length)
    }
  });
}
async function handlePublishLayer(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/operator/publish-status') {
    return json({
      ok: true,
      publishLayer: 'GNK_ASG_PUBLISH_ENDPOINTS_V1',
      hasKV: !!env.GNK_ASG_KV,
      hasOperatorToken: !!expectedToken(env),
      endpoints: {
        publishNews: '/operator/publish-news',
        publishArticle: '/operator/publish-article',
        newsData: '/data/news.json',
        articlesData: '/data/articles.json'
      },
      generatedAt: new Date().toISOString()
    });
  }

  if (path === '/operator/publish-news') return await handlePublish(request, env, 'news');
  if (path === '/operator/publish-article') return await handlePublish(request, env, 'article');
  if (path === '/data/news.json') return await GNK_HANDLE_NEWS_DATA(request, env);
  if (path === '/data/articles.json') return await handleData(env, 'article');

  return null;
}

const __GNK_ASG_ORIGINAL_DEFAULT__ = {
  async fetch(request, env, ctx) {
    const handled = await handlePublishLayer(request, env);
    if (handled) return handled;
    return legacy.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    if (legacy.scheduled) return legacy.scheduled(event, env, ctx);
  },

  async email(message, env, ctx) {
    if (legacy.email) return legacy.email(message, env, ctx);
  }
};

const GNK_ASG_ACTIVE_ADMIN_API_WRAPPER_V2_START=true;

const GNK_ADMIN_H={
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store",
  "access-control-allow-origin":"https://gnk-asg.hr",
  "access-control-allow-methods":"GET,POST,OPTIONS",
  "access-control-allow-headers":"content-type,authorization,x-gnk-asg-token"
};

function GNK_ADMIN_JSON(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:GNK_ADMIN_H});
}

function GNK_ADMIN_NOW(){
  return new Date().toISOString();
}

function GNK_ADMIN_ID(prefix){
  return prefix+"-"+GNK_ADMIN_NOW().replace(/[-:.TZ]/g,"").slice(0,14)+"-"+Math.random().toString(16).slice(2,8);
}

function GNK_ADMIN_SLUG(s){
  return String(s||"asset").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,120)||"asset";
}

function GNK_ADMIN_B64_BYTES(base64){
  const clean=String(base64||"").replace(/^data:[^;]+;base64,/,"");
  if(!clean)return new Uint8Array();
  const bin=atob(clean);
  const out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
}

async function GNK_ADMIN_GET_LIST(env,key){
  if(!env.GNK_ASG_KV)return [];
  try{
    const raw=await env.GNK_ASG_KV.get(key);
    return raw?JSON.parse(raw):[];
  }catch(e){
    return [];
  }
}

async function GNK_ADMIN_ADD_LIST(env,key,item,max=500){
  if(!env.GNK_ASG_KV)throw new Error("GNK_ASG_KV binding nije dostupan.");
  let arr=await GNK_ADMIN_GET_LIST(env,key);
  arr.unshift(item);
  arr=arr.slice(0,max);
  await env.GNK_ASG_KV.put(key,JSON.stringify(arr,null,2));
  return arr;
}

async function GNK_ADMIN_STATUS(env){
  return GNK_ADMIN_JSON({
    ok:true,
    service:"GNK ASG Active Admin API Backend",
    activeWorker:true,
    mailBackend:true,
    publishQueue:true,
    mediaUpload:true,
    assetList:true,
    kvBinding:!!env.GNK_ASG_KV,
    r2Binding:!!env.GNK_ASG_MEDIA_ASSETS,
    emailBinding:!!(env.EMAIL&&typeof env.EMAIL.send==="function"),
    gmxForward:"rht@gmx.com",
    endpoints:[
      "/api/admin-control-status",
      "/api/admin-publish",
      "/api/publish-queue",
      "/api/media-upload",
      "/api/admin-asset-list"
    ],
    time:GNK_ADMIN_NOW()
  });
}

async function GNK_ADMIN_PUBLISH(request,env){
  const m=await request.json();
  const item={
    id:m.id||GNK_ADMIN_ID("GNK-PUBLISH"),
    createdAt:m.createdAt||GNK_ADMIN_NOW(),
    updatedAt:GNK_ADMIN_NOW(),
    status:m.status||"draft_queue",
    type:m.type||"article",
    lang:m.lang||"hr",
    title:String(m.title||"").trim(),
    summary:String(m.summary||"").trim(),
    body:String(m.body||"").trim(),
    image:String(m.image||"").trim(),
    seo:m.seo||{},
    approvedForPublic:false,
    source:"active-admin-api"
  };
  if(!item.title)return GNK_ADMIN_JSON({ok:false,error:"Nedostaje naslov."},400);
  if(!item.summary&&!item.body)return GNK_ADMIN_JSON({ok:false,error:"Nedostaje sažetak ili tekst."},400);
  await GNK_ADMIN_ADD_LIST(env,"publish:queue",item,500);
  await env.GNK_ASG_KV.put("publish:last",JSON.stringify(item,null,2));
  return GNK_ADMIN_JSON({ok:true,stored:"publish:queue",item});
}

async function GNK_ADMIN_MEDIA(request,env){
  if(request.method==="GET"){
    return GNK_ADMIN_JSON({
      ok:true,
      service:"GNK ASG Active Admin API Backend",
      endpoint:"/api/media-upload",
      method:"POST",
      accepts:["filename","mime","base64","folder","title","alt","caption"],
      r2Binding:!!env.GNK_ASG_MEDIA_ASSETS,
      kvBinding:!!env.GNK_ASG_KV
    });
  }

  const m=await request.json();
  const bytes=GNK_ADMIN_B64_BYTES(m.base64||m.data||"");
  if(!bytes.length)return GNK_ADMIN_JSON({ok:false,error:"Nedostaje base64 sadržaj."},400);
  if(bytes.length>15*1024*1024)return GNK_ADMIN_JSON({ok:false,error:"Datoteka je prevelika. Maksimalno 15 MB."},413);

  const assetId=GNK_ADMIN_ID("GNK-ASSET");
  const filename=GNK_ADMIN_SLUG(m.filename||"upload.bin");
  const folder=GNK_ADMIN_SLUG(m.folder||"admin-uploads");
  const mime=String(m.mime||"application/octet-stream");
  const key=`${folder}/${assetId}-${filename}`;

  if(env.GNK_ASG_MEDIA_ASSETS&&typeof env.GNK_ASG_MEDIA_ASSETS.put==="function"){
    await env.GNK_ASG_MEDIA_ASSETS.put(key,bytes,{
      httpMetadata:{contentType:mime},
      customMetadata:{
        title:String(m.title||"").slice(0,240),
        alt:String(m.alt||"").slice(0,240),
        caption:String(m.caption||"").slice(0,240)
      }
    });
  }

  const asset={
    id:assetId,
    createdAt:GNK_ADMIN_NOW(),
    key,
    filename,
    folder,
    mime,
    size:bytes.length,
    title:m.title||"",
    alt:m.alt||"",
    caption:m.caption||"",
    r2:!!env.GNK_ASG_MEDIA_ASSETS,
    r2Url:`r2://${key}`,
    suggestedPublicPath:`/r2/${key}`,
    newsProxyUrl:`https://news.gnk-asg.hr/r2/${key}`
  };

  await GNK_ADMIN_ADD_LIST(env,"assets:list",asset,500);
  await env.GNK_ASG_KV.put(`asset:${assetId}`,JSON.stringify(asset,null,2));

  return GNK_ADMIN_JSON({ok:true,asset});
}

const __GNK_ASG_BEFORE_PUBLICATIONS_FIX__ = {
  async fetch(request,env,ctx){
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:GNK_ADMIN_H});

    const path=new URL(request.url).pathname;

    try{
      if(request.method==="GET"&&path==="/api/admin-control-status")return await GNK_ADMIN_STATUS(env);
      if(request.method==="POST"&&path==="/api/admin-publish")return await GNK_ADMIN_PUBLISH(request,env);
      if(request.method==="GET"&&path==="/api/publish-queue")return GNK_ADMIN_JSON({ok:true,items:await GNK_ADMIN_GET_LIST(env,"publish:queue")});
      if((request.method==="GET"||request.method==="POST")&&path==="/api/media-upload")return await GNK_ADMIN_MEDIA(request,env);
      if(request.method==="GET"&&path==="/api/admin-asset-list")return GNK_ADMIN_JSON({ok:true,items:await GNK_ADMIN_GET_LIST(env,"assets:list")});
    }catch(e){
      return GNK_ADMIN_JSON({ok:false,error:e.message||String(e)},500);
    }

    if(typeof __GNK_ASG_ORIGINAL_DEFAULT__!=="undefined"&&__GNK_ASG_ORIGINAL_DEFAULT__&&typeof __GNK_ASG_ORIGINAL_DEFAULT__.fetch==="function"){
      return await __GNK_ASG_ORIGINAL_DEFAULT__.fetch(request,env,ctx);
    }

    return GNK_ADMIN_JSON({ok:false,error:"not_found",path},404);
  },

  async scheduled(event,env,ctx){
    if(typeof __GNK_ASG_ORIGINAL_DEFAULT__!=="undefined"&&__GNK_ASG_ORIGINAL_DEFAULT__&&typeof __GNK_ASG_ORIGINAL_DEFAULT__.scheduled==="function"){
      return await __GNK_ASG_ORIGINAL_DEFAULT__.scheduled(event,env,ctx);
    }
  },

  async email(message,env,ctx){
    if(typeof __GNK_ASG_ORIGINAL_DEFAULT__!=="undefined"&&__GNK_ASG_ORIGINAL_DEFAULT__&&typeof __GNK_ASG_ORIGINAL_DEFAULT__.email==="function"){
      return await __GNK_ASG_ORIGINAL_DEFAULT__.email(message,env,ctx);
    }
  }
};

const GNK_ASG_ACTIVE_ADMIN_API_WRAPPER_V2_END=true;


const GNK_ASG_PUBLICATIONS_ONLY_FIX_START=true;

const GNK_PUB_HEADERS_JSON={
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store",
  "access-control-allow-origin":"https://gnk-asg.hr"
};

function GNK_PUB_JSON(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:GNK_PUB_HEADERS_JSON});
}

function GNK_PUB_HTML(html,status=200){
  return new Response(html,{status,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
}

function GNK_PUB_ESC(s){
  return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

async function GNK_PUB_GET(env,key){
  if(!env.GNK_ASG_KV)return [];
  try{
    const raw=await env.GNK_ASG_KV.get(key);
    return raw?JSON.parse(raw):[];
  }catch(e){
    return [];
  }
}

async function GNK_PUB_LIST_HTML(env){
  const items=await GNK_PUB_GET(env,"publish:approved");
  const cards=items.length?items.map(x=>`
    <article class="card">
      ${x.image?`<img src="${GNK_PUB_ESC(x.image)}" alt="${GNK_PUB_ESC(x.title||"GNK ASG objava")}">`:""}
      <div class="meta">${GNK_PUB_ESC(x.type||"objava")} · ${GNK_PUB_ESC(x.lang||"hr")} · ${GNK_PUB_ESC(x.publishedAt||x.approvedAt||"")}</div>
      <h2>${GNK_PUB_ESC(x.title||"Bez naslova")}</h2>
      <p>${GNK_PUB_ESC(x.summary||String(x.body||"").slice(0,220))}</p>
      <a href="${GNK_PUB_ESC(x.publicUrl||"/publications/")}">Otvori zapis</a>
    </article>
  `).join(""):`<div class="empty">Još nema javno odobrenih objava.</div>`;

  return GNK_PUB_HTML(`<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GNK ASG Publications</title>
<style>
body{margin:0;background:#07101f;color:#f8fafc;font-family:Inter,Arial,sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:34px 18px}
.top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:22px}
h1{font-family:Georgia,serif;color:#f4d37a;margin:0;font-size:34px}
a{color:#f4d37a;text-decoration:none;font-weight:800}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px}
.card{border:1px solid rgba(214,173,79,.28);border-radius:22px;background:rgba(255,255,255,.07);padding:16px}
.card img{width:100%;max-height:220px;object-fit:cover;border-radius:16px;margin-bottom:12px}
.card h2{font-size:20px;margin:8px 0;color:#fff}
.card p{color:#d1d5db;line-height:1.5}
.meta{color:#f4d37a;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
.empty{border:1px solid rgba(214,173,79,.28);border-radius:22px;padding:22px;color:#d1d5db}
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <h1>GNK ASG Publications</h1>
    <div><a href="/">Početna</a> · <a href="/operator-dashboard/">Admin</a> · <a href="/api/publications">JSON</a></div>
  </div>
  <div class="grid">${cards}</div>
</div>
</body>
</html>`);
}

async function GNK_PUB_DETAIL_HTML(env,slug){
  const items=await GNK_PUB_GET(env,"publish:approved");
  const item=items.find(x=>String(x.slug||"")===String(slug||""))||null;
  if(!item)return GNK_PUB_HTML(`<!doctype html><html><head><meta charset="utf-8"><title>Objava nije pronađena</title></head><body style="font-family:Arial;background:#07101f;color:#fff;padding:40px"><h1>Objava nije pronađena</h1><p><a style="color:#f4d37a" href="/publications/">Natrag</a></p></body></html>`,404);

  return GNK_PUB_HTML(`<!doctype html>
<html lang="${GNK_PUB_ESC(item.lang||"hr")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${GNK_PUB_ESC(item.title||"GNK ASG objava")}</title>
<meta name="description" content="${GNK_PUB_ESC(item.summary||"GNK ASG objava")}">
<style>
body{margin:0;background:#07101f;color:#f8fafc;font-family:Inter,Arial,sans-serif}
main{max-width:920px;margin:0 auto;padding:38px 18px}
h1{font-family:Georgia,serif;color:#f4d37a;font-size:38px;line-height:1.1}
.meta{color:#f4d37a;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
.article{font-size:18px;line-height:1.7;color:#e5e7eb;white-space:pre-wrap}
a{color:#f4d37a;text-decoration:none;font-weight:800}
img{max-width:100%;border-radius:22px}
</style>
</head>
<body>
<main>
<p><a href="/publications/">← Publications</a> · <a href="/">Početna</a></p>
<div class="meta">${GNK_PUB_ESC(item.type||"objava")} · ${GNK_PUB_ESC(item.publishedAt||item.approvedAt||"")}</div>
<h1>${GNK_PUB_ESC(item.title||"Bez naslova")}</h1>
${item.image?`<img src="${GNK_PUB_ESC(item.image)}" alt="${GNK_PUB_ESC(item.title||"GNK ASG objava")}">`:""}
<p>${GNK_PUB_ESC(item.summary||"")}</p>
<div class="article">${GNK_PUB_ESC(item.body||"")}</div>
</main>
</body>
</html>`);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname;

    if(request.method==="GET"&&path==="/api/publications")return GNK_PUB_JSON({ok:true,items:await GNK_PUB_GET(env,"publish:approved")});
    if(request.method==="GET"&&path==="/api/publish-approved")return GNK_PUB_JSON({ok:true,items:await GNK_PUB_GET(env,"publish:approved")});
    if(request.method==="GET"&&(path==="/publications/"||path==="/objave-admin/"))return await GNK_PUB_LIST_HTML(env);
    if(request.method==="GET"&&path.startsWith("/publications/")&&path!=="/publications/"){
      const slug=path.replace(/^\/publications\//,"").replace(/\/$/,"");
      return await GNK_PUB_DETAIL_HTML(env,slug);
    }

    return await __GNK_ASG_BEFORE_PUBLICATIONS_FIX__.fetch(request,env,ctx);
  },

  async scheduled(event,env,ctx){
    if(__GNK_ASG_BEFORE_PUBLICATIONS_FIX__&&typeof __GNK_ASG_BEFORE_PUBLICATIONS_FIX__.scheduled==="function"){
      return await __GNK_ASG_BEFORE_PUBLICATIONS_FIX__.scheduled(event,env,ctx);
    }
  },

  async email(message,env,ctx){
    if(__GNK_ASG_BEFORE_PUBLICATIONS_FIX__&&typeof __GNK_ASG_BEFORE_PUBLICATIONS_FIX__.email==="function"){
      return await __GNK_ASG_BEFORE_PUBLICATIONS_FIX__.email(message,env,ctx);
    }
  }
};

const GNK_ASG_PUBLICATIONS_ONLY_FIX_END=true;
