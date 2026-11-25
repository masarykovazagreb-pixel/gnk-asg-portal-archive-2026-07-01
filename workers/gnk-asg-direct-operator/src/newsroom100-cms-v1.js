// AKTUAL MEDIA — authenticated runtime editorial CMS (feature-branch implementation, not live yet).
export const VERSION="AKTUAL_NEWSROOM100_D1_R2_V1";
const ORIGIN="https://gnk-asg.hr",PREFIX="/gnk-aktual/novosti/";
const escapeHTML=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const normalize=x=>String(x??"").trim();
const response=(body,status=200,contentType="text/html; charset=utf-8")=>new Response(body,{status,headers:{"content-type":contentType,"x-content-type-options":"nosniff","cache-control":"no-store"}});
const json=(value,status=200)=>response(JSON.stringify(value),status,"application/json; charset=utf-8");
function sourceUrls(input){
 const urls=[...new Set(String(input??"").split(/[\r\n;]+/).map(x=>x.trim()).filter(Boolean))].map(x=>{
  let u;try{u=new URL(x)}catch{throw new Error("Nevaljana poveznica na izvor")}
  if(u.protocol!=="https:"||!u.hostname.includes(".")||u.username||u.password)throw new Error("Izvor mora biti javna HTTPS poveznica");
  return u.toString();
 });
 if(urls.length<2||urls.length>10||new Set(urls.map(u=>new URL(u).hostname.replace(/^www\./,""))).size<2)throw new Error("Potrebne su dvije neovisne domene izvora");
 return urls;
}
function slugify(input){return normalize(input).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/đ/g,"d").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90).replace(/-$/,"");}
export function validateArticle(input){
 const title=normalize(input.title),slug=normalize(input.slug)||slugify(title),body=normalize(input.body);
 if(title.length<18||title.length>145)throw new Error("Naslov mora imati 18–145 znakova");
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>95)throw new Error("Pogrešna URL oznaka");
 if(body.split(/\s+/).filter(Boolean).length<90||body.length>28000)throw new Error("Originalni tekst mora imati najmanje 90 riječi i najviše 28.000 znakova");
 if(input.editorial_verified!=="yes")throw new Error("Nedostaje urednička potvrda");
 return {title,slug,body,sources:sourceUrls(input.sources)};
}
async function authorized(req,env,ctx,app){
 const url=new URL("/api/operator-auth-check",req.url),headers=new Headers(req.headers);
 headers.delete("content-length");headers.delete("content-type");
 try{const r=await app.fetch(new Request(url,{method:"GET",headers,redirect:"manual"}),env,ctx);return r.ok&&(await r.json()).authenticated===true}catch{return false}
}
function checkOrigin(request){const url=new URL(request.url);return request.headers.get("origin")===url.origin&&request.headers.get("sec-fetch-site")!=="cross-site";}
async function initDB(env){
 const db=env.GNK_ASG_D1;if(!db)throw new Error("Cloudflare D1 nije konfiguriran");
 await db.prepare("CREATE TABLE IF NOT EXISTS aktual_newsroom100_articles (slug TEXT PRIMARY KEY,title TEXT NOT NULL,html TEXT NOT NULL,image_url TEXT NOT NULL,published_at TEXT NOT NULL,source_urls TEXT NOT NULL,status TEXT NOT NULL)").run();
 await db.prepare("CREATE INDEX IF NOT EXISTS idx_aktual_newsroom100_recent ON aktual_newsroom100_articles(published_at DESC)").run();
 return db;
}
async function findArticle(env,slug){
 if(!env.GNK_ASG_D1)return null;
 try{return await env.GNK_ASG_D1.prepare("SELECT slug,title,html,image_url,published_at FROM aktual_newsroom100_articles WHERE slug=? AND status='published'").bind(slug).first()}catch{return null}
}
async function listArticles(env,limit=100,days=365){
 if(!env.GNK_ASG_D1)return [];
 try{const cutoff=new Date(Date.now()-days*86400000).toISOString();const r=await env.GNK_ASG_D1.prepare("SELECT slug,title,image_url,published_at FROM aktual_newsroom100_articles WHERE status='published' AND published_at>=? ORDER BY published_at DESC LIMIT ?").bind(cutoff,limit).all();return r.results||[]}catch{return []}
}
function renderArticle(data,image,caption,licenseUrl,date){
 const url=ORIGIN+PREFIX+data.slug+"/",desc=data.body.replace(/\s+/g," ").slice(0,150);
 const news={"@context":"https://schema.org","@type":"NewsArticle",headline:data.title,description:desc,url,mainEntityOfPage:url,inLanguage:"hr",datePublished:date,dateModified:date,image:[ORIGIN+image],author:{"@type":"Organization",name:"Redakcija AKTUAL MEDIA"},publisher:{"@type":"Organization",name:"AKTUAL MEDIA",url:ORIGIN+"/gnk-aktual/"},citation:data.sources};
 const ps=data.body.split(/\n\s*\n/).map(p=>"<p>"+escapeHTML(p.replace(/\s*\n\s*/g," "))+"</p>").join("");
 const cites=data.sources.map((s,i)=>'<li><a href="'+escapeHTML(s)+'" rel="noopener noreferrer" target="_blank">Izvor '+(i+1)+": "+escapeHTML(new URL(s).hostname)+"</a></li>").join("");
 const cred=escapeHTML(caption)+(licenseUrl?'; <a href="'+escapeHTML(licenseUrl)+'" rel="license noopener noreferrer" target="_blank">Prava/licenca</a>':"");
 return '<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
 '<title>'+escapeHTML(data.title)+' | AKTUAL MEDIA</title><meta name="robots" content="index,follow,max-image-preview:large"><meta name="description" content="'+escapeHTML(desc)+'">'+
 '<link rel="canonical" href="'+url+'"><meta property="og:type" content="article"><meta property="og:title" content="'+escapeHTML(data.title)+'"><meta property="og:url" content="'+url+'"><meta property="og:image" content="'+ORIGIN+image+'">'+
 '<meta name="twitter:card" content="summary_large_image"><meta property="article:published_time" content="'+date+'"><script type="application/ld+json">'+JSON.stringify(news).replace(/</g,"\\u003c")+'</script>'+
 '<style>body{margin:0;background:#fff;color:#15233b;font:17px/1.8 system-ui,sans-serif}header,footer{background:#091b33;color:white;padding:18px 6%}header a,footer a{color:white}main{max-width:790px;margin:auto;padding:30px 20px}h1{font-size:clamp(2rem,4vw,3rem);line-height:1.15}img{width:100%;height:auto;border-radius:12px}figcaption,time{font-size:.82rem;color:#667}figure{margin:20px 0}aside{border-top:1px solid #ddd;margin-top:35px;padding-top:15px}a{color:#125094}</style>'+
 '</head><body><header><a href="/gnk-aktual/">AKTUAL MEDIA</a> / <a href="'+PREFIX+'">Vijesti</a></header><main><article><h1>'+escapeHTML(data.title)+'</h1><p>Redakcija AKTUAL MEDIA · <time datetime="'+date+'">'+date.slice(0,16).replace("T"," ")+' UTC</time></p>'+
 '<figure><img src="'+escapeHTML(image)+'" alt="'+escapeHTML(data.title)+'" width="1200" height="630"><figcaption>'+cred+'</figcaption></figure>'+ps+'</article><aside><h2>Izvori</h2><ol>'+cites+'</ol><p>Originalni redakcijski tekst; za ispravke kontaktirajte redakciju.</p></aside></main><footer><a href="/gnk-aktual/">AKTUAL MEDIA</a></footer></body></html>';
}
function svgCover(title){return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#091a32"/><rect x="70" y="80" width="12" height="450" fill="#d5ac5c"/><text x="115" y="155" fill="white" font-family="Arial" font-size="52" font-weight="bold">AKTUAL MEDIA</text><text x="115" y="230" fill="#d5ac5c" font-family="Arial" font-size="24">ORIGINALNA REDAKCIJSKA ILUSTRACIJA</text><text x="115" y="500" fill="white" font-family="Arial" font-size="28">'+escapeHTML(title.slice(0,62))+'</text></svg>';}
async function publish(req,env){
 if(!checkOrigin(req))return json({ok:false,error:"CSRF provjera nije uspjela"},403);
 if(Number(req.headers.get("content-length")||0)>7500000)return json({ok:false,error:"Zahtjev je prevelik"},413);
 const f=await req.formData();
 const data=validateArticle({title:f.get("title"),slug:f.get("slug"),body:f.get("body"),sources:f.get("sources"),editorial_verified:f.get("editorial_verified")});
 const db=await initDB(env);
 if(await findArticle(env,data.slug))return json({ok:false,error:"Ovaj URL već postoji"},409);
 let image="/media/aktual100/"+data.slug+".svg",caption="Originalna ilustracija AKTUAL MEDIA",licenseUrl="",key=null;
 const photo=f.get("photo");
 if(photo&&typeof photo.arrayBuffer==="function"&&photo.size>0){
  if(!env.GNK_ASG_MEDIA_ASSETS)throw new Error("Cloudflare R2 nije konfiguriran");
  const mime=new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"],["image/avif","avif"]]);
  const ext=mime.get(photo.type);if(!ext||photo.size>5000000)throw new Error("Fotografija mora biti JPG/PNG/WebP/AVIF do 5MB");
  const rights=normalize(f.get("photo_rights")),credit=normalize(f.get("photo_credit"));
  licenseUrl=normalize(f.get("photo_license_url"));
  if(!["owned","licensed","cc-by","public-domain"].includes(rights))throw new Error("Nedostaje provjerena osnova prava na fotografiju");
  if(rights!=="owned"&&!credit)throw new Error("Za tuđu fotografiju navedi autora/izvor");
  if(["cc-by","licensed"].includes(rights)&&!licenseUrl)throw new Error("Unesi dokumentiranu HTTPS licencu");
  if(licenseUrl){const u=new URL(licenseUrl);if(u.protocol!=="https:"||!u.hostname.includes(".")||u.username||u.password)throw new Error("Nevaljana poveznica licence");}
  key="newsroom100/"+data.slug+"/"+crypto.randomUUID()+"."+ext;
  await env.GNK_ASG_MEDIA_ASSETS.put(key,await photo.arrayBuffer(),{httpMetadata:{contentType:photo.type},customMetadata:{rights,credit:credit||"own",licenseUrl}});
  caption="Fotografija: "+(credit||"AKTUAL MEDIA")+"; "+rights;
  image="/media/aktual100/"+key.slice("newsroom100/".length);
 }
 const date=new Date().toISOString(),html=renderArticle(data,image,caption,licenseUrl,date);
 try{await db.prepare("INSERT INTO aktual_newsroom100_articles(slug,title,html,image_url,published_at,source_urls,status) VALUES(?,?,?,?,?,?,'published')").bind(data.slug,data.title,html,image,date,JSON.stringify(data.sources)).run()}
 catch(error){if(key)try{await env.GNK_ASG_MEDIA_ASSETS.delete(key)}catch{};throw error}
 const row=await findArticle(env,data.slug);
 if(!row)return json({ok:false,error:"Zapis nije potvrđen"},500);
 return json({ok:true,status:"published-in-d1",publicUrl:ORIGIN+PREFIX+data.slug+"/",slug:data.slug,publishedAt:date},201);
}
async function aiDraft(req,env){
 if(!checkOrigin(req))return json({ok:false,error:"CSRF provjera nije uspjela"},403);
 if(Number(req.headers.get("content-length")||0)>18000)return json({ok:false,error:"Predugačak zahtjev"},413);
 const input=await req.json(),title=normalize(input?.title),facts=normalize(input?.facts),sources=sourceUrls(input?.sources);
 if(title.length<18||title.length>145||facts.length<140||facts.length>10000)return json({ok:false,error:"Za AI su potrebne konkretne uredničke bilješke"},400);
 if(!env?.AI?.run)return json({ok:false,error:"AI nije dostupan u ovom Cloudflare okruženju"},503);
 const db=await initDB(env),today=new Date().toISOString().slice(0,10);
 await db.prepare("CREATE TABLE IF NOT EXISTS aktual_newsroom100_drafts (id TEXT PRIMARY KEY,created_at TEXT NOT NULL)").run();
 const c=await db.prepare("SELECT COUNT(*) n FROM aktual_newsroom100_drafts WHERE created_at>=?").bind(today+"T00:00:00Z").first();
 if(Number(c?.n||0)>=100)return json({ok:false,error:"Dnevna kvota 100 AI nacrta je dosegnuta"},429);
 await db.prepare("INSERT INTO aktual_newsroom100_drafts (id,created_at) VALUES (?,?)").bind(crypto.randomUUID(),new Date().toISOString()).run();
 const model=normalize(env.AUTO_EDITOR_MODEL)||"@cf/meta/llama-3.1-8b-instruct-fast";
 const prompt="NASLOV: "+title+"\nPROVJERENE BILJEŠKE:\n"+facts+"\nIZVORI:\n"+sources.join("\n");
 const result=await env.AI.run(model,{messages:[{role:"system",content:"Piši na hrvatskom originalan nacrt vijesti od 180–450 riječi isključivo iz dostavljenih činjenica. Ne tvrdi da si otvorio URL-ove. Ne izmišljaj citate, datume, imena ili brojke. Nesigurnosti izričito istakni. Bez HTML-a."},{role:"user",content:prompt}],max_tokens:1900,temperature:0.3});
 const draft=normalize(result?.response||result?.text);
 if(draft.length<250)return json({ok:false,error:"Model nije proizveo kvalitetan nacrt; ništa nije objavljeno"},502);
 return json({ok:true,status:"UNVERIFIED_DRAFT",body:draft,requiresEditorialReview:true});
}
export async function handleNewsroom100(req,env,ctx,app){
 const p=new URL(req.url).pathname,m=req.method;
 if(p==="/api/newsroom100/status"||p==="/api/newsroom100/publish"||p==="/api/newsroom100/ai-draft"){
  if(!await authorized(req,env,ctx,app))return json({ok:false,error:"Potrebna je administratorska prijava"},401);
  try{
   if(p==="/api/newsroom100/status"&&m==="GET")return json({ok:true,d1:Boolean(env.GNK_ASG_D1),r2:Boolean(env.GNK_ASG_MEDIA_ASSETS),ai:Boolean(env?.AI?.run),publishedLast48Hours:(await listArticles(env,100,2)).length});
   if(p==="/api/newsroom100/publish"&&m==="POST")return await publish(req,env);
   if(p==="/api/newsroom100/ai-draft"&&m==="POST")return await aiDraft(req,env);
   return json({ok:false,error:"Metoda nije dopuštena"},405);
  }catch(e){return json({ok:false,error:normalize(e.message||e).slice(0,200)},400)}
 }
 if(!["GET","HEAD"].includes(m))return null;
 if(p===PREFIX||p===PREFIX.slice(0,-1)){
  const entries=await listArticles(env,100,365);
  const list=entries.map(x=>'<li><a href="'+PREFIX+escapeHTML(x.slug)+'/">'+escapeHTML(x.title)+'</a> <time>'+escapeHTML(x.published_at.slice(0,10))+'</time></li>').join("");
  const html='<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="'+ORIGIN+PREFIX+'"><title>Najnovije vijesti — AKTUAL MEDIA</title></head><body style="font:18px/1.7 system-ui;max-width:800px;margin:3rem auto;padding:1rem"><a href="/gnk-aktual/">AKTUAL MEDIA</a><h1>Najnovije vijesti</h1><ol>'+list+'</ol></body></html>';
  return response(m==="HEAD"?null:html,200);
 }
 if(p==="/gnk-aktual/news-sitemap.xml"){
  const entries=await listArticles(env,1000,2);
  const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'+entries.map(x=>'<url><loc>'+ORIGIN+PREFIX+escapeHTML(x.slug)+'/</loc><news:news><news:publication><news:name>AKTUAL MEDIA</news:name><news:language>hr</news:language></news:publication><news:publication_date>'+escapeHTML(x.published_at)+'</news:publication_date><news:title>'+escapeHTML(x.title)+'</news:title></news:news></url>').join("")+'</urlset>';
  return response(m==="HEAD"?null:xml,200,"application/xml; charset=utf-8");
 }
 if(p==="/sitemap-index.xml"&&env?.ASSETS?.fetch){
  try{const r=await env.ASSETS.fetch(new Request(req.url,{method:"GET"}));if(!r.ok)return null;let xml=await r.text();if(!xml.includes("</sitemapindex>"))return null;
   if(!xml.includes("/gnk-aktual/news-sitemap.xml"))xml=xml.replace("</sitemapindex>","<sitemap><loc>"+ORIGIN+"/gnk-aktual/news-sitemap.xml</loc></sitemap></sitemapindex>");
   return response(m==="HEAD"?null:xml,200,"application/xml; charset=utf-8");
  }catch{return null}
 }
 const original=p.match(/^\/media\/aktual100\/([a-z0-9-]+)\.svg$/);
 if(original){const article=await findArticle(env,original[1]);if(!article)return null;return response(m==="HEAD"?null:svgCover(article.title),200,"image/svg+xml");}
 const photo=p.match(/^\/media\/aktual100\/([a-z0-9-]+)\/([a-z0-9-]+\.(?:jpg|png|webp|avif))$/);
 if(photo&&env.GNK_ASG_MEDIA_ASSETS){
  const key="newsroom100/"+photo[1]+"/"+photo[2],asset=await env.GNK_ASG_MEDIA_ASSETS.get(key);
  if(!asset)return null;const h=new Headers({"cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"});asset.writeHttpMetadata(h);
  return new Response(m==="HEAD"?null:asset.body,{status:200,headers:h});
 }
 const match=p.match(/^\/gnk-aktual\/novosti\/([a-z0-9-]+)\/?$/);
 if(match){const article=await findArticle(env,match[1]);if(!article)return null;const live=response(m==="HEAD"?null:article.html,200);live.headers.set("x-aktual-newsroom100-public","published-in-d1");return live;}
 return null;
}
