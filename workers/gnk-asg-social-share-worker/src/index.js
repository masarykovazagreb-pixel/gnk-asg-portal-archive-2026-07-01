const DEFAULT_IMAGE = 'https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png';
const INDEX_KEY = 'social-share:index:v1';
const LOG_KEY = 'social-share:log:v1';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors(request)});

    if (url.pathname === '/api/social-share/status') {
      return json(request,{ok:true,service:'GNK ASG Social Share',mode:'preview',productionRouteConfigured:false,kv:Boolean(env.GNK_ASG_KV),updatedAt:new Date().toISOString()});
    }

    const shareMatch = url.pathname.match(/^\/s\/([a-z0-9-]{8,80})$/i);
    if (request.method === 'GET' && shareMatch) return renderSharePage(request,env,shareMatch[1]);

    if (!authorized(request,env)) return json(request,{ok:false,error:'unauthorized'},401);

    if (request.method === 'POST' && url.pathname === '/api/social-share/create') return createShare(request,env);
    if (request.method === 'POST' && url.pathname === '/api/social-share/log') return logShare(request,env);
    if (request.method === 'GET' && url.pathname === '/api/social-share/log') return listLog(request,env);
    if (request.method === 'GET' && url.pathname === '/api/social-share/metadata') return inspectMetadata(request,url);

    return json(request,{ok:false,error:'not_found',path:url.pathname},404);
  }
};

async function createShare(request,env) {
  let input;
  try { input = await request.json(); } catch { return json(request,{ok:false,error:'invalid_json'},400); }
  try {
    const record = normalizeRecord(input);
    const id = slugId(record.title);
    const createdAt = new Date().toISOString();
    const stored = {...record,id,createdAt,updatedAt:createdAt};
    await env.GNK_ASG_KV?.put(`social-share:${id}`,JSON.stringify(stored,null,2));
    const index = await readList(env,INDEX_KEY);
    const next = [{id,title:stored.title,targetUrl:stored.targetUrl,image:stored.image,contentType:stored.contentType,createdAt},...index.filter(x=>x.id!==id)].slice(0,1000);
    await env.GNK_ASG_KV?.put(INDEX_KEY,JSON.stringify(next,null,2));
    const origin = new URL(request.url).origin;
    return json(request,{ok:true,id,shareUrl:`${origin}/s/${id}`,record:stored},201);
  } catch (error) {
    return json(request,{ok:false,error:String(error?.message||error)},400);
  }
}

async function logShare(request,env) {
  let input;
  try { input = await request.json(); } catch { return json(request,{ok:false,error:'invalid_json'},400); }
  const item = {
    id:crypto.randomUUID(),
    provider:String(input.provider||'unknown').slice(0,40),
    targetUrl:safePublicUrl(input.targetUrl||input.shareUrl),
    shareUrl:String(input.shareUrl||'').slice(0,800),
    title:String(input.title||'').slice(0,180),
    selectedImage:String(input.image||DEFAULT_IMAGE).slice(0,1200),
    createdBy:String(input.createdBy||'admin').slice(0,120),
    createdAt:new Date().toISOString()
  };
  const log = await readList(env,LOG_KEY);
  await env.GNK_ASG_KV?.put(LOG_KEY,JSON.stringify([item,...log].slice(0,2000),null,2));
  return json(request,{ok:true,item},201);
}

async function listLog(request,env) {
  const items = await readList(env,LOG_KEY);
  return json(request,{ok:true,count:items.length,items});
}

async function renderSharePage(request,env,id) {
  const raw = await env.GNK_ASG_KV?.get(`social-share:${id}`);
  if (!raw) return html('Share zapis nije pronađen.',404);
  let record;
  try { record = JSON.parse(raw); } catch { return html('Neispravan share zapis.',500); }
  const schemaType = ['publication','news'].includes(record.contentType) ? 'Article' : 'WebPage';
  const schema = {
    '@context':'https://schema.org','@type':schemaType,
    headline:record.title,description:record.description,url:record.targetUrl,
    image:{'@type':'ImageObject',url:record.image,caption:record.imageAlt||record.title},
    publisher:{'@type':'Organization',name:'GNK ASG d.o.o.',url:'https://gnk-asg.hr'}
  };
  const body = `<!doctype html><html lang="${escapeAttr(record.language||'hr')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(record.title)}</title><meta name="description" content="${escapeAttr(record.description)}"><link rel="canonical" href="${escapeAttr(record.targetUrl)}"><meta property="og:type" content="${schemaType==='Article'?'article':'website'}"><meta property="og:site_name" content="GNK ASG"><meta property="og:title" content="${escapeAttr(record.title)}"><meta property="og:description" content="${escapeAttr(record.description)}"><meta property="og:url" content="${escapeAttr(new URL(request.url).href)}"><meta property="og:image" content="${escapeAttr(record.image)}"><meta property="og:image:secure_url" content="${escapeAttr(record.image)}"><meta property="og:image:alt" content="${escapeAttr(record.imageAlt||record.title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeAttr(record.title)}"><meta name="twitter:description" content="${escapeAttr(record.description)}"><meta name="twitter:image" content="${escapeAttr(record.image)}"><script type="application/ld+json">${safeJson(schema)}</script><style>body{margin:0;background:#050d19;color:#f7f9fc;font-family:Arial,sans-serif}.wrap{max-width:860px;margin:0 auto;padding:36px 22px}.card{overflow:hidden;border:1px solid rgba(212,175,55,.35);border-radius:24px;background:#071426}.card img{display:block;width:100%;aspect-ratio:1.91/1;object-fit:cover}.content{padding:24px}.eyebrow{color:#d4af37;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}h1{font-family:Georgia,serif;font-size:clamp(30px,6vw,54px)}p{color:#aeb9cb;line-height:1.6}.button{display:inline-flex;margin-top:10px;padding:12px 18px;border-radius:999px;background:linear-gradient(135deg,#d4af37,#f0d77d);color:#07101f;text-decoration:none;font-weight:900}</style></head><body><main class="wrap"><article class="card"><img src="${escapeAttr(record.image)}" alt="${escapeAttr(record.imageAlt||record.title)}"><div class="content"><div class="eyebrow">GNK ASG · ${escapeHtml(record.contentType)}</div><h1>${escapeHtml(record.title)}</h1><p>${escapeHtml(record.description)}</p><a class="button" href="${escapeAttr(record.targetUrl)}">Otvori izvorni sadržaj</a></div></article></main><script>setTimeout(()=>location.replace(${JSON.stringify(record.targetUrl)}),1800)</script></body></html>`;
  return new Response(body,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public,max-age=300','x-robots-tag':'index,follow'}});
}

async function inspectMetadata(request,url) {
  try {
    const target = safePublicUrl(url.searchParams.get('url'));
    const response = await fetch(target,{headers:{accept:'text/html','user-agent':'GNK-ASG-Social-Share/1.0'},redirect:'follow'});
    const text = await response.text();
    const title = readMeta(text,'property','og:title') || readTitle(text);
    const description = readMeta(text,'property','og:description') || readMeta(text,'name','description');
    const image = absolute(readMeta(text,'property','og:image') || readMeta(text,'name','twitter:image') || DEFAULT_IMAGE,target);
    const canonical = absolute(readLink(text,'canonical') || target,target);
    return json(request,{ok:response.ok,status:response.status,title,description,image,canonical,targetUrl:target});
  } catch (error) {
    return json(request,{ok:false,error:String(error?.message||error)},400);
  }
}

function normalizeRecord(input) {
  const targetUrl = safePublicUrl(input.targetUrl);
  const title = String(input.title||'').trim().slice(0,180);
  const description = String(input.description||'').trim().slice(0,500);
  if (title.length<8) throw new Error('Naslov je prekratak.');
  if (description.length<20) throw new Error('Opis je prekratak.');
  const image = safeImageUrl(input.image||DEFAULT_IMAGE);
  return {
    targetUrl,title,description,image,
    imageAlt:String(input.imageAlt||title).trim().slice(0,220),
    contentType:String(input.contentType||'page').slice(0,40),
    language:['hr','en'].includes(input.language)?input.language:'hr',
    caption:String(input.caption||'').slice(0,1600),
    hashtags:String(input.hashtags||'').slice(0,400),
    createdBy:String(input.createdBy||'admin').slice(0,120)
  };
}

function safePublicUrl(value) {
  const url = new URL(String(value||''),'https://gnk-asg.hr');
  if (!/(^|\.)gnk-asg\.hr$/i.test(url.hostname) && !/\.workers\.dev$/i.test(url.hostname)) throw new Error('URL nije dopušten.');
  if (/\/(operator|admin|mail-center|mail-studio|command-center|social-share)\//i.test(url.pathname)) throw new Error('Privatna administratorska ruta nije dopuštena.');
  url.hash='';
  return url.href;
}

function safeImageUrl(value) {
  const url = new URL(String(value||DEFAULT_IMAGE),'https://gnk-asg.hr');
  if (!['https:'].includes(url.protocol)) throw new Error('Slika mora koristiti HTTPS.');
  return url.href;
}

function slugId(title) {
  const slug = String(title||'share').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,52) || 'share';
  return `${slug}-${crypto.randomUUID().slice(0,8)}`;
}

async function readList(env,key) {
  if (!env.GNK_ASG_KV) return [];
  const raw = await env.GNK_ASG_KV.get(key);
  if (!raw) return [];
  try { const data=JSON.parse(raw); return Array.isArray(data)?data:[]; } catch { return []; }
}

function suppliedToken(request) {
  const bearer=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  return String(request.headers.get('x-operator-token')||bearer).trim();
}

function authorized(request,env) {
  const expected=String(env.OPERATOR_TOKEN||env.GNK_ASG_OPERATOR_TOKEN||'').trim();
  return Boolean(expected&&suppliedToken(request)===expected);
}

function readMeta(html,attr,name) {
  const tags=String(html||'').match(/<meta\b[^>]*>/gi)||[];
  for (const tag of tags) {
    if (!new RegExp(`${attr}=["']${escapeRegex(name)}["']`,'i').test(tag)) continue;
    const match=tag.match(/content=["']([^"']+)["']/i);
    if (match) return decode(match[1]);
  }
  return '';
}

function readLink(html,rel) {
  const tags=String(html||'').match(/<link\b[^>]*>/gi)||[];
  for (const tag of tags) {
    if (!new RegExp(`rel=["']${escapeRegex(rel)}["']`,'i').test(tag)) continue;
    const match=tag.match(/href=["']([^"']+)["']/i);
    if (match) return decode(match[1]);
  }
  return '';
}

function readTitle(html) {
  const match=String(html||'').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?decode(match[1].replace(/<[^>]+>/g,' ').trim()):'';
}

function absolute(value,base) { try{return new URL(value,base).href}catch{return String(value||'')} }
function decode(value){return String(value||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function escapeRegex(value){return String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function escapeAttr(value){return escapeHtml(value).replace(/`/g,'&#096;')}
function safeJson(value){return JSON.stringify(value).replace(/</g,'\\u003c')}
function cors(request){const origin=String(request.headers.get('origin')||'');const allowed=/^https:\/\/([a-z0-9-]+\.)?gnk-asg\.hr$/i.test(origin)||/^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(origin)?origin:'https://gnk-asg.hr';return{'access-control-allow-origin':allowed,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization,x-operator-token','cache-control':'no-store',vary:'Origin'}}
function json(request,data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8',...cors(request)}})}
function html(message,status=200){return new Response(`<!doctype html><meta charset="utf-8"><title>GNK ASG</title><body style="font-family:Arial;padding:40px">${escapeHtml(message)}</body>`,{status,headers:{'content-type':'text/html; charset=utf-8'}})}
