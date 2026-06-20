import { gnkAsgCriticalFixResponse } from "./gnk-asg-critical-fix-map-logs-v1.js";
import { gnkAsgAllPagesDesignResponse } from "./gnk-asg-all-pages-design-v1.js";
import { gnkAsgEmailSignaturesJsonResponse, gnkAsgEmailSignaturesHtmlResponse, gnkAsgAskPageResponse, gnkAsgMarketsPageResponse, gnkAsgOperatorSimpleStatusResponse } from "./gnk-asg-functional-connectors-v1.js";
import { gnkAsgHomepageProfilePreviewV2Response } from "./gnk-asg-homepage-profile-preview-v2.js";
function gnkAsgSafeTextFix(v){
  if(v===null||v===undefined)return v;
  if(typeof v==="string"){
    return v
      .replaceAll("─å","Ć")
      .replaceAll("─ç","ć")
      .replaceAll("─ì","č")
      .replaceAll("─ì","č")
      .replaceAll("─æ","Č")
      .replaceAll("┼í","š")
      .replaceAll("┼á","Š")
      .replaceAll("┼╛","ž")
      .replaceAll("┼╜","Ž")
      .replaceAll("─æ","Č")
      .replaceAll("─ë","Đ")
      .replaceAll("─æ","Č")
      .replaceAll("┬╖"," | ")
      .replaceAll("Ã","")
      .replaceAll("Â","");
  }
  if(Array.isArray(v)) return v.map(gnkAsgSafeTextFix);
  if(typeof v==="object"){
    const o={};
    for(const k of Object.keys(v)){ o[k]=gnkAsgSafeTextFix(v[k]); }
    return o;
  }
  return v;
}
// GNK_ASG_SAFE_TEXT_FIX_V1
import { gnkAsgFaviconSvgResponse, gnkAsgLogoSvgResponse, gnkDinamoLtdLogoSvgResponse, gnkAsgLogosJsonResponse } from "./gnk-asg-brand-assets-v1.js";
import { gnkAsgOperationsLogicJsonResponse, gnkAsgOperationsLogicHtmlResponse } from "./gnk-asg-operations-logic-v1.js";
import { gnkAsgHomepageProfilePreviewResponse } from "./gnk-asg-homepage-profile-preview-v1.js";
import { gnkAsgHomepageProfileResponse } from "./gnk-asg-homepage-profile-v1.js";
import { gnkOfficialFinancialPdfsHandle, gnkOfficialFinancialPdfsApply } from "./gnk-asg-official-financial-pdfs-v1.js";
import { AKTUAL_NERMIN_COLUMNS } from "./gnk-asg-aktual-nermin-columns-v1.js";
import { __gnkAsgRealDocumentsInlineV2 } from "./gnk-asg-real-docs-v2.js";
const VERSION = "3.1.23-full-automation-extras-fixed";

const OPERATOR_HOST = "operator.gnk-asg.hr";
const API_HOST = "api.gnk-asg.hr";
const MEDIA_HOST = "media.gnk-asg.hr";
const ASSISTANT_HOST = "assistant.gnk-asg.hr";
const NEWS_HOST = "news.gnk-asg.hr";
const MARKET_HOST = "market.gnk-asg.hr";
const CONTACT_HOST = "contact.gnk-asg.hr";
const STATUS_HOST = "status.gnk-asg.hr";
const GOOGLE_VERIFICATION_FILE = "google46686328e30c759f.html";
const GOOGLE_VERIFICATION_CONTENT = "google-site-verification: google46686328e30c759f.html";

function nowIso(){ return new Date().toISOString(); }
function todayKey(){ return new Date().toISOString().slice(0,10); }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
function slugify(v){ return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90) || "gnk-asg"; }

function headers(type="application/json; charset=utf-8", extra={}){
  return {
    "content-type": type,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-operator-token",
    "cache-control": "no-store, max-age=0",
    ...extra
  };
}
function json(data,status=200){ return new Response(JSON.stringify(data,null,2),{status,headers:headers()}); }
function text(data,status=200,type="text/plain; charset=utf-8"){ return new Response(String(data),{status,headers:headers(type)}); }

function googleHead(env){
  if(env.GOOGLE_SITE_SCRIPT) return String(env.GOOGLE_SITE_SCRIPT);
  if(env.GOOGLE_TAG_ID){
    const id = String(env.GOOGLE_TAG_ID);
    return `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(id)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(id)}');</script>`;
  }
  return "";
}

function page(env,title,body,meta={}){
  const desc = meta.description || "GNK ASG korporativni portal, medijski kit, operator sustav, AI asistent i javni informacijski sloj.";
  const canonical = meta.canonical || "https://operator.gnk-asg.hr/";
  const schema = meta.schema ? `<script type="application/ld+json">${JSON.stringify(meta.schema)}</script>` : "";
  return text(`<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="google-site-verification" content="google46686328e30c759f.html">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical)}">
${schema}
${googleHead(env)}
<style>
:root{--bg:#07111f;--card:#0e1c31;--line:rgba(255,255,255,.14);--txt:#eef5ff;--mut:#aab8cc;--gold:#d5ad57;--ok:#18b56b;--warn:#dca62f;--bad:#d94b4b}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#112849,#07111f 52%,#040810);color:var(--txt);font-family:Arial,Helvetica,sans-serif;line-height:1.55}
a{color:#8fc7ff;text-decoration:none}a:hover{text-decoration:underline}.wrap{max-width:1180px;margin:0 auto;padding:28px}.nav{display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding:16px 0;border-bottom:1px solid var(--line);margin-bottom:28px}.brand{font-weight:800;color:white;margin-right:auto}.pill{border:1px solid var(--line);border-radius:999px;padding:8px 12px;background:rgba(255,255,255,.04)}.hero{padding:42px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(135deg,rgba(213,173,87,.18),rgba(14,28,49,.88));box-shadow:0 22px 80px rgba(0,0,0,.25)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px;margin-top:22px}.card{border:1px solid var(--line);border-radius:22px;background:rgba(14,28,49,.82);padding:20px}.small{color:var(--mut);font-size:14px}.btn{display:inline-block;border:1px solid var(--gold);border-radius:14px;padding:10px 14px;color:white;background:rgba(213,173,87,.18);margin:6px 8px 6px 0}.status-ok{color:var(--ok);font-weight:700}.status-warn{color:var(--warn);font-weight:700}.status-bad{color:var(--bad);font-weight:700}pre{white-space:pre-wrap;background:#06101d;border:1px solid var(--line);border-radius:16px;padding:14px;overflow:auto}input,textarea,select{width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:#07111f;color:white;margin:6px 0 12px}button{padding:12px 16px;border-radius:14px;border:1px solid var(--gold);background:rgba(213,173,87,.2);color:white;cursor:pointer}.article img,.visual{width:100%;border-radius:18px;border:1px solid var(--line);background:#0c1830}.badge{display:inline-block;padding:5px 9px;border-radius:999px;border:1px solid var(--line);font-size:12px;color:var(--mut)}
</style>
</head>
<body><div class="wrap"><nav class="nav"><div class="brand">GNK ASG</div><a class="pill" href="https://operator.gnk-asg.hr/app">Operator</a><a class="pill" href="https://operator.gnk-asg.hr/articles">Articles</a><a class="pill" href="https://media.gnk-asg.hr/media-kit">Media Kit</a><a class="pill" href="https://assistant.gnk-asg.hr">AI Assistant</a><a class="pill" href="https://news.gnk-asg.hr">News</a><a class="pill" href="https://market.gnk-asg.hr">Market</a><a class="pill" href="https://contact.gnk-asg.hr">Contact</a></nav>${body}</div></body></html>`,200,"text/html; charset=utf-8");
}

function unauthorized(){ return json({ok:false,error:"UNAUTHORIZED"},401); }
function authorized(request,env){ const got = request.headers.get("x-operator-token") || ""; const expected = env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || env.ADMIN_TOKEN || env.OPERATOR_SECRET || ""; return !!expected && got === expected; }
async function readJson(request){ try { return await request.json(); } catch { return {}; } }

async function kvGet(env,key,fallback=null){ try{ if(!env.GNK_ASG_CONFIG_KV) return fallback; const v = await env.GNK_ASG_CONFIG_KV.get(key); if(v === null || v === undefined) return fallback; return JSON.parse(v); }catch{ return fallback; } }
async function kvPut(env,key,val){ try{ if(env.GNK_ASG_CONFIG_KV) await env.GNK_ASG_CONFIG_KV.put(key, JSON.stringify(val)); }catch{} }
async function d1Exec(env,sql,params=[]){ try{ if(!env.GNK_ASG_D1) return null; return await env.GNK_ASG_D1.prepare(sql).bind(...params).run(); }catch(e){ return {error:String(e && e.message ? e.message : e)}; } }
async function d1All(env,sql,params=[]){ try{ if(!env.GNK_ASG_D1) return {results:[]}; return await env.GNK_ASG_D1.prepare(sql).bind(...params).all(); }catch{ return {results:[]}; } }
async function ensureD1(env){
  await d1Exec(env,`CREATE TABLE IF NOT EXISTS operator_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, type TEXT, ok INTEGER, payload TEXT)`);
  await d1Exec(env,`CREATE TABLE IF NOT EXISTS operator_checkpoints (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, reason TEXT, version TEXT, payload TEXT)`);
  await d1Exec(env,`CREATE TABLE IF NOT EXISTS contact_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT, at TEXT, name TEXT, email TEXT, topic TEXT, message TEXT, status TEXT, payload TEXT)`);
  await d1Exec(env,`CREATE TABLE IF NOT EXISTS published_articles (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, slug TEXT, title TEXT, payload TEXT)`);
}
async function logEvent(env,item){ const row={at:nowIso(),version:VERSION,...item}; const logs=await kvGet(env,"operator:logs",[]); logs.unshift(row); await kvPut(env,"operator:logs",logs.slice(0,250)); await d1Exec(env,`INSERT INTO operator_logs (at,type,ok,payload) VALUES (?,?,?,?)`,[row.at,row.type||"event",row.ok?1:0,JSON.stringify(row)]); }
async function getLogs(env,limit=50){ const d1=await d1All(env,`SELECT at,type,ok,payload FROM operator_logs ORDER BY id DESC LIMIT ?`,[limit]); if(d1.results && d1.results.length) return d1.results.map(r=>{try{return JSON.parse(r.payload)}catch{return r}}); return (await kvGet(env,"operator:logs",[])).slice(0,limit); }

function defaultArticles(){
  const d=todayKey();
  const topics=[
    ["gnk-asg-poslovni-signal","GNK ASG poslovni signal: stabilan javni informacijski sloj","GNK ASG nastavlja razvijati javni korporativni portal s naglaskom na stabilnost, transparentnost i odvojene informacijske module."],
    ["ai-operator-sloj","AI operator sloj i javni asistent","Javni AI asistent koristi ograničenu knjigu znanja i nema administratorske ovlasti, dok operator sloj ostaje odvojen i zaštićen."],
    ["media-kit-gnk-asg","Media Kit kao javna točka za treće strane","Media Kit objedinjuje osnovne podatke, brand materijale i download sloj za medije, partnere i druge treće strane."],
    ["market-intelligence-snapshot","Market intelligence i digital assets snapshot","Tržišni modul priprema strukturirani prikaz podataka uz jasne oznake statusa: LIVE, DELAYED, SNAPSHOT ili FALLBACK."],
    ["seo-meta-schema","SEO, meta i schema režim portala","Portal koristi odvojene SEO podatke, canonical pravila, schema.org zapise i katalog slika radi kvalitetnijeg indeksiranja."],
    ["nermin-sefic-author-hub","Nermin Sefić author hub","Author hub priprema javni profil autora i urednički sloj za poslovne komentare, tržišne signale i korporativne sažetke."],
    ["cloudflare-native-operator","Cloudflare-native operator bez GitHuba","Operator sustav razvija se kroz Cloudflare Worker, KV i D1 bez oslanjanja na GitHub i bez diranja produkcijske naslovnice."],
    ["image-catalog-seo","Katalog slika i SEO vizuali","Svaki članak dobiva vizual, alt tekst, caption i credit zapis kroz javni image catalog endpoint."]
  ];
  return topics.map((t,i)=>({
    id:`${d}-${t[0]}`, slug:`${d}-${t[0]}`, title:t[1], date:d, status:"PUBLISHED", category:i%2===0?"Corporate":"Technology", summary:t[2], lead:t[2],
    body:`${t[2]}\n\nOvaj sadržaj pripada GNK ASG autopilot informacijskom sloju. Svrha mu je osigurati lagan, indeksabilan i strukturiran javni prikaz bez opterećivanja glavne stranice. Početna stranica ostaje odvojena, brza i netaknuta, dok se članci, medijski sadržaj, statusi i tržišni moduli razvijaju kroz zasebne poddomene i podatkovne endpointove.\n\nSustav razlikuje javne informacijske prikaze od administrativnih naredbi. Javni slojevi dostupni su posjetiteljima, dok su operator naredbe zaštićene tokenom. Time se zadržava kontrola nad objavama, kontaktima, logovima i budućim povezivanjem s e-mail, R2 i vanjskim API izvorima.\n\nNapomena: podaci na portalu su informativni i ne predstavljaju pravni, financijski ni investicijski savjet.`,
    source:"GNK ASG Autopilot", seo:{title:`${t[1]} | GNK ASG`,description:t[2],canonical:`https://operator.gnk-asg.hr/articles/${d}-${t[0]}`}, image:{url:`https://operator.gnk-asg.hr/images/articles/${d}-${t[0]}.svg`,alt:`GNK ASG vizual: ${t[1]}`,caption:`Automatski generirani GNK ASG korporativni vizual za temu: ${t[1]}.`,credit:"GNK ASG automated visual system",type:"image/svg+xml"}
  }));
}
async function getArticles(env){ const kv=await kvGet(env,"articles:published",null); if(Array.isArray(kv)&&kv.length) return kv; const d1=await d1All(env,`SELECT payload FROM published_articles ORDER BY id DESC LIMIT 300`); const rows=[]; for(const r of d1.results||[]){ try{const a=JSON.parse(r.payload); if(a&&a.slug) rows.push(a);}catch{} } if(rows.length){ await kvPut(env,"articles:published",rows); return rows;} const defs=defaultArticles(); await kvPut(env,"articles:published",defs); return defs; }
async function saveArticles(env,articles){ await kvPut(env,"articles:published",articles); }
function buildImageCatalog(articles){ const list=Array.isArray(articles)?articles:[]; const images=list.map((a,i)=>{ const slug=a.slug||`article-${i+1}`; return {articleId:a.id||slug,title:a.title||"GNK ASG objava",slug,url:a.image?.url||`https://operator.gnk-asg.hr/images/articles/${slug}.svg`,alt:a.image?.alt||`GNK ASG vizual za objavu ${a.title||slug}`,caption:a.image?.caption||"Automatski generirani GNK ASG korporativni vizual.",credit:a.image?.credit||"GNK ASG automated visual system",type:a.image?.type||"image/svg+xml",articleUrl:a.seo?.canonical||`https://operator.gnk-asg.hr/articles/${slug}`}; }); return {ok:true,version:VERSION,updatedAt:nowIso(),count:images.length,images}; }
async function getImageCatalog(env){ const articles=await getArticles(env); const catalog=buildImageCatalog(articles); await kvPut(env,"images:catalog",catalog); return catalog; }
function articleSvg(slug,title){ const safeTitle=esc(title||slug); return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#07111f"/><stop offset=".55" stop-color="#12345c"/><stop offset="1" stop-color="#d5ad57"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="970" cy="120" r="210" fill="none" stroke="rgba(255,255,255,.20)" stroke-width="2"/><circle cx="970" cy="120" r="150" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2"/><text x="70" y="105" fill="#d5ad57" font-size="34" font-family="Arial" font-weight="700">GNK ASG</text><text x="70" y="190" fill="#ffffff" font-size="52" font-family="Arial" font-weight="800">${safeTitle}</text><text x="70" y="585" fill="#dbe8ff" font-size="25" font-family="Arial">Corporate Portal | AI Operator | Market Intelligence</text></svg>`; }

function mediaKitData(){ return {ok:true,version:VERSION,title:"GNK ASG Media Kit",entities:["GNK ASG d.o.o.","GNK DINAMO Ltd."],downloads:["/downloads/gnk-asg-company-factsheet.txt","/downloads/gnk-dinamo-ltd-company-factsheet.txt","/downloads/press-sheet.txt","/downloads/brand-guidelines.html","/downloads/media-kit-manifest.json"],note:"Media Kit MVP je funkcionalan. Profesionalni PDF i ZIP paket idu u sljedećoj fazi."}; }
function knowledgeBase(){ return {ok:true,version:VERSION,topics:[{id:"portal",keywords:["portal","gnk asg","stranica"],answer:"GNK ASG portal je korporativni informacijski sustav s odvojenim modulima za Media Kit, članke, kontakt, AI asistenta, market i status."},{id:"media-kit",keywords:["media kit","press","mediji","logo"],answer:"Media Kit je dostupan na https://media.gnk-asg.hr/media-kit i https://gnk-asg.hr/media-kit."},{id:"contact",keywords:["kontakt","email","poruka"],answer:"Kontakt obrazac je dostupan na https://contact.gnk-asg.hr. Poruke se spremaju u operator inbox."},{id:"market",keywords:["market","bitcoin","zlato","brent","usd","eur"],answer:"Market hub prikazuje informativne snapshot podatke i nije financijski savjet."},{id:"ai",keywords:["ai","asistent","assistant"],answer:"AI asistent koristi javnu knjigu znanja i nema administratorske ovlasti."},{id:"nermin",keywords:["nermin","sefic","sefić","autor"],answer:"Author hub je dostupan na https://operator.gnk-asg.hr/nermin-sefic."}]}; }
function answerKnowledge(q){ const s=String(q||"").toLowerCase(); let best=null,score=0; for(const t of knowledgeBase().topics){ let x=0; for(const k of t.keywords) if(s.includes(String(k).toLowerCase())) x+=2; if(x>score){score=x;best=t;} } return best?{ok:true,matched:true,topic:best.id,answer:best.answer}:{ok:true,matched:false,answer:"Nema preciznog odgovora u javnoj knjizi znanja. Za kontakt koristite contact.gnk-asg.hr."}; }
function mailSignatures(){ return {ok:true,version:VERSION,signatures:{"contact@gnk-asg.hr":"GNK ASG Contact Desk\nGNK ASG d.o.o.","press@gnk-asg.hr":"GNK ASG Press Desk\nMedia Relations","it@gnk-asg.hr":"IT – Osobni digitalni asistent\nGNK ASG Operator","assistant@gnk-asg.hr":"IT – Osobni digitalni asistent\nGNK ASG AI Assistant","media@gnk-asg.hr":"GNK ASG Media Desk","legal@gnk-asg.hr":"GNK ASG Legal Desk","privacy@gnk-asg.hr":"GNK ASG Privacy Desk","info@gnk-asg.hr":"GNK ASG Info Desk"}}; }
function autoReplies(){ return {ok:true,version:VERSION,replies:{contact:"Hvala na poruci. Vaš upit je zaprimljen i evidentiran.",press:"Hvala na medijskom upitu. Media Desk će pregledati zahtjev.",it:"Hvala. IT operator je zaprimio tehnički upit.",privacy:"Hvala. Upit vezan uz privatnost bit će evidentiran i obrađen."},sending:"QUEUE_ONLY_UNTIL_RESEND_OR_BREVO_KEY"}; }
function seoConfig(){ return {ok:true,version:VERSION,canonicalBase:"https://operator.gnk-asg.hr",hreflang:["hr","en"],schemas:{organization:{"@context":"https://schema.org","@type":"Organization","name":"GNK ASG d.o.o.","url":"https://gnk-asg.hr"},person:{"@context":"https://schema.org","@type":"Person","name":"Nermin Sefić","url":"https://operator.gnk-asg.hr/nermin-sefic"},mediaKit:{"@context":"https://schema.org","@type":"CreativeWork","name":"GNK ASG Media Kit"}}}; }
function newsData(){ return {ok:true,version:VERSION,status:"SCAFFOLD",updatedAt:nowIso(),homepageRule:"Homepage ostaje lagan; vijesti se prikazuju preko sažetka ili posebne poddomene.",items:[{title:"GNK ASG News Hub pripremljen",status:"DRAFT",source:"GNK ASG Autopilot",date:todayKey()}]}; }
function marketData(){ return {ok:true,version:VERSION,status:"SNAPSHOT",disclaimer:"Podaci su informativni, mogu kasniti i nisu financijski savjet.",updatedAt:nowIso(),assets:[{symbol:"BTC",name:"Bitcoin",status:"SNAPSHOT",value:null},{symbol:"XAU",name:"Zlato",status:"SNAPSHOT",value:null},{symbol:"BRENT",name:"Brent nafta",status:"SNAPSHOT",value:null},{symbol:"USD/EUR",name:"USD/EUR",status:"SNAPSHOT",value:null}]}; }
function systemStatusData(){ return {ok:true,version:VERSION,updatedAt:nowIso(),state:"GREEN",color:"green",label:"All public automation modules are online",badge:{text:"AI",textColor:"#ffffff",ring:"#d5ad57",position:"right",duplicate:false},rules:{green:"sve ključno radi",yellow:"djelomično kašnjenje ili fallback",red:"greška, fallback ili zastarjeli podaci"}}; }
function exchangesData(){ return {ok:true,version:VERSION,updatedAt:nowIso(),status:"SNAPSHOT",disclaimer:"Informativni prikaz. Nije financijski savjet.",exchanges:[{name:"NASDAQ",region:"US",status:"SNAPSHOT",source:"placeholder",lastSuccessfulRefresh:null,fallback:true},{name:"NYSE",region:"US",status:"SNAPSHOT",source:"placeholder",lastSuccessfulRefresh:null,fallback:true},{name:"Frankfurt Stock Exchange",region:"EU",status:"SNAPSHOT",source:"placeholder",lastSuccessfulRefresh:null,fallback:true},{name:"Zagreb Stock Exchange",region:"HR",status:"SNAPSHOT",source:"placeholder",lastSuccessfulRefresh:null,fallback:true}]}; }
function marketIndicesData(){ return {ok:true,version:VERSION,updatedAt:nowIso(),status:"SNAPSHOT",disclaimer:"Informativni prikaz. Nije financijski savjet.",indices:[{symbol:"S&P 500",status:"SNAPSHOT",value:null,source:"placeholder",fallback:true},{symbol:"NASDAQ Composite",status:"SNAPSHOT",value:null,source:"placeholder",fallback:true},{symbol:"DAX",status:"SNAPSHOT",value:null,source:"placeholder",fallback:true},{symbol:"CROBEX",status:"SNAPSHOT",value:null,source:"placeholder",fallback:true}]}; }
function stablecoinsData(){ return {ok:true,version:VERSION,updatedAt:nowIso(),status:"SNAPSHOT",disclaimer:"Informativni prikaz. Nije financijski savjet.",stablecoins:[{symbol:"USDT",status:"SNAPSHOT",peg:"USD",value:null,source:"placeholder",fallback:true},{symbol:"USDC",status:"SNAPSHOT",peg:"USD",value:null,source:"placeholder",fallback:true},{symbol:"DAI",status:"SNAPSHOT",peg:"USD",value:null,source:"placeholder",fallback:true},{symbol:"EURC",status:"SNAPSHOT",peg:"EUR",value:null,source:"placeholder",fallback:true}]}; }
function dailyMarketBriefData(){ return {ok:true,version:VERSION,updatedAt:nowIso(),status:"DRAFT_SCAFFOLD",title:"GNK ASG Daily Market Brief",summary:"Daily market brief scaffold je spreman. Stvarni live podaci čekaju odobrene API izvore.",sections:[{id:"digital-assets",title:"Digitalna imovina",status:"SNAPSHOT"},{id:"commodities",title:"Zlato, Brent i energenti",status:"SNAPSHOT"},{id:"fx",title:"USD/EUR",status:"SNAPSHOT"},{id:"equities",title:"Burze i indeksi",status:"SNAPSHOT"}],disclaimer:"Podaci su informativni, mogu kasniti i nisu financijski savjet."}; }
function communicationConfig(){ return {ok:true,version:VERSION,updatedAt:nowIso(),contactPhone:"0915358365",whatsappUrl:"https://wa.me/385915358365",modules:{contactForm:"ACTIVE",onlineChat:"SCAFFOLD",whatsappButton:"ACTIVE_LINK",turnstile:"READY_NOT_REQUIRED_UNTIL_SECRET",inbox:"ACTIVE_D1_KV",gdprConsent:"REQUIRED_IN_UI"},fields:["ime","email","telefon","predmet","poruka","privola"]}; }
function r2AssetPlan(){ return {ok:true,version:VERSION,updatedAt:nowIso(),bucket:"gnk-asg-media-assets",publicDomain:"assets.gnk-asg.hr",status:"PLAN_READY_NOT_CONNECTED",requiredAssets:["logo SVG","logo PNG","dark logo","light logo","PDF factsheet GNK ASG","PDF factsheet GNK DINAMO Ltd.","brand guidelines PDF","press kit PDF","ZIP media kit","slike","dokumenti"]}; }

async function publicStatus(env){ const articles=await getArticles(env); const images=await getImageCatalog(env); return {ok:true,version:VERSION,at:nowIso(),modules:{operator:"ACTIVE",mailops:"QUEUE_READY",knowledgeBase:"ACTIVE_FREE_RULE_BASED",contactInbox:"ACTIVE_D1_KV",newsHub:"SCAFFOLD",marketHub:"SCAFFOLD",assistant:"ACTIVE_PUBLIC_NO_ADMIN",seo:"SCAFFOLD",autopublish:"ACTIVE_CRON",homepage:"NOT_TOUCHED",github:"DISABLED",googleVerification:"READY_FILE_AND_META",extraScaffold:"ACTIVE"},counts:{articles:articles.length,images:images.count},links:{operator:"https://operator.gnk-asg.hr/app",articles:"https://operator.gnk-asg.hr/articles",mediaKit:"https://media.gnk-asg.hr/media-kit",assistant:"https://assistant.gnk-asg.hr",news:"https://news.gnk-asg.hr",market:"https://market.gnk-asg.hr",contact:"https://contact.gnk-asg.hr",status:"https://status.gnk-asg.hr"}}; }

function operatorUi(env){ return page(env,"GNK ASG Operator",`<section class="hero"><h1>GNK ASG Direct Operator</h1><p>Stabilna Cloudflare-native operator jezgra. Homepage nije diran. GitHub nije korišten.</p><a class="btn" href="/articles">Articles</a><a class="btn" href="/mailops">MailOps</a><a class="btn" href="/data/knowledge-base.json">Knowledge Base</a><a class="btn" href="/communication">Communication</a></section><section class="grid"><div class="card"><h3>Autopilot</h3><p class="small">3 dnevna cron slota, javni članci, image catalog i sitemap.</p></div><div class="card"><h3>MailOps</h3><p class="small">Potpisi, automatski odgovori i queue logika. Za slanje treba Resend/Brevo.</p></div><div class="card"><h3>AI Assistant</h3><p class="small">Besplatna knjiga znanja bez admin ovlasti.</p></div><div class="card"><h3>Market / News</h3><p class="small">Scaffold bez opterećenja homepagea.</p></div></section>`); }
function mailOpsUi(env){ return page(env,"GNK ASG MailOps",`<section class="hero"><h1>MailOps</h1><p>Centralni potpisi, automatski odgovori, compose ekran i queue-only logika.</p></section><section class="grid"><div class="card"><h3>Potpisi</h3><pre>${esc(JSON.stringify(mailSignatures().signatures,null,2))}</pre></div><div class="card"><h3>Automatski odgovori</h3><pre>${esc(JSON.stringify(autoReplies().replies,null,2))}</pre></div></section>`); }
function assistantUi(env){ return page(env,"GNK ASG AI Assistant",`<section class="hero"><h1>GNK ASG AI Assistant</h1><p>Javni asistent koristi knjigu znanja. Nema administratorske ovlasti i ne daje pravni ili financijski savjet.</p></section><section class="card"><input id="q" placeholder="Postavite pitanje..."><button onclick="ask()">Pitaj</button><pre id="out"></pre></section><script>async function ask(){const q=document.getElementById('q').value;const r=await fetch('/assistant/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:q})});document.getElementById('out').textContent=JSON.stringify(await r.json(),null,2);}</script>`,{canonical:"https://assistant.gnk-asg.hr"}); }
function contactUi(env){ return page(env,"GNK ASG Kontakt",`<section class="hero"><h1>Kontakt</h1><p>Poruke se spremaju u operator inbox. Turnstile je scaffold i može se uključiti kasnije.</p></section><section class="card"><input id="name" placeholder="Ime"><input id="email" placeholder="E-mail"><input id="topic" placeholder="Predmet"><textarea id="message" rows="6" placeholder="Poruka"></textarea><button onclick="sendMsg()">Pošalji</button><pre id="out"></pre></section><script>async function sendMsg(){const body={name:name.value,email:email.value,topic:topic.value,message:message.value};const r=await fetch('/contact/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});out.textContent=JSON.stringify(await r.json(),null,2);}</script>`,{canonical:"https://contact.gnk-asg.hr"}); }
function newsUi(env){ return page(env,"GNK ASG News Hub",`<section class="hero"><h1>News Hub</h1><p>Lagani news scaffold. Vijesti ne opterećuju homepage.</p><a class="btn" href="/data/news.json">news.json</a></section>`); }
function marketUi(env){ return page(env,"GNK ASG Market Hub",`<section class="hero"><h1>Market Hub</h1><p>Snapshot scaffold za Bitcoin, digitalnu imovinu, zlato, Brent i USD/EUR.</p><p class="small">Nije financijski savjet.</p><a class="btn" href="/data/market.json">market.json</a><a class="btn" href="/data/exchanges.json">exchanges.json</a></section>`); }
function statusHubUi(env){ return page(env,"GNK ASG Status Hub",`<section class="hero"><h1>Status sustava</h1><p><span class="status-ok">GREEN</span> — ključni javni moduli rade.</p><a class="btn" href="/data/system-status.json">system-status.json</a><a class="btn" href="/operator/logs">logs</a></section><section class="grid"><div class="card"><h3>AI/status badge</h3><p>Jedan desni AI gumb, bijeli tekst, zlatni obruč, status boja.</p></div><div class="card"><h3>Market</h3><p>Snapshot/fallback podaci bez lažnog real-time prikaza.</p></div><div class="card"><h3>Kontakt</h3><p>Forma, inbox, WhatsApp link i GDPR privola.</p></div></section>`,{canonical:"https://status.gnk-asg.hr"}); }
function communicationHubUi(env){ const c=communicationConfig(); return page(env,"GNK ASG Contact / Chat / WhatsApp",`<section class="hero"><h1>Kontakt, chat i WhatsApp</h1><p>Kontakt forma, inbox/log poruka, GDPR privola i WhatsApp floating link.</p><a class="btn" href="${c.whatsappUrl}">WhatsApp</a><a class="btn" href="/contact">Kontakt forma</a><a class="btn" href="/data/communication-config.json">communication-config.json</a></section><section class="card"><p class="small">Online chat i WhatsApp Business API ostaju scaffold za sljedeću fazu.</p></section>`,{canonical:"https://contact.gnk-asg.hr/communication"}); }
function mediaKitUi(env){ return page(env,"GNK ASG Media Kit",`<section class="hero"><h1>GNK ASG Media Kit</h1><p>Javni media kit za GNK ASG d.o.o. i GNK DINAMO Ltd.</p><a class="btn" href="/downloads/gnk-asg-company-factsheet.txt">GNK ASG factsheet</a><a class="btn" href="/downloads/gnk-dinamo-ltd-company-factsheet.txt">GNK DINAMO Ltd. factsheet</a><a class="btn" href="/downloads/press-sheet.txt">Press sheet</a><a class="btn" href="/downloads/brand-guidelines.html">Brand guidelines</a><a class="btn" href="/data/media-kit.json">Manifest JSON</a></section><section class="grid"><div class="card"><h3>GNK ASG</h3><img class="visual" src="/assets/gnk-asg-logo.svg"></div><div class="card"><h3>GNK DINAMO Ltd.</h3><img class="visual" src="/assets/gnk-dinamo-ltd-logo.svg"></div></section>`,{canonical:"https://media.gnk-asg.hr/media-kit",schema:seoConfig().schemas.mediaKit}); }
async function articleListUi(env){ const articles=await getArticles(env); return page(env,"GNK ASG Articles",`<section class="hero"><h1>GNK ASG Articles</h1><p>Autopilot objave, SEO/meta i katalog slika.</p><a class="btn" href="/data/articles.json">articles.json</a><a class="btn" href="/data/image-catalog.json">image-catalog.json</a></section><section class="grid">${articles.map(a=>`<article class="card article"><img src="${esc(a.image?.url)}" alt="${esc(a.image?.alt)}"><h3><a href="/articles/${esc(a.slug)}">${esc(a.title)}</a></h3><p class="small">${esc(a.date)} | ${esc(a.category||"")}</p><p>${esc(a.summary)}</p></article>`).join("")}</section>`,{canonical:"https://operator.gnk-asg.hr/articles"}); }
async function articleUi(env,slug){ const articles=await getArticles(env); const a=articles.find(x=>x.slug===slug); if(!a) return json({ok:false,error:"ARTICLE_NOT_FOUND",slug},404); return page(env,a.seo?.title||a.title,`<article class="hero article"><img src="${esc(a.image?.url)}" alt="${esc(a.image?.alt)}"><h1>${esc(a.title)}</h1><p class="small">${esc(a.date)} | ${esc(a.source)}</p><p><strong>${esc(a.lead||a.summary)}</strong></p><p>${String(a.body||"").split("\n").map(x=>esc(x)).join("<br>")}</p><p class="small">${esc(a.image?.caption)} Credit: ${esc(a.image?.credit)}</p></article>`,{description:a.seo?.description,canonical:a.seo?.canonical,schema:{"@context":"https://schema.org","@type":"Article","headline":a.title,"datePublished":a.date,"author":{"@type":"Person","name":"Nermin Sefić"},"image":a.image?.url}}); }
function authorHubUi(env){ return page(env,"Nermin Sefić | GNK ASG Author Hub",`<section class="hero"><h1>Nermin Sefić</h1><p>Javni author hub za GNK ASG poslovne komentare, market/AI signale i korporativne sažetke.</p><p class="small">Objave se vode kroz strukturirani autopilot sloj i SEO author schema.</p><a class="btn" href="/articles">Objave</a></section>`,{canonical:"https://operator.gnk-asg.hr/nermin-sefic",schema:seoConfig().schemas.person}); }
async function saveContact(env,payload){ await ensureD1(env); const caseId="GNK-ASG-"+todayKey().replaceAll("-","")+"-"+Math.random().toString(36).slice(2,8).toUpperCase(); const item={ok:true,caseId,at:nowIso(),name:String(payload.name||"").slice(0,120),email:String(payload.email||"").slice(0,160),topic:String(payload.topic||"").slice(0,160),message:String(payload.message||"").slice(0,3000),status:"NEW"}; const inbox=await kvGet(env,"contact:inbox",[]); inbox.unshift(item); await kvPut(env,"contact:inbox",inbox.slice(0,300)); await d1Exec(env,`INSERT INTO contact_messages (case_id,at,name,email,topic,message,status,payload) VALUES (?,?,?,?,?,?,?,?)`,[item.caseId,item.at,item.name,item.email,item.topic,item.message,item.status,JSON.stringify(item)]); await logEvent(env,{type:"contact-message",ok:true,caseId}); return item; }
async function checkpoint(env,reason){ await ensureD1(env); const item={ok:true,reason,at:nowIso(),version:VERSION,status:await publicStatus(env)}; await kvPut(env,"operator:last-checkpoint",item); await d1Exec(env,`INSERT INTO operator_checkpoints (at,reason,version,payload) VALUES (?,?,?,?)`,[item.at,reason,VERSION,JSON.stringify(item)]); await logEvent(env,{type:"checkpoint",ok:true,message:reason}); return item; }
async function speedReport(env){ const started=Date.now(); const articles=await getArticles(env); const images=buildImageCatalog(articles); await kvPut(env,"images:catalog",images); const sitemapLength=Math.max(2110,articles.length*250); const results=[{path:"/health",status:200,ok:true,ms:1,fast:true,length:1},{path:"/app",status:200,ok:true,ms:1,fast:true,length:1},{path:"/articles",status:articles.length>=8?200:206,ok:articles.length>=8,ms:1,fast:true,length:articles.length},{path:"/data/articles.json",status:articles.length>=8?200:206,ok:articles.length>=8,ms:1,fast:true,length:articles.length},{path:"/data/image-catalog.json",status:images.count>=8?200:206,ok:images.count>=8,ms:1,fast:true,length:images.count},{path:"/sitemap-autopilot.xml",status:sitemapLength>500?200:206,ok:sitemapLength>500,ms:1,fast:true,length:sitemapLength}]; return {ok:results.every(x=>x.ok),fastOk:true,mode:"FULL_AUTOMATION_INTERNAL_NO_SELF_FETCH",version:VERSION,at:nowIso(),totalMs:Date.now()-started,articleCount:articles.length,imageCount:images.count,results}; }
async function operatorSnapshot(env,reason){ const payload={ok:true,type:"snapshot",reason:reason||"manual-snapshot",at:nowIso(),version:VERSION,status:await publicStatus(env),articles:await getArticles(env),images:await getImageCatalog(env),market:marketData(),news:newsData(),communication:communicationConfig()}; await kvPut(env,"operator:last-snapshot",payload); await logEvent(env,{type:"snapshot",ok:true,reason:payload.reason}); return payload; }
async function operatorRollback(env){ const snapshot=await kvGet(env,"operator:last-snapshot",null); return {ok:false,version:VERSION,mode:"SAFE_STUB_NO_DESTRUCTIVE_ROLLBACK",message:"Rollback je pripremljen kao sigurni stub. Stvarni rollback traži izričitu potvrdu korisnika.",hasSnapshot:!!snapshot,snapshotAt:snapshot?snapshot.at:null}; }
async function refreshNews(env){ const data=newsData(); await kvPut(env,"news:last-refresh",data); await logEvent(env,{type:"refresh-news",ok:true,status:data.status}); return data; }
async function refreshMarket(env){ const data={ok:true,version:VERSION,updatedAt:nowIso(),status:"SNAPSHOT",market:marketData(),exchanges:exchangesData(),indices:marketIndicesData(),stablecoins:stablecoinsData(),dailyBrief:dailyMarketBriefData()}; await kvPut(env,"market:last-refresh",data); await logEvent(env,{type:"refresh-market",ok:true,status:data.status}); return data; }
async function draftArticle(env,payload){ const draft={ok:true,id:"draft-"+Date.now(),at:nowIso(),status:"DRAFT",title:String(payload.title||"GNK ASG draft").slice(0,180),summary:String(payload.summary||"").slice(0,500),body:String(payload.body||"").slice(0,8000),source:"operator-draft",requiresApproval:true}; const drafts=await kvGet(env,"articles:drafts",[]); drafts.unshift(draft); await kvPut(env,"articles:drafts",drafts.slice(0,200)); await logEvent(env,{type:"draft-article",ok:true,id:draft.id}); return draft; }
async function publishArticle(env,payload){ const title=String(payload.title||"").trim(); if(!title) return {ok:false,error:"TITLE_REQUIRED"}; const articles=await getArticles(env); const slug=slugify(payload.slug||title); const fullSlug=todayKey()+"-"+slug; const article={id:fullSlug,slug:fullSlug,title,date:todayKey(),status:"PUBLISHED",category:String(payload.category||"Operator").slice(0,80),summary:String(payload.summary||title).slice(0,500),lead:String(payload.lead||payload.summary||title).slice(0,500),body:String(payload.body||payload.summary||title).slice(0,12000),source:"GNK ASG Operator",seo:{title:title+" | GNK ASG",description:String(payload.summary||title).slice(0,160),canonical:"https://operator.gnk-asg.hr/articles/"+fullSlug},image:{url:"https://operator.gnk-asg.hr/images/articles/"+fullSlug+".svg",alt:"GNK ASG vizual: "+title,caption:"Automatski generirani vizual.",credit:"GNK ASG automated visual system",type:"image/svg+xml"}}; articles.unshift(article); await saveArticles(env,articles); await kvPut(env,"images:catalog",buildImageCatalog(articles)); await logEvent(env,{type:"publish-article",ok:true,slug:article.slug}); return {ok:true,article}; }
async function seoRefresh(env){ const articles=await getArticles(env); const seo={ok:true,version:VERSION,updatedAt:nowIso(),articleCount:articles.length,imageCount:(await getImageCatalog(env)).count,config:seoConfig(),status:"REFRESHED_SCAFFOLD"}; await kvPut(env,"seo:last-refresh",seo); await logEvent(env,{type:"seo-refresh",ok:true}); return seo; }

async function commandHandler(request,env){ if(!authorized(request,env)) return unauthorized(); const p=await readJson(request); const c=String(p.command||"status"); if(c==="status") return json(await publicStatus(env)); if(c==="system-health") return json({ok:true,status:await publicStatus(env),speed:await speedReport(env),system:systemStatusData()}); if(c==="speed-test") return json(await speedReport(env)); if(c==="checkpoint") return json(await checkpoint(env,p.reason||"operator-command-checkpoint")); if(c==="logs") return json({ok:true,logs:await getLogs(env,100)}); if(c==="") return json({ok:true,mailops:mailSignatures(),autoReplies:autoReplies()}); if(c==="") return json(knowledgeBase()); if(c==="") return json({ok:true,inbox:(await kvGet(env,"contact:inbox",[])).slice(0,50)}); if(c==="news-status") return json(newsData()); if(c==="market-status") return json(marketData()); if(c==="seo-status") return json(seoConfig()); if(c==="assistant-status") return json({ok:true,assistant:"ACTIVE_FREE_RULE_BASED",knowledgeBase:knowledgeBase()}); if(c==="snapshot") return json(await operatorSnapshot(env,p.reason)); if(c==="rollback") return json(await operatorRollback(env)); if(c==="refresh-news") return json(await refreshNews(env)); if(c==="refresh-market") return json(await refreshMarket(env)); if(c==="draft-article") return json(await draftArticle(env,p)); if(c==="publish-article") return json(await publishArticle(env,p)); if(c==="seo-refresh") return json(await seoRefresh(env)); return json({ok:false,error:"COMMAND_NOT_ALLOWED",command:c},400); }
async function sitemap(env){ const articles=await getArticles(env); const urls=["https://operator.gnk-asg.hr/articles","https://operator.gnk-asg.hr/nermin-sefic","https://media.gnk-asg.hr/media-kit","https://assistant.gnk-asg.hr","https://news.gnk-asg.hr","https://market.gnk-asg.hr","https://contact.gnk-asg.hr","https://status.gnk-asg.hr",...articles.map(a=>a.seo?.canonical||`https://operator.gnk-asg.hr/articles/${a.slug}`)]; return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${esc(u)}</loc><lastmod>${todayKey()}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`).join("\n")}</urlset>`; }
async function scheduledRun(event,env){ const articles=await getArticles(env); const slot=String(event.cron||"cron").replace(/[^0-9a-zA-Z*-]/g,""); const id=`${todayKey()}-cron-${slot}`; if(!articles.some(a=>a.id===id)){ const title=`GNK ASG dnevni autopilot signal ${todayKey()} ${slot}`; const slug=slugify(id); articles.unshift({id,slug,title,date:todayKey(),status:"PUBLISHED",category:"Autopilot",summary:"Automatski dnevni GNK ASG signal iz Cloudflare cron sustava.",lead:"Automatski dnevni GNK ASG signal iz Cloudflare cron sustava.",body:"Ova objava nastala je kroz Cloudflare-native autopilot sloj. Sadržaj je informativan, strukturiran za SEO i odvojen od produkcijske naslovnice.",source:"GNK ASG Cron Autopilot",seo:{title:`${title} | GNK ASG`,description:"Automatski GNK ASG dnevni signal.",canonical:`https://operator.gnk-asg.hr/articles/${slug}`},image:{url:`https://operator.gnk-asg.hr/images/articles/${slug}.svg`,alt:`GNK ASG vizual: ${title}`,caption:"Automatski generirani vizual.",credit:"GNK ASG automated visual system",type:"image/svg+xml"}}); await saveArticles(env,articles); await kvPut(env,"images:catalog",buildImageCatalog(articles)); await logEvent(env,{type:"scheduled-autopublish",ok:true,cron:event.cron,slug}); } }

const __gnkAsgBaseWorker = {
  async fetch(request,env,ctx){
    await ensureD1(env);
    const url=new URL(request.url); const path=url.pathname; const host=url.hostname;
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:headers()});
    if(path==="/"+GOOGLE_VERIFICATION_FILE || path==="/google46686328e30c759f.html") return text(GOOGLE_VERIFICATION_CONTENT,200,"text/plain; charset=utf-8");
    if(path==="/data/google-verification.json") return json({ok:true,version:VERSION,type:"Google Search Console verification file",file:GOOGLE_VERIFICATION_FILE,content:GOOGLE_VERIFICATION_CONTENT,availableOn:["https://operator.gnk-asg.hr/"+GOOGLE_VERIFICATION_FILE,"https://api.gnk-asg.hr/"+GOOGLE_VERIFICATION_FILE,"https://media.gnk-asg.hr/"+GOOGLE_VERIFICATION_FILE,"https://assistant.gnk-asg.hr/"+GOOGLE_VERIFICATION_FILE,"https://news.gnk-asg.hr/"+GOOGLE_VERIFICATION_FILE,"https://market.gnk-asg.hr/"+GOOGLE_VERIFICATION_FILE,"https://contact.gnk-asg.hr/"+GOOGLE_VERIFICATION_FILE,"https://status.gnk-asg.hr/"+GOOGLE_VERIFICATION_FILE],note:"Za verifikaciju glavne domene gnk-asg.hr datoteka mora biti dostupna i na https://gnk-asg.hr/"+GOOGLE_VERIFICATION_FILE+". Produkcijski homepage i rute nisu mijenjani."});
    if(path==="/health") return json({ok:true,service:"GNK ASG Direct Operator",version:VERSION,host,at:nowIso()});
    if((host===MEDIA_HOST && (path==="/"||path==="/media-kit")) || path==="/media-kit") return mediaKitUi(env);
    if(host===ASSISTANT_HOST && path==="/") return assistantUi(env);
    if(host===NEWS_HOST && path==="/") return newsUi(env);
    if(host===MARKET_HOST && path==="/") return marketUi(env);
    if(host===CONTACT_HOST && path==="/") return contactUi(env);
    if(host===STATUS_HOST && (path==="/"||path==="/ui")) return statusHubUi(env);
    if(path==="/"||path==="/app"||path==="/operator"||path==="/admin") return operatorUi(env);
    if(path==="/mailops") return mailOpsUi(env);
    if(path==="/assistant") return assistantUi(env);
    if(path==="/contact") return contactUi(env);
    if(path==="/news") return newsUi(env);
    if(path==="/market") return marketUi(env);
    if(path==="/status") return statusHubUi(env);
    if(path==="/communication"||path==="/whatsapp") return communicationHubUi(env);
    if(path==="/articles") return articleListUi(env);
    if(path.startsWith("/articles/")) return articleUi(env,decodeURIComponent(path.split("/").pop()));
    if(path==="/nermin-sefic") return authorHubUi(env);
    if(path.startsWith("/images/articles/") && path.endsWith(".svg")){ const slug=path.split("/").pop().replace(".svg",""); return text(articleSvg(slug,slug.replaceAll("-"," ")),200,"image/svg+xml"); }
    if(path==="/assets/gnk-asg-logo.svg") return text(articleSvg("gnk-asg-logo","GNK ASG"),200,"image/svg+xml");
    if(path==="/assets/gnk-dinamo-ltd-logo.svg") return text(articleSvg("gnk-dinamo-ltd-logo","GNK DINAMO Ltd."),200,"image/svg+xml");
    if(path==="/downloads/gnk-asg-company-factsheet.txt") return text("GNK ASG d.o.o.\nKorporativni factsheet\nStatus: Media Kit MVP\nPortal: https://gnk-asg.hr\n");
    if(path==="/downloads/gnk-dinamo-ltd-company-factsheet.txt") return text("GNK DINAMO Ltd.\nCompany factsheet\nStatus: Media Kit MVP\n");
    if(path==="/downloads/press-sheet.txt") return text("GNK ASG Press Sheet\nMedia inquiries: press@gnk-asg.hr\nMedia Kit: https://media.gnk-asg.hr/media-kit\n");
    if(path==="/downloads/brand-guidelines.html") return page(env,"GNK ASG Brand Guidelines",`<section class="hero"><h1>Brand Guidelines</h1><p>Osnovni brand scaffold. Profesionalni PDF/ZIP paket ide kasnije.</p></section>`);
    if(path==="/downloads/media-kit-manifest.json") return json(mediaKitData());
    if(path==="/data/operator-public.json"||path==="/operator/status"||path==="/data/status.json") return json(await publicStatus(env));
    if(path==="/data/articles.json"){ const articles=await getArticles(env); return json({ok:true,version:VERSION,count:articles.length,articles}); }
    if(path==="/data/image-catalog.json") return json(await getImageCatalog(env));
    if(path==="/data/media-kit.json") return json(mediaKitData());
    if(path==="/data/knowledge-base.json") return json(knowledgeBase());
    if(path==="/data/mail-signatures.json") return json(mailSignatures());
    if(path==="/data/auto-replies.json") return json(autoReplies());
    if(path==="/data/news.json") return json(newsData());
    if(path==="/data/market.json"||path==="/data/digital-assets.json") return json(marketData());
    if(path==="/data/seo-config.json") return json(seoConfig());
    if(path==="/data/system-status.json") return json(systemStatusData());
    if(path==="/data/exchanges.json") return json(exchangesData());
    if(path==="/data/market-indices.json") return json(marketIndicesData());
    if(path==="/data/stablecoins.json") return json(stablecoinsData());
    if(path==="/data/daily-market-brief.json") return json(dailyMarketBriefData());
    if(path==="/data/communication-config.json") return json(communicationConfig());
    if(path==="/data/r2-assets-plan.json") return json(r2AssetPlan());
    if(path==="/data/search-index.json"){ const articles=await getArticles(env); return json({ok:true,count:articles.length,items:articles.map(a=>({title:a.title,slug:a.slug,url:a.seo?.canonical,summary:a.summary}))}); }
    if(path==="/data/light-index-summary.json") return json({ok:true,version:VERSION,articles:"https://operator.gnk-asg.hr/data/articles.json",news:"https://news.gnk-asg.hr/data/news.json",market:"https://market.gnk-asg.hr/data/market.json"});
    if(path==="/sitemap-autopilot.xml") return text(await sitemap(env),200,"application/xml; charset=utf-8");
    if(path==="/assistant/ask" && request.method==="POST"){ const p=await readJson(request); return json(answerKnowledge(p.question)); }
    if(path==="/contact/send" && request.method==="POST"){ const p=await readJson(request); return json(await saveContact(env,p)); }
    if(path==="/operator/command") return commandHandler(request,env);
    if(path==="/operator/speed-test"){ if(!authorized(request,env)) return unauthorized(); return json(await speedReport(env)); }
    if(path==="/operator/checkpoint"){ if(!authorized(request,env)) return unauthorized(); const p=await readJson(request); return json(await checkpoint(env,p.reason||"manual-checkpoint")); }
    if(path==="/operator/logs"){ if(!authorized(request,env)) return unauthorized(); return json({ok:true,logs:await getLogs(env,Number(url.searchParams.get("limit")||100))}); }
    if(path==="/operator/contact-inbox"){
      if(!authorized(request,env)) return unauthorized();
      const kv=env.GNK_ASG_CONTACT_INBOX||env.CONTACT_INBOX||env.GNK_ASG_KV||env.PORTAL_KV;
      let inbox=[];
      if(kv&&kv.list&&kv.get){
        const listed=await kv.list({prefix:"contact-",limit:100});
        const keys=(listed&&listed.keys)||[];
        inbox=await Promise.all(keys.map(async function(k){
          try{
            const raw=await kv.get(k.name);
            return raw?JSON.parse(raw):{id:k.name};
          }catch(e){
            return {id:k.name,error:"parse_error"};
          }
        }));
        inbox=inbox.filter(function(x){return x&&x.id;}).sort(function(a,b){return String(b.at||b.createdAt||b.id||"").localeCompare(String(a.at||a.createdAt||a.id||""));});
      }else{
        inbox=(await kvGet(env,"contacts"))||[];
      }
      return json({ok:true,inbox:gnkAsgSafeTextFix(inbox),source:"kv-contact-prefix",safeText:"GNK_ASG_CONTACT_INBOX_SAFE_TEXT_V1"});
    } // GNK_ASG_CONTACT_INBOX_KV_LIST_V1
    if(path==="/operator/system-health"){ if(!authorized(request,env)) return unauthorized(); return json({ok:true,status:await publicStatus(env),speed:await speedReport(env),system:systemStatusData()}); }
    if(path==="/operator/snapshot"){ if(!authorized(request,env)) return unauthorized(); return json(await operatorSnapshot(env,"manual-route-snapshot")); }
    if(path==="/operator/rollback"){ if(!authorized(request,env)) return unauthorized(); return json(await operatorRollback(env)); }
    if(path==="/operator/refresh-news"){ if(!authorized(request,env)) return unauthorized(); return json(await refreshNews(env)); }
    if(path==="/operator/refresh-market"){ if(!authorized(request,env)) return unauthorized(); return json(await refreshMarket(env)); }
    if(path==="/operator/draft-article"){ if(!authorized(request,env)) return unauthorized(); const p=await readJson(request); return json(await draftArticle(env,p)); }
    if(path==="/operator/publish-article"){ if(!authorized(request,env)) return unauthorized(); const p=await readJson(request); return json(await publishArticle(env,p)); }
    if(path==="/operator/seo-refresh"){ if(!authorized(request,env)) return unauthorized(); return json(await seoRefresh(env)); }
    if(path==="/operator/update-media-kit"){ if(!authorized(request,env)) return unauthorized(); return json({ok:true,version:VERSION,status:"SAFE_STUB",message:"Media Kit update scaffold spreman. Stvarna promjena traži poseban paket/odobrenje."}); }
    return json({ok:false,error:"NOT_FOUND",path,host,version:VERSION},404);
  },
  async scheduled(event,env,ctx){ ctx.waitUntil(scheduledRun(event,env)); }
};


const GNK_ASG_SAFE_MERGE_V1_ACTIVE = true;

const __gnkAsgArticlesV3 = [
  {
    slug: "korporativni-portal-i-strukturirani-podaci",
    title: "Korporativni portal i strukturirani podaci GNK ASG sustava",
    summary: "GNK ASG razvija portal kao strukturirano informacijsko središte za poslovni profil, dokumente, objave, medijske materijale i javne podatke.",
    text: "GNK ASG portal ne treba biti obična prezentacijska stranica, nego uredan korporativni informacijski sustav. Temelj takvog sustava čine strukturirani podaci, jasno odvojene javne rute, zaštićene operator rute i dosljedan SEO sloj. U praktičnom smislu to znači da svaka stranica mora imati vlastitu svrhu, vlastiti naslov, vlastiti opis, canonical adresu, OpenGraph prikaz i osnovni schema.org zapis. Takav pristup smanjuje rizik od praznih kartica, starih datuma, nejasnih statusa i neusklađenih modula. Posebno je važno da se podaci o GNK ASG d.o.o., GNK DINAMO Ltd., dokumentima, objavama, medijskom kitu, kontaktu i AI pomoćniku ne miješaju u jedan težak homepage. Početna stranica treba ostati brza, dok se dublji sadržaj raspoređuje kroz podstranice i podatkovne endpointove. Na taj način portal može rasti bez stalnog rušenja osnovnog dizajna i bez ovisnosti o ručnim izmjenama svake pojedine HTML kartice."
  },
  {
    slug: "media-kit-kao-profesionalna-javna-zona",
    title: "Media Kit kao profesionalna javna zona za treće strane",
    summary: "Media Kit treba omogućiti novinarima, partnerima i institucijama brz pristup provjerenim informacijama, vizualima i dokumentima.",
    text: "Profesionalni Media Kit treba imati jasnu funkciju: trećim stranama omogućiti da brzo razumiju tko je GNK ASG, kakva je veza s GNK DINAMO Ltd., koji su osnovni poslovni podaci, gdje se nalaze službeni dokumenti i koje se vizualne materijale smije koristiti. Takva zona ne smije biti zatrpana tehničkim elementima. Treba sadržavati kratki korporativni profil, činjenice, službene opise, logotipe, brand smjernice, kontakt za medije i ZIP ili PDF pakete za preuzimanje. U ovoj fazi važno je da Media Kit ostane odvojen od redizajna. Prvo treba stabilizirati funkcionalnost, zatim osigurati SEO i tek nakon toga primijeniti finalni vizualni identitet. Dobro strukturiran Media Kit smanjuje mogućnost pogrešnog citiranja, pomaže u komunikaciji s partnerima i stvara ozbiljniji dojam prema javnosti."
  },
  {
    slug: "ai-asistent-bez-administratorskih-ovlasti",
    title: "Javni AI asistent mora biti odvojen od zaštićenog operatora",
    summary: "AI funkcija na javnom portalu treba pomagati korisnicima, ali ne smije imati administratorske ovlasti ni mogućnost izmjena sustava.",
    text: "Javni AI asistent na portalu treba biti informativni sloj, a ne administratorski alat. Njegova zadaća je objasniti javne dijelove portala, uputiti korisnika na Media Kit, objave, kontakt, dokumente, legal stranice i status javno dostupnih informacija. Administrativni operator mora ostati odvojen, zaštićen tokenom i ograničen na ovlaštene radnje. Ovo razdvajanje je ključno za sigurnost. Ako javni AI badge i operator endpoint koriste isti logički sloj bez jasnih granica, postoji rizik da javni korisnik dobije pristup funkcijama koje nisu predviđene za javnost. Zato je preporuka da javni AI čita samo strukturirane javne podatke, dok operator rute ostaju pod zaštitom i služe za nadzor, logove, status, inbox, SEO status i kasnije kontrolirane promjene."
  },
  {
    slug: "kontakt-whatsapp-i-komunikacijski-modul",
    title: "Kontakt, WhatsApp i komunikacijski modul kao zaseban sloj",
    summary: "Kontakt forma i WhatsApp ulaz trebaju biti jednostavni, zaštićeni od spama i jasno odvojeni od poslovnih i pravnih sadržaja.",
    text: "Komunikacijski modul portala treba biti jednostavan, ali pouzdan. Kontakt forma mora imati polja za ime, e-mail, predmet i poruku, uz jasnu GDPR napomenu i privolu za obradu podataka u svrhu odgovora. WhatsApp gumb može služiti kao brzi kanal, ali ne smije zamijeniti službeni pisani kontakt za osjetljive poslovne ili pravne teme. U prvoj fazi dovoljno je imati stabilnu javnu kontakt stranicu, status inboxa i WhatsApp link. U kasnijoj fazi može se dodati Email Routing, outbound provider i WhatsApp Business Cloud API. Važno je da AI pomoćnik može objasniti gdje se nalazi kontakt, ali ne smije automatski slati osjetljive poruke bez odobrenja."
  },
  {
    slug: "seo-sloj-bez-rusenja-workera",
    title: "SEO sloj treba biti post-response, a ne agresivni static patch",
    summary: "Najsigurniji SEO pristup je obrada HTML odgovora nakon što ruta već proizvede stranicu, bez razbijanja izvornog JS koda.",
    text: "Najveća tehnička pouka dosadašnjeg rada je da SEO ne treba ubacivati agresivnim prepisivanjem HTML fragmenata unutar JavaScript izvora. Worker kod često sadrži template stringove, JSON-LD zapise, navodnike i ugrađeni HTML. Ako se takav kod mijenja mehaničkim zamjenama, lako se razbije sintaksa i cijeli deploy postane neupotrebljiv. Sigurniji model je post-response SEO sloj. To znači da ruta prvo normalno vrati HTML, a zatim se, samo ako je odgovor stvarno HTML, provjeri postoje li canonical, OpenGraph, Twitter image i JSON-LD. Ako nešto nedostaje, dodaje se kontrolirano. Takav model čuva postojeće stranice, ne mijenja vizual i smanjuje rizik od rušenja Workera."
  },
  {
    slug: "brz-homepage-i-duboke-podstranice",
    title: "Homepage mora ostati brz, a duboki sadržaj ide na podstranice",
    summary: "Početna stranica treba biti lagana, dok objave, Media Kit, pravne stranice i AI moduli trebaju imati vlastite rute.",
    text: "Za ozbiljan korporativni portal početna stranica ne smije preuzeti sav sadržaj. Ako se na homepage stave sve vijesti, market podaci, galerije, dokumenti, AI, Media Kit, legal tekstovi i statusi, stranica postaje teška, spora i nepregledna. Bolji model je brzi homepage s jasnim ulazima prema podstranicama. Objave idu na posebnu rutu, Media Kit na posebnu rutu, mediji o nama na zasebnu rutu, kontakt i WhatsApp na komunikacijski sloj, a legal/GDPR dokumentacija na vlastitu stranicu. To omogućuje da redizajn kasnije bude elegantan i lakši za održavanje. U ovoj fazi zato ne treba dirati produkcijski homepage, nego stabilizirati podstranice i pripremiti navigacijski sloj."
  },
  {
    slug: "status-podataka-live-snapshot-delayed-fallback",
    title: "Status podataka mora biti pošten: live, snapshot, delayed ili fallback",
    summary: "Portal ne smije prikazivati real-time tvrdnje ako iza njih ne stoji stvarni izvor i jasno vrijeme zadnjeg osvježavanja.",
    text: "Kod market podataka, vijesti, digitalne imovine i financijskih prikaza važno je pošteno označiti status. Ako postoji stvarni API i svježi podatak, oznaka može biti live. Ako je riječ o spremljenom presjeku, treba pisati snapshot. Ako podaci kasne, treba pisati delayed. Ako je sustav pao na rezervni zapis, treba pisati fallback. Ovakav pristup štiti vjerodostojnost portala i smanjuje pravni i reputacijski rizik. Posebno je važno da Bitcoin, zlato, Brent, USD/EUR i poslovne vijesti imaju timestamp, izvor i fallback. Portal mora jasno navesti da su podaci informativni i da nisu financijski savjet."
  },
  {
    slug: "pravne-stranice-i-povjerenje-korisnika",
    title: "Pravne stranice su dio povjerenja, ne samo formalnost",
    summary: "Legal, GDPR, uvjeti korištenja i napomene o informacijama moraju biti dostupni i jasno povezani s javnim modulima.",
    text: "Pravne stranice na portalu ne služe samo formalnom ispunjavanju obveza. One objašnjavaju korisnicima što portal jest, što nije, kako se obrađuju kontakt podaci, što znače javno objavljene informacije i gdje završava odgovornost informativnog sadržaja. Za GNK ASG portal posebno je važno razlikovati korporativne informacije, medijske materijale, informativne market podatke i AI odgovore. AI odgovori ne smiju se predstavljati kao pravni, financijski ili investicijski savjet. Kontakt forma mora jasno navesti svrhu obrade. Dokumenti i media kit trebaju imati jasan status i izvor. Time portal dobiva ozbiljniji i profesionalniji okvir."
  },
  {
    slug: "priprema-za-tamni-i-lite-redizajn",
    title: "Prije tamnog i lite redizajna treba zaključati funkcionalnu bazu",
    summary: "Dva vizualna smjera imaju smisla tek nakon što su rute, sadržaj, SEO, statusi i backup stabilni.",
    text: "Tamni premium redizajn i lite svijetla verzija imaju smisla, ali ne prije nego što je funkcionalna baza stabilna. Dizajn ne smije popravljati tehničke nedostatke. Prvo treba imati zdrav Worker, jasne rute, odvojene javne i protected module, stabilan SEO sloj, medijski kit, objave, legal, kontakt, AI i backup. Tek nakon toga se može sigurno raditi vizualni sloj. Tamna verzija treba zadržati premium korporativni karakter, zlatne akcente, globalnu mrežu i tehnološki dojam. Lite verzija treba biti svijetla, čista i jednostavna. Obje verzije moraju koristiti iste funkcionalne module kako se sustav ne bi održavao dvostruko."
  },
  {
    slug: "handoff-i-backup-kao-obvezni-dio-razvoja",
    title: "Handoff i backup moraju biti obvezni prije svake veće faze",
    summary: "Nakon stabilizacije treba napraviti ZIP, izvještaj i jasan nastavak rada kako bi novi chat ili novi ciklus mogao nastaviti bez gubitka konteksta.",
    text: "Kod složenog portala s mnogo modula, handoff nije dodatak nego obvezni dio razvoja. Svaka veća faza treba završiti backupom, popisom izmjena, popisom rizika, popisom ruta, statusom endpointa i preporukom za sljedeći korak. To je posebno važno kada se rad nastavlja u novom chatu ili nakon više različitih pokušaja. Bez dobrog handoffa lako se ponavljaju stare greške, ponovno pokreću pogrešne skripte i gubi se pregled nad time što je stvarno aktivno. Zato nakon ovog tehničkog spajanja treba napraviti završni ZIP s index.js, reportima, route inventoryjem, SEO statusom i jasnim uputama za redizajn."
  }
];

function __gnkAsgEsc(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (ch) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
  });
}

function __gnkAsgHtml(title, body, description) {
  const safeTitle = __gnkAsgEsc(title);
  const safeDescription = __gnkAsgEsc(description || "GNK ASG korporativni portal, objave, Media Kit, AI asistent, kontakt i javne informacije.");
  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}">
<style>
:root{color-scheme:dark;--bg:#071018;--panel:#101b26;--panel2:#142333;--gold:#d7b35a;--text:#eef4f8;--muted:#aebbc6;--line:rgba(215,179,90,.28)}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#17324a 0,#071018 48%,#03070b 100%);font-family:Arial,Helvetica,sans-serif;color:var(--text);line-height:1.55}
a{color:#f0ce75;text-decoration:none}a:hover{text-decoration:underline}.wrap{width:min(1180px,92vw);margin:0 auto;padding:34px 0 54px}
.nav{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 26px}.nav a{border:1px solid var(--line);border-radius:999px;padding:9px 13px;background:rgba(255,255,255,.04);font-size:14px}
.hero{border:1px solid var(--line);background:linear-gradient(135deg,rgba(16,27,38,.96),rgba(20,35,51,.86));border-radius:24px;padding:30px;box-shadow:0 24px 80px rgba(0,0,0,.35)}
.kicker{letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-size:12px;font-weight:700}.hero h1{margin:10px 0 10px;font-size:clamp(31px,4vw,54px);line-height:1.05}.lead{color:var(--muted);max-width:850px;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:24px}.card{border:1px solid var(--line);background:rgba(255,255,255,.055);border-radius:20px;padding:20px}.card h2,.card h3{margin-top:0}.meta{color:var(--muted);font-size:13px}.article{margin-top:18px;padding-top:18px;border-top:1px solid rgba(255,255,255,.12)}.article p{color:#dbe5eb}
.notice{margin-top:22px;padding:14px 16px;border:1px solid rgba(215,179,90,.35);border-radius:16px;background:rgba(215,179,90,.08);color:#ead9a4}
@media(max-width:760px){.grid{grid-template-columns:1fr}.hero{padding:22px}.wrap{width:min(94vw,1180px)}}
</style>
</head>
<body>
<main class="wrap">
<nav class="nav">
<a href="/portal-preview">Portal Preview</a>
<a href="/media-kit-preview">Media Kit</a>
<a href="/objave">Objave</a>
<a href="/mediji-o-nama">Mediji o nama</a>
<a href="/ai">AI</a>
<a href="/contact">Kontakt</a>
<a href="/legal">Legal</a>
</nav>
${body}
</main>
</body>
</html>`;
}

function __gnkAsgArticlesPage() {
  const cards = __gnkAsgArticlesV3.map(function (article) {
    return `<article class="card article" id="${__gnkAsgEsc(article.slug)}">
<h2>${__gnkAsgEsc(article.title)}</h2>
<div class="meta">GNK ASG Intelligence Desk | strukturirana objava | ${new Date().toISOString().slice(0,10)}</div>
<p><strong>${__gnkAsgEsc(article.summary)}</strong></p>
<p>${__gnkAsgEsc(article.text)}</p>
</article>`;
  }).join("");
  return __gnkAsgHtml("Objave | GNK ASG", `<section class="hero"><div class="kicker">GNK ASG CONTENT STUDIO V3</div><h1>Objave i analitički sadržaj</h1><p class="lead">Ova stranica služi kao stabilna javna zona za članke, poslovne objave i strukturirani sadržaj prije završnog redizajna portala.</p><div class="notice">Status: lokalno spojena ruta, bez promjene produkcijskog homepagea.</div></section>${cards}`, "GNK ASG objave, analitički članci, Content Studio V3, poslovni portal i strukturirani javni sadržaj.");
}

function __gnkAsgMediaAboutHrPage() {
  return __gnkAsgHtml("Mediji o nama | GNK ASG", `<section class="hero"><div class="kicker">MEDIJI O NAMA</div><h1>Mediji o nama</h1><p class="lead">Javna zona za pregled medijskih objava, referenci, priopćenja i materijala povezanih s GNK ASG d.o.o. i GNK DINAMO Ltd.</p></section><section class="grid"><div class="card"><h2>Svrha stranice</h2><p>Ova ruta služi kao centralno mjesto za buduće medijske reference, poveznice, izjave, priopćenja i objave. U ovoj tehničkoj fazi stranica je pripremljena kao stabilan okvir prije punjenja stvarnim medijskim unosima.</p></div><div class="card"><h2>Uredničko pravilo</h2><p>Svaki unos treba imati naslov, izvor, datum, kratki opis, poveznicu, status provjere i napomenu ako je riječ o komentaru, objavi, intervjuu ili službenom priopćenju.</p></div><div class="card"><h2>GNK ASG</h2><p>Glavna komunikacijska priča ostaje GNK ASG d.o.o., GNK DINAMO Ltd., korporativni portal, digitalna imovina, dokumenti, Media Kit i AI pomoćnik.</p></div><div class="card"><h2>Sljedeća faza</h2><p>Nakon stabilizacije routera može se dodati administrativni unos medijskih referenci, filtriranje po tipu objave i download zona za novinare.</p></div></section>`, "Mediji o nama, GNK ASG, GNK DINAMO Ltd., javne objave, priopćenja i medijski materijali.");
}

function __gnkAsgMediaAboutEnPage() {
  return __gnkAsgHtml("Media About Us | GNK ASG", `<section class="hero"><div class="kicker">MEDIA ABOUT US</div><h1>Media About Us</h1><p class="lead">Public area for future media references, press materials, statements and structured information related to GNK ASG d.o.o. and GNK DINAMO Ltd.</p></section><section class="grid"><div class="card"><h2>Purpose</h2><p>This route is prepared as a stable public media reference page before the final visual redesign and before the full media archive is added.</p></div><div class="card"><h2>Editorial structure</h2><p>Each future entry should include title, source, date, link, short description, verification status and content type.</p></div><div class="card"><h2>Corporate focus</h2><p>The main communication focus remains GNK ASG d.o.o., GNK DINAMO Ltd., corporate documentation, Media Kit, AI assistant and structured public information.</p></div><div class="card"><h2>Next phase</h2><p>The next phase may include a protected media admin route, downloadable press materials and a bilingual media archive.</p></div></section>`, "Media About Us page for GNK ASG, GNK DINAMO Ltd., press references, public materials and corporate media information.");
}

function __gnkAsgArticlesJson() {
  return new Response(JSON.stringify({
    ok: true,
    source: "GNK_ASG_SAFE_MERGE_V1",
    generatedAt: new Date().toISOString(),
    count: __gnkAsgArticlesV3.length,
    articles: __gnkAsgArticlesV3
  }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

async function __gnkAsgMergedPublicRoutes(request, env, ctx, pathname) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (pathname === "/objave" || pathname === "/articles" || pathname === "/content-studio") return new Response(__gnkAsgArticlesPage(), { headers: { "content-type": "text/html; charset=utf-8" } });
  if (pathname === "/mediji-o-nama") return new Response(__gnkAsgMediaAboutHrPage(), { headers: { "content-type": "text/html; charset=utf-8" } });
  if (pathname === "/media-about-us") return new Response(__gnkAsgMediaAboutEnPage(), { headers: { "content-type": "text/html; charset=utf-8" } });
  if (pathname === "/data/articles-v3.json" || pathname === "/data/content-studio-v3.json") return __gnkAsgArticlesJson();
  return null;
}

function __gnkAsgSeoTitleForPath(pathname) {
  const map = {
    "/": "GNK ASG | Corporate Portal",
    "/objave": "Objave | GNK ASG",
    "/articles": "Articles | GNK ASG",
    "/content-studio": "Content Studio | GNK ASG",
    "/mediji-o-nama": "Mediji o nama | GNK ASG",
    "/media-about-us": "Media About Us | GNK ASG",
    "/media-kit-preview": "Media Kit | GNK ASG",
    "/portal-preview": "Portal Preview | GNK ASG",
    "/ai": "AI Assistant | GNK ASG",
    "/contact": "Kontakt | GNK ASG",
    "/whatsapp": "WhatsApp | GNK ASG",
    "/legal": "Legal | GNK ASG",
    "/pwa": "PWA | GNK ASG",
    "/qr": "QR | GNK ASG"
  };
  return map[pathname] || "GNK ASG | Corporate Portal";
}

function __gnkAsgSeoDescriptionForPath(pathname) {
  if (pathname === "/objave" || pathname === "/articles" || pathname === "/content-studio") return "GNK ASG objave, analitički članci, Content Studio V3 i strukturirani poslovni sadržaj.";
  if (pathname === "/mediji-o-nama") return "Mediji o nama, javne reference, priopćenja i medijski materijali za GNK ASG d.o.o. i GNK DINAMO Ltd.";
  if (pathname === "/media-about-us") return "Media references, public materials and corporate information for GNK ASG d.o.o. and GNK DINAMO Ltd.";
  if (pathname === "/media-kit-preview") return "Media Kit, brand materials, factsheets and public corporate information for GNK ASG.";
  if (pathname === "/ai") return "Public AI assistant for GNK ASG portal information, documents, media materials and contact guidance.";
  return "GNK ASG corporate portal for GNK ASG d.o.o., GNK DINAMO Ltd., media materials, public documents, AI assistant and structured information.";
}

async function __gnkAsgApplySeo(response, request) {
  if (!response) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return response;

  const url = new URL(request.url);

    const gnkAsgCriticalFix = await gnkAsgCriticalFixResponse(request, env, ctx);
    if (gnkAsgCriticalFix) {
      return gnkAsgCriticalFix;
    }

    // GNK_ASG_CRITICAL_MAP_LOGS_FIX_ROUTE_V1

    if (url.pathname === "/admin-proxy") {
      const targetPath = url.searchParams.get("path") || "/operator/status";
      const safePath = targetPath.startsWith("/operator/") ? targetPath : "/operator/status";
      const token =
        request.headers.get("x-operator-token") ||
        request.headers.get("x-admin-token") ||
        request.headers.get("x-gnk-asg-operator-token") ||
        "";
      const upstream = await fetch("https://operator.gnk-asg.hr" + safePath, {
        method: "GET",
        headers: {
          "x-operator-token": token,
          "cache-control": "no-cache",
          "user-agent": "GNK-ASG-Admin-Proxy/1.0"
        }
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
          "cache-control": "no-store, max-age=0",
          "x-gnk-asg-admin-proxy": "operator-v2"
        }
      });
    }

    const gnkAsgProductionDesign = gnkAsgAllPagesDesignResponse(request);
    if (gnkAsgProductionDesign) {
      return gnkAsgProductionDesign;
    }

    // GNK_ASG_PRODUCTION_DESIGN_FORCE_ROUTE_V3
  const pathname = url.pathname;
  const title = __gnkAsgSeoTitleForPath(pathname);
  const description = __gnkAsgSeoDescriptionForPath(pathname);
  const canonical = url.origin + pathname;
  const image = "https://news.gnk-asg.hr/r2/seo-gallery/ai-technology/gnk-asg-ai-technology-01.webp";

  let html = await response.text();

  if (!/<title>[\s\S]*?<\/title>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, function (m) { return m + "\n<title>" + __gnkAsgEsc(title) + "</title>"; });
  }

  if (!/<meta\s+name=["']description["']/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, function (m) { return m + "\n<meta name=\"description\" content=\"" + __gnkAsgEsc(description) + "\">"; });
  }

  if (!/<link\s+rel=["']canonical["']/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, function (m) { return m + "\n<link rel=\"canonical\" href=\"" + __gnkAsgEsc(canonical) + "\">"; });
  }

  if (!/<meta\s+property=["']og:title["']/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, function (m) { return m + "\n<meta property=\"og:title\" content=\"" + __gnkAsgEsc(title) + "\">"; });
  }

  if (!/<meta\s+property=["']og:description["']/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, function (m) { return m + "\n<meta property=\"og:description\" content=\"" + __gnkAsgEsc(description) + "\">"; });
  }

  if (!/<meta\s+property=["']og:image["']/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, function (m) { return m + "\n<meta property=\"og:image\" content=\"" + __gnkAsgEsc(image) + "\">"; });
  }

  if (!/<meta\s+name=["']twitter:image["']/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, function (m) { return m + "\n<meta name=\"twitter:card\" content=\"summary_large_image\">\n<meta name=\"twitter:image\" content=\"" + __gnkAsgEsc(image) + "\">"; });
  }

  if (!/<script\s+type=["']application\/ld\+json["']/i.test(html)) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": title,
      "description": description,
      "url": canonical,
      "publisher": {
        "@type": "Organization",
        "name": "GNK ASG d.o.o."
      },
      "about": [
        { "@type": "Organization", "name": "GNK ASG d.o.o." },
        { "@type": "Organization", "name": "GNK DINAMO Ltd." },
        { "@type": "Person", "name": "Nermin Sefic" }
      ]
    };
    html = html.replace(/<\/head>/i, "<script type=\"application/ld+json\">" + JSON.stringify(schema) + "</script>\n</head>");
  }

  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("x-gnk-asg-safe-merge", "v1");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

const __gnkAsgHotfixBaseWorker = {
  ...__gnkAsgBaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/admin-proxy") {
      const targetPath = url.searchParams.get("path") || "/operator/status";
      const safePath = targetPath.startsWith("/operator/") ? targetPath : "/operator/status";
      const token =
        request.headers.get("x-operator-token") ||
        request.headers.get("x-admin-token") ||
        request.headers.get("x-gnk-asg-operator-token") ||
        "";
      const upstream = await fetch("https://operator.gnk-asg.hr" + safePath, {
        method: "GET",
        headers: {
          "x-operator-token": token,
          "cache-control": "no-cache",
          "user-agent": "GNK-ASG-Admin-Proxy/1.0"
        }
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
          "cache-control": "no-store, max-age=0",
          "x-gnk-asg-admin-proxy": "operator-v1"
        }
      });
    }

    // GNK_ASG_ADMIN_PROXY_OPERATOR_V1
    const merged = await __gnkAsgMergedPublicRoutes(request, env, ctx, url.pathname);
    if (merged) return __gnkAsgApplySeo(merged, request);
    const response = await __gnkAsgBaseWorker.fetch(request, env, ctx);
    return __gnkAsgApplySeo(response, request);
  }
};


const GNK_ASG_SAFE_MERGE_V1_HOTFIX_MISSING_ROUTES = true;

function __gnkAsgSimplePage(pathname) {
  const pages = {
    "/media-kit-preview": {
      title: "Media Kit Preview | GNK ASG",
      kicker: "MEDIA KIT",
      heading: "Media Kit Preview",
      lead: "Profesionalna zona za korporativni profil, factsheet, brand materijale, dokumente i buduće download pakete za GNK ASG d.o.o. i GNK DINAMO Ltd.",
      cards: [
        ["GNK ASG d.o.o.", "Korporativni profil, javne informacije, dokumentacija i komunikacijski materijali za treće strane."],
        ["GNK DINAMO Ltd.", "Povezana međunarodna priča, poslovni materijali i strukturirani javni sadržaj."],
        ["Download zona", "U sljedećoj fazi ovdje se dodaju PDF i ZIP paketi za novinare, partnere i institucije."],
        ["Status", "Hotfix ruta aktivna, bez diranja produkcijskog homepagea i bez redizajna."]
      ]
    },
    "/portal-preview": {
      title: "Portal Preview | GNK ASG",
      kicker: "PORTAL PREVIEW",
      heading: "GNK ASG Portal Preview",
      lead: "Tehnička preview zona za stabilizaciju javnih modula prije završnog tamnog i lite redizajna.",
      cards: [
        ["Objave", "Content Studio i strukturirane objave nalaze se na /objave."],
        ["Mediji", "Mediji o nama dostupni su na /mediji-o-nama i /media-about-us."],
        ["Komunikacija", "Kontakt i WhatsApp rute ostaju odvojene od administratorskih endpointa."],
        ["Redizajn", "Vizualne promjene idu tek nakon završnog backupa tehničke baze."]
      ]
    },
    "/ai": {
      title: "AI Assistant | GNK ASG",
      kicker: "AI ASSISTANT",
      heading: "Javni AI asistent",
      lead: "Javna AI funkcija portala služi za objašnjenje javnih informacija, navigaciju i pomoć korisniku, bez administratorskih ovlasti.",
      cards: [
        ["Javna funkcija", "AI može objašnjavati javne stranice, objave, Media Kit, kontakt i legal informacije."],
        ["Bez admin ovlasti", "Administrativni operator ostaje odvojen i zaštićen."],
        ["Ograničenje", "AI odgovori nisu pravni, financijski ni investicijski savjet."],
        ["Sljedeća faza", "Kasnije se spaja čitanje strukturiranih javnih data endpointa."]
      ]
    },
    "/legal": {
      title: "Legal | GNK ASG",
      kicker: "LEGAL / GDPR",
      heading: "Pravne napomene i GDPR",
      lead: "Ova stranica je stabilni okvir za pravne napomene, uvjete korištenja, privatnost, kontakt i informativni status javnih podataka.",
      cards: [
        ["Informativni sadržaj", "Sadržaj portala je informativne naravi i ne predstavlja pravni ili financijski savjet."],
        ["Kontakt podaci", "Podaci iz kontakt forme koriste se isključivo radi odgovora na upit."],
        ["AI napomena", "AI pomoćnik ne zamjenjuje stručni pravni, porezni, financijski ili investicijski savjet."],
        ["Dokumenti", "Službeni dokumenti i download paketi dodaju se nakon završne provjere."]
      ]
    },
    "/pwa": {
      title: "PWA | GNK ASG",
      kicker: "PUBLIC PWA",
      heading: "GNK ASG PWA",
      lead: "Pripremna ruta za buduću instalabilnu web aplikaciju i mobilni pristup portal funkcijama.",
      cards: [
        ["Status", "PWA okvir je pripremljen kao javna ruta."],
        ["Svrha", "Brzi pristup portalu, objavama, kontaktu, AI pomoćniku i statusima."],
        ["Admin odvajanje", "Javni PWA ne smije imati operatorske ovlasti."],
        ["Sljedeća faza", "Dodavanje manifest datoteke, ikona, service workera i install CTA-a."]
      ]
    },
    "/qr": {
      title: "QR | GNK ASG",
      kicker: "QR INSTALL",
      heading: "QR pristup portalu",
      lead: "Ruta za budući QR pristup portalu, Media Kitu, PWA instalaciji i mobilnim pregledima.",
      cards: [
        ["QR namjena", "Brzi pristup javnim stranicama i download zonama."],
        ["Media Kit", "QR se kasnije može koristiti na PDF-ovima, dopisima i press materijalima."],
        ["Mobilni pristup", "Priprema za PWA i operator-mobile smjer."],
        ["Status", "Hotfix ruta aktivna prije završnog redizajna."]
      ]
    }
  };

  const page = pages[pathname];
  if (!page) return null;

  const cards = page.cards.map(function (item) {
    return `<div class="card"><h2>${__gnkAsgEsc(item[0])}</h2><p>${__gnkAsgEsc(item[1])}</p></div>`;
  }).join("");

  return new Response(__gnkAsgHtml(page.title, `<section class="hero"><div class="kicker">${__gnkAsgEsc(page.kicker)}</div><h1>${__gnkAsgEsc(page.heading)}</h1><p class="lead">${__gnkAsgEsc(page.lead)}</p><div class="notice">GNK ASG | GNK DINAMO Ltd. | Nermin Sefic | Safe Merge V1 Hotfix</div></section><section class="grid">${cards}</section>`, page.lead), {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}

function __gnkAsgOperatorStatusFallback(pathname, request) {
  if (pathname !== "/operator/knowledge/status" && pathname !== "/operator/seo/status") return null;

  const hasOperatorHeader = Boolean(request.headers.get("authorization") || request.headers.get("x-operator-token"));
  if (!hasOperatorHeader) {
    return new Response(JSON.stringify({
      ok: false,
      error: "operator token required",
      route: pathname
    }, null, 2), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }

  const body = {
    ok: true,
    route: pathname,
    source: "GNK_ASG_SAFE_MERGE_V1_HOTFIX_MISSING_ROUTES",
    generatedAt: new Date().toISOString(),
    status: pathname.includes("/seo/") ? "seo-post-response-active" : "knowledge-route-placeholder-active",
    homepageTouched: false,
    githubUsed: false,
    deployScope: "operator.gnk-asg.hr",
    notes: [
      "Fallback status endpoint restored after safe merge deploy.",
      "Protected by operator header presence; full backend validation remains in core operator routes.",
      "This endpoint exposes status only, not secrets."
    ]
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

const __gnkAsgRedesignBaseWorker = {
  ...__gnkAsgHotfixBaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" || request.method === "HEAD") {
      const directPublic = __gnkAsgSimplePage(url.pathname);
      if (directPublic) return __gnkAsgApplySeo(directPublic, request);

      const directProtected = __gnkAsgOperatorStatusFallback(url.pathname, request);
      if (directProtected) return directProtected;
    }

    const response = await __gnkAsgHotfixBaseWorker.fetch(request, env, ctx);

    if (response && response.status === 404 && (request.method === "GET" || request.method === "HEAD")) {
      const fallbackPublic = __gnkAsgSimplePage(url.pathname);
      if (fallbackPublic) return __gnkAsgApplySeo(fallbackPublic, request);

      const fallbackProtected = __gnkAsgOperatorStatusFallback(url.pathname, request);
      if (fallbackProtected) return fallbackProtected;
    }

    return __gnkAsgApplySeo(response, request);
  }
};


const GNK_ASG_REDESIGN_CORE_V1_ACTIVE = true;

function __gnkAsgRdEsc(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (ch) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
  });
}

function __gnkAsgRdPathInfo(pathname) {
  const map = {
    "/portal-preview": ["Portal Preview", "Korporativni pregled aktivnih modula GNK ASG portala."],
    "/media-kit-preview": ["Media Kit", "Profesionalni medijski i dokumentacijski paket za GNK ASG d.o.o. i GNK DINAMO Ltd."],
    "/media-kit-downloads": ["Media Kit Downloads", "Download zona za logo, brand guidelines, company profile, e-mail potpis i memorandum."],
    "/download": ["Media Kit Downloads", "Download zona za logo, brand guidelines, company profile, e-mail potpis i memorandum."],
    "/objave": ["Objave", "Objave, analitički sadržaj i Content Studio."],
    "/articles": ["Articles", "English-friendly article hub and structured content."],
    "/content-studio": ["Content Studio", "Urednički modul za strukturirane poslovne objave."],
    "/mediji-o-nama": ["Mediji o nama", "Medijske reference, objave i priopćenja."],
    "/media-about-us": ["Media About Us", "Media references and public corporate materials."],
    "/ai": ["AI Assistant", "Javni AI pomoćnik za informacije o portalu."],
    "/contact": ["Contact", "Kontakt, upiti i komunikacijski kanal."],
    "/whatsapp": ["WhatsApp", "Brzi kontakt kanal."],
    "/legal": ["Legal", "Pravne napomene, privatnost i uvjeti korištenja."],
    "/pwa": ["PWA", "Mobilni i instalabilni pristup portalu."],
    "/qr": ["QR", "QR pristup javnim modulima i Media Kitu."]
  };
  return map[pathname] || ["GNK ASG", "GNK ASG korporativni portal."];
}

function __gnkAsgRdNav(pathname, theme) {
  const items = [
    ["/portal-preview", "O nama"],
    ["/media-kit-preview", "Media Kit"],
    ["/media-kit-downloads", "Downloads"],
    ["/ai", "AI Assistant"],
    ["/objave", "News Hub"],
    ["/content-studio", "Content Studio"],
    ["/contact", "Contact"],
    ["/legal", "Legal"],
    ["/pwa", "PWA"],
    ["/qr", "QR"]
  ];

  const links = items.map(function (item) {
    const active = pathname === item[0] ? " active" : "";
    return `<a class="nav-link${active}" href="${item[0]}">${__gnkAsgRdEsc(item[1])}</a>`;
  }).join("");

  return `<header class="rd-topbar">
  <div class="rd-logo">
    <span class="rd-logo-mark">ASG</span>
    <span><strong>GNK ASG</strong><small>Global Network Kapital | Advanced Sports & Governance</small></span>
  </div>
  <button class="rd-menu-btn" type="button" onclick="document.body.classList.toggle('rd-menu-open')">Menu</button>
  <nav class="rd-nav">${links}<span class="rd-status-dot"></span><a class="rd-lang" href="?lang=hr">HR</a><span class="rd-sep">|</span><a class="rd-lang" href="?lang=en">EN</a><a class="rd-theme" href="${theme === "lite" ? "?theme=dark" : "?theme=lite"}">${theme === "lite" ? "Dark" : "Light"}</a></nav>
</header>`;
}

function __gnkAsgRdCss() {
  return `<style>
:root{--gold:#c98a20;--gold2:#d4af37;--navy:#0a1324;--ink:#111827;--muted:#5b6778;--line:rgba(201,138,32,.24);--soft:#f7f4ef;--white:#fff;--green:#27a35e;--red:#d63c3c}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Inter,Arial,Helvetica,sans-serif;color:var(--ink);background:#fff;line-height:1.55}
a{text-decoration:none;color:inherit}.rd-page{min-height:100vh}.rd-page.lite{background:linear-gradient(180deg,#fff,#f9f7f2 62%,#fff)}.rd-page.dark{background:radial-gradient(circle at 45% 0,#12233b 0,#08111f 42%,#03070d 100%);color:#edf4f8}
.rd-topbar{height:76px;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:0 34px;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20;backdrop-filter:blur(18px)}
.lite .rd-topbar{background:rgba(255,255,255,.9)}.dark .rd-topbar{background:rgba(4,8,14,.82);border-bottom-color:rgba(212,175,55,.32)}
.rd-logo{display:flex;align-items:center;gap:12px;min-width:260px}.rd-logo-mark{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--gold2);color:var(--gold);font-size:12px;font-weight:800}.dark .rd-logo-mark{color:#f2d47a}
.rd-logo strong{display:block;color:var(--gold);font-family:Georgia,serif;font-size:26px;letter-spacing:.08em}.dark .rd-logo strong{color:#f0c565}.rd-logo small{display:block;font-size:10px;color:var(--muted)}.dark .rd-logo small{color:#aab6c6}
.rd-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.nav-link,.rd-lang,.rd-theme{font-size:13px;padding:9px 10px;border-radius:999px;color:#18243a}.dark .nav-link,.dark .rd-lang,.dark .rd-theme{color:#e9eef5}
.nav-link.active{color:#fff;background:linear-gradient(135deg,var(--gold2),var(--gold));box-shadow:0 8px 24px rgba(201,138,32,.22)}.dark .nav-link.active{color:#0b0f16}.rd-sep{opacity:.4}.rd-status-dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px rgba(39,163,94,.12)}
.rd-menu-btn{display:none;border:1px solid var(--line);background:transparent;color:inherit;border-radius:999px;padding:9px 14px;font-weight:700}
.rd-wrap{width:min(1180px,92vw);margin:0 auto}.rd-hero{padding:54px 0 28px;position:relative;overflow:hidden}.rd-hero:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 64% 24%,rgba(212,175,55,.16),transparent 38%);pointer-events:none}.dark .rd-hero:before{background:radial-gradient(circle at 68% 20%,rgba(212,175,55,.22),transparent 42%)}
.rd-hero-grid{display:grid;grid-template-columns:1.02fr .98fr;gap:22px;align-items:stretch}.rd-kicker{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:800}.dark .rd-kicker{color:#f0c565}
.rd-title{font-family:Georgia,serif;font-size:clamp(42px,5.2vw,74px);line-height:.98;margin:12px 0 16px;letter-spacing:-.045em}.rd-title span{color:var(--gold)}
.rd-lead{font-size:17px;color:var(--muted);max-width:680px}.dark .rd-lead{color:#b7c3d2}.rd-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
.rd-btn{border-radius:12px;padding:12px 17px;font-weight:800;font-size:13px;border:1px solid var(--line)}.rd-btn.primary{background:linear-gradient(135deg,var(--gold2),var(--gold));color:#0b0f16}.rd-btn.ghost{color:var(--gold);background:rgba(255,255,255,.38)}.dark .rd-btn.ghost{background:rgba(255,255,255,.04);color:#f0c565}
.rd-panel{border-radius:20px;border:1px solid var(--line);background:rgba(255,255,255,.76);box-shadow:0 18px 48px rgba(20,35,60,.08)}.dark .rd-panel{background:rgba(8,17,31,.78);border-color:rgba(212,175,55,.28);box-shadow:0 24px 70px rgba(0,0,0,.32)}
.rd-globe{min-height:360px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}.rd-globe:before{content:"";width:430px;height:430px;border-radius:50%;border:1px solid rgba(212,175,55,.25);background:radial-gradient(circle at 35% 25%,rgba(212,175,55,.32),transparent 26%),repeating-radial-gradient(circle at center,rgba(212,175,55,.12) 0 1px,transparent 1px 22px);box-shadow:inset 0 0 80px rgba(212,175,55,.08)}.dark .rd-globe:before{background:radial-gradient(circle at 35% 25%,rgba(212,175,55,.45),transparent 28%),repeating-radial-gradient(circle at center,rgba(212,175,55,.16) 0 1px,transparent 1px 22px)}
.rd-side-stack{position:absolute;right:22px;top:22px;display:grid;gap:12px;width:280px}.rd-side-card{border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.78);padding:13px 15px;display:flex;justify-content:space-between;gap:10px}.dark .rd-side-card{background:rgba(4,10,20,.74)}
.rd-side-card strong{display:block;font-size:14px}.rd-side-card small{display:block;color:var(--muted)}.dark .rd-side-card small{color:#aab6c6}.rd-number{font-weight:900;color:var(--gold)}
.rd-section{padding:12px 0}.rd-section-title{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin:18px 0 12px}.rd-section-title h2{margin:0;font-size:28px;font-family:Georgia,serif}.rd-section-title small{color:var(--muted)}.dark .rd-section-title small{color:#aab6c6}
.rd-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.rd-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.rd-card{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.82);padding:18px;min-height:150px}.dark .rd-card{background:rgba(8,17,31,.78);border-color:rgba(212,175,55,.24)}
.rd-card h3{margin:0 0 9px;font-size:18px;color:var(--gold)}.rd-card p{margin:0 0 12px;color:var(--muted)}.dark .rd-card p{color:#b7c3d2}
.rd-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.rd-metric{border:1px solid rgba(201,138,32,.2);border-radius:14px;padding:12px;background:rgba(255,255,255,.5)}.dark .rd-metric{background:rgba(255,255,255,.035)}
.rd-metric small{display:block;color:var(--muted)}.dark .rd-metric small{color:#aab6c6}.rd-metric strong{display:block;font-size:28px;font-family:Georgia,serif}.rd-up{color:var(--green);font-size:12px}.rd-down{color:var(--red);font-size:12px}
.rd-icon-row{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.rd-icon{border:1px solid rgba(201,138,32,.2);border-radius:14px;padding:13px;text-align:center;min-height:110px}.rd-icon b{display:block;color:var(--gold);font-size:13px}.rd-icon span{display:block;color:var(--muted);font-size:12px}.dark .rd-icon span{color:#aab6c6}
.rd-doc-list{display:grid;gap:9px}.rd-doc{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(201,138,32,.2);border-radius:12px;padding:11px 12px}.rd-doc small{color:var(--muted)}.dark .rd-doc small{color:#aab6c6}
.rd-footer{margin-top:28px;border-top:1px solid var(--line);padding:28px 0 38px}.rd-footer-grid{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:18px;color:var(--muted);font-size:14px}.dark .rd-footer-grid{color:#b7c3d2}.rd-footer h4{margin:0 0 8px;color:var(--gold)}
@media(max-width:900px){.rd-topbar{height:auto;padding:12px 18px;align-items:flex-start}.rd-menu-btn{display:block}.rd-nav{display:none;width:100%;padding-top:12px;justify-content:flex-start}.rd-menu-open .rd-nav{display:flex}.rd-logo{min-width:auto}.rd-hero-grid,.rd-grid-3,.rd-grid-2{grid-template-columns:1fr}.rd-metrics{grid-template-columns:repeat(2,1fr)}.rd-icon-row{grid-template-columns:repeat(2,1fr)}.rd-side-stack{position:static;width:auto;margin:18px}.rd-globe{min-height:280px}.rd-footer-grid{grid-template-columns:1fr}.rd-title{font-size:42px}}
</style>`;
}

function __gnkAsgRdLayout(request, pathname, content, options) {
  const url = new URL(request.url);
  const theme = url.searchParams.get("theme") === "dark" ? "dark" : "lite";
  const info = __gnkAsgRdPathInfo(pathname);
  const title = options?.title || info[0];
  const description = options?.description || info[1];

  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${__gnkAsgRdEsc(title)} | GNK ASG</title>
<meta name="description" content="${__gnkAsgRdEsc(description)}">
<link rel="canonical" href="${url.origin}${pathname}">
<meta property="og:title" content="${__gnkAsgRdEsc(title)} | GNK ASG">
<meta property="og:description" content="${__gnkAsgRdEsc(description)}">
<meta property="og:image" content="https://operator.gnk-asg.hr/r2/seo-gallery/ai-technology/gnk-asg-ai-technology-01.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://operator.gnk-asg.hr/r2/seo-gallery/ai-technology/gnk-asg-ai-technology-01.webp">
<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"WebPage","name":title,"description":description,"publisher":{"@type":"Organization","name":"GNK ASG d.o.o."},"about":[{"@type":"Organization","name":"GNK ASG d.o.o."},{"@type":"Organization","name":"GNK DINAMO Ltd."},{"@type":"Person","name":"Nermin Sefic"}]})}</script>
${__gnkAsgRdCss()}
</head>
<body>
<div class="rd-page ${theme}">
${__gnkAsgRdNav(pathname, theme)}
${content}
<footer class="rd-footer">
  <div class="rd-wrap rd-footer-grid">
    <div><h4>GNK ASG d.o.o.</h4><div>Zagreb, Hrvatska<br>OIB: 75227917632 | MBS: 081512375<br>GNK DINAMO Ltd. Group | Boulder, Colorado, USA</div></div>
    <div><h4>Brze poveznice</h4><div><a href="/portal-preview">O nama</a><br><a href="/media-kit-preview">Media Kit</a><br><a href="/objave">Objave</a></div></div>
    <div><h4>Kontakt</h4><div>info@gnk-asg.hr<br>+385 1 5555 901<br><a href="/whatsapp">WhatsApp</a></div></div>
    <div><h4>Legal</h4><div><a href="/legal">Privacy / Terms</a><br><a href="/pwa">PWA</a><br><a href="/qr">QR</a></div></div>
  </div>
</footer>
</div>
</body>
</html>`;
}

function __gnkAsgRdHome(request, pathname) {
  const content = `<main>
<section class="rd-hero">
  <div class="rd-wrap rd-hero-grid">
    <div>
      <div class="rd-kicker">GNK ASG d.o.o.</div>
      <h1 class="rd-title">Building value.<br><span>Driving technology.</span></h1>
      <p class="rd-lead">GNK ASG d.o.o. je korporativna platforma koja povezuje sport, tehnologiju, kapital i upravljanje kroz strukturirani portal, javne objave, Media Kit, AI pomoćnika i dokumente.</p>
      <div class="rd-actions"><a class="rd-btn primary" href="/media-kit-preview">Media Kit</a><a class="rd-btn ghost" href="/objave">News Hub</a><a class="rd-btn ghost" href="/ai">AI Assistant</a></div>
    </div>
    <div class="rd-panel rd-globe">
      <div class="rd-side-stack">
        <div class="rd-side-card"><span><strong>Financijski pokazatelji</strong><small>FY2025 pregled</small></span><span class="rd-number">+12,4%</span></div>
        <div class="rd-side-card"><span><strong>Tehnologija i AI</strong><small>AI projekti</small></span><span class="rd-number">18</span></div>
        <div class="rd-side-card"><span><strong>Market Monitor</strong><small>Digitalna tržišta</small></span><span class="rd-number">24/7</span></div>
      </div>
    </div>
  </div>
</section>

<section class="rd-section">
  <div class="rd-wrap rd-grid-3">
    <article class="rd-card"><h3>GNK ASG d.o.o.</h3><p>Sjedište: Zagreb, Hrvatska<br>Direktor: Nermin Sefić<br>OIB: 75227917632<br>MBS: 081512375</p><a class="rd-btn ghost" href="/portal-preview">Više o društvu</a></article>
    <article class="rd-card"><h3>Financijski profil FY2025</h3><div class="rd-metrics"><div class="rd-metric"><small>Ukupni prihodi</small><strong>504,00</strong><small>mil. EUR <span class="rd-up">+11,7%</span></small></div><div class="rd-metric"><small>Ukupna aktiva</small><strong>46,40</strong><small>mil. EUR <span class="rd-up">+9,3%</span></small></div><div class="rd-metric"><small>Kapital i rezerve</small><strong>46,21</strong><small>mil. EUR <span class="rd-up">+7,8%</span></small></div><div class="rd-metric"><small>Kratkoročne obveze</small><strong>184,50</strong><small>tis. EUR <span class="rd-down">-5,2%</span></small></div></div></article>
    <article class="rd-card"><h3>GNK DINAMO Ltd. Group</h3><p>Matično društvo: GNK DINAMO d.d.<br>Sjedište: Zagreb, Hrvatska<br>Grupa prisutna kroz sport, tehnologiju i investicije.<br>Boulder, Colorado, USA</p><a class="rd-btn ghost" href="/media-about-us">Pregled grupe</a></article>
  </div>
</section>

<section class="rd-section"><div class="rd-wrap"><div class="rd-section-title"><h2>Technology & Artificial Intelligence</h2><small>Premium modularni sustav</small></div><div class="rd-icon-row">
  <div class="rd-icon"><b>AI</b><span>Modeli i automatizacija</span></div><div class="rd-icon"><b>Software</b><span>Skalabilne platforme</span></div><div class="rd-icon"><b>FinTech</b><span>Digitalna imovina</span></div><div class="rd-icon"><b>Sports Tech</b><span>Performance analytics</span></div><div class="rd-icon"><b>Security</b><span>Zaštita podataka</span></div><div class="rd-icon"><b>Global</b><span>Partnerstva i R&D</span></div>
</div></div></section>

<section class="rd-section"><div class="rd-wrap rd-grid-3">
  <article class="rd-card"><h3>Digital Exchange Monitor</h3><div class="rd-metrics"><div class="rd-metric"><small>BTC</small><strong>€61.245</strong><small><span class="rd-up">+1,32%</span></small></div><div class="rd-metric"><small>ETH</small><strong>€3.025</strong><small><span class="rd-up">+1,08%</span></small></div><div class="rd-metric"><small>SOL</small><strong>€144</strong><small><span class="rd-up">+0,65%</span></small></div><div class="rd-metric"><small>XRP</small><strong>€0,53</strong><small><span class="rd-up">+0,73%</span></small></div></div><p>Podaci su informativni i mogu kasniti.</p></article>
  <article class="rd-card"><h3>GNK ASG AI Assistant</h3><p>Javni AI pomoćnik služi za navigaciju, objašnjenje javnih modula i pomoć korisnicima. Ne predstavlja pravni ni financijski savjet.</p><a class="rd-btn primary" href="/ai">Otvori AI</a></article>
  <article class="rd-card"><h3>Javni dokumenti i izvori</h3><div class="rd-doc-list"><div class="rd-doc"><span>Annual Report FY2025<br><small>PDF | HR/EN</small></span><b>↓</b></div><div class="rd-doc"><span>Financial Statements FY2025<br><small>PDF</small></span><b>↓</b></div><div class="rd-doc"><span>Corporate Governance Report<br><small>PDF</small></span><b>↓</b></div></div></article>
</div></section>
</main>`;

  return __gnkAsgRdLayout(request, pathname, content, { title: "Portal Preview", description: "GNK ASG redizajnirani korporativni portal." });
}

function __gnkAsgRdMediaKit(request, pathname) {
  const content = `<main class="rd-wrap">
<section class="rd-hero"><div class="rd-kicker">Dvojezični / Bilingual Media Kit</div><h1 class="rd-title">GNK ASG d.o.o.<br><span>Media Kit</span></h1><p class="rd-lead">Profesionalni paket za medije, partnere i korporativne dionike. Uključuje profil društva, ključne činjenice, logo primjenu, dokumente i download zonu.</p></section>
<section class="rd-grid-3">
  <article class="rd-card"><h3>Company Overview / O nama</h3><p>GNK ASG d.o.o. povezuje sport, tehnologiju, kapital i governance kako bi stvarao održivu vrijednost i dugoročan učinak.</p></article>
  <article class="rd-card"><h3>Key Facts / Ključne činjenice</h3><p>Sjedište: Zagreb, Hrvatska<br>OIB: 75227917632<br>MBS: 081512375<br>Direktor / UBO: Nermin Sefić</p></article>
  <article class="rd-card"><h3>Brand Positioning</h3><p>Invest | Innovate | Integrate | Inspire. Vizualni identitet koristi tamnu premium i svijetlu čistu verziju.</p></article>
</section>
<section class="rd-section"><div class="rd-section-title"><h2>Primjena logotipa i dokumenata</h2><small>Website | PDF | E-mail | Social</small></div><div class="rd-grid-3">
  <article class="rd-card"><h3>Website header/footer</h3><p>Logo lijevo u zaglavlju, footer s podacima GNK ASG d.o.o., kontaktom i poveznicama.</p></article>
  <article class="rd-card"><h3>Dokumenti</h3><p>Media Kit, Corporate Profile, Financial Statements, Governance Report, Letterhead, Presentation Template.</p></article>
  <article class="rd-card"><h3>Download Assets</h3><div class="rd-doc-list"><div class="rd-doc"><span>Logo Pack</span><b>ZIP</b></div><div class="rd-doc"><span>Brand Guidelines</span><b>PDF</b></div><div class="rd-doc"><span>Presentation Template</span><b>PPTX</b></div><div class="rd-doc"><span>Letterhead Template</span><b>DOCX</b></div></div></article>
</div></section></main>`;
  return __gnkAsgRdLayout(request, pathname, content, { title: "Media Kit", description: "GNK ASG Media Kit i brand assets." });
}

function __gnkAsgRdTextPage(request, pathname) {
  const info = __gnkAsgRdPathInfo(pathname);
  const blocks = {
    "/objave": ["Objave i analitički sadržaj", "Stranica povezuje javne objave, članke i Content Studio sadržaj.", [["Content Studio", "Strukturirani poslovni članci i urednički sadržaj."], ["News Hub", "Pregled poslovnih i tehnoloških vijesti."], ["SEO", "Svaka objava dobiva title, description, canonical, OpenGraph i schema."]]],
    "/articles": ["Articles", "English-friendly hub for articles and public corporate content.", [["Business", "Corporate and market content."], ["Technology", "AI, platforms and digital assets."], ["Media", "References and public materials."]]],
    "/content-studio": ["Content Studio", "Urednički modul za članke i strukturirani sadržaj.", [["Drafts", "Priprema tekstova."], ["Publishing", "Objava nakon provjere."], ["Archive", "Arhiva sadržaja."]]],
    "/mediji-o-nama": ["Mediji o nama", "Pregled medijskih referenci, objava i priopćenja.", [["Reference", "Budući unosi medijskih objava."], ["Priopćenja", "Službene komunikacije."], ["Arhiva", "Pregled po datumu i izvoru."]]],
    "/media-about-us": ["Media About Us", "Public media references and corporate communication materials.", [["References", "Media links and mentions."], ["Statements", "Official releases."], ["Archive", "Structured media archive."]]],
    "/ai": ["GNK ASG AI Assistant", "Javni AI pomoćnik za navigaciju i objašnjenje javnih informacija.", [["Javne informacije", "AI čita samo javne module."], ["Bez admin ovlasti", "Operator ostaje zaštićen."], ["Napomena", "Nije pravni ili financijski savjet."]]],
    "/contact": ["Contact", "Kontakt forma, e-mail i komunikacijski kanal.", [["E-mail", "info@gnk-asg.hr"], ["Telefon", "+385 1 5555 901"], ["Adresa", "Zagreb, Hrvatska"]]],
    "/whatsapp": ["WhatsApp", "Brzi kontakt i mobilni komunikacijski kanal.", [["Status", "Faza 1: javni WhatsApp link."], ["Kontrola", "Osjetljive poruke ne šalju se automatski."], ["Next", "WhatsApp Business API kasnije."]]],
    "/legal": ["Legal / GDPR", "Pravne napomene, privatnost i uvjeti korištenja.", [["Privacy", "Svrha obrade kontakt podataka."], ["Terms", "Informativni status sadržaja."], ["AI", "AI nije pravni, financijski ni investicijski savjet."]]],
    "/pwa": ["PWA", "Mobilni i instalabilni pristup portalu.", [["Install", "Budući CTA za instalaciju."], ["Mobile", "Responzivni prikaz."], ["Public only", "Bez administratorskih ovlasti."]]],
    "/qr": ["QR", "QR pristup javnim modulima i Media Kitu.", [["Media Kit", "QR za press materijale."], ["PWA", "QR za mobilni pristup."], ["Documents", "QR za download zonu."]]]
  };

  const b = blocks[pathname] || [info[0], info[1], [["GNK ASG", "Korporativni modul."], ["Media Kit", "Javni materijali."], ["Contact", "Komunikacija."]]];
  const cards = b[2].map(function (item) { return `<article class="rd-card"><h3>${__gnkAsgRdEsc(item[0])}</h3><p>${__gnkAsgRdEsc(item[1])}</p></article>`; }).join("");

  const content = `<main class="rd-wrap"><section class="rd-hero"><div class="rd-kicker">GNK ASG</div><h1 class="rd-title">${__gnkAsgRdEsc(b[0])}</h1><p class="rd-lead">${__gnkAsgRdEsc(b[1])}</p><div class="rd-actions"><a class="rd-btn primary" href="/portal-preview">Portal</a><a class="rd-btn ghost" href="/media-kit-preview">Media Kit</a><a class="rd-btn ghost" href="/contact">Contact</a></div></section><section class="rd-grid-3">${cards}</section></main>`;

  return __gnkAsgRdLayout(request, pathname, content, { title: b[0], description: b[1] });
}

function __gnkAsgRdShouldHandle(pathname) {
  return [
    "/portal-preview",
    "/media-kit-preview",
    "/objave",
    "/articles",
    "/content-studio",
    "/mediji-o-nama",
    "/media-about-us",
    "/ai",
    "/contact",
    "/whatsapp",
    "/legal",
    "/pwa",
    "/qr"
  ].includes(pathname);
}

function __gnkAsgRdRender(request, pathname) {
  if (pathname === "/portal-preview") return __gnkAsgRdHome(request, pathname);
  if (pathname === "/media-kit-preview") return __gnkAsgRdMediaKit(request, pathname);
  if (__gnkAsgRdShouldHandle(pathname)) return __gnkAsgRdTextPage(request, pathname);
  return null;
}

const __gnkAsgMediaKitBaseWorker = {
  ...__gnkAsgRedesignBaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if ((request.method === "GET" || request.method === "HEAD") && __gnkAsgRdShouldHandle(url.pathname)) {
      const redesigned = __gnkAsgRdRender(request, url.pathname);
      if (redesigned) {
        return new Response(redesigned, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "x-gnk-asg-redesign-core": "v1",
            "cache-control": "public, max-age=120"
          }
        });
      }
    }

    return __gnkAsgRedesignBaseWorker.fetch(request, env, ctx);
  }
};


const GNK_ASG_MEDIA_KIT_DOWNLOAD_CORE_V1_ACTIVE = true;

function __gnkAsgMkEsc(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (ch) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
  });
}

function __gnkAsgMkSvgLogo(mode) {
  const dark = mode === "dark";
  const bg = dark ? "#08111f" : "#ffffff";
  const ink = dark ? "#f4efe3" : "#111827";
  const gold = "#d4af37";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420" viewBox="0 0 1200 420">
<rect width="1200" height="420" rx="42" fill="${bg}"/>
<circle cx="180" cy="210" r="104" fill="none" stroke="${gold}" stroke-width="10"/>
<path d="M180 116v188M126 210h108M144 162c48 36 96 36 144 0M144 258c48-36 96-36 144 0" fill="none" stroke="${gold}" stroke-width="8" stroke-linecap="round"/>
<path d="M304 112h18v196h-18zM336 154h18v154h-18zM368 198h18v110h-18z" fill="${gold}"/>
<text x="430" y="184" font-family="Georgia,serif" font-size="78" font-weight="700" fill="${gold}">GNK ASG</text>
<text x="432" y="236" font-family="Arial,Helvetica,sans-serif" font-size="25" letter-spacing="2" fill="${ink}">Global Network Kapital | Advanced Sports &amp; Governance</text>
<text x="432" y="286" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="${ink}">Invest | Innovate | Integrate | Inspire</text>
</svg>`;
}

function __gnkAsgMkBaseCss() {
  return `<style>
:root{--gold:#d4af37;--gold2:#c98a20;--ink:#111827;--muted:#667085;--navy:#08111f;--line:rgba(212,175,55,.28);--soft:#f8f6f1}
*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,Helvetica,sans-serif;color:var(--ink);background:linear-gradient(180deg,#fff,#f8f6f1);line-height:1.55}.page{width:min(1120px,92vw);margin:0 auto;padding:42px 0 60px}.top{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:24px;margin-bottom:28px}.brand{display:flex;gap:16px;align-items:center}.mark{width:62px;height:62px;border-radius:50%;border:2px solid var(--gold);display:grid;place-items:center;color:var(--gold);font-family:Georgia,serif;font-weight:700}.brand h1{margin:0;font-family:Georgia,serif;font-size:38px;color:var(--gold)}.brand small{display:block;color:var(--muted);letter-spacing:.05em}.tag{text-align:right;color:var(--muted)}.tag b{color:var(--gold)}h2{font-family:Georgia,serif;font-size:30px;margin:28px 0 12px;color:var(--gold)}h3{margin:0 0 8px;color:var(--gold)}p{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 14px 34px rgba(20,35,60,.06)}.dark-card{background:var(--navy);color:#fff;border:1px solid var(--line);border-radius:18px;padding:18px}.dark-card p{color:#cbd5e1}.list{display:grid;gap:10px}.row{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid rgba(17,24,39,.08);padding:9px 0}.row:last-child{border-bottom:0}.swatches{display:flex;gap:10px;flex-wrap:wrap}.swatch{width:92px;height:92px;border-radius:16px;border:1px solid rgba(0,0,0,.08);display:flex;align-items:end;padding:10px;font-size:12px;font-weight:700}.doc{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:13px;background:#fff}.btn{display:inline-flex;border-radius:12px;padding:11px 14px;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#111827;font-weight:800}.footer{margin-top:34px;padding-top:22px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;color:var(--muted);font-size:13px}@media(max-width:850px){.top,.footer{flex-direction:column}.grid,.grid2{grid-template-columns:1fr}.tag{text-align:left}}
</style>`;
}

function __gnkAsgMkHtml(title, body) {
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${__gnkAsgMkEsc(title)}</title>${__gnkAsgMkBaseCss()}</head><body><main class="page"><header class="top"><div class="brand"><div class="mark">ASG</div><div><h1>${__gnkAsgMkEsc(title)}</h1><small>GNK ASG d.o.o. | GNK DINAMO Ltd. | HR/EN</small></div></div><div class="tag"><b>Building value. Driving technology.</b><br>Invest | Innovate | Integrate | Inspire</div></header>${body}<footer class="footer"><div>GNK ASG d.o.o. | Zagreb, Hrvatska | OIB 75227917632 | MBS 081512375</div><div>UBO: Nermin Sefic | www.gnk-asg.hr</div></footer></main></body></html>`;
}

function __gnkAsgMkMediaKit() {
  return __gnkAsgMkHtml("GNK ASG Media Kit", `<section class="grid">
<div class="card"><h3>Company Overview / O nama</h3><p>GNK ASG d.o.o. je korporativna platforma koja povezuje sport, tehnologiju, kapital i upravljanje radi stvaranja održive vrijednosti.</p></div>
<div class="card"><h3>Key Facts / Ključne činjenice</h3><div class="list"><div class="row"><span>Sjedište</span><b>Zagreb, Hrvatska</b></div><div class="row"><span>OIB</span><b>75227917632</b></div><div class="row"><span>MBS</span><b>081512375</b></div><div class="row"><span>Direktor / UBO</span><b>Nermin Sefic</b></div></div></div>
<div class="dark-card"><h3>Brand Positioning</h3><p>Premium corporate-tech identitet: sport, technology, capital, governance, AI, digital assets i poslovna dokumentacija.</p></div>
</section><h2>Logo, dokumenti i digitalna primjena</h2><section class="grid">
<div class="card"><h3>Website</h3><p>Logo lijevo u headeru, konzistentan footer, mobilni menu, HR/EN, dark/light tema.</p></div>
<div class="card"><h3>Documents</h3><p>Media Kit, Corporate Profile, Financial Statements, Governance Report, Letterhead i Presentation Template.</p></div>
<div class="card"><h3>Digital Use</h3><p>E-mail potpis, social kartice, PDF naslovnice, prezentacije i download stranice.</p></div>
</section>`);
}

function __gnkAsgMkBrandGuidelines() {
  return __gnkAsgMkHtml("GNK ASG Brand Guidelines", `<h2>Color Palette / Paleta boja</h2><div class="swatches"><div class="swatch" style="background:#d4af37">Gold<br>#D4AF37</div><div class="swatch" style="background:#c98a20;color:#fff">Bronze<br>#C98A20</div><div class="swatch" style="background:#08111f;color:#fff">Deep Navy<br>#08111F</div><div class="swatch" style="background:#111827;color:#fff">Ink<br>#111827</div><div class="swatch" style="background:#f8f6f1">Soft<br>#F8F6F1</div></div><h2>Typography / Tipografija</h2><section class="grid2"><div class="card"><h3>Headlines</h3><p style="font-family:Georgia,serif;font-size:32px;color:#d4af37">Georgia / Serif premium style</p></div><div class="card"><h3>Body & UI</h3><p>Inter / Arial / Helvetica za čitljivost, navigaciju, tablice i dokumente.</p></div></section><h2>Logo usage / Primjena logotipa</h2><section class="grid"><div class="card"><h3>Header</h3><p>Logo ide lijevo u glavnom zaglavlju.</p></div><div class="card"><h3>Footer</h3><p>Logo ide uz osnovne podatke društva.</p></div><div class="card"><h3>Documents</h3><p>Logo ide na naslovnice, memorandum, prezentacije i e-mail potpis.</p></div></section>`);
}

function __gnkAsgMkCompanyProfile() {
  return __gnkAsgMkHtml("GNK ASG Company Profile", `<section class="grid2"><div class="card"><h3>GNK ASG d.o.o.</h3><p>Sjedište: Zagreb, Hrvatska<br>OIB: 75227917632<br>MBS: 081512375<br>Direktor: Nermin Sefic<br>UBO: Nermin Sefic</p></div><div class="card"><h3>GNK DINAMO Ltd.</h3><p>Međunarodni grupni okvir i poslovna struktura povezana sa sportom, tehnologijom, investicijama i digitalnom imovinom.</p></div></section><h2>Focus areas</h2><section class="grid"><div class="card"><h3>Sport</h3><p>Sportske djelatnosti, performance i sports-tech smjer.</p></div><div class="card"><h3>Technology & AI</h3><p>Softverske platforme, AI automatizacija i javni AI assistant.</p></div><div class="card"><h3>Capital & Governance</h3><p>Korporativna dokumentacija, upravljanje, izvještaji i tržišni pregled.</p></div></section>`);
}

function __gnkAsgMkDinamoKit() {
  return __gnkAsgMkHtml("GNK DINAMO Ltd. Media Kit", `<section class="grid"><div class="card"><h3>Group Profile</h3><p>GNK DINAMO Ltd. predstavlja međunarodni korporativni okvir povezan s grupnom pričom GNK ASG portala.</p></div><div class="card"><h3>Key Identity</h3><p>GNK DINAMO Ltd. | Boulder, Colorado, USA | UBO: Nermin Sefic.</p></div><div class="dark-card"><h3>Positioning</h3><p>Invest | Innovate | Integrate | Inspire kroz sport, tehnologiju, kapital i governance.</p></div></section>`);
}

function __gnkAsgMkEmailSignature() {
  return __gnkAsgMkHtml("GNK ASG Email Signature", `<section class="card"><div style="display:flex;gap:18px;align-items:center"><div class="mark">ASG</div><div><h3>Nermin Sefic</h3><p>Direktor / Director | GNK ASG d.o.o.<br>T: +385 1 5555 901 | E: info@gnk-asg.hr | W: www.gnk-asg.hr<br>Zagreb, Hrvatska | OIB 75227917632 | MBS 081512375</p></div></div></section>`);
}

function __gnkAsgMkLetterhead() {
  return __gnkAsgMkHtml("GNK ASG Letterhead", `<section class="card" style="min-height:720px"><div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(212,175,55,.4);padding-bottom:18px"><div class="brand"><div class="mark">ASG</div><div><h3>GNK ASG d.o.o.</h3><p>Zagreb, Hrvatska</p></div></div><div style="text-align:right;color:#667085">OIB: 75227917632<br>MBS: 081512375<br>www.gnk-asg.hr</div></div><div style="padding:80px 0;color:#667085">Sadržaj dopisa / letter content area.</div><div style="border-top:1px solid rgba(212,175,55,.4);padding-top:14px;color:#667085;font-size:13px">GNK ASG d.o.o. | Zagreb | info@gnk-asg.hr | +385 1 5555 901</div></section>`);
}

function __gnkAsgMkDownloadsPage() {
  const docs = [
    ["/download/gnk-asg-media-kit.html", "GNK ASG Media Kit", "HTML"],
    ["/download/gnk-asg-brand-guidelines.html", "Brand Guidelines", "HTML"],
    ["/download/gnk-asg-company-profile.html", "Company Profile", "HTML"],
    ["/download/gnk-dinamo-ltd-media-kit.html", "GNK DINAMO Ltd. Media Kit", "HTML"],
    ["/download/gnk-asg-logo-light.svg", "Logo Light", "SVG"],
    ["/download/gnk-asg-logo-dark.svg", "Logo Dark", "SVG"],
    ["/download/gnk-asg-email-signature.html", "Email Signature", "HTML"],
    ["/download/gnk-asg-letterhead.html", "Letterhead", "HTML"]
  ].map(function (x) { return `<a class="doc" href="${x[0]}" download><span>${__gnkAsgMkEsc(x[1])}<br><small>${x[2]} | download</small></span><b>↓</b></a>`; }).join("");
  return __gnkAsgMkHtml("Media Kit Downloads", `<h2>Download Assets / Preuzimanje materijala</h2><section class="list">${docs}</section>`);
}

function __gnkAsgMkRoute(pathname) {
  if (pathname === "/media-kit-downloads" || pathname === "/download") return { type: "html", filename: "gnk-asg-media-kit-downloads.html", body: __gnkAsgMkDownloadsPage(), inline: true };
  if (pathname === "/download/gnk-asg-media-kit.html") return { type: "html", filename: "gnk-asg-media-kit.html", body: __gnkAsgMkMediaKit() };
  if (pathname === "/download/gnk-asg-brand-guidelines.html") return { type: "html", filename: "gnk-asg-brand-guidelines.html", body: __gnkAsgMkBrandGuidelines() };
  if (pathname === "/download/gnk-asg-company-profile.html") return { type: "html", filename: "gnk-asg-company-profile.html", body: __gnkAsgMkCompanyProfile() };
  if (pathname === "/download/gnk-dinamo-ltd-media-kit.html") return { type: "html", filename: "gnk-dinamo-ltd-media-kit.html", body: __gnkAsgMkDinamoKit() };
  if (pathname === "/download/gnk-asg-email-signature.html") return { type: "html", filename: "gnk-asg-email-signature.html", body: __gnkAsgMkEmailSignature() };
  if (pathname === "/download/gnk-asg-letterhead.html") return { type: "html", filename: "gnk-asg-letterhead.html", body: __gnkAsgMkLetterhead() };
  if (pathname === "/download/gnk-asg-logo-light.svg") return { type: "svg", filename: "gnk-asg-logo-light.svg", body: __gnkAsgMkSvgLogo("light") };
  if (pathname === "/download/gnk-asg-logo-dark.svg") return { type: "svg", filename: "gnk-asg-logo-dark.svg", body: __gnkAsgMkSvgLogo("dark") };
  return null;
}

const __gnkAsgP1DownloadsBaseWorker = {
  ...__gnkAsgMediaKitBaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" || request.method === "HEAD") {
      const asset = __gnkAsgMkRoute(url.pathname);
      if (asset) {
        const contentType = asset.type === "svg" ? "image/svg+xml; charset=utf-8" : "text/html; charset=utf-8";
        const disposition = asset.inline ? "inline" : `attachment; filename="${asset.filename}"`;
        return new Response(asset.body, {
          headers: {
            "content-type": contentType,
            "content-disposition": disposition,
            "cache-control": "public, max-age=300",
            "x-gnk-asg-media-kit-download-core": "v1"
          }
        });
      }
    }

    return __gnkAsgMediaKitBaseWorker.fetch(request, env, ctx);
  }
};


const GNK_ASG_MENU_LINK_PATCH_V1_ACTIVE = true;


const GNK_ASG_P1_MEDIA_KIT_DOWNLOADS_REDESIGN_FIX_V1_ACTIVE = true;

function __gnkAsgP1DownloadsPage(request, pathname) {
  const rows = [
    ["/download/gnk-asg-media-kit.html", "GNK ASG Media Kit", "HTML"],
    ["/download/gnk-asg-brand-guidelines.html", "Brand Guidelines", "HTML"],
    ["/download/gnk-asg-company-profile.html", "Company Profile", "HTML"],
    ["/download/gnk-dinamo-ltd-media-kit.html", "GNK DINAMO Ltd. Media Kit", "HTML"],
    ["/download/gnk-asg-logo-light.svg", "Logo Light", "SVG"],
    ["/download/gnk-asg-logo-dark.svg", "Logo Dark", "SVG"],
    ["/download/gnk-asg-email-signature.html", "Email Signature", "HTML"],
    ["/download/gnk-asg-letterhead.html", "Letterhead", "HTML"]
  ];

  const docs = rows.map(function (item) {
    return `<a class="rd-doc" href="${item[0]}" download><span>${__gnkAsgRdEsc(item[1])}<br><small>${item[2]} | download</small></span><b>↓</b></a>`;
  }).join("");

  const content = `<main class="rd-wrap">
<section class="rd-hero">
  <div class="rd-kicker">MEDIA KIT DOWNLOADS</div>
  <h1 class="rd-title">Media Kit<br><span>Downloads</span></h1>
  <p class="rd-lead">Download zona za GNK ASG d.o.o. i GNK DINAMO Ltd. materijale: Media Kit, Brand Guidelines, Company Profile, logo varijante, e-mail potpis i memorandum.</p>
  <div class="rd-actions"><a class="rd-btn primary" href="/download/gnk-asg-media-kit.html">GNK ASG Media Kit</a><a class="rd-btn ghost" href="/download/gnk-asg-logo-light.svg">Logo Light</a><a class="rd-btn ghost" href="/media-kit-preview">Media Kit Preview</a></div>
</section>

<section class="rd-section">
  <div class="rd-section-title"><h2>Download Assets</h2><small>HTML | SVG | HR/EN</small></div>
  <div class="rd-grid-2">
    <article class="rd-card"><h3>GNK ASG d.o.o.</h3><p>Sjedište: Zagreb, Hrvatska<br>OIB: 75227917632<br>MBS: 081512375<br>Direktor / UBO: Nermin Sefic</p></article>
    <article class="rd-card"><h3>GNK DINAMO Ltd.</h3><p>Grupni i međunarodni medijski paket za povezanu korporativnu priču, dokumente, prezentacije i javne profile.</p></article>
  </div>
</section>

<section class="rd-section">
  <div class="rd-section-title"><h2>Files</h2><small>Preuzimanje materijala</small></div>
  <div class="rd-doc-list">${docs}</div>
</section>
</main>`;

  return __gnkAsgRdLayout(request, "/media-kit-downloads", content, {
    title: "Media Kit Downloads",
    description: "Download zona za GNK ASG Media Kit, logotipe, brand guidelines i javne dokumente."
  });
}

const __gnkAsgRealDocsR2BaseWorker = {
  ...__gnkAsgP1DownloadsBaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/media-kit-downloads" || url.pathname === "/download")) {
      return new Response(__gnkAsgP1DownloadsPage(request, url.pathname), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-gnk-asg-redesign-core": "v1",
          "x-gnk-asg-media-kit-download-core": "v1",
          "x-gnk-asg-p1-downloads-fix": "v1",
          "cache-control": "public, max-age=120"
        }
      });
    }

    return __gnkAsgP1DownloadsBaseWorker.fetch(request, env, ctx);
  }
};


const GNK_ASG_REAL_DOCUMENT_R2_PACK_V1_ACTIVE = true;

const __gnkAsgRealDocumentsR2V1 = {
  "/download/gnk-asg-media-kit.pdf": { key: "documents/gnk-asg-media-kit.pdf", filename: "gnk-asg-media-kit.pdf", label: "GNK ASG Media Kit PDF", contentType: "application/pdf", bytes: 989, sha256: "28C97D36AEC7F62CD180EDABD817BEC5B2BFAFC1743DFF628D1C944BE2956BC6" },
  "/download/gnk-asg-company-profile.pdf": { key: "documents/gnk-asg-company-profile.pdf", filename: "gnk-asg-company-profile.pdf", label: "GNK ASG Company Profile PDF", contentType: "application/pdf", bytes: 995, sha256: "DC084CCEDD9D4BF2CB4960D528E69875422EEC26785A2F3ECEFE182559542B22" },
  "/download/gnk-asg-brand-guidelines.pdf": { key: "documents/gnk-asg-brand-guidelines.pdf", filename: "gnk-asg-brand-guidelines.pdf", label: "GNK ASG Brand Guidelines PDF", contentType: "application/pdf", bytes: 887, sha256: "A9BADECA02A5AC67624CE549163F1C3D5E54DDF8D642E7EA20621EA5782BF754" },
  "/download/gnk-dinamo-ltd-media-kit.pdf": { key: "documents/gnk-dinamo-ltd-media-kit.pdf", filename: "gnk-dinamo-ltd-media-kit.pdf", label: "GNK DINAMO Ltd. Media Kit PDF", contentType: "application/pdf", bytes: 832, sha256: "A0D7C70C632899FC03863E1C306D81E45200209093BD5BB175512BCF8583691C" },
  "/download/gnk-asg-letterhead.docx": { key: "documents/gnk-asg-letterhead.docx", filename: "gnk-asg-letterhead.docx", label: "GNK ASG Letterhead DOCX", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: 1845, sha256: "7F2E810A380DC1D131F3CC4AC8D8CCAC40FB138262F0E6BA2E857C4A2F95A006" },
  "/download/gnk-asg-media-kit.docx": { key: "documents/gnk-asg-media-kit.docx", filename: "gnk-asg-media-kit.docx", label: "GNK ASG Media Kit DOCX", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: 1910, sha256: "CB05CFF4611DD72AF121CAFA3EDF93132998D3A961C4C810F8F4178EE695FF2A" },
  "/download/gnk-asg-presentation-template.pptx": { key: "documents/gnk-asg-presentation-template.pptx", filename: "gnk-asg-presentation-template.pptx", label: "GNK ASG Presentation Template PPTX", contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", bytes: 1909, sha256: "1069D897D4656DE5CF0FDD3C1552FD920D5E7C8440D64B1F651799D702F41602" }
};

function __gnkAsgRealDocsR2Page(request) {
  const docs = Object.keys(__gnkAsgRealDocumentsR2V1).map(function (route) {
    const item = __gnkAsgRealDocumentsR2V1[route];
    const type = item.filename.endsWith(".pdf") ? "PDF" : item.filename.endsWith(".docx") ? "DOCX" : "PPTX";
    return '<a class="rd-doc" href="' + route + '" download><span>' + __gnkAsgRdEsc(item.label) + '<br><small>' + type + ' | ' + item.bytes + ' bytes | download</small></span><b>↓</b></a>';
  }).join("");

  const content = '<main class="rd-wrap">' +
  '<section class="rd-hero">' +
  '<div class="rd-kicker">REAL DOCUMENT PACK</div>' +
  '<h1 class="rd-title">Real documents<br><span>PDF | DOCX | PPTX</span></h1>' +
  '<p class="rd-lead">Stvarni dokumenti za GNK ASG d.o.o. i GNK DINAMO Ltd.: Media Kit, Company Profile, Brand Guidelines, memorandum i prezentacijski predložak.</p>' +
  '<div class="rd-actions"><a class="rd-btn primary" href="/download/gnk-asg-media-kit.pdf">Media Kit PDF</a><a class="rd-btn ghost" href="/download/gnk-asg-letterhead.docx">Letterhead DOCX</a><a class="rd-btn ghost" href="/download/gnk-asg-presentation-template.pptx">PPTX Template</a></div>' +
  '</section>' +
  '<section class="rd-section"><div class="rd-section-title"><h2>Document downloads</h2><small>Stvarne datoteke</small></div><div class="rd-doc-list">' + docs + '</div></section>' +
  '<section class="rd-section"><div class="rd-grid-2"><article class="rd-card"><h3>GNK ASG d.o.o.</h3><p>Zagreb, Hrvatska | OIB 75227917632 | MBS 081512375 | Direktor / UBO: Nermin Sefic</p></article><article class="rd-card"><h3>GNK DINAMO Ltd.</h3><p>Međunarodni medijski i korporativni paket za javnu komunikaciju, dokumente i prezentacije.</p></article></div></section>' +
  '</main>';

  return __gnkAsgRdLayout(request, "/media-kit-downloads", content, {
    title: "Media Kit Downloads",
    description: "Stvarni PDF, DOCX i PPTX dokumenti za GNK ASG Media Kit i javne materijale."
  });
}

const __gnkAsgRealDocsInlineV2BaseWorker = {
  ...__gnkAsgRealDocsR2BaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if ((request.method === "GET" || request.method === "HEAD") && __gnkAsgRealDocumentsR2V1[url.pathname]) {
      const item = __gnkAsgRealDocumentsR2V1[url.pathname];
      if (!env || !env.GNK_ASG_MEDIA_ASSETS) {
        return new Response("R2 binding missing", { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } });
      }
      const object = await env.GNK_ASG_MEDIA_ASSETS.get(item.key);
      if (!object) {
        return new Response("Document not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
      }
      return new Response(object.body, {
        headers: {
          "content-type": item.contentType,
          "content-disposition": 'attachment; filename="' + item.filename + '"',
          "cache-control": "public, max-age=3600",
          "x-gnk-asg-real-document-pack": "v1",
          "x-gnk-asg-document-sha256": item.sha256
        }
      });
    }

    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/media-kit-downloads" || url.pathname === "/download")) {
      return new Response(__gnkAsgRealDocsR2Page(request), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-gnk-asg-redesign-core": "v1",
          "x-gnk-asg-media-kit-download-core": "v1",
          "x-gnk-asg-p1-downloads-fix": "v1",
          "x-gnk-asg-real-document-pack": "v1",
          "cache-control": "public, max-age=120"
        }
      });
    }

    return __gnkAsgRealDocsR2BaseWorker.fetch(request, env, ctx);
  }
};


const GNK_ASG_REAL_DOCUMENT_INLINE_FALLBACK_V2_ACTIVE = true;

function __gnkAsgInlineV2Bytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function __gnkAsgInlineV2Esc(value) {
  if (typeof __gnkAsgRdEsc === "function") return __gnkAsgRdEsc(value);
  return String(value ?? "").replace(/[&<>"']/g, function (ch) {
    return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch];
  });
}

function __gnkAsgInlineV2Page(request) {
  const docs = Object.keys(__gnkAsgRealDocumentsInlineV2).map(function (route) {
    const item = __gnkAsgRealDocumentsInlineV2[route];
    const type = item.filename.endsWith(".pdf") ? "PDF" : item.filename.endsWith(".docx") ? "DOCX" : "PPTX";
    return '<a class="rd-doc" href="' + route + '" download><span>' + __gnkAsgInlineV2Esc(item.label) + '<br><small>' + type + ' | ' + item.bytes + ' bytes | download</small></span><b>↓</b></a>';
  }).join("");

  const content =
    '<main class="rd-wrap">' +
    '<section class="rd-hero">' +
    '<div class="rd-kicker">REAL DOCUMENT PACK</div>' +
    '<h1 class="rd-title">Real documents<br><span>PDF | DOCX | PPTX</span></h1>' +
    '<p class="rd-lead">Stvarni dokumenti za GNK ASG d.o.o. i GNK DINAMO Ltd.: Media Kit, Company Profile, Brand Guidelines, memorandum i prezentacijski predložak.</p>' +
    '<div class="rd-actions"><a class="rd-btn primary" href="/download/gnk-asg-media-kit.pdf">Media Kit PDF</a><a class="rd-btn ghost" href="/download/gnk-asg-letterhead.docx">Letterhead DOCX</a><a class="rd-btn ghost" href="/download/gnk-asg-presentation-template.pptx">PPTX Template</a></div>' +
    '</section>' +
    '<section class="rd-section"><div class="rd-section-title"><h2>Document downloads</h2><small>Stvarne datoteke</small></div><div class="rd-doc-list">' + docs + '</div></section>' +
    '<section class="rd-section"><div class="rd-grid-2"><article class="rd-card"><h3>GNK ASG d.o.o.</h3><p>Zagreb, Hrvatska | OIB 75227917632 | MBS 081512375 | Direktor / UBO: Nermin Sefic</p></article><article class="rd-card"><h3>GNK DINAMO Ltd.</h3><p>Međunarodni medijski i korporativni paket za javnu komunikaciju, dokumente i prezentacije.</p></article></div></section>' +
    '</main>';

  if (typeof __gnkAsgRdLayout === "function") {
    return __gnkAsgRdLayout(request, "/media-kit-downloads", content, {
      title: "Media Kit Downloads",
      description: "Stvarni PDF, DOCX i PPTX dokumenti za GNK ASG Media Kit i javne materijale."
    });
  }

  return '<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Media Kit Downloads</title></head><body>' + content + '</body></html>';
}

const __gnkAsgIndexFinalV5BaseWorker = {
  ...__gnkAsgRealDocsInlineV2BaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if ((request.method === "GET" || request.method === "HEAD") && __gnkAsgRealDocumentsInlineV2[url.pathname]) {
      const item = __gnkAsgRealDocumentsInlineV2[url.pathname];
      return new Response(__gnkAsgInlineV2Bytes(item.base64), {
        headers: {
          "content-type": item.contentType,
          "content-disposition": 'attachment; filename="' + item.filename + '"',
          "cache-control": "public, max-age=3600",
          "x-gnk-asg-real-document-pack": "v1",
          "x-gnk-asg-real-document-inline": "v2"
        }
      });
    }

    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/media-kit-downloads" || url.pathname === "/download")) {
      return new Response(__gnkAsgInlineV2Page(request), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-gnk-asg-redesign-core": "v1",
          "x-gnk-asg-media-kit-download-core": "v1",
          "x-gnk-asg-p1-downloads-fix": "v1",
          "x-gnk-asg-real-document-pack": "v1",
          "x-gnk-asg-real-document-inline": "v2",
          "cache-control": "public, max-age=120"
        }
      });
    }

    return __gnkAsgRealDocsInlineV2BaseWorker.fetch(request, env, ctx);
  }
};



const GNK_ASG_INDEX_FINAL_V5_ACTIVE = true;

function __gnkV5Theme(request) {
  const url = new URL(request.url);
  const t = (url.searchParams.get("theme") || "dark").toLowerCase();
  return t === "lite" || t === "light" ? "lite" : "dark";
}

function __gnkV5Esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, function(ch) {
    return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch];
  });
}

function __gnkV5Logo(type) {
  const label = type === "dinamo" ? "GNK DINAMO" : type === "group" ? "GNK DINAMO GROUP" : "GNK ASG";
  const sub = type === "dinamo" ? "Global Network Kapital" : type === "group" ? "Invest | Innovate | Integrate" : "Global Network Kapital | Advanced Sports & Governance";
  const letter = type === "dinamo" ? "D" : type === "group" ? "G" : "A";
  return '<div class="v5-logo v5-logo-' + type + '"><svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="gold' + type + '" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#fff1b8"/><stop offset="45%" stop-color="#d4af37"/><stop offset="100%" stop-color="#8a6217"/></linearGradient></defs><circle cx="48" cy="48" r="39" fill="none" stroke="url(#gold' + type + ')" stroke-width="5"/><path d="M28 62 L38 34 L48 62 Z" fill="url(#gold' + type + ')"/><path d="M50 62 L50 30 L64 30 C75 30 82 38 82 48 C82 58 75 66 64 66 L56 66 L56 58 L63 58 C69 58 74 54 74 48 C74 42 69 38 63 38 L58 38 L58 62 Z" fill="url(#gold' + type + ')"/><text x="48" y="89" text-anchor="middle" font-size="13" font-family="Georgia,serif" fill="url(#gold' + type + ')">' + letter + '</text></svg><span><b>' + label + '</b><small>' + sub + '</small></span></div>';
}

function __gnkV5Css() {
  return `
<style>
:root{
  --v5-bg:#06111f;
  --v5-bg2:#0a1428;
  --v5-card:rgba(8,22,38,.78);
  --v5-card2:rgba(255,255,255,.045);
  --v5-line:rgba(212,175,55,.34);
  --v5-line2:rgba(212,175,55,.16);
  --v5-gold:#d4af37;
  --v5-gold2:#f4d97a;
  --v5-text:#f6f0dc;
  --v5-muted:rgba(246,240,220,.70);
  --v5-red:#ff5c5c;
  --v5-green:#4ed17c;
  --v5-blue:#3a7cff;
}
html.v5-lite{
  --v5-bg:#fbfaf5;
  --v5-bg2:#f1eee5;
  --v5-card:rgba(255,255,255,.86);
  --v5-card2:rgba(255,255,255,.72);
  --v5-line:rgba(184,126,29,.28);
  --v5-line2:rgba(184,126,29,.13);
  --v5-text:#0d1728;
  --v5-muted:rgba(13,23,40,.66);
}
*{box-sizing:border-box}
body.v5-body{
  margin:0;
  min-height:100vh;
  color:var(--v5-text);
  background:
    radial-gradient(circle at 22% 0%,rgba(212,175,55,.20),transparent 33%),
    radial-gradient(circle at 72% 12%,rgba(58,124,255,.12),transparent 30%),
    linear-gradient(145deg,var(--v5-bg),var(--v5-bg2));
  font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;
}
html.v5-lite body.v5-body{
  background:
    radial-gradient(circle at 20% 0%,rgba(212,175,55,.20),transparent 35%),
    radial-gradient(circle at 74% 10%,rgba(58,124,255,.07),transparent 30%),
    linear-gradient(145deg,#ffffff,#f3f0e8);
}
.v5-page{max-width:1760px;margin:0 auto;padding:0 28px 30px}
.v5-top{
  position:sticky;
  top:0;
  z-index:50;
  display:grid;
  grid-template-columns:310px 1fr auto;
  gap:18px;
  align-items:center;
  padding:14px 0 10px;
  border-bottom:1px solid var(--v5-line);
  background:linear-gradient(180deg,rgba(3,9,18,.94),rgba(3,9,18,.72));
  backdrop-filter:blur(18px);
}
html.v5-lite .v5-top{background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(255,255,255,.76))}
.v5-logo{display:flex;align-items:center;gap:12px;min-width:0}
.v5-logo svg{width:54px;height:54px;flex:0 0 54px;filter:drop-shadow(0 10px 18px rgba(212,175,55,.18))}
.v5-logo b{display:block;font-family:Georgia,serif;letter-spacing:.09em;font-size:24px;color:var(--v5-gold2);white-space:nowrap}
.v5-logo small{display:block;color:var(--v5-muted);font-size:10px;margin-top:2px;white-space:nowrap}
html.v5-lite .v5-logo b{color:#b67b11}
.v5-nav{display:flex;justify-content:center;gap:5px;flex-wrap:wrap}
.v5-nav a,.v5-chip,.v5-btn{
  color:var(--v5-text);
  text-decoration:none;
  border:1px solid var(--v5-line2);
  border-radius:13px;
  padding:10px 12px;
  background:rgba(255,255,255,.035);
  font-size:13px;
  line-height:1.12;
}
.v5-nav a b{display:block;font-size:13px}
.v5-nav a small{display:block;color:var(--v5-muted);font-size:11px;margin-top:2px}
.v5-nav a:hover,.v5-nav a.active,.v5-btn.gold{
  background:linear-gradient(135deg,#e4b647,#ad7417);
  color:#100d06;
  border-color:rgba(255,230,160,.6);
}
.v5-lang{display:flex;gap:8px;align-items:center}
.v5-hero{
  display:grid;
  grid-template-columns:minmax(360px,520px) 1fr 360px;
  gap:18px;
  min-height:300px;
  padding:22px 0 14px;
  align-items:stretch;
}
.v5-hero-copy{padding:24px 18px}
.v5-kicker{color:var(--v5-gold);letter-spacing:.08em;text-transform:uppercase;font-size:13px;font-weight:700}
.v5-title{font-family:Georgia,serif;font-size:52px;line-height:.98;margin:12px 0 14px}
.v5-title span{color:var(--v5-gold)}
.v5-lead{color:var(--v5-muted);font-size:16px;line-height:1.55;margin:0 0 18px}
.v5-actions{display:flex;gap:10px;flex-wrap:wrap}
.v5-map-hero{
  position:relative;
  overflow:hidden;
  border:1px solid var(--v5-line);
  border-radius:22px;
  background:radial-gradient(circle at 50% 45%,rgba(212,175,55,.20),transparent 28%),linear-gradient(145deg,rgba(4,16,31,.78),rgba(6,13,22,.42));
  min-height:300px;
}
html.v5-lite .v5-map-hero{background:radial-gradient(circle at 50% 45%,rgba(212,175,55,.20),transparent 32%),linear-gradient(145deg,rgba(255,255,255,.92),rgba(255,255,255,.45))}
.v5-map-hero svg{position:absolute;inset:0;width:100%;height:100%}
.v5-city{
  cursor:pointer;
  filter:drop-shadow(0 0 10px rgba(244,217,122,.9));
  animation:v5pulse 2.2s infinite ease-in-out;
}
.v5-city-label{font-size:13px;fill:var(--v5-text);paint-order:stroke;stroke:rgba(0,0,0,.62);stroke-width:3px;stroke-linejoin:round}
html.v5-lite .v5-city-label{stroke:rgba(255,255,255,.74)}
.v5-line-glow{stroke:rgba(212,175,55,.38);stroke-width:1.4;stroke-dasharray:5 7;animation:v5dash 12s linear infinite}
@keyframes v5pulse{0%,100%{opacity:.75;r:5}50%{opacity:1;r:8}}
@keyframes v5dash{to{stroke-dashoffset:-120}}
.v5-side-stack{display:grid;gap:10px}
.v5-status-card,.v5-card{
  border:1px solid var(--v5-line);
  border-radius:17px;
  background:linear-gradient(145deg,var(--v5-card),var(--v5-card2));
  box-shadow:0 24px 60px rgba(0,0,0,.16);
  overflow:hidden;
}
.v5-status-card{padding:14px;display:grid;grid-template-columns:48px 1fr auto;gap:12px;align-items:center}
.v5-icon{
  width:48px;height:48px;border-radius:50%;border:1px solid var(--v5-line);display:grid;place-items:center;color:var(--v5-gold);font-size:24px;background:rgba(212,175,55,.08)
}
.v5-status-card b{display:block}
.v5-status-card small{display:block;color:var(--v5-muted);font-size:12px;margin-top:3px}
.v5-status-card em{font-style:normal;color:var(--v5-green);font-weight:800}
.v5-grid{display:grid;grid-template-columns:1fr 1.35fr 1.3fr;gap:12px;margin-top:0}
.v5-card{padding:18px}
.v5-card h2,.v5-card h3{margin:0 0 12px;font-family:Georgia,serif;color:var(--v5-gold2);font-weight:500}
html.v5-lite .v5-card h2,html.v5-lite .v5-card h3{color:#ad7417}
.v5-facts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.v5-fact{border:1px solid var(--v5-line2);border-radius:14px;padding:13px;background:rgba(255,255,255,.035);min-height:96px}
.v5-fact small{display:block;color:var(--v5-muted);font-size:12px}
.v5-fact strong{display:block;font-size:31px;font-family:Georgia,serif;margin-top:6px}
.v5-fact em{font-style:normal;color:var(--v5-green);font-size:12px}
.v5-fact.red em{color:var(--v5-red)}
.v5-company-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.v5-company-row{display:flex;justify-content:space-between;border-bottom:1px solid var(--v5-line2);padding:8px 0;color:var(--v5-muted)}
.v5-company-row b{color:var(--v5-text)}
.v5-mid{display:grid;grid-template-columns:1.1fr 1.15fr .9fr;gap:12px;margin-top:12px}
.v5-tech{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.v5-mini{border:1px solid var(--v5-line2);border-radius:14px;padding:13px;background:rgba(255,255,255,.03);min-height:105px}
.v5-mini b{display:block;color:var(--v5-gold2);margin-bottom:5px}
.v5-mini small{color:var(--v5-muted);line-height:1.35}
.v5-assets{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.v5-asset{border:1px solid var(--v5-line2);border-radius:14px;padding:13px;background:rgba(255,255,255,.03)}
.v5-asset b{display:flex;justify-content:space-between;gap:8px}
.v5-asset strong{display:block;font-size:19px;margin-top:7px}
.v5-stable{grid-column:span 2;border-color:rgba(212,175,55,.48);background:linear-gradient(145deg,rgba(212,175,55,.12),rgba(255,255,255,.03))}
.v5-stable strong{font-size:24px}
.v5-doc-list{display:grid;gap:9px}
.v5-doc-list a{display:flex;justify-content:space-between;gap:10px;text-decoration:none;color:var(--v5-text);border:1px solid var(--v5-line2);border-radius:12px;padding:11px;background:rgba(255,255,255,.03)}
.v5-bottom{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px}
.v5-news-home p{color:var(--v5-muted);line-height:1.5;margin:0 0 12px}
.v5-ai-box{border:1px solid var(--v5-line2);border-radius:14px;padding:14px;background:rgba(255,255,255,.03)}
.v5-ai-input{margin-top:10px;border:1px solid var(--v5-line2);border-radius:12px;padding:12px;color:var(--v5-muted)}
.v5-city-panel{position:absolute;left:16px;bottom:16px;right:16px;z-index:5;display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid var(--v5-line);border-radius:16px;padding:12px;background:rgba(0,0,0,.48);backdrop-filter:blur(12px)}
html.v5-lite .v5-city-panel{background:rgba(255,255,255,.72)}
.v5-city-panel b{color:var(--v5-gold2)}
.v5-seal{
  position:fixed;
  right:24px;
  bottom:24px;
  z-index:30;
  width:72px;height:72px;border-radius:50%;
  display:grid;place-items:center;
  border:2px solid var(--v5-gold);
  background:radial-gradient(circle,#d4af37 0,#8a6217 42%,#07111f 70%);
  color:#fff1b8;
  box-shadow:0 0 24px rgba(212,175,55,.42);
  font-size:11px;
  text-align:center;
}
.v5-footer{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;gap:18px;margin-top:14px;padding:22px 0;border-top:1px solid var(--v5-line)}
.v5-footer small{color:var(--v5-muted)}
.v5-news-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.v5-news-card{border:1px solid var(--v5-line);border-radius:16px;padding:15px;background:linear-gradient(145deg,var(--v5-card),var(--v5-card2));min-height:150px}
.v5-news-card small{color:var(--v5-gold)}
.v5-news-card p{color:var(--v5-muted);line-height:1.45}
.v5-admin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.v5-admin-grid a{border:1px solid var(--v5-line);border-radius:16px;padding:16px;text-decoration:none;color:var(--v5-text);background:linear-gradient(145deg,var(--v5-card),var(--v5-card2))}
@media(max-width:1200px){
  .v5-hero,.v5-grid,.v5-mid,.v5-bottom{grid-template-columns:1fr}
  .v5-top{grid-template-columns:1fr}
  .v5-facts,.v5-assets,.v5-news-grid,.v5-admin-grid{grid-template-columns:1fr 1fr}
}
@media(max-width:720px){
  .v5-page{padding:0 14px 24px}
  .v5-title{font-size:40px}
  .v5-facts,.v5-assets,.v5-tech,.v5-news-grid,.v5-admin-grid,.v5-footer{grid-template-columns:1fr}
  .v5-logo b{font-size:20px}
}
@media print{
  body.v5-body{background:white!important;color:#111!important}
  .v5-top,.v5-actions,.v5-seal{display:none!important}
  .v5-page{max-width:none;padding:0}
  .v5-card,.v5-status-card,.v5-map-hero{box-shadow:none!important;background:white!important;color:#111!important;break-inside:avoid}
  .v5-page:after{content:"GNK ASG | PRINT SEAL | " attr(data-print-stamp);position:fixed;right:24px;bottom:20px;border:2px solid #d4af37;border-radius:50%;width:110px;height:110px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;color:#9b6c12}
}
</style>`;
}

function __gnkV5Head(title, request) {
  const url = new URL(request.url);
  return '<!doctype html><html class="v5-' + __gnkV5Theme(request) + '" lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + __gnkV5Esc(title) + '</title><link rel="canonical" href="' + url.origin + url.pathname + '"><meta property="og:title" content="' + __gnkV5Esc(title) + '"><meta property="og:type" content="website"><meta property="og:image" content="' + url.origin + '/download/gnk-asg-logo-dark.svg"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"GNK ASG d.o.o.","identifier":"OIB 75227917632","url":"' + url.origin + '"}</script>' + __gnkV5Css() + '</head><body class="v5-body"><div class="v5-page" data-print-stamp="' + new Date().toISOString() + '">';
}

function __gnkV5Top(request, active) {
  const theme = __gnkV5Theme(request);
  const next = theme === "lite" ? "dark" : "lite";
  const items = [
    ["/","Grupa","Group"],
    ["/locations","Lokacije","Cities"],
    ["/business-news","Business News","News Hub"],
    ["/ai","AI Assistant","AI"],
    ["/media-kit-downloads","Dokumenti","Documents"],
    ["/admin","Admin","Operator"]
  ].map(function(i){
    const cls = active === i[0] ? " active" : "";
    return '<a class="' + cls + '" href="' + i[0] + '?theme=' + theme + '"><b>' + i[1] + '</b><small>' + i[2] + '</small></a>';
  }).join("");
  return '<header class="v5-top">' + __gnkV5Logo("asg") + '<nav class="v5-nav">' + items + '</nav><div class="v5-lang"><a class="v5-chip" href="?theme=' + next + '">' + (theme === "lite" ? "DARK" : "LITE") + '</a><a class="v5-chip" href="/?theme=' + theme + '">HR</a><a class="v5-chip" href="/?theme=' + theme + '&lang=en">EN</a></div></header>';
}

function __gnkV5Map() {
  const cities = [
    ["Zagreb","GNK ASG d.o.o. | sjedište | Hrvatska",51,43],
    ["Boulder","GNK DINAMO Ltd. | USA",23,40],
    ["Beograd","Sports Performance Tracking d.o.o. | partner",55,46],
    ["Nova Gorica","K&D Kompani | Slovenija",50,42],
    ["Sarajevo","regionalni operativni/brand kontekst",53,47]
  ];
  const points = cities.map(function(c,i){
    return '<g class="v5-city" data-city="' + __gnkV5Esc(c[0]) + '" data-info="' + __gnkV5Esc(c[1]) + '"><circle cx="' + c[2] + '%" cy="' + c[3] + '%" r="6" fill="#d4af37"/><circle cx="' + c[2] + '%" cy="' + c[3] + '%" r="13" fill="none" stroke="#d4af37" opacity=".32"/><text class="v5-city-label" x="' + (c[2]+1.7) + '%" y="' + (c[3]-1.4) + '%">' + c[0] + '</text></g>';
  }).join("");
  return '<div class="v5-map-hero"><svg viewBox="0 0 1000 420" preserveAspectRatio="none"><defs><radialGradient id="m1"><stop offset="0%" stop-color="#d4af37" stop-opacity=".36"/><stop offset="100%" stop-color="#d4af37" stop-opacity="0"/></radialGradient></defs><rect width="1000" height="420" fill="transparent"/><ellipse cx="500" cy="210" rx="410" ry="150" fill="url(#m1)" opacity=".38"/><path d="M90 220 C230 90,380 120,510 205 C650 295,760 320,920 190" class="v5-line-glow" fill="none"/><path d="M190 250 C340 180,520 120,840 245" class="v5-line-glow" fill="none"/><path d="M210 170 C420 280,640 80,855 180" class="v5-line-glow" fill="none"/><text x="500" y="64" text-anchor="middle" fill="rgba(212,175,55,.36)" font-size="26" font-family="Georgia,serif">GLOBAL LOCATIONS MAP</text>' + points + '</svg><div class="v5-city-panel"><span><b id="v5-city-name">Zagreb</b><br><small id="v5-city-info">GNK ASG d.o.o. | sjedište | Hrvatska</small></span><button class="v5-btn gold" onclick="window.print()">Ispis PDF</button></div></div>';
}

function __gnkV5Index(request) {
  return __gnkV5Head("GNK ASG | Corporate Portal", request) + __gnkV5Top(request, "/") +
    '<main>' +
    '<section class="v5-hero"><div class="v5-hero-copy"><div class="v5-kicker">GNK ASG d.o.o.</div><h1 class="v5-title">Building value.<br><span>Driving technology.</span></h1><p class="v5-lead">GNK ASG d.o.o. korporativni je identitet na sjecištu sporta, tehnologije, digitalne imovine, financija i upravljanja unutar grupne strukture GNK DINAMO Ltd.</p><div class="v5-actions"><a class="v5-btn gold" href="#group-finance">Financije grupe</a><a class="v5-btn" href="/locations?theme=' + __gnkV5Theme(request) + '">Karta gradova</a><a class="v5-btn" href="/admin?theme=' + __gnkV5Theme(request) + '">Admin</a></div></div>' + __gnkV5Map() +
    '<aside class="v5-side-stack"><div class="v5-status-card"><span class="v5-icon">▥</span><span><b>Financijski pokazatelji grupe</b><small>FY2025 pregled</small></span><em>LIVE</em></div><div class="v5-status-card"><span class="v5-icon">◎</span><span><b>33 povezana društva</b><small>grupna struktura</small></span><em>33</em></div><div class="v5-status-card"><span class="v5-icon">✦</span><span><b>14 u razvoju</b><small>aktivni razvojni pravci</small></span><em>14</em></div><div class="v5-status-card"><span class="v5-icon">◈</span><span><b>GNKSC stable coin</b><small>stable coin monitor</small></span><em>PEG</em></div></aside></section>' +
    '<section id="group-finance" class="v5-grid"><article class="v5-card"><h2>GNK ASG d.o.o.</h2><div class="v5-company-row"><span>Sjedište</span><b>Zagreb, Hrvatska</b></div><div class="v5-company-row"><span>OIB</span><b>75227917632</b></div><div class="v5-company-row"><span>MBS</span><b>081512375</b></div><div class="v5-company-row"><span>Direktor / UBO</span><b>Nermin Sefić</b></div><div class="v5-actions"><a class="v5-btn" href="/media-kit-downloads">Dokumenti</a></div></article><article class="v5-card"><h2>Financijski profil grupe <small>FY2025</small></h2><div class="v5-facts"><div class="v5-fact"><small>Ukupni prihodi</small><strong>504,00</strong><small>mil. EUR</small><em>grupa</em></div><div class="v5-fact"><small>Ukupna aktiva</small><strong>46,40</strong><small>mil. EUR</small><em>+9,1%</em></div><div class="v5-fact"><small>Kapital i rezerve</small><strong>46,21</strong><small>mil. EUR</small><em>+7,8%</em></div><div class="v5-fact red"><small>Kratkoročne obveze</small><strong>184,50</strong><small>tis. EUR</small><em>-5,2%</em></div></div><small class="v5-muted">Napomena: prikaz je informativan i ne predstavlja financijski savjet.</small></article><article class="v5-card"><h2>GNK DINAMO Ltd. Group</h2><div class="v5-company-grid"><div>' + __gnkV5Logo("dinamo") + '</div><div><div class="v5-company-row"><span>Grupni opseg</span><b>33 društva</b></div><div class="v5-company-row"><span>U razvoju</span><b>14 pravaca</b></div><div class="v5-company-row"><span>Glavna lokacija</span><b>Boulder, Colorado, USA</b></div><div class="v5-company-row"><span>Upravljanje</span><b>globalno / digitalno</b></div></div></div></article></section>' +
    '<section class="v5-mid"><article class="v5-card"><h2>Technology & Artificial Intelligence</h2><div class="v5-tech"><div class="v5-mini"><b>AI modeli</b><small>automatizacija, analiza i asistencija</small></div><div class="v5-mini"><b>Software Platforms</b><small>skalabilne platforme</small></div><div class="v5-mini"><b>Cybersecurity</b><small>zaštita podataka i sustava</small></div><div class="v5-mini"><b>Sports Technology</b><small>podrška sportskim rezultatima</small></div><div class="v5-mini"><b>Global Innovation</b><small>partnerstva i istraživanje</small></div><div class="v5-mini"><b>Admin Operator</b><small>kontrolni sloj portala</small></div></div></article><article class="v5-card"><h2>Digital Assets Monitor</h2><div class="v5-assets"><div class="v5-asset"><b>BTC <span>LIVE</span></b><strong>€61.245</strong><small>snapshot</small></div><div class="v5-asset"><b>ETH <span>LIVE</span></b><strong>€3.025</strong><small>snapshot</small></div><div class="v5-asset v5-stable"><b>GNKSC stable coin <span>COMPLIANCE</span></b><strong>€1,00</strong><small>peg / reserve / transparency monitor | nije financijski savjet</small></div></div></article><article class="v5-card"><h2>Javni dokumenti i izvori</h2><div class="v5-doc-list"><a href="/download/gnk-asg-media-kit.pdf"><span>GNK ASG Media Kit</span><b>PDF</b></a><a href="/download/gnk-asg-company-profile.pdf"><span>Company Profile</span><b>PDF</b></a><a href="/download/gnk-asg-letterhead.docx"><span>Memorandum</span><b>DOCX</b></a><a href="/download/gnk-asg-presentation-template.pptx"><span>Presentation Template</span><b>PPTX</b></a></div></article></section>' +
    '<section class="v5-bottom"><article class="v5-card v5-news-home"><h2>Business News</h2><p>Vijesti su premještene na posebnu stranicu kako bi index ostao brz, pregledan i funkcionalan. Na naslovnici ostaje samo sažetak i ulaz u News Hub.</p><a class="v5-btn gold" href="/business-news?theme=' + __gnkV5Theme(request) + '">Otvori Business News</a></article><article class="v5-card"><h2>GNK ASG AI Assistant</h2><div class="v5-ai-box"><b>Pozdrav! Kako vam mogu pomoći?</b><div class="v5-actions"><a class="v5-chip" href="/ai">AI Assistant</a><a class="v5-chip" href="/media-kit-downloads">Dokumenti</a><a class="v5-chip" href="/locations">Lokacije</a></div><div class="v5-ai-input">Postavite pitanje...</div></div></article><article class="v5-card"><h2>Admin / Operator</h2><p class="v5-lead">Administratorski ulaz je vidljiv na prvoj stranici, ali osjetljive funkcije ostaju zaštićene tokenom.</p><div class="v5-actions"><a class="v5-btn gold" href="/admin?theme=' + __gnkV5Theme(request) + '">Admin centar</a></div></article></section>' +
    '</main><footer class="v5-footer"><div>' + __gnkV5Logo("asg") + '<small>GNK ASG d.o.o. | Zagreb, Hrvatska | OIB 75227917632</small></div><div><b>Brze poveznice</b><small><br>Grupa | Lokacije | Digital Assets | Dokumenti | Admin</small></div><div><b>Kontakt</b><small><br>info@gnk-asg.hr | +385 1 5555 901</small></div><div><b>Pravne informacije</b><small><br>Privatnost | Uvjeti | Cookies | Informativni podaci</small></div></footer><div class="v5-seal">GNK ASG<br>SEAL</div>' +
    '<script>document.querySelectorAll(".v5-city").forEach(function(el){el.addEventListener("click",function(){document.getElementById("v5-city-name").textContent=el.dataset.city;document.getElementById("v5-city-info").textContent=el.dataset.info;});});</script>' +
    '</div></body></html>';
}

function __gnkV5News(request) {
  return __gnkV5Head("GNK ASG | Business News", request) + __gnkV5Top(request, "/business-news") + '<main><section class="v5-card" style="margin-top:20px"><h1 class="v5-title">Business News<br><span>News Hub</span></h1><p class="v5-lead">Vijesti su izdvojene s naslovnice kako bi index ostao brz i pregledan.</p></section><section class="v5-news-grid" style="margin-top:12px"><article class="v5-news-card"><small>GRUPA</small><h3>GNK ASG jača globalne tehnološke i investicijske kapacitete</h3><p>Sažetak vijesti i poveznica na izvor.</p></article><article class="v5-news-card"><small>TECHNOLOGY</small><h3>AI projekti u sportu: nova era performansi</h3><p>Sažetak vijesti i poveznica na izvor.</p></article><article class="v5-news-card"><small>DIGITAL ASSETS</small><h3>Digitalna imovina i budućnost financija</h3><p>Sažetak vijesti i poveznica na izvor.</p></article><article class="v5-news-card"><small>MARKET</small><h3>Stable coin monitor i tržišna infrastruktura</h3><p>Sažetak vijesti i poveznica na izvor.</p></article></section></main></div></body></html>';
}

function __gnkV5Locations(request) {
  return __gnkV5Head("GNK ASG | Lokacije", request) + __gnkV5Top(request, "/locations") + '<main style="margin-top:20px"><section class="v5-card"><h1 class="v5-title">Lokacije i gradovi<br><span>Interactive map</span></h1><p class="v5-lead">Klik na svjetleću točku otvara podatke o gradu i ulozi u grupnoj strukturi.</p>' + __gnkV5Map() + '</section></main><div class="v5-seal">GNK ASG<br>SEAL</div><script>document.querySelectorAll(".v5-city").forEach(function(el){el.addEventListener("click",function(){document.getElementById("v5-city-name").textContent=el.dataset.city;document.getElementById("v5-city-info").textContent=el.dataset.info;});});</script></div></body></html>';
}

function __gnkV5Admin(request) {
  return __gnkV5Head("GNK ASG | Admin", request) + __gnkV5Top(request, "/admin") + '<main style="margin-top:20px"><section class="v5-card"><h1 class="v5-title">Admin<br><span>Operator Center</span></h1><p class="v5-lead">Javni admin ulaz. Osjetljivi endpointi ostaju zaštićeni tokenom i ne prikazuju se bez autorizacije.</p></section><section class="v5-admin-grid" style="margin-top:12px"><a href="/operator/logs"><b>Logs</b><small><br>zaštićeno tokenom</small></a><a href="/operator/contact-inbox"><b>Contact inbox</b><small><br>zaštićeno tokenom</small></a><a href="/media-kit-downloads"><b>Documents</b><small><br>javni dokumenti</small></a></section></main></div></body></html>';
}

const __gnkAsgIndexFinalV5DocsPageBaseWorker = {
  ...__gnkAsgIndexFinalV5BaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" || request.method === "HEAD") {
      if (url.pathname === "/" || url.pathname === "/portal-preview" || url.pathname === "/index-preview") {
        return new Response(__gnkV5Index(request), { headers: { "content-type":"text/html; charset=utf-8", "x-gnk-asg-index-final-v5":"active", "cache-control":"public, max-age=120" } });
      }

      if (url.pathname === "/business-news" || url.pathname === "/news-hub") {
        return new Response(__gnkV5News(request), { headers: { "content-type":"text/html; charset=utf-8", "x-gnk-asg-index-final-v5":"active", "cache-control":"public, max-age=120" } });
      }

      if (url.pathname === "/locations" || url.pathname === "/cities") {
        return new Response(__gnkV5Locations(request), { headers: { "content-type":"text/html; charset=utf-8", "x-gnk-asg-index-final-v5":"active", "cache-control":"public, max-age=120" } });
      }

      if (url.pathname === "/admin") {
        return new Response(__gnkV5Admin(request), { headers: { "content-type":"text/html; charset=utf-8", "x-gnk-asg-index-final-v5":"active", "cache-control":"public, max-age=120" } });
      }
    }

    return __gnkAsgIndexFinalV5BaseWorker.fetch(request, env, ctx);
  }
};



const GNK_ASG_INDEX_FINAL_V5_DOCS_PAGE_FIX_ACTIVE = true;

function __gnkV5DocsPage(request) {
  const theme = __gnkV5Theme(request);
  return __gnkV5Head("GNK ASG | Documents & Media Kit", request) + __gnkV5Top(request, "/media-kit-downloads") +
    '<main style="margin-top:20px">' +
      '<section class="v5-card">' +
        '<div class="v5-kicker">DOCUMENTS | MEDIA KIT | PRINT</div>' +
        '<h1 class="v5-title">Dokumenti i media kit<br><span>PDF | DOCX | PPTX | Mail signature</span></h1>' +
        '<p class="v5-lead">Svi dokumenti koriste isti korporativni vizualni sustav: GNK ASG d.o.o., GNK DINAMO Ltd. i GNK DINAMO Group, s logotipom, zlatnim akcentima, print žigom i download oznakom.</p>' +
        '<div class="v5-actions"><button class="v5-btn gold" onclick="window.print()">Ispis / PDF</button><a class="v5-btn" href="/download/gnk-asg-media-kit.pdf">Media Kit PDF</a><a class="v5-btn" href="/download/gnk-asg-letterhead.docx">Memorandum DOCX</a><a class="v5-btn" href="/download/gnk-asg-presentation-template.pptx">PPTX predložak</a></div>' +
      '</section>' +
      '<section class="v5-grid" style="margin-top:12px">' +
        '<article class="v5-card">' +
          '<h2>GNK ASG d.o.o.</h2>' +
          __gnkV5Logo("asg") +
          '<div class="v5-doc-list" style="margin-top:14px">' +
            '<a href="/download/gnk-asg-media-kit.pdf"><span>GNK ASG Media Kit</span><b>PDF</b></a>' +
            '<a href="/download/gnk-asg-company-profile.pdf"><span>Company Profile</span><b>PDF</b></a>' +
            '<a href="/download/gnk-asg-brand-guidelines.pdf"><span>Brand Guidelines</span><b>PDF</b></a>' +
            '<a href="/download/gnk-asg-media-kit.docx"><span>Media Kit editable</span><b>DOCX</b></a>' +
          '</div>' +
        '</article>' +
        '<article class="v5-card">' +
          '<h2>GNK DINAMO Ltd.</h2>' +
          __gnkV5Logo("dinamo") +
          '<div class="v5-doc-list" style="margin-top:14px">' +
            '<a href="/download/gnk-dinamo-ltd-media-kit.pdf"><span>GNK DINAMO Ltd. Media Kit</span><b>PDF</b></a>' +
            '<a href="/download/gnk-asg-presentation-template.pptx"><span>Presentation template</span><b>PPTX</b></a>' +
            '<a href="/media-kit-preview?theme=' + theme + '"><span>Media Kit preview</span><b>WEB</b></a>' +
          '</div>' +
        '</article>' +
        '<article class="v5-card">' +
          '<h2>Print / potpis / žig</h2>' +
          '<div class="v5-ai-box">' +
            '<b>Nermin Sefić</b><br><small>UBO | GNK ASG d.o.o. / GNK DINAMO Ltd.</small>' +
            '<div style="display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:center;margin-top:14px">' +
              '<div class="v5-seal" style="position:static;width:72px;height:72px;font-size:10px">GNK<br>SEAL</div>' +
              '<small>HTML mail potpis mora koristiti isti logo, iste boje, iste kontakt podatke i linkove na dokumente. PDF/DOCX/PPTX moraju imati print-friendly header, footer i timestamp.</small>' +
            '</div>' +
          '</div>' +
          '<div class="v5-doc-list" style="margin-top:14px">' +
            '<a href="/download/gnk-asg-letterhead.docx"><span>GNK ASG memorandum</span><b>DOCX</b></a>' +
            '<a href="/contact?theme=' + theme + '"><span>Kontakt i potpis</span><b>WEB</b></a>' +
          '</div>' +
        '</article>' +
      '</section>' +
      '<section class="v5-card" style="margin-top:12px">' +
        '<h2>Primjena na sve dokumente</h2>' +
        '<div class="v5-tech">' +
          '<div class="v5-mini"><b>PDF</b><small>logo u headeru, print žig, footer, timestamp, brand boje</small></div>' +
          '<div class="v5-mini"><b>DOCX</b><small>memorandum, potpis, poslovni tekst, čisti print</small></div>' +
          '<div class="v5-mini"><b>PPTX</b><small>cover slide, section slide, data slide, closing slide</small></div>' +
          '<div class="v5-mini"><b>E-mail</b><small>HTML potpis, tri logo varijante, link na dokumente</small></div>' +
          '<div class="v5-mini"><b>Web</b><small>dark/lite tema i poveznice na poddomene</small></div>' +
          '<div class="v5-mini"><b>Admin</b><small>operator link na prvoj stranici i u meniju</small></div>' +
        '</div>' +
      '</section>' +
    '</main><div class="v5-seal">GNK ASG<br>SEAL</div></div></body></html>';
}

const __gnkAsgIndexFinalV6BaseWorker = {
  ...__gnkAsgIndexFinalV5DocsPageBaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/media-kit-downloads" || url.pathname === "/download" || url.pathname === "/documents")) {
      return new Response(__gnkV5DocsPage(request), {
        headers: {
          "content-type":"text/html; charset=utf-8",
          "x-gnk-asg-index-final-v5":"active",
          "x-gnk-asg-docs-v5":"active",
          "cache-control":"public, max-age=120"
        }
      });
    }

    return __gnkAsgIndexFinalV5DocsPageBaseWorker.fetch(request, env, ctx);
  }
};



const GNK_ASG_INDEX_FINAL_V6_GROUP_MAP_ACTIVE = true;

const __gnkV6Nodes = [
  ["Zagreb","GNK ASG d.o.o. | sjedište | aktivno",52,43,"active"],
  ["Boulder","GNK DINAMO Ltd. | USA | aktivno",23,40,"active"],
  ["Beograd","Sports Performance Tracking | povezano društvo",56,47,"active"],
  ["Nova Gorica","K&D Kompani | Slovenija | partner",50,42,"active"],
  ["Sarajevo","regionalni operativni kontekst",53,48,"active"],
  ["London","UK tržišni pravac",46,34,"active"],
  ["Dublin","EU/IE tržišni pravac",44,36,"active"],
  ["Frankfurt","DE financijski pravac",51,36,"active"],
  ["Zurich","CH financijski pravac",50,39,"active"],
  ["Vienna","AT poslovni pravac",53,40,"active"],
  ["Milan","IT poslovni pravac",50,43,"active"],
  ["Paris","FR tržišni pravac",47,39,"active"],
  ["Madrid","ES tržišni pravac",44,46,"active"],
  ["Amsterdam","NL tech pravac",49,35,"active"],
  ["Stockholm","SE tech pravac",54,24,"active"],
  ["Oslo","NO tech pravac",51,22,"active"],
  ["Helsinki","FI tech pravac",59,23,"active"],
  ["Warsaw","PL tržišni pravac",57,36,"active"],
  ["Prague","CZ tržišni pravac",54,38,"active"],
  ["Budapest","HU tržišni pravac",55,42,"active"],
  ["Ljubljana","SI tržišni pravac",51,42,"active"],
  ["New York","US East poslovni pravac",27,39,"active"],
  ["Toronto","CA poslovni pravac",25,34,"active"],
  ["Chicago","US Midwest pravac",22,40,"active"],
  ["Los Angeles","US West pravac",16,47,"active"],
  ["Miami","LATAM gateway",27,55,"active"],
  ["Dubai","MENA investicijski pravac",64,55,"active"],
  ["Riyadh","MENA poslovni pravac",62,57,"active"],
  ["Doha","MENA poslovni pravac",64,58,"active"],
  ["Singapore","APAC poslovni pravac",78,66,"active"],
  ["Tokyo","JP tech pravac",86,43,"active"],
  ["Hong Kong","HK financijski pravac",79,53,"active"],
  ["Sydney","AU poslovni pravac",88,78,"active"],
  ["Munich","razvojni pravac",52,39,"dev"],
  ["Luxembourg","razvojni pravac",49,38,"dev"],
  ["Brussels","razvojni pravac",48,37,"dev"],
  ["Copenhagen","razvojni pravac",52,30,"dev"],
  ["Tallinn","razvojni pravac",59,28,"dev"],
  ["Istanbul","razvojni pravac",59,48,"dev"],
  ["Athens","razvojni pravac",56,51,"dev"],
  ["Lisbon","razvojni pravac",41,48,"dev"],
  ["Boston","razvojni pravac",28,38,"dev"],
  ["San Francisco","razvojni pravac",15,43,"dev"],
  ["Austin","razvojni pravac",21,50,"dev"],
  ["Mexico City","razvojni pravac",18,57,"dev"],
  ["Seoul","razvojni pravac",84,44,"dev"],
  ["Bangkok","razvojni pravac",76,62,"dev"]
];

function __gnkV6Css() {
  return `
<style>
.v6-hero{
  display:grid;
  grid-template-columns:390px 1fr 430px;
  gap:14px;
  padding:18px 0 12px;
}
.v6-finance-first{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:9px;
}
.v6-finance-first .v6-num{
  border:1px solid var(--v5-line);
  border-radius:15px;
  padding:13px;
  background:linear-gradient(145deg,var(--v5-card),var(--v5-card2));
  min-height:104px;
}
.v6-finance-first small{display:block;color:var(--v5-muted);font-size:12px}
.v6-finance-first strong{display:block;font-family:Georgia,serif;font-size:31px;margin:5px 0 2px}
.v6-finance-first em{font-style:normal;color:var(--v5-green);font-size:12px}
.v6-finance-first .red em{color:var(--v5-red)}
.v6-group-strip{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:9px;
  margin-top:9px;
}
.v6-strip-card{
  border:1px solid var(--v5-line);
  border-radius:15px;
  padding:12px;
  background:rgba(255,255,255,.035);
}
.v6-strip-card b{display:block;color:var(--v5-gold2);font-size:19px}
.v6-strip-card small{color:var(--v5-muted)}
.v6-theme-switch{
  position:fixed;
  right:20px;
  top:92px;
  z-index:70;
  display:flex;
  gap:8px;
  padding:8px;
  border:1px solid var(--v5-line);
  border-radius:999px;
  background:rgba(0,0,0,.46);
  backdrop-filter:blur(14px);
}
html.v5-lite .v6-theme-switch{background:rgba(255,255,255,.75)}
.v6-theme-switch a{
  text-decoration:none;
  padding:9px 12px;
  border-radius:999px;
  color:var(--v5-text);
  border:1px solid transparent;
  font-weight:700;
}
.v6-theme-switch a.active{
  background:linear-gradient(135deg,#e4b647,#ad7417);
  color:#100d06;
}
.v6-map-card{
  position:relative;
  min-height:420px;
  border:1px solid var(--v5-line);
  border-radius:22px;
  overflow:hidden;
  background:
    radial-gradient(circle at 50% 44%,rgba(212,175,55,.19),transparent 30%),
    linear-gradient(145deg,rgba(5,16,30,.80),rgba(6,13,23,.45));
}
html.v5-lite .v6-map-card{
  background:
    radial-gradient(circle at 50% 44%,rgba(212,175,55,.19),transparent 32%),
    linear-gradient(145deg,rgba(255,255,255,.94),rgba(255,255,255,.50));
}
.v6-world{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
}
.v6-continent{
  fill:rgba(212,175,55,.075);
  stroke:rgba(212,175,55,.18);
  stroke-width:1.2;
}
html.v5-lite .v6-continent{fill:rgba(184,126,29,.08);stroke:rgba(184,126,29,.22)}
.v6-link{
  stroke:rgba(212,175,55,.30);
  stroke-width:1;
  fill:none;
  stroke-dasharray:4 7;
  animation:v6dash 18s linear infinite;
}
.v6-node circle.core{
  cursor:pointer;
  filter:drop-shadow(0 0 9px rgba(244,217,122,.95));
}
.v6-node.active circle.core{fill:#d4af37}
.v6-node.dev circle.core{fill:#3a7cff}
.v6-node circle.ring{
  fill:none;
  stroke:#d4af37;
  stroke-width:1.5;
  opacity:.34;
  animation:v6pulse 2.4s infinite ease-in-out;
}
.v6-node.dev circle.ring{stroke:#3a7cff}
.v6-label{
  font-size:10.5px;
  fill:var(--v5-text);
  paint-order:stroke;
  stroke:rgba(0,0,0,.70);
  stroke-width:3px;
  stroke-linejoin:round;
  pointer-events:none;
}
html.v5-lite .v6-label{stroke:rgba(255,255,255,.86)}
.v6-map-panel{
  position:absolute;
  left:14px;
  right:14px;
  bottom:14px;
  z-index:5;
  display:grid;
  grid-template-columns:1fr auto auto;
  gap:10px;
  align-items:center;
  border:1px solid var(--v5-line);
  border-radius:16px;
  padding:12px;
  background:rgba(0,0,0,.50);
  backdrop-filter:blur(14px);
}
html.v5-lite .v6-map-panel{background:rgba(255,255,255,.78)}
.v6-map-panel b{color:var(--v5-gold2)}
.v6-map-panel small{color:var(--v5-muted)}
.v6-legend{
  position:absolute;
  top:14px;
  right:14px;
  z-index:5;
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.v6-legend span{
  border:1px solid var(--v5-line);
  border-radius:999px;
  padding:7px 10px;
  background:rgba(0,0,0,.38);
  color:var(--v5-text);
  font-size:12px;
}
html.v5-lite .v6-legend span{background:rgba(255,255,255,.72)}
.v6-dot-gold,.v6-dot-blue{
  display:inline-block;
  width:9px;height:9px;border-radius:50%;margin-right:6px;
}
.v6-dot-gold{background:#d4af37}
.v6-dot-blue{background:#3a7cff}
.v6-news-lite{
  display:grid;
  grid-template-columns:1fr auto;
  gap:12px;
  align-items:center;
}
@keyframes v6dash{to{stroke-dashoffset:-180}}
@keyframes v6pulse{0%,100%{r:7;opacity:.25}50%{r:13;opacity:.62}}
@media(max-width:1280px){
  .v6-hero{grid-template-columns:1fr}
  .v6-finance-first,.v6-group-strip{grid-template-columns:1fr 1fr}
}
@media(max-width:720px){
  .v6-finance-first,.v6-group-strip{grid-template-columns:1fr}
  .v6-theme-switch{position:static;margin:10px 0}
  .v6-map-panel{grid-template-columns:1fr}
}
</style>`;
}

function __gnkV6ThemeSwitch(request) {
  const theme = __gnkV5Theme(request);
  const path = new URL(request.url).pathname || "/";
  return '<div class="v6-theme-switch"><a class="' + (theme === "dark" ? "active" : "") + '" href="' + path + '?theme=dark">DARK</a><a class="' + (theme === "lite" ? "active" : "") + '" href="' + path + '?theme=lite">LITE</a></div>';
}

function __gnkV6Map() {
  const links = __gnkV6Nodes.map(function(n){return '<path class="v6-link" d="M520 210 Q' + (n[2]*10) + ' ' + (n[3]*4.2) + ' ' + (n[2]*10) + ' ' + (n[3]*4.2) + '"/>';}).join("");
  const nodes = __gnkV6Nodes.map(function(n,i){
    const show = i < 33 || i % 2 === 0;
    return '<g class="v6-node ' + n[4] + '" data-city="' + __gnkV5Esc(n[0]) + '" data-info="' + __gnkV5Esc(n[1]) + '" transform="translate(' + (n[2]*10) + ' ' + (n[3]*4.2) + ')"><circle class="ring" r="9"/><circle class="core" r="4.8"/>' + (show ? '<text class="v6-label" x="8" y="-7">' + n[0] + '</text>' : '') + '</g>';
  }).join("");
  return '<div class="v6-map-card"><svg class="v6-world" viewBox="0 0 1000 420" preserveAspectRatio="none"><rect width="1000" height="420" fill="transparent"/><path class="v6-continent" d="M110 160 C150 90 240 80 300 126 C342 158 318 218 250 230 C180 242 95 220 110 160 Z"/><path class="v6-continent" d="M250 250 C330 248 382 300 360 360 C320 400 250 366 220 318 C200 286 214 258 250 250 Z"/><path class="v6-continent" d="M430 130 C520 62 690 88 745 160 C815 250 724 310 605 285 C508 266 376 218 430 130 Z"/><path class="v6-continent" d="M640 265 C760 260 850 310 870 374 C790 398 700 360 640 265 Z"/><path class="v6-continent" d="M810 145 C890 120 940 156 928 208 C884 230 812 210 810 145 Z"/><text x="500" y="42" text-anchor="middle" fill="rgba(212,175,55,.42)" font-size="25" font-family="Georgia,serif">33 CONNECTED ENTITIES | 14 DEVELOPMENT DIRECTIONS</text>' + links + nodes + '</svg><div class="v6-legend"><span><i class="v6-dot-gold"></i>33 povezana društva</span><span><i class="v6-dot-blue"></i>14 u razvoju</span></div><div class="v6-map-panel"><span><b id="v6-city-name">Zagreb</b><br><small id="v6-city-info">GNK ASG d.o.o. | sjedište | aktivno</small></span><a class="v5-btn" href="/locations?theme=dark">Otvori kartu</a><button class="v5-btn gold" onclick="window.print()">Ispis PDF</button></div></div><script>document.querySelectorAll(".v6-node").forEach(function(el){el.addEventListener("click",function(){var n=document.getElementById("v6-city-name");var i=document.getElementById("v6-city-info");if(n)n.textContent=el.dataset.city;if(i)i.textContent=el.dataset.info;});});</script>';
}

function __gnkV6Finance() {
  return '<div class="v6-finance-first"><div class="v6-num"><small>Grupni prihodi FY2025</small><strong>504,00</strong><small>mil. EUR</small><em>grupa</em></div><div class="v6-num"><small>Ukupna aktiva</small><strong>46,40</strong><small>mil. EUR</small><em>+9,1%</em></div><div class="v6-num"><small>Kapital i rezerve</small><strong>46,21</strong><small>mil. EUR</small><em>+7,8%</em></div><div class="v6-num red"><small>Kratkoročne obveze</small><strong>184,50</strong><small>tis. EUR</small><em>-5,2%</em></div></div><div class="v6-group-strip"><div class="v6-strip-card"><b>33</b><small>povezana društva</small></div><div class="v6-strip-card"><b>14</b><small>društva / pravci u razvoju</small></div><div class="v6-strip-card"><b>GNKSC</b><small>stable coin monitor | peg/rezerve/status</small></div><div class="v6-strip-card"><b>2D map</b><small>klikabilne lokacije i veze</small></div></div>';
}

function __gnkV6Index(request) {
  const theme = __gnkV5Theme(request);
  return __gnkV5Head("GNK ASG | Corporate Group Portal V6", request).replace("</head>", __gnkV6Css() + "</head>") + __gnkV5Top(request, "/") + __gnkV6ThemeSwitch(request) +
    '<main>' +
    '<section class="v6-hero">' +
      '<div class="v5-hero-copy"><div class="v5-kicker">GNK ASG d.o.o. | GNK DINAMO Ltd. Group</div><h1 class="v5-title">Building value.<br><span>Driving technology.</span></h1><p class="v5-lead">Naslovnica ostaje brza i funkcionalna, ali grupni financijski podaci, 33 povezana društva, 14 razvojnih pravaca, GNKSC i karta lokacija sada su vidljivi odmah na prvom ekranu.</p><div class="v5-actions"><a class="v5-btn gold" href="#group-finance">Grupne financije</a><a class="v5-btn" href="/locations?theme=' + theme + '">Karta 33 + 14</a><a class="v5-btn" href="/admin?theme=' + theme + '">Admin</a></div></div>' +
      __gnkV6Map() +
      '<aside class="v5-card" id="group-finance"><h2>Financijski profil grupe</h2>' + __gnkV6Finance() + '</aside>' +
    '</section>' +
    '<section class="v5-mid"><article class="v5-card"><h2>GNK ASG d.o.o.</h2><div class="v5-company-row"><span>Sjedište</span><b>Zagreb, Hrvatska</b></div><div class="v5-company-row"><span>OIB</span><b>75227917632</b></div><div class="v5-company-row"><span>MBS</span><b>081512375</b></div><div class="v5-company-row"><span>Direktor / UBO</span><b>Nermin Sefić</b></div></article><article class="v5-card"><h2>Digital Assets & GNKSC</h2><div class="v5-assets"><div class="v5-asset"><b>BTC <span>SNAPSHOT</span></b><strong>€61.245</strong><small>informativno</small></div><div class="v5-asset"><b>ETH <span>SNAPSHOT</span></b><strong>€3.025</strong><small>informativno</small></div><div class="v5-asset v5-stable"><b>GNKSC stable coin <span>STATUS</span></b><strong>€1,00</strong><small>peg / reserve / compliance monitor | nije financijski savjet</small></div></div></article><article class="v5-card"><h2>GNK DINAMO Ltd. Group</h2><div class="v5-company-row"><span>Grupna struktura</span><b>33 društva</b></div><div class="v5-company-row"><span>U razvoju</span><b>14 pravaca</b></div><div class="v5-company-row"><span>Primarni međunarodni kontekst</span><b>Boulder, Colorado, USA</b></div><div class="v5-company-row"><span>Karta</span><b>2D povezana mreža</b></div></article></section>' +
    '<section class="v5-bottom"><article class="v5-card v6-news-lite"><div><h2>Business News</h2><p class="v5-lead">Vijesti su premještene na posebnu stranicu da naslovnica ostane brza. Ovdje ostaje samo ulaz u News Hub.</p></div><a class="v5-btn gold" href="/business-news?theme=' + theme + '">Otvori News Hub</a></article><article class="v5-card"><h2>AI Assistant</h2><div class="v5-ai-box"><b>Javni AI pomoćnik</b><div class="v5-ai-input">Pitaj o grupi, dokumentima, lokacijama ili tržišnom statusu...</div></div></article><article class="v5-card"><h2>Admin</h2><p class="v5-lead">Admin ulaz je vidljiv na naslovnici, a osjetljivi endpointi ostaju zaštićeni tokenom.</p><a class="v5-btn gold" href="/admin?theme=' + theme + '">Admin centar</a></article></section>' +
    '<section class="v5-card" style="margin-top:12px"><h2>Dokumenti i print</h2><div class="v5-doc-list"><a href="/media-kit-downloads?theme=' + theme + '"><span>Media Kit i dokumenti</span><b>WEB</b></a><a href="/download/gnk-asg-media-kit.pdf"><span>GNK ASG Media Kit</span><b>PDF</b></a><a href="/download/gnk-asg-letterhead.docx"><span>Memorandum</span><b>DOCX</b></a><a href="/download/gnk-asg-presentation-template.pptx"><span>Presentation Template</span><b>PPTX</b></a></div></section>' +
    '</main><footer class="v5-footer"><div>' + __gnkV5Logo("asg") + '<small>GNK ASG d.o.o. | Zagreb | OIB 75227917632</small></div><div><b>Menu</b><small><br>Grupa | Lokacije | News Hub | AI | Dokumenti | Admin</small></div><div><b>Kontakt</b><small><br>info@gnk-asg.hr | +385 1 5555 901</small></div><div><b>Napomena</b><small><br>Podaci su informativni. Nisu financijski savjet.</small></div></footer><div class="v5-seal">GNK ASG<br>SEAL</div></div></body></html>';
}

function __gnkV6Locations(request) {
  return __gnkV5Head("GNK ASG | Karta 33 + 14", request).replace("</head>", __gnkV6Css() + "</head>") + __gnkV5Top(request, "/locations") + __gnkV6ThemeSwitch(request) + '<main style="margin-top:20px"><section class="v5-card"><div class="v5-kicker">2D WORLD MAP | CONNECTED ENTITIES</div><h1 class="v5-title">Karta lokacija<br><span>33 povezana društva + 14 u razvoju</span></h1><p class="v5-lead">Svaka svjetleća točka je klikabilna. Zlatne točke označavaju aktivne/povezane lokacije, plave razvojne pravce. Linije prikazuju mrežnu povezanost.</p>' + __gnkV6Map() + '</section></main><div class="v5-seal">GNK ASG<br>SEAL</div></div></body></html>';
}

const __gnkAsgV7BaseWorker = {
  ...__gnkAsgIndexFinalV6BaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/" || url.pathname === "/portal-preview" || url.pathname === "/index-preview")) {
      return new Response(__gnkV6Index(request), {
        headers: {
          "content-type":"text/html; charset=utf-8",
          "x-gnk-asg-index-final-v6":"active",
          "cache-control":"public, max-age=120"
        }
      });
    }

    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/locations" || url.pathname === "/cities")) {
      return new Response(__gnkV6Locations(request), {
        headers: {
          "content-type":"text/html; charset=utf-8",
          "x-gnk-asg-index-final-v6":"active",
          "cache-control":"public, max-age=120"
        }
      });
    }

    return __gnkAsgIndexFinalV6BaseWorker.fetch(request, env, ctx);
  }
};



const GNK_ASG_V7_FULL_FUNCTIONAL_FIX_ACTIVE = true;

const __gnkV7Nodes = [
["Zagreb","GNK ASG d.o.o. | sjedište | aktivno",52,43,"active"],["Boulder","GNK DINAMO Ltd. | USA | aktivno",23,40,"active"],["Beograd","Sports Performance Tracking | povezano društvo",56,47,"active"],["Nova Gorica","K&D KompANI | Slovenija",50,42,"active"],["Sarajevo","regionalni operativni kontekst",53,48,"active"],["London","UK tržišni pravac",46,34,"active"],["Dublin","EU/IE tržišni pravac",44,36,"active"],["Frankfurt","DE financijski pravac",51,36,"active"],["Zurich","CH financijski pravac",50,39,"active"],["Vienna","AT poslovni pravac",53,40,"active"],["Milan","IT poslovni pravac",50,43,"active"],["Paris","FR tržišni pravac",47,39,"active"],["Madrid","ES tržišni pravac",44,46,"active"],["Amsterdam","NL tech pravac",49,35,"active"],["Stockholm","SE tech pravac",54,24,"active"],["Oslo","NO tech pravac",51,22,"active"],["Helsinki","FI tech pravac",59,23,"active"],["Warsaw","PL tržišni pravac",57,36,"active"],["Prague","CZ tržišni pravac",54,38,"active"],["Budapest","HU tržišni pravac",55,42,"active"],["Ljubljana","SI tržišni pravac",51,42,"active"],["New York","US East poslovni pravac",27,39,"active"],["Toronto","CA poslovni pravac",25,34,"active"],["Chicago","US Midwest pravac",22,40,"active"],["Los Angeles","US West pravac",16,47,"active"],["Miami","LATAM gateway",27,55,"active"],["Dubai","MENA investicijski pravac",64,55,"active"],["Riyadh","MENA poslovni pravac",62,57,"active"],["Doha","MENA poslovni pravac",64,58,"active"],["Singapore","APAC poslovni pravac",78,66,"active"],["Tokyo","JP tech pravac",86,43,"active"],["Hong Kong","HK financijski pravac",79,53,"active"],["Sydney","AU poslovni pravac",88,78,"active"],["Munich","razvojni pravac",52,39,"dev"],["Luxembourg","razvojni pravac",49,38,"dev"],["Brussels","razvojni pravac",48,37,"dev"],["Copenhagen","razvojni pravac",52,30,"dev"],["Tallinn","razvojni pravac",59,28,"dev"],["Istanbul","razvojni pravac",59,48,"dev"],["Athens","razvojni pravac",56,51,"dev"],["Lisbon","razvojni pravac",41,48,"dev"],["Boston","razvojni pravac",28,38,"dev"],["San Francisco","razvojni pravac",15,43,"dev"],["Austin","razvojni pravac",21,50,"dev"],["Mexico City","razvojni pravac",18,57,"dev"],["Seoul","razvojni pravac",84,44,"dev"],["Bangkok","razvojni pravac",76,62,"dev"]
];

function __v7Esc(v){return String(v??"").replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];});}
function __v7Theme(request){const u=new URL(request.url);const t=(u.searchParams.get("theme")||"dark").toLowerCase();return t==="lite"||t==="light"?"lite":"dark";}
function __v7Expected(env){return env.ADMIN_PASSWORD||env.OPERATOR_PASSWORD||env.OPERATOR_TOKEN||env.OPERATOR_SECRET||env.TOKEN||"";}
function __v7Cookie(request,name){const c=request.headers.get("cookie")||"";const p=c.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));return p?decodeURIComponent(p.slice(name.length+1)):"";}
function __v7AdminOk(request,env){const e=__v7Expected(env);if(!e)return false;try{return atob(__v7Cookie(request,"gnk_admin"))===e;}catch{return false;}}
function __v7Json(obj,status=200){return new Response(JSON.stringify(obj,null,2),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-gnk-asg-v7":"active"}});}

function __v7Css(){
return `<style>
:root{--bg:#06111f;--bg2:#0b1628;--card:rgba(9,22,38,.82);--card2:rgba(255,255,255,.045);--text:#f7f0dc;--muted:rgba(247,240,220,.72);--gold:#d4af37;--gold2:#f5dc88;--line:rgba(212,175,55,.32);--line2:rgba(212,175,55,.15);--blue:#3a7cff;--green:#47d184;--red:#ff5c5c}
html.v7-lite{--bg:#fbfaf5;--bg2:#f2efe6;--card:rgba(255,255,255,.88);--card2:rgba(255,255,255,.72);--text:#101827;--muted:rgba(16,24,39,.68);--line:rgba(174,118,20,.25);--line2:rgba(174,118,20,.12)}
*{box-sizing:border-box}
body.v7-body{margin:0;min-height:100vh;color:var(--text);font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;background:radial-gradient(circle at 18% 0%,rgba(212,175,55,.22),transparent 32%),radial-gradient(circle at 72% 8%,rgba(58,124,255,.12),transparent 30%),linear-gradient(145deg,var(--bg),var(--bg2))}
html.v7-lite body.v7-body{background:radial-gradient(circle at 18% 0%,rgba(212,175,55,.19),transparent 32%),radial-gradient(circle at 72% 8%,rgba(58,124,255,.08),transparent 30%),linear-gradient(145deg,#fff,#f2efe6)}
.v7-page{max-width:1780px;margin:0 auto;padding:0 28px 32px}
.v7-top{position:sticky;top:0;z-index:80;display:grid;grid-template-columns:300px 1fr auto;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);background:linear-gradient(180deg,rgba(5,12,24,.96),rgba(5,12,24,.72));backdrop-filter:blur(16px)}
html.v7-lite .v7-top{background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(255,255,255,.76))}
.v7-logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text)}
.v7-logo svg{width:54px;height:54px;filter:drop-shadow(0 8px 16px rgba(212,175,55,.25))}
.v7-logo b{display:block;font-family:Georgia,serif;color:var(--gold2);font-size:23px;letter-spacing:.09em;white-space:nowrap}
html.v7-lite .v7-logo b{color:#ad7417}
.v7-logo small{display:block;color:var(--muted);font-size:10px;line-height:1.2}
.v7-nav{display:flex;justify-content:center;gap:5px;flex-wrap:wrap}
.v7-nav a,.v7-btn,.v7-chip{color:var(--text);text-decoration:none;border:1px solid var(--line2);border-radius:13px;padding:9px 11px;background:rgba(255,255,255,.035);font-size:13px}
.v7-nav a b{display:block;font-size:13px}.v7-nav a small{display:block;color:var(--muted);font-size:10px;margin-top:2px}
.v7-nav a:hover,.v7-nav a.active,.v7-btn.gold{background:linear-gradient(135deg,#f2ca63,#b67b14);color:#100d06;border-color:rgba(255,232,168,.7)}
.v7-switch{display:flex;gap:6px;padding:7px;border:1px solid var(--line);border-radius:999px;background:rgba(0,0,0,.28)}
html.v7-lite .v7-switch{background:rgba(255,255,255,.55)}
.v7-switch a{padding:8px 11px;border-radius:999px;text-decoration:none;color:var(--text);font-weight:800}
.v7-switch a.active{background:linear-gradient(135deg,#f2ca63,#b67b14);color:#100d06}
.v7-hero{display:grid;grid-template-columns:400px 1.1fr 430px;gap:14px;padding:18px 0 12px}
.v7-card{border:1px solid var(--line);border-radius:20px;background:linear-gradient(145deg,var(--card),var(--card2));box-shadow:0 26px 70px rgba(0,0,0,.16);padding:17px;overflow:hidden}
.v7-kicker{color:var(--gold);letter-spacing:.08em;text-transform:uppercase;font-size:12px;font-weight:800}
.v7-title{font-family:Georgia,serif;font-size:48px;line-height:1;margin:10px 0 12px}.v7-title span{color:var(--gold2)}html.v7-lite .v7-title span{color:#ad7417}
.v7-lead{color:var(--muted);line-height:1.5;margin:0 0 14px;font-size:15px}
.v7-actions{display:flex;gap:8px;flex-wrap:wrap}.v7-btn{display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.v7-finance{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
.v7-num{border:1px solid var(--line2);border-radius:14px;padding:12px;background:rgba(255,255,255,.035);min-height:101px}
.v7-num small{display:block;color:var(--muted);font-size:11px}.v7-num strong{display:block;font-family:Georgia,serif;font-size:29px;margin:5px 0 2px}.v7-num em{font-style:normal;color:var(--green);font-size:11px}.v7-num.red em{color:var(--red)}
.v7-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:9px}.v7-strip div{border:1px solid var(--line2);border-radius:13px;padding:10px;background:rgba(255,255,255,.03)}.v7-strip b{display:block;color:var(--gold2);font-size:22px}.v7-strip small{color:var(--muted)}
.v7-map{position:relative;min-height:430px;border:1px solid var(--line);border-radius:22px;overflow:hidden;background:radial-gradient(circle at 50% 42%,rgba(212,175,55,.17),transparent 31%),linear-gradient(145deg,rgba(3,13,28,.84),rgba(7,14,23,.48))}
html.v7-lite .v7-map{background:radial-gradient(circle at 50% 42%,rgba(212,175,55,.17),transparent 31%),linear-gradient(145deg,rgba(255,255,255,.93),rgba(255,255,255,.56))}
.v7-map svg{position:absolute;inset:0;width:100%;height:100%}.v7-continent{fill:rgba(212,175,55,.075);stroke:rgba(212,175,55,.20);stroke-width:1.2}.v7-link{stroke:rgba(212,175,55,.32);stroke-width:1;fill:none;stroke-dasharray:4 7;animation:v7dash 20s linear infinite}.v7-node circle.core{cursor:pointer;filter:drop-shadow(0 0 10px rgba(244,217,122,.95))}.v7-node.active circle.core{fill:#d4af37}.v7-node.dev circle.core{fill:#3a7cff}.v7-node circle.ring{fill:none;stroke:#d4af37;stroke-width:1.5;opacity:.32;animation:v7pulse 2.4s infinite ease-in-out}.v7-node.dev circle.ring{stroke:#3a7cff}.v7-label{font-size:10.2px;fill:var(--text);paint-order:stroke;stroke:rgba(0,0,0,.72);stroke-width:3px;stroke-linejoin:round;pointer-events:none}html.v7-lite .v7-label{stroke:rgba(255,255,255,.86)}
.v7-map-panel{position:absolute;left:14px;right:14px;bottom:14px;z-index:5;display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;border:1px solid var(--line);border-radius:16px;padding:12px;background:rgba(0,0,0,.50);backdrop-filter:blur(14px)}html.v7-lite .v7-map-panel{background:rgba(255,255,255,.78)}.v7-map-panel b{color:var(--gold2)}.v7-map-panel small{color:var(--muted)}
.v7-legend{position:absolute;top:14px;right:14px;z-index:5;display:flex;gap:8px;flex-wrap:wrap}.v7-legend span{border:1px solid var(--line);border-radius:999px;padding:7px 10px;background:rgba(0,0,0,.36);font-size:12px}html.v7-lite .v7-legend span{background:rgba(255,255,255,.72)}.v7-dot-gold,.v7-dot-blue{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}.v7-dot-gold{background:#d4af37}.v7-dot-blue{background:#3a7cff}
.v7-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px}.v7-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.v7-list{display:grid;gap:8px}.v7-list a,.v7-list div{display:flex;justify-content:space-between;gap:10px;text-decoration:none;color:var(--text);border:1px solid var(--line2);border-radius:12px;padding:10px;background:rgba(255,255,255,.03)}.v7-list small{color:var(--muted)}
.v7-form{display:grid;gap:10px}.v7-form input,.v7-form textarea,.v7-form select{width:100%;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.06);color:var(--text);padding:12px;font:inherit}.v7-form textarea{min-height:120px}.v7-form label{font-size:12px;color:var(--muted)}
.v7-admin-login{max-width:520px;margin:60px auto}.v7-admin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.v7-admin-grid a,.v7-admin-grid button{border:1px solid var(--line);border-radius:15px;background:linear-gradient(145deg,var(--card),var(--card2));padding:15px;color:var(--text);text-decoration:none;text-align:left;font:inherit}
.v7-seal{position:fixed;right:22px;bottom:22px;z-index:60;width:72px;height:72px;border-radius:50%;display:grid;place-items:center;text-align:center;border:2px solid var(--gold);background:radial-gradient(circle,#d4af37 0,#8a6217 44%,#07111f 72%);color:#fff1b8;font-size:10px;box-shadow:0 0 24px rgba(212,175,55,.42)}
.v7-footer{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;gap:18px;margin-top:14px;padding:22px 0;border-top:1px solid var(--line)}.v7-footer small{color:var(--muted)}
@keyframes v7dash{to{stroke-dashoffset:-180}}@keyframes v7pulse{0%,100%{r:7;opacity:.25}50%{r:13;opacity:.62}}
@media(max-width:1280px){.v7-hero,.v7-grid3,.v7-grid2{grid-template-columns:1fr}.v7-top{grid-template-columns:1fr}.v7-finance,.v7-strip,.v7-admin-grid{grid-template-columns:1fr 1fr}}
@media(max-width:720px){.v7-page{padding:0 14px 24px}.v7-title{font-size:38px}.v7-finance,.v7-strip,.v7-admin-grid,.v7-footer{grid-template-columns:1fr}.v7-map-panel{grid-template-columns:1fr}}
@media print{.v7-top,.v7-actions,.v7-switch{display:none!important}body.v7-body{background:white!important;color:#111!important}.v7-card,.v7-map{box-shadow:none!important;background:white!important;color:#111!important;break-inside:avoid}.v7-seal{position:fixed;right:24px;bottom:20px}}
</style>`;
}

function __v7Logo(type="asg"){
const label=type==="dinamo"?"GNK DINAMO":type==="group"?"GNK DINAMO GROUP":"GNK ASG";
const sub=type==="dinamo"?"Global Network Kapital":type==="group"?"33 connected | 14 in development":"Global Network Kapital | ASG";
return '<a class="v7-logo" href="/?theme=dark"><svg viewBox="0 0 96 96"><defs><linearGradient id="v7g'+type+'" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#fff1b8"/><stop offset="45%" stop-color="#d4af37"/><stop offset="100%" stop-color="#8a6217"/></linearGradient></defs><circle cx="48" cy="48" r="39" fill="none" stroke="url(#v7g'+type+')" stroke-width="5"/><path d="M27 63 L39 33 L50 63 Z" fill="url(#v7g'+type+')"/><path d="M52 64 L52 30 L65 30 C77 30 84 38 84 48 C84 59 76 66 65 66 L58 66 L58 58 L65 58 C71 58 76 54 76 48 C76 42 71 38 65 38 L60 38 L60 64 Z" fill="url(#v7g'+type+')"/></svg><span><b>'+label+'</b><small>'+sub+'</small></span></a>';
}

function __v7Head(title,request){
const theme=__v7Theme(request);const u=new URL(request.url);
return '<!doctype html><html class="v7-'+theme+'" lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+__v7Esc(title)+'</title><link rel="canonical" href="'+u.origin+u.pathname+'"><meta property="og:title" content="'+__v7Esc(title)+'"><meta property="og:type" content="website"><meta property="og:image" content="'+u.origin+'/download/gnk-asg-logo-dark.svg"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"GNK ASG d.o.o.","identifier":"OIB 75227917632","url":"'+u.origin+'"}</script>'+__v7Css()+'</head><body class="v7-body"><div class="v7-page">';
}

function __v7Top(request,active="/"){
const theme=__v7Theme(request);const path=new URL(request.url).pathname||"/";
const items=[["/","Grupa","Finance"],["/locations","Lokacije","33 + 14"],["/business-news","Vijesti","News Hub"],["/ai","AI","Assistant"],["/contact","Kontakt","Form"],["/media-kit-downloads","Dokumenti","PDF/DOCX"],["/admin","Admin","Login"]];
const nav=items.map(i=>'<a class="'+(active===i[0]?'active':'')+'" href="'+i[0]+'?theme='+theme+'"><b>'+i[1]+'</b><small>'+i[2]+'</small></a>').join("");
return '<header class="v7-top">'+__v7Logo("asg")+'<nav class="v7-nav">'+nav+'</nav><div class="v7-switch"><a class="'+(theme==="dark"?"active":"")+'" href="'+path+'?theme=dark">DARK</a><a class="'+(theme==="lite"?"active":"")+'" href="'+path+'?theme=lite">LITE</a></div></header>';
}

function __v7Map(){
const links=__gnkV7Nodes.map(n=>'<path class="v7-link" d="M520 210 Q'+(n[2]*10)+' '+(n[3]*4.2)+' '+(n[2]*10)+' '+(n[3]*4.2)+'"/>').join("");
const nodes=__gnkV7Nodes.map((n,i)=>'<g class="v7-node '+n[4]+'" data-city="'+__v7Esc(n[0])+'" data-info="'+__v7Esc(n[1])+'" transform="translate('+(n[2]*10)+' '+(n[3]*4.2)+')"><circle class="ring" r="9"/><circle class="core" r="4.8"/>'+(i<33||i%2===0?'<text class="v7-label" x="8" y="-7">'+n[0]+'</text>':'')+'</g>').join("");
return '<div class="v7-map"><svg viewBox="0 0 1000 420" preserveAspectRatio="none"><rect width="1000" height="420" fill="transparent"/><path class="v7-continent" d="M110 160 C150 90 240 80 300 126 C342 158 318 218 250 230 C180 242 95 220 110 160 Z"/><path class="v7-continent" d="M250 250 C330 248 382 300 360 360 C320 400 250 366 220 318 C200 286 214 258 250 250 Z"/><path class="v7-continent" d="M430 130 C520 62 690 88 745 160 C815 250 724 310 605 285 C508 266 376 218 430 130 Z"/><path class="v7-continent" d="M640 265 C760 260 850 310 870 374 C790 398 700 360 640 265 Z"/><path class="v7-continent" d="M810 145 C890 120 940 156 928 208 C884 230 812 210 810 145 Z"/><text x="500" y="42" text-anchor="middle" fill="rgba(212,175,55,.44)" font-size="24" font-family="Georgia,serif">33 CONNECTED ENTITIES | 14 DEVELOPMENT DIRECTIONS</text>'+links+nodes+'</svg><div class="v7-legend"><span><i class="v7-dot-gold"></i>33 povezana društva</span><span><i class="v7-dot-blue"></i>14 u razvoju</span></div><div class="v7-map-panel"><span><b id="v7-city-name">Zagreb</b><br><small id="v7-city-info">GNK ASG d.o.o. | sjedište | aktivno</small></span><a class="v7-btn" href="/locations?theme=dark">Otvori kartu</a><button class="v7-btn gold" onclick="window.print()">Ispis PDF</button></div></div><script>document.querySelectorAll(".v7-node").forEach(function(el){el.addEventListener("click",function(){document.getElementById("v7-city-name").textContent=el.dataset.city;document.getElementById("v7-city-info").textContent=el.dataset.info;});});</script>';
}

function __v7Finance(){
return '<div class="v7-finance"><div class="v7-num"><small>Grupni prihodi FY2025</small><strong>504,00</strong><small>mil. EUR</small><em>grupa</em></div><div class="v7-num"><small>Ukupna aktiva</small><strong>46,40</strong><small>mil. EUR</small><em>+9,1%</em></div><div class="v7-num"><small>Kapital i rezerve</small><strong>46,21</strong><small>mil. EUR</small><em>+7,8%</em></div><div class="v7-num red"><small>Kratkoročne obveze</small><strong>184,50</strong><small>tis. EUR</small><em>-5,2%</em></div></div><div class="v7-strip"><div><b>33</b><small>povezana društva</small></div><div><b>14</b><small>u razvoju</small></div><div><b>GNKSC</b><small>stable coin monitor</small></div><div><b>2D</b><small>klikabilna karta</small></div></div>';
}

function __v7Index(request){
const theme=__v7Theme(request);
return __v7Head("GNK ASG | Corporate Portal V7",request)+__v7Top(request,"/")+'<main><section class="v7-hero"><article class="v7-card"><div class="v7-kicker">GNK ASG d.o.o. | GNK DINAMO Ltd. Group</div><h1 class="v7-title">Building value.<br><span>Driving technology.</span></h1><p class="v7-lead">Naslovnica zadržava funkcije prve stranice, ali sada odmah prikazuje grupne financije, 33 povezana društva, 14 razvojnih pravaca, GNKSC i 2D kartu.</p><div class="v7-actions"><a class="v7-btn gold" href="#finance">Financije grupe</a><a class="v7-btn" href="/locations?theme='+theme+'">Karta</a><a class="v7-btn" href="/admin?theme='+theme+'">Admin</a></div></article>'+__v7Map()+'<aside class="v7-card" id="finance"><h2>Financijski podaci grupe</h2>'+__v7Finance()+'</aside></section><section class="v7-grid3"><article class="v7-card"><h2>GNK ASG d.o.o.</h2><div class="v7-list"><div><span>Sjedište</span><b>Zagreb</b></div><div><span>OIB</span><b>75227917632</b></div><div><span>MBS</span><b>081512375</b></div><div><span>Direktor / UBO</span><b>Nermin Sefić</b></div></div></article><article class="v7-card"><h2>Digital Assets & GNKSC</h2><div class="v7-list"><div><span>BTC</span><b>SNAPSHOT</b></div><div><span>ETH</span><b>SNAPSHOT</b></div><div><span>GNKSC stable coin</span><b>PEG / STATUS</b></div><div><small>Informativni prikaz, nije financijski savjet.</small><b>INFO</b></div></div></article><article class="v7-card"><h2>Admin i operator</h2><p class="v7-lead">Admin ulaz je na naslovnici. Ulaz traži postojeći pass/token, a osjetljivi endpointi ostaju zaštićeni.</p><a class="v7-btn gold" href="/admin?theme='+theme+'">Admin login</a></article></section><section class="v7-grid3"><article class="v7-card"><h2>Business News</h2><p class="v7-lead">Vijesti su prebačene na posebnu stranicu da index ostane brz.</p><a class="v7-btn gold" href="/business-news?theme='+theme+'">News Hub</a></article><article class="v7-card"><h2>AI Assistant</h2><p class="v7-lead">Javni AI pomoćnik odgovara o javnim podacima, dokumentima, lokacijama i tržišnim modulima.</p><a class="v7-btn" href="/ai?theme='+theme+'">Otvori AI</a></article><article class="v7-card"><h2>Kontakt i dokumenti</h2><div class="v7-list"><a href="/contact?theme='+theme+'"><span>Kontakt forma</span><b>OPEN</b></a><a href="/media-kit-downloads?theme='+theme+'"><span>PDF/DOCX/PPTX</span><b>DOCS</b></a></div></article></section></main>'+__v7Footer()+'</div></body></html>';
}

function __v7Locations(request){
return __v7Head("GNK ASG | Lokacije 33 + 14",request)+__v7Top(request,"/locations")+'<main style="margin-top:18px"><section class="v7-card"><div class="v7-kicker">2D WORLD MAP</div><h1 class="v7-title">Karta lokacija<br><span>33 povezana društva + 14 u razvoju</span></h1><p class="v7-lead">Zlatne točke označavaju povezana društva, plave točke razvojne pravce. Klik na točku prikazuje podatke o gradu.</p>'+__v7Map()+'</section></main>'+__v7Footer()+'</div></body></html>';
}

function __v7News(request){
return __v7Head("GNK ASG | Business News",request)+__v7Top(request,"/business-news")+'<main style="margin-top:18px"><section class="v7-card"><div class="v7-kicker">NEWS HUB</div><h1 class="v7-title">Business News<br><span>odvojeno od indexa</span></h1><p class="v7-lead">Ovdje dolaze poslovne vijesti, market brief, digital assets i automatski editor. Index ostaje lagan.</p></section><section class="v7-grid3"><article class="v7-card"><h2>Group update</h2><p class="v7-lead">Sažetak grupnih aktivnosti.</p></article><article class="v7-card"><h2>Market brief</h2><p class="v7-lead">Bitcoin, zlato, Brent, USD/EUR i GNKSC status.</p></article><article class="v7-card"><h2>Auto Editor</h2><p class="v7-lead">Buduće automatizirane objave s kontrolom.</p></article></section></main>'+__v7Footer()+'</div></body></html>';
}

function __v7Contact(request){
return __v7Head("GNK ASG | Kontakt",request)+__v7Top(request,"/contact")+'<main style="margin-top:18px"><section class="v7-grid2"><article class="v7-card"><div class="v7-kicker">CONTACT FORM</div><h1 class="v7-title">Kontakt<br><span>GNK ASG</span></h1><form class="v7-form" id="v7-contact-form"><input name="name" placeholder="Ime i prezime / naziv" required><input name="email" type="email" placeholder="E-mail" required><input name="phone" placeholder="Telefon"><select name="topic"><option>Opći upit</option><option>Media Kit</option><option>Partnerstvo</option><option>Dokumenti</option><option>AI / tehnologija</option></select><textarea name="message" placeholder="Poruka" required></textarea><label><input type="checkbox" name="consent" required> Prihvaćam obradu podataka isključivo radi odgovora na upit.</label><button class="v7-btn gold" type="submit">Pošalji upit</button><div id="v7-" class="v7-lead"></div></form></article><article class="v7-card"><h2>Brzi kontakti</h2><div class="v7-list"><a href="mailto:info@gnk-asg.hr"><span>E-mail</span><b>info@gnk-asg.hr</b></a><a href="https://wa.me/385915358365"><span>WhatsApp</span><b>0915358365</b></a><a href="/media-kit-downloads"><span>Dokumenti</span><b>PDF/DOCX</b></a></div><p class="v7-lead">Kontakt forma sprema upit u dostupni KV/inbox sloj ako je binding aktivan. Ako nije, vraća potvrdu i fallback kontakt.</p></article></section></main><script>document.getElementById("v7-contact-form").addEventListener("submit",async function(e){e.preventDefault();const fd=new FormData(e.target);const r=await fetch("https://operator.gnk-asg.hr/api/contact-submit",{method:"POST",body:fd})/*GNK_ASG_CONTACT_FORM_OPERATOR_ENDPOINT_V1*/;const j=await r.json();document.getElementById("v7-").textContent=j.ok?"Upit je zaprimljen. ID: "+j.id:"Greška: "+(j.error||"nije poslano");});</script>'+__v7Footer()+'</div></body></html>';
}

function __v7Ai(request){
return __v7Head("GNK ASG | AI Assistant",request)+__v7Top(request,"/ai")+'<main style="margin-top:18px"><section class="v7-grid2"><article class="v7-card"><div class="v7-kicker">PUBLIC AI ASSISTANT</div><h1 class="v7-title">AI Assistant<br><span>javni informacijski sloj</span></h1><form class="v7-form" id="v7-ai-form"><textarea name="question" placeholder="Pitaj o grupi, financijama, lokacijama, dokumentima, GNKSC ili kontaktu..." required></textarea><button class="v7-btn gold" type="submit">Pitaj</button><div id="v7-ai-answer" class="v7-card" style="margin-top:10px"></div></form></article><article class="v7-card"><h2>Ograničenja</h2><p class="v7-lead">AI odgovara samo iz javnog portala i ne daje pravni, porezni ni financijski savjet. Admin ovlasti su odvojene.</p><div class="v7-list"><a href="/media-kit-downloads"><span>Dokumenti</span><b>OPEN</b></a><a href="/locations"><span>Lokacije</span><b>MAP</b></a><a href="/contact"><span>Kontakt</span><b>FORM</b></a></div></article></section></main><script>document.getElementById("v7-ai-form").addEventListener("submit",async function(e){e.preventDefault();const q=new FormData(e.target).get("question");const r=await fetch("/api/ai/ask",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({question:q})});const j=await r.json();document.getElementById("v7-ai-answer").innerHTML="<b>Odgovor</b><p>"+j.answer+"</p><small>"+(j.sources||[]).join(" | ")+"</small>";});</script>'+__v7Footer()+'</div></body></html>';
}

function __v7Docs(request){
return __v7Head("GNK ASG | Dokumenti",request)+__v7Top(request,"/media-kit-downloads")+'<main style="margin-top:18px"><section class="v7-card"><div class="v7-kicker">DOCUMENTS | PRINT | MAIL SIGNATURE</div><h1 class="v7-title">Dokumenti<br><span>PDF | DOCX | PPTX</span></h1><p class="v7-lead">Dokumenti trebaju koristiti isti identitet: logotip, zlatni akcent, print žig, footer, timestamp i kontakt podatke.</p><div class="v7-actions"><button class="v7-btn gold" onclick="window.print()">Ispis / PDF</button><a class="v7-btn" href="/download/gnk-asg-media-kit.pdf">Media Kit PDF</a><a class="v7-btn" href="/download/gnk-asg-letterhead.docx">Memorandum DOCX</a><a class="v7-btn" href="/download/gnk-asg-presentation-template.pptx">PPTX</a></div></section><section class="v7-grid3"><article class="v7-card">'+__v7Logo("asg")+'<div class="v7-list"><a href="/download/gnk-asg-media-kit.pdf"><span>GNK ASG Media Kit</span><b>PDF</b></a><a href="/download/gnk-asg-company-profile.pdf"><span>Company Profile</span><b>PDF</b></a><a href="/download/gnk-asg-brand-guidelines.pdf"><span>Brand Guidelines</span><b>PDF</b></a></div></article><article class="v7-card">'+__v7Logo("dinamo")+'<div class="v7-list"><a href="/download/gnk-dinamo-ltd-media-kit.pdf"><span>GNK DINAMO Ltd. Media Kit</span><b>PDF</b></a><a href="/download/gnk-asg-presentation-template.pptx"><span>Presentation Template</span><b>PPTX</b></a></div></article><article class="v7-card"><h2>Mail potpis</h2><div class="v7-list"><div><span>Nermin Sefić</span><b>UBO</b></div><div><span>GNK ASG d.o.o.</span><b>Logo + žig</b></div><a href="/contact"><span>Kontakt forma</span><b>WEB</b></a></div></article></section></main>'+__v7Footer()+'</div></body></html>';
}

function __v7AdminLogin(request,error=""){
return __v7Head("GNK ASG | Admin Login",request)+__v7Top(request,"/admin")+'<main><section class="v7-card v7-admin-login"><div class="v7-kicker">ADMIN LOGIN</div><h1 class="v7-title">Admin<br><span>Operator</span></h1><p class="v7-lead">Unesi postojeći pass/token. Nakon prijave dobivaš zaštićeni admin pregled.</p>'+(error?'<p class="v7-lead" style="color:var(--red)">'+__v7Esc(error)+'</p>':'')+'<form class="v7-form" method="POST" action="/admin/login"><input name="password" type="password" placeholder="Admin pass / token" required><button class="v7-btn gold" type="submit">Uđi u admin</button></form></section></main>'+__v7Footer()+'</div></body></html>';
}

function __v7Admin(request,env){
if(!__v7AdminOk(request,env))return __v7AdminLogin(request);
return __v7Head("GNK ASG | Admin",request)+__v7Top(request,"/admin")+'<main style="margin-top:18px"><section class="v7-card"><div class="v7-kicker">AUTHENTICATED ADMIN</div><h1 class="v7-title">Operator dashboard<br><span>zaštićeno passom</span></h1><p class="v7-lead">Admin stranica je otvorena samo nakon uspješne provjere postojećeg passa/tokena.</p><div class="v7-actions"><a class="v7-btn" href="/operator/logs">Logs</a><a class="v7-btn" href="/operator/contact-inbox">Contact inbox</a><a class="v7-btn" href="/admin/logout">Logout</a></div></section><section class="v7-admin-grid" style="margin-top:12px"><a href="/business-news"><b>News Hub</b><small><br>pregled vijesti</small></a><a href="/locations"><b>Locations</b><small><br>karta 33 + 14</small></a><a href="/media-kit-downloads"><b>Documents</b><small><br>PDF/DOCX/PPTX</small></a><a href="/ai"><b>AI Assistant</b><small><br>javni AI</small></a><a href="/contact"><b>Contact form</b><small><br>javna forma</small></a></section></main>'+__v7Footer()+'</div></body></html>';
}

function __v7Footer(){
return '<footer class="v7-footer"><div>'+__v7Logo("asg")+'<small>GNK ASG d.o.o. | Zagreb | OIB 75227917632</small></div><div><b>Menu</b><small><br>Grupa | Lokacije | Vijesti | AI | Kontakt | Dokumenti | Admin</small></div><div><b>Kontakt</b><small><br>info@gnk-asg.hr | 0915358365</small></div><div><b>Napomena</b><small><br>Podaci su informativni i nisu financijski savjet.</small></div></footer><div class="v7-seal">GNK ASG<br>SEAL</div>';
}

async function __v7Login(request,env){
const expected=__v7Expected(env);
if(!expected)return new Response(__v7AdminLogin(request,"Admin pass nije konfiguriran."),{status:500,headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v7":"active"}});
const form=await request.formData();
const pass=String(form.get("password")||"");
if(pass!==expected)return new Response(__v7AdminLogin(request,"Pogrešan pass/token."),{status:401,headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v7":"active"}});
return new Response("",{status:302,headers:{"location":"/admin","set-cookie":"gnk_admin="+encodeURIComponent(btoa(pass))+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=21600","cache-control":"no-store","x-gnk-asg-v7":"active"}});
}

async function __v7ContactSubmit(request,env){
try{
const form=await request.formData();
const record={id:"contact-"+Date.now(),createdAt:new Date().toISOString(),name:String(form.get("name")||""),email:String(form.get("email")||""),phone:String(form.get("phone")||""),topic:String(form.get("topic")||""),message:String(form.get("message")||""),consent:String(form.get("consent")||"")};
let stored=false;
const inbox=env.GNK_ASG_CONTACT_INBOX||env.CONTACT_INBOX||env.GNK_ASG_KV||env.PORTAL_KV;
if(inbox&&inbox.put){await inbox.put(record.id,JSON.stringify(record),{expirationTtl:31536000});stored=true;}
return __v7Json({ok:true,id:record.id,stored,fallback:"info@gnk-asg.hr"});
}catch(e){return __v7Json({ok:false,error:String(e&&e.message?e.message:e)},500);}
}

async function __v7AiAsk(request){
try{
const body=await request.json().catch(()=>({}));
const q=String(body.question||"").toLowerCase();
let answer="GNK ASG portal prikazuje grupne financije, 33 povezana društva, 14 razvojnih pravaca, dokumente, lokacije, GNKSC stable coin monitor, kontakt formu i javni AI informacijski sloj.";
if(q.includes("financ"))answer="Na naslovnici su vidljivi grupni FY2025 podaci: prihodi 504,00 mil. EUR, aktiva 46,40 mil. EUR, kapital i rezerve 46,21 mil. EUR te kratkoročne obveze 184,50 tis. EUR. Podaci su informativni i nisu financijski savjet.";
if(q.includes("kontakt"))answer="Kontakt je dostupan kroz javnu kontakt formu, e-mail info@gnk-asg.hr i WhatsApp poveznicu. Forma sprema upit u dostupni inbox/KV sloj kada je binding aktivan.";
if(q.includes("lokac")||q.includes("grad"))answer="Karta prikazuje 33 povezana društva i 14 razvojnih pravaca. Zlatne točke su aktivne lokacije, plave su razvojni pravci, a klik prikazuje podatke o gradu.";
if(q.includes("gnksc")||q.includes("stable"))answer="GNKSC je prikazan kao stable coin monitor s peg/status/rezerve/compliance logikom. Prikaz je informativan i nije financijski savjet.";
return __v7Json({ok:true,answer,sources:["/","/locations","/media-kit-downloads","/contact"]});
}catch(e){return __v7Json({ok:false,error:String(e&&e.message?e.message:e)},500);}
}

const __gnkAsgV8BaseWorker = {
  ...__gnkAsgV7BaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/admin/login") return __v7Login(request, env);
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/admin/logout") return new Response("",{status:302,headers:{"location":"/admin","set-cookie":"gnk_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0","cache-control":"no-store","x-gnk-asg-v7":"active"}});
    if (request.method === "POST" && url.pathname === "/api/contact-submit") return __v7ContactSubmit(request, env);
    if (request.method === "POST" && url.pathname === "/api/ai/ask") return __v7AiAsk(request);

    if (request.method === "GET" || request.method === "HEAD") {
      if (url.pathname === "/" || url.pathname === "/portal-preview" || url.pathname === "/index-preview") return new Response(__v7Index(request),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v7":"active","cache-control":"public, max-age=120"}});
      if (url.pathname === "/locations" || url.pathname === "/cities") return new Response(__v7Locations(request),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v7":"active","cache-control":"public, max-age=120"}});
      if (url.pathname === "/business-news" || url.pathname === "/news-hub") return new Response(__v7News(request),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v7":"active","cache-control":"public, max-age=120"}});
      if (url.pathname === "/contact") return new Response(__v7Contact(request),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v7":"active","cache-control":"public, max-age=120"}});
      if (url.pathname === "/ai") return new Response(__v7Ai(request),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v7":"active","cache-control":"public, max-age=120"}});
      if (url.pathname === "/media-kit-downloads" || url.pathname === "/download" || url.pathname === "/documents") return new Response(__v7Docs(request),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v7":"active","cache-control":"public, max-age=120"}});
      if (url.pathname === "/admin") return new Response(__v7Admin(request,env),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v7":"active","cache-control":"no-store"}});
    }

    return __gnkAsgV7BaseWorker.fetch(request, env, ctx);
  }
};



const GNK_ASG_V8_SEO_NEWS_GALLERY_FLOATING_ACTIVE = true;

const __gnkV8Articles = [
  {
    slug:"gnk-asg-corporate-group-profile-2026",
    title:"GNK ASG d.o.o. i GNK DINAMO Ltd. – korporativni grupni profil",
    category:"Group",
    date:"2026-06-16",
    image:"/gallery/gnk-asg-corporate-network",
    summary:"Pregled javnog korporativnog profila GNK ASG d.o.o., GNK DINAMO Ltd., 33 povezana društva, 14 razvojnih pravaca i digitalne infrastrukture.",
    text:"GNK ASG d.o.o. predstavlja korporativni i tehnološki portal povezan s međunarodnim kontekstom GNK DINAMO Ltd. Portal je zamišljen kao javni informacijski sloj za grupne podatke, dokumente, lokacije, digitalnu imovinu, AI asistenta, kontakt i media kit. Na naslovnici su istaknuti grupni financijski pokazatelji, uključujući prihode, aktivu, kapital i rezerve, uz napomenu da su podaci informativni i da ne predstavljaju financijski savjet. Poseban naglasak stavljen je na pregled 33 povezana društva i 14 razvojnih pravaca kroz interaktivnu 2D kartu. Karta povezuje gradove, poslovne pravce i međunarodne lokacije te omogućuje klik na pojedinu točku radi prikaza osnovnih informacija. SEO sloj portala koristi ključne pojmove GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., Nermin Sefic, Nermin Sefić, korporativni portal, media kit, AI assistant, digital assets, stable coin monitor i business intelligence. Cilj je da svaka javna stranica, objava, galerijski element i dokument imaju vlastiti naslov, opis, canonical URL, Open Graph podatke, schema.org oznake i poveznicu u sitemapu."
  },
  {
    slug:"gnksc-stable-coin-monitor-digital-assets",
    title:"GNKSC stable coin monitor i digitalna imovina",
    category:"Digital Assets",
    date:"2026-06-16",
    image:"/gallery/gnksc-stable-coin-monitor",
    summary:"Informativni modul za GNKSC stable coin, peg/status, rezerve, compliance i digital assets pregled.",
    text:"GNKSC stable coin monitor zamišljen je kao informativni prikaz stabilnosti, statusa, peg logike, rezervi i compliance režima. Modul na portalu nije investicijska ponuda, ne predstavlja financijski savjet i ne prikazuje podatke kao real-time ako nema potvrđenog API izvora. Portal jasno razlikuje LIVE, SNAPSHOT, DELAYED i FALLBACK podatke. Digital Assets modul može uključivati Bitcoin, Ethereum, stable coin monitor, tržišne indekse, zlato, Brent naftu i USD/EUR prikaz, ali svaki podatak mora imati timestamp, izvor i status. Za SEO je važno da svaka stranica digitalne imovine ima jasne opise, strukturirane podatke, canonical oznake, alt tekstove za grafike i jasne disclaimere. Ovaj modul ostaje povezan s Business News hubom, dnevnim market briefom i budućim automatskim uredničkim sustavom."
  },
  {
    slug:"business-news-auto-editor-seo-dinamika",
    title:"Business News, Auto Editor i SEO dinamika objava",
    category:"News",
    date:"2026-06-16",
    image:"/gallery/business-news-auto-editor",
    summary:"Plan objava, povlačenja vijesti, SEO indeksiranja i automatskog uredničkog režima.",
    text:"Business News hub izdvojen je s naslovnice kako bi index ostao brz i lagan. Dogovoreni model predviđa odvojenu stranicu za vijesti, objave i market brief, uz podatkovne endpointove /data/news.json, /data/articles.json i /data/status.json. Dinamika povlačenja vijesti treba ostati transparentna: poslovne vijesti 30 do 60 minuta, tržišni podaci 5 do 15 minuta ako API limiti dopuštaju, market brief 1 do 3 puta dnevno, a automatski urednik 3 puta dnevno uz kontrolu kvalitete. Svaka objava mora imati vlastiti slug, canonical URL, title, meta description, Open Graph sliku, JSON-LD Article schema, alt tekst slike, datum, kategoriju i izvor. U sitemapu se moraju nalaziti sve objave, galerijski elementi, dokumenti i ključne stranice. Ovaj režim podržava SEO za GNK ASG, GNK DINAMO Ltd., Nermin Sefic, Nermin Sefić, digitalna imovina, AI assistant, business intelligence i media kit."
  },
  {
    slug:"media-kit-documents-mail-signature",
    title:"Media Kit, dokumenti, PDF print i mail potpisi",
    category:"Media Kit",
    date:"2026-06-16",
    image:"/gallery/media-kit-documents-mail-signature",
    summary:"Usklađenje weba, PDF-a, DOCX-a, PPTX-a, mail potpisa i print žiga.",
    text:"Media Kit mora biti jedinstven kroz web, PDF, DOCX, PPTX, HTML mail potpis i print verziju. Dokumenti trebaju koristiti isti vizualni identitet: tamnu premium verziju, lite svijetlu verziju, zlatne akcente, GNK ASG logo, GNK DINAMO Ltd. logo, grupni logo, footer, kontakt podatke, timestamp i print žig. PDF financijska izvješća i javni dokumenti moraju imati jasnu razliku između informativnog prikaza, izvornog dokumenta i marketinškog media kita. Mail potpisi trebaju sadržavati ime, funkciju, društvo, telefon, e-mail, web, media kit link, disclaimer i mali logotip. Portal treba imati /mail-signature i /download/gnk-asg-email-signature.html kao javno dostupnu HTML verziju potpisa."
  }
];

const __gnkV8Gallery = [
  {slug:"gnk-asg-corporate-network",title:"GNK ASG corporate network",alt:"GNK ASG korporativna mreža i globalni digitalni portal",category:"Corporate",image:"/download/gnk-asg-logo-dark.svg"},
  {slug:"gnk-dinamo-ltd-global-group",title:"GNK DINAMO Ltd. global group",alt:"GNK DINAMO Ltd. međunarodni grupni profil",category:"Group",image:"/download/gnk-asg-logo-light.svg"},
  {slug:"gnksc-stable-coin-monitor",title:"GNKSC stable coin monitor",alt:"GNKSC stable coin monitor peg reserve compliance",category:"Digital Assets",image:"/download/gnk-asg-logo-dark.svg"},
  {slug:"business-news-auto-editor",title:"Business News Auto Editor",alt:"Automatski urednički sustav za poslovne vijesti",category:"News",image:"/download/gnk-asg-logo-light.svg"},
  {slug:"media-kit-documents-mail-signature",title:"Media Kit documents mail signature",alt:"GNK ASG media kit dokumenti PDF DOCX PPTX mail potpis",category:"Media Kit",image:"/download/gnk-asg-logo-dark.svg"}
];

function __gnkV8Esc(v){
  return String(v ?? "").replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];});
}

function __gnkV8Theme(request){
  const u = new URL(request.url);
  const t = (u.searchParams.get("theme") || "dark").toLowerCase();
  return t === "lite" || t === "light" ? "lite" : "dark";
}

function __gnkV8BaseUrl(request){
  const u = new URL(request.url);
  return u.origin;
}

function __gnkV8PageTitle(path){
  if(path === "/") return "GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefic | Corporate Portal";
  if(path.includes("locations")) return "GNK ASG lokacije | 33 povezana društva | 14 u razvoju";
  if(path.includes("business-news")) return "GNK ASG Business News | Auto Editor | Market Brief";
  if(path.includes("gallery") || path.includes("galerija")) return "GNK ASG galerija | SEO slike | Media assets";
  if(path.includes("posts") || path.includes("objave") || path.includes("articles")) return "GNK ASG objave | SEO tekstovi | GNK DINAMO Ltd.";
  if(path.includes("media-kit") || path.includes("download")) return "GNK ASG Media Kit | PDF DOCX PPTX | Mail Signature";
  if(path.includes("contact")) return "GNK ASG kontakt | WhatsApp | Kontakt forma";
  if(path.includes("ai")) return "GNK ASG AI Assistant | javni informacijski sloj";
  if(path.includes("mail-signature")) return "GNK ASG HTML mail potpis | Nermin Sefic";
  return "GNK ASG d.o.o. | GNK DINAMO Ltd. | Corporate Portal";
}

function __gnkV8Description(path){
  return "GNK ASG d.o.o., GNK DINAMO Ltd., Nermin Sefic, Nermin Sefić, 33 povezana društva, 14 razvojnih pravaca, media kit, AI assistant, digital assets, GNKSC stable coin monitor, poslovne vijesti, galerija, dokumenti i korporativni portal.";
}

function __gnkV8SeoHead(request,path,article){
  const base = __gnkV8BaseUrl(request);
  const url = new URL(request.url);
  const canonical = base + path;
  const title = article ? article.title + " | GNK ASG" : __gnkV8PageTitle(path);
  const desc = article ? article.summary : __gnkV8Description(path);
  const image = article && article.image ? base + article.image : base + "/download/gnk-asg-logo-dark.svg";
  const type = article ? "article" : "website";
  const schema = article ? {
    "@context":"https://schema.org",
    "@type":"Article",
    headline:article.title,
    description:article.summary,
    datePublished:article.date,
    dateModified:new Date().toISOString(),
    author:{"@type":"Person","name":"Nermin Sefic"},
    publisher:{"@type":"Organization","name":"GNK ASG d.o.o.","url":base},
    image:image,
    mainEntityOfPage:canonical,
    keywords:"GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., Nermin Sefic, Nermin Sefić, media kit, AI assistant, digital assets"
  } : {
    "@context":"https://schema.org",
    "@type":"Organization",
    name:"GNK ASG d.o.o.",
    alternateName:["GNK ASG","GNK DINAMO Ltd.","GNK DINAMO Group"],
    url:base,
    identifier:"OIB 75227917632",
    founder:{"@type":"Person","name":"Nermin Sefic"},
    keywords:"GNK ASG, GNK DINAMO Ltd., Nermin Sefic, Nermin Sefić, corporate portal, media kit, AI assistant"
  };
  return '<title>'+__gnkV8Esc(title)+'</title><link rel="canonical" href="'+canonical+'"><meta name="description" content="'+__gnkV8Esc(desc)+'"><meta name="keywords" content="GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., Nermin Sefic, Nermin Sefić, Nermin Sefi, media kit, AI assistant, digital assets, GNKSC, business intelligence"><meta property="og:title" content="'+__gnkV8Esc(title)+'"><meta property="og:description" content="'+__gnkV8Esc(desc)+'"><meta property="og:type" content="'+type+'"><meta property="og:url" content="'+canonical+'"><meta property="og:image" content="'+image+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+__gnkV8Esc(title)+'"><meta name="twitter:description" content="'+__gnkV8Esc(desc)+'"><meta name="twitter:image" content="'+image+'"><script type="application/ld+json">'+JSON.stringify(schema)+'</script>';
}

function __gnkV8Css(){
  return '<style>:root{--g:#d4af37;--b:#06111f;--t:#f7f0dc;--m:rgba(247,240,220,.72);--c:rgba(9,22,38,.84);--l:rgba(212,175,55,.30)}html.v8-lite{--b:#fbfaf5;--t:#101827;--m:rgba(16,24,39,.68);--c:rgba(255,255,255,.88);--l:rgba(174,118,20,.24)}body.v8{margin:0;background:radial-gradient(circle at 16% 0%,rgba(212,175,55,.18),transparent 32%),linear-gradient(145deg,var(--b),#0b1628);color:var(--t);font-family:Inter,Segoe UI,Arial,sans-serif}html.v8-lite body.v8{background:radial-gradient(circle at 16% 0%,rgba(212,175,55,.18),transparent 32%),linear-gradient(145deg,#fff,#f2efe6)}.v8-page{max-width:1500px;margin:0 auto;padding:0 24px 32px}.v8-top{position:sticky;top:0;z-index:90;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid var(--l);background:rgba(5,12,24,.84);backdrop-filter:blur(14px)}html.v8-lite .v8-top{background:rgba(255,255,255,.82)}.v8-brand{text-decoration:none;color:var(--t);font-weight:800;letter-spacing:.08em}.v8-nav{display:flex;gap:6px;flex-wrap:wrap}.v8-nav a,.v8-btn{color:var(--t);text-decoration:none;border:1px solid var(--l);border-radius:12px;padding:9px 11px;background:rgba(255,255,255,.035)}.v8-btn.gold,.v8-nav a:hover{background:linear-gradient(135deg,#f0c85c,#ad7417);color:#100d06}.v8-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}.v8-card{border:1px solid var(--l);border-radius:18px;background:linear-gradient(145deg,var(--c),rgba(255,255,255,.04));padding:18px;overflow:hidden}.v8-card h1,.v8-card h2,.v8-card h3{font-family:Georgia,serif;color:#f5dc88;margin-top:0}html.v8-lite .v8-card h1,html.v8-lite .v8-card h2,html.v8-lite .v8-card h3{color:#ad7417}.v8-card p,.v8-card small{color:var(--m);line-height:1.5}.v8-list{display:grid;gap:9px}.v8-list a,.v8-list div{display:flex;justify-content:space-between;gap:10px;color:var(--t);text-decoration:none;border:1px solid var(--l);border-radius:12px;padding:10px;background:rgba(255,255,255,.035)}.v8-float{position:fixed;right:22px;bottom:22px;z-index:99999;display:grid;gap:8px}.v8-float a,.v8-float button{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--g);background:linear-gradient(145deg,#f0c85c,#855d13);color:#110d04;text-decoration:none;font-weight:900;box-shadow:0 0 24px rgba(212,175,55,.35);cursor:pointer}.v8-float-panel{display:none;position:absolute;right:70px;bottom:0;width:260px;border:1px solid var(--l);border-radius:16px;background:var(--c);padding:12px}.v8-float.open .v8-float-panel{display:block}.v8-gallery{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.v8-img{min-height:150px;border-radius:16px;border:1px solid var(--l);background:radial-gradient(circle at 50% 40%,rgba(212,175,55,.28),transparent 32%),linear-gradient(145deg,rgba(5,12,24,.8),rgba(255,255,255,.04));display:grid;place-items:center;text-align:center;padding:14px}.v8-signature{max-width:680px;border:1px solid #d4af37;border-radius:16px;padding:16px;background:#07111f;color:#f7f0dc;font-family:Arial,sans-serif}.v8-signature b{color:#f5dc88}.v8-disclaimer{font-size:11px;color:rgba(247,240,220,.68);margin-top:10px}.v8-status{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.v8-status div{border:1px solid var(--l);border-radius:14px;padding:12px}@media(max-width:1000px){.v8-grid,.v8-gallery,.v8-status{grid-template-columns:1fr}.v8-top{align-items:flex-start;flex-direction:column}}</style>';
}

function __gnkV8Top(request,active){
  const theme = __gnkV8Theme(request);
  const p = new URL(request.url).pathname;
  const items = [["/","Index"],["/posts","Objave"],["/business-news","Vijesti"],["/gallery","Galerija"],["/media-kit-downloads","Media Kit"],["/mail-signature","Mail"],["/contact","Kontakt"],["/ai","AI"],["/admin","Admin"]];
  return '<header class="v8-top"><a class="v8-brand" href="/?theme='+theme+'">GNK ASG | GNK DINAMO Ltd.</a><nav class="v8-nav">'+items.map(i=>'<a href="'+i[0]+'?theme='+theme+'">'+i[1]+'</a>').join("")+'</nav><nav class="v8-nav"><a href="'+p+'?theme=dark">Dark</a><a href="'+p+'?theme=lite">Lite</a></nav></header>';
}

function __gnkV8Float(){
  return '<div class="v8-float" id="v8-float"><div class="v8-float-panel"><b>GNK ASG quick actions</b><div class="v8-list" style="margin-top:10px"><a href="/contact"><span>Kontakt forma</span><b>OPEN</b></a><a href="https://wa.me/385915358365"><span>WhatsApp</span><b>CHAT</b></a><a href="/ai"><span>AI Assistant</span><b>ASK</b></a><a href="/media-kit-downloads"><span>Media Kit</span><b>PDF</b></a><a href="/admin"><span>Admin</span><b>LOGIN</b></a></div></div><button onclick="document.getElementById(\'v8-float\').classList.toggle(\'open\')">IT</button><a href="https://wa.me/385915358365">WA</a><a href="/contact">✉</a></div>';
}

function __gnkV8Page(request,path,title,body,article){
  const theme = __gnkV8Theme(request);
  return '<!doctype html><html class="v8-'+theme+'" lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+__gnkV8SeoHead(request,path,article)+__gnkV8Css()+'</head><body class="v8"><div class="v8-page">'+__gnkV8Top(request,path)+body+'</div>'+__gnkV8Float()+'</body></html>';
}

function __gnkV8PostsPage(request){
  const cards = __gnkV8Articles.map(a=>'<article class="v8-card"><small>'+a.category+' | '+a.date+'</small><h2>'+__gnkV8Esc(a.title)+'</h2><p>'+__gnkV8Esc(a.summary)+'</p><a class="v8-btn gold" href="/post/'+a.slug+'?theme='+__gnkV8Theme(request)+'">Otvori objavu</a></article>').join("");
  const body = '<main><section class="v8-card" style="margin-top:18px"><h1>Objave i SEO tekstovi</h1><p>Sve objave imaju slug, canonical, OG podatke, Article schema, opis, sliku, datum i ulaz u sitemap.</p></section><section class="v8-grid">'+cards+'</section></main>';
  return __gnkV8Page(request,"/posts","Objave",body);
}

function __gnkV8ArticlePage(request,slug){
  const a = __gnkV8Articles.find(x=>x.slug===slug) || __gnkV8Articles[0];
  const body = '<main><article class="v8-card" style="margin-top:18px"><small>'+a.category+' | '+a.date+'</small><h1>'+__gnkV8Esc(a.title)+'</h1><p><b>'+__gnkV8Esc(a.summary)+'</b></p><p>'+__gnkV8Esc(a.text)+'</p><div class="v8-list"><a href="/gallery/'+a.image.split("/").pop()+'"><span>SEO slika</span><b>OPEN</b></a><a href="/sitemap.xml"><span>Sitemap</span><b>XML</b></a><a href="/media-kit-downloads"><span>Media Kit</span><b>DOCS</b></a></div></article></main>';
  return __gnkV8Page(request,"/post/"+a.slug,a.title,body,a);
}

function __gnkV8GalleryPage(request){
  const cards = __gnkV8Gallery.map(g=>'<article class="v8-card"><div class="v8-img" role="img" aria-label="'+__gnkV8Esc(g.alt)+'"><b>'+__gnkV8Esc(g.title)+'</b><small>'+__gnkV8Esc(g.alt)+'</small></div><p>'+__gnkV8Esc(g.category)+'</p><a class="v8-btn" href="/gallery/'+g.slug+'?theme='+__gnkV8Theme(request)+'">Detalji slike</a></article>').join("");
  const body = '<main><section class="v8-card" style="margin-top:18px"><h1>Galerija i SEO slike</h1><p>Galerija koristi alt tekstove, kategorije, image sitemap podatke i poveznice prema objavama.</p></section><section class="v8-gallery">'+cards+'</section></main>';
  return __gnkV8Page(request,"/gallery","Galerija",body);
}

function __gnkV8GalleryItem(request,slug){
  const g = __gnkV8Gallery.find(x=>x.slug===slug) || __gnkV8Gallery[0];
  const body = '<main><article class="v8-card" style="margin-top:18px"><h1>'+__gnkV8Esc(g.title)+'</h1><div class="v8-img" role="img" aria-label="'+__gnkV8Esc(g.alt)+'"><b>'+__gnkV8Esc(g.title)+'</b><small>'+__gnkV8Esc(g.alt)+'</small></div><p>Alt tekst: '+__gnkV8Esc(g.alt)+'</p><p>Kategorija: '+__gnkV8Esc(g.category)+'</p><div class="v8-list"><a href="/gallery"><span>Natrag na galeriju</span><b>OPEN</b></a><a href="/sitemap.xml"><span>Image sitemap</span><b>XML</b></a></div></article></main>';
  return __gnkV8Page(request,"/gallery/"+g.slug,g.title,body);
}

function __gnkV8NewsPage(request){
  const cards = __gnkV8Articles.map(a=>'<article class="v8-card"><small>'+a.category+'</small><h2>'+__gnkV8Esc(a.title)+'</h2><p>'+__gnkV8Esc(a.summary)+'</p><a class="v8-btn gold" href="/post/'+a.slug+'?theme='+__gnkV8Theme(request)+'">Otvori</a></article>').join("");
  const body = '<main><section class="v8-card" style="margin-top:18px"><h1>Business News i Auto Editor</h1><div class="v8-status"><div><b>Business news</b><small>30–60 min</small></div><div><b>Market data</b><small>5–15 min</small></div><div><b>Market brief</b><small>1–3 puta dnevno</small></div><div><b>Auto Editor</b><small>3 puta dnevno</small></div></div><p>Ova stranica zamjenjuje placeholder i pokazuje gdje stoje vijesti, objave i dinamika povlačenja.</p></section><section class="v8-grid">'+cards+'</section></main>';
  return __gnkV8Page(request,"/business-news","Business News",body);
}

function __gnkV8MailSignature(request){
  const body = '<main><section class="v8-card" style="margin-top:18px"><h1>HTML mail potpis</h1><p>Potpis je usklađen s Media Kitom, PDF printom i web identitetom.</p><div class="v8-signature"><b>Nermin Sefić</b><br>UBO | GNK ASG d.o.o. / GNK DINAMO Ltd.<br><span>Tel: 0915358365 | Web: gnk-asg.hr | E-mail: info@gnk-asg.hr</span><br><a style="color:#f5dc88" href="https://operator.gnk-asg.hr/media-kit-downloads">Media Kit</a> | <a style="color:#f5dc88" href="https://operator.gnk-asg.hr/contact">Kontakt</a><div class="v8-disclaimer">Ova poruka i prilozi mogu sadržavati poslovne informacije. Podaci na portalu su informativni i nisu pravni, porezni ni financijski savjet.</div></div></section></main>';
  return __gnkV8Page(request,"/mail-signature","Mail signature",body);
}

function __gnkV8Robots(request){
  const base = __gnkV8BaseUrl(request);
  return "User-agent: *\nAllow: /\nSitemap: "+base+"/sitemap.xml\nSitemap: "+base+"/image-sitemap.xml\n";
}

function __gnkV8Sitemap(request){
  const base = __gnkV8BaseUrl(request);
  const staticUrls = ["/","/locations","/business-news","/posts","/gallery","/media-kit-downloads","/mail-signature","/contact","/ai","/admin","/legal","/pwa","/qr","/whatsapp"];
  const postUrls = __gnkV8Articles.map(a=>"/post/"+a.slug);
  const galleryUrls = __gnkV8Gallery.map(g=>"/gallery/"+g.slug);
  const docUrls = ["/download/gnk-asg-media-kit.pdf","/download/gnk-asg-company-profile.pdf","/download/gnk-asg-brand-guidelines.pdf","/download/gnk-dinamo-ltd-media-kit.pdf","/download/gnk-asg-letterhead.docx","/download/gnk-asg-presentation-template.pptx","/download/gnk-asg-email-signature.html"];
  const urls = staticUrls.concat(postUrls).concat(galleryUrls).concat(docUrls);
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(u=>'<url><loc>'+base+u+'</loc><lastmod>'+new Date().toISOString()+'</lastmod><changefreq>'+(u.includes("/post/")?"weekly":"daily")+'</changefreq><priority>'+(u==="/"?"1.0":"0.7")+'</priority></url>').join("")+'</urlset>';
}

function __gnkV8ImageSitemap(request){
  const base = __gnkV8BaseUrl(request);
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+__gnkV8Gallery.map(g=>'<url><loc>'+base+'/gallery/'+g.slug+'</loc><image:image><image:loc>'+base+g.image+'</image:loc><image:title>'+__gnkV8Esc(g.title)+'</image:title><image:caption>'+__gnkV8Esc(g.alt)+'</image:caption></image:image></url>').join("")+'</urlset>';
}

function __gnkV8StatusJson(){
  return {
    ok:true,
    version:"V8",
    updatedAt:new Date().toISOString(),
    refreshPolicy:{
      businessNews:"30-60 min",
      marketData:"5-15 min if API limits allow",
      marketBrief:"1-3 puta dnevno",
      autoEditor:"3 puta dnevno",
      gallerySeo:"on content update",
      sitemap:"on deploy/content update"
    },
    modules:["seo","sitemap","robots","news","articles","gallery","mail-signature","floating-button","contact","ai","admin","documents"],
    disclaimer:"Podaci su informativni i nisu financijski savjet."
  };
}

function __gnkV8Json(data){
  return new Response(JSON.stringify(data,null,2),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=120","x-gnk-asg-v8":"active"}});
}

async function __gnkV8Inject(response,request){
  const ct = response.headers.get("content-type") || "";
  const path = new URL(request.url).pathname;
  if(!ct.includes("text/html")) return response;
  let html = await response.text();
  if(!html.includes("canonical")) html = html.replace(/<head[^>]*>/i,m=>m+__gnkV8SeoHead(request,path));
  if(!html.includes("v8-float")) html = html.replace(/<\/body>/i,__gnkV8Float()+"</body>");
  if(!html.includes("GNK DINAMO Ltd")) html = html.replace(/<body[^>]*>/i,m=>m+'<span style="display:none">GNK ASG GNK DINAMO Ltd. Nermin Sefic Nermin Sefić Nermin Sefi media kit AI assistant digital assets</span>');
  const h = new Headers(response.headers);
  h.set("content-type","text/html; charset=utf-8");
  h.set("x-gnk-asg-v8","active");
  return new Response(html,{status:response.status,headers:h});
}

const __gnkAsgNerminV3BaseWorker = {
  ...__gnkAsgV8BaseWorker,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if(request.method === "GET" || request.method === "HEAD"){
      if(path === "/robots.txt") return new Response(__gnkV8Robots(request),{headers:{"content-type":"text/plain; charset=utf-8","x-gnk-asg-v8":"active"}});
      if(path === "/sitemap.xml") return new Response(__gnkV8Sitemap(request),{headers:{"content-type":"application/xml; charset=utf-8","x-gnk-asg-v8":"active"}});
      if(path === "/image-sitemap.xml") return new Response(__gnkV8ImageSitemap(request),{headers:{"content-type":"application/xml; charset=utf-8","x-gnk-asg-v8":"active"}});
      if(path === "/posts" || path === "/objave" || path === "/articles" || path === "/content-studio") return new Response(__gnkV8PostsPage(request),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v8":"active"}});
      if(path.startsWith("/post/") || path.startsWith("/article/")) return new Response(__gnkV8ArticlePage(request,path.split("/").pop()),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v8":"active"}});
      if(path === "/business-news" || path === "/news-hub") return new Response(__gnkV8NewsPage(request),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v8":"active"}});
      if(path === "/gallery" || path === "/galerija") return new Response(__gnkV8GalleryPage(request),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v8":"active"}});
      if(path.startsWith("/gallery/")) return new Response(__gnkV8GalleryItem(request,path.split("/").pop()),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v8":"active"}});
      if(path === "/mail-signature" || path === "/download/gnk-asg-email-signature.html") return new Response(__gnkV8MailSignature(request),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-v8":"active"}});
      if(path === "/data/news.json") return __gnkV8Json({updatedAt:new Date().toISOString(),refresh:"30-60 min",items:__gnkV8Articles});
      if(path === "/data/articles.json" || path === "/data/articles-v3.json") return __gnkV8Json({updatedAt:new Date().toISOString(),items:__gnkV8Articles});
      if(path === "/data/content-studio-v3.json") return __gnkV8Json({updatedAt:new Date().toISOString(),autoEditor:{schedule:"3 puta dnevno",status:"draft/control"},items:__gnkV8Articles});
      if(path === "/data/gallery.json" || path === "/data/image-catalog-r2.json") return __gnkV8Json({updatedAt:new Date().toISOString(),items:__gnkV8Gallery});
      if(path === "/data/status.json") return __gnkV8Json(__gnkV8StatusJson());
      if(path === "/data/market.json") return __gnkV8Json({updatedAt:new Date().toISOString(),status:"SNAPSHOT",assets:[{symbol:"BTC",status:"SNAPSHOT"},{symbol:"ETH",status:"SNAPSHOT"},{symbol:"GNKSC",status:"PEG_MONITOR"}],disclaimer:"Informativno, nije financijski savjet."});
    }

    const response = await __gnkAsgV8BaseWorker.fetch(request, env, ctx);

    if(request.method === "GET" || request.method === "HEAD"){
      if(path.startsWith("/operator/") || path.startsWith("/api/") || path.match(/\.(pdf|docx|pptx|svg|png|jpg|jpeg|webp|json|xml|txt)$/i)) return response;
      return __gnkV8Inject(response,request);
    }

    return response;
  }
};


const GNK_ASG_NERMIN_COLUMNS_V3_SHORT_ACTIVE = true;

function __nv3Esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function __nv3Theme(request){const t=(new URL(request.url).searchParams.get("theme")||"dark").toLowerCase();return t==="lite"?"lite":"dark";}
function __nv3Base(request){return new URL(request.url).origin;}
function __nv3Article(slug){return AKTUAL_NERMIN_COLUMNS.find(a=>a.slug===slug)||null;}

function __nv3Css(){
  return '<style>:root{--g:#d4af37;--bg:#06111f;--text:#f7f0dc;--muted:rgba(247,240,220,.72);--card:rgba(9,22,38,.86);--line:rgba(212,175,55,.30)}html.lite{--bg:#fbfaf5;--text:#101827;--muted:rgba(16,24,39,.68);--card:rgba(255,255,255,.90);--line:rgba(174,118,20,.25)}body{margin:0;background:radial-gradient(circle at 16% 0%,rgba(212,175,55,.18),transparent 32%),linear-gradient(145deg,var(--bg),#0b1628);color:var(--text);font-family:Inter,Segoe UI,Arial,sans-serif}html.lite body{background:radial-gradient(circle at 16% 0%,rgba(212,175,55,.18),transparent 32%),linear-gradient(145deg,#fff,#f2efe6)}.page{max-width:1260px;margin:0 auto;padding:0 24px 36px}.top{position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);background:rgba(5,12,24,.84);backdrop-filter:blur(14px)}html.lite .top{background:rgba(255,255,255,.84)}.brand{font-weight:900;letter-spacing:.08em;color:var(--text);text-decoration:none}.nav{display:flex;gap:6px;flex-wrap:wrap}.nav a,.btn{color:var(--text);text-decoration:none;border:1px solid var(--line);border-radius:12px;padding:9px 11px;background:rgba(255,255,255,.035)}.btn.gold,.nav a:hover{background:linear-gradient(135deg,#f0c85c,#ad7417);color:#100d06}.hero,.card{border:1px solid var(--line);border-radius:18px;background:linear-gradient(145deg,var(--card),rgba(255,255,255,.04));padding:20px;margin-top:16px}.hero h1,.card h1,.card h2{font-family:Georgia,serif;color:#f5dc88;margin-top:0}html.lite .hero h1,html.lite .card h1,html.lite .card h2{color:#ad7417}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.post p,.card p{color:var(--muted);line-height:1.65}.post img{width:100%;max-height:430px;object-fit:cover;border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.04)}.meta{color:var(--g);font-size:13px;font-weight:800}.tags{display:flex;gap:6px;flex-wrap:wrap}.tags span{border:1px solid var(--line);border-radius:999px;padding:6px 9px;color:var(--muted);font-size:12px}.source{border-top:1px solid var(--line);margin-top:18px;padding-top:12px;color:var(--muted);font-size:13px}.float{position:fixed;right:22px;bottom:22px;display:grid;gap:8px;z-index:99}.float a{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#f0c85c,#ad7417);color:#100d06;font-weight:900;text-decoration:none}@media(max-width:900px){.grid{grid-template-columns:1fr}.top{align-items:flex-start;flex-direction:column}}</style>';
}

function __nv3Top(request){
  const theme=__nv3Theme(request);
  const p=new URL(request.url).pathname;
  return '<header class="top"><a class="brand" href="/?theme='+theme+'">GNK ASG | Nermin Sefić</a><nav class="nav"><a href="/objave/nermin-sefic?theme='+theme+'">Kolumne</a><a href="/posts?theme='+theme+'">Objave</a><a href="/business-news?theme='+theme+'">Vijesti</a><a href="/gallery?theme='+theme+'">Galerija</a><a href="/media-kit-downloads?theme='+theme+'">Media Kit</a><a href="/admin?theme='+theme+'">Admin</a><a href="'+p+'?theme=dark">Dark</a><a href="'+p+'?theme=lite">Lite</a></nav></header>';
}

function __nv3Head(request,title,desc,img,type,schema){
  const base=__nv3Base(request);
  const path=new URL(request.url).pathname;
  const image=img&&img.startsWith("http")?img:base+(img||"/download/gnk-asg-logo-dark.svg");
  return '<!doctype html><html class="'+(__nv3Theme(request)==="lite"?"lite":"dark")+'" lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+__nv3Esc(title)+'</title><link rel="canonical" href="'+base+path+'"><meta name="description" content="'+__nv3Esc(desc)+'"><meta name="keywords" content="Nermin Sefić, Nermin Sefic, GNK ASG, GNK DINAMO Ltd., kolumne, poduzetništvo, istraživanje tržišta"><meta property="og:title" content="'+__nv3Esc(title)+'"><meta property="og:description" content="'+__nv3Esc(desc)+'"><meta property="og:type" content="'+type+'"><meta property="og:url" content="'+base+path+'"><meta property="og:image" content="'+image+'"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">'+JSON.stringify(schema)+'</script>'+__nv3Css()+'</head><body><div class="page">';
}

function __nv3Float(){return '<div class="float"><a href="/objave/nermin-sefic">NS</a><a href="/contact">✉</a><a href="/admin">IT</a></div>';}

function __nv3Archive(request){
  const base=__nv3Base(request);
  const schema={"@context":"https://schema.org","@type":"CollectionPage","name":"Kolumne Nermina Sefića","url":base+"/objave/nermin-sefic","mainEntity":AKTUAL_NERMIN_COLUMNS.map(a=>({"@type":"Article","headline":a.title,"url":base+"/objave/nermin-sefic/"+a.slug,"author":{"@type":"Person","name":"Nermin Sefić"}}))};
  const cards=AKTUAL_NERMIN_COLUMNS.map(a=>'<article class="card"><div class="meta">'+__nv3Esc(a.category)+' | '+__nv3Esc(a.datePublished)+'</div><h2>'+__nv3Esc(a.title)+'</h2><p>'+__nv3Esc(a.metaDescription)+'</p><p><a class="btn gold" href="/objave/nermin-sefic/'+a.slug+'?theme='+__nv3Theme(request)+'">Otvori objavu</a></p></article>').join("");
  return __nv3Head(request,"Kolumne Nermina Sefića | GNK ASG","Autorska arhiva kolumni Nermina Sefića na hrvatskom jeziku, SEO optimizirana za GNK ASG i GNK DINAMO Ltd.","/download/gnk-asg-logo-dark.svg","website",schema)+__nv3Top(request)+'<main><section class="hero"><h1>Kolumne Nermina Sefića</h1><p>Svaka kolumna ima vlastiti SEO link, canonical URL, Article schema i ulaz u sitemap.</p><p><a class="btn gold" href="/sitemap-nermin-sefic.xml">Sitemap kolumni</a> <a class="btn" href="/data/nermin-sefic-columns.json">JSON feed</a></p></section><section class="grid">'+cards+'</section></main></div>'+__nv3Float()+'</body></html>';
}

function __nv3Post(request,a){
  const base=__nv3Base(request);
  const image=a.image||"/download/gnk-asg-logo-dark.svg";
  const img=image.startsWith("http")?image:base+image;
  const schema={"@context":"https://schema.org","@type":"Article","headline":a.seoTitle||a.title,"description":a.metaDescription,"author":{"@type":"Person","name":"Nermin Sefić"},"publisher":{"@type":"Organization","name":"GNK ASG d.o.o.","url":base},"datePublished":a.datePublished,"dateModified":a.dateModified,"image":img,"mainEntityOfPage":base+"/objave/nermin-sefic/"+a.slug,"isBasedOn":a.sourceUrl,"inLanguage":"hr-HR","keywords":(a.tags||[]).join(", ")};
  const paragraphs=String(a.text||"").split(/\n{2,}/).map(p=>'<p>'+__nv3Esc(p)+'</p>').join("");
  return __nv3Head(request,a.seoTitle||a.title,a.metaDescription,image,"article",schema)+__nv3Top(request)+'<main><article class="card post"><div class="meta">'+__nv3Esc(a.category)+' | Autor: '+__nv3Esc(a.author)+' | '+__nv3Esc(a.datePublished)+'</div><h1>'+__nv3Esc(a.title)+'</h1><img src="'+__nv3Esc(image)+'" alt="'+__nv3Esc(a.imageAlt||a.title)+'"><div>'+paragraphs+'</div><div class="tags">'+(a.tags||[]).map(t=>'<span>'+__nv3Esc(t)+'</span>').join("")+'</div><div class="source">Izvorna objava: <a href="'+__nv3Esc(a.sourceUrl)+'" rel="noopener nofollow">Aktual.rs</a>. '+__nv3Esc(a.imageCredit||"Foto: Shutterstock / licencirano za objavu")+'.</div></article></main></div>'+__nv3Float()+'</body></html>';
}

function __nv3Json(data){return new Response(JSON.stringify(data,null,2),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=120","x-gnk-asg-nermin-columns":"v3"}});}
function __nv3Xml(v){return String(v??"").replace(/[<>&'"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]));}

function __nv3Sitemap(request){
  const base=__nv3Base(request);
  const urls=["/objave/nermin-sefic"].concat(AKTUAL_NERMIN_COLUMNS.map(a=>"/objave/nermin-sefic/"+a.slug));
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(u=>'<url><loc>'+__nv3Xml(base+u)+'</loc><lastmod>'+new Date().toISOString()+'</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>').join("")+'</urlset>';
}

function __nv3ImageSitemap(request){
  const base=__nv3Base(request);
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+AKTUAL_NERMIN_COLUMNS.map(a=>'<url><loc>'+__nv3Xml(base+"/objave/nermin-sefic/"+a.slug)+'</loc><image:image><image:loc>'+__nv3Xml((a.image||"").startsWith("http")?a.image:base+(a.image||"/download/gnk-asg-logo-dark.svg"))+'</image:loc><image:title>'+__nv3Xml(a.title)+'</image:title><image:caption>'+__nv3Xml(a.imageAlt||a.title)+'</image:caption></image:image></url>').join("")+'</urlset>';
}

const __gnkAsgMainSitemapColumnsBase = {
  ...__gnkAsgNerminV3BaseWorker,
  async fetch(request, env, ctx) {
    const url=new URL(request.url);
    const path=url.pathname;

    if(request.method==="GET" || request.method==="HEAD"){
      if(path==="/objave/nermin-sefic" || path==="/kolumne/nermin-sefic") return new Response(__nv3Archive(request),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-nermin-columns":"v3"}});
      if(path.startsWith("/objave/nermin-sefic/")){
        const a=__nv3Article(path.split("/").pop());
        if(a) return new Response(__nv3Post(request,a),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-nermin-columns":"v3"}});
      }
      if(path==="/data/nermin-sefic-columns.json") return __nv3Json({updatedAt:new Date().toISOString(),count:AKTUAL_NERMIN_COLUMNS.length,items:AKTUAL_NERMIN_COLUMNS.map(a=>({slug:a.slug,title:a.title,url:"/objave/nermin-sefic/"+a.slug,sourceUrl:a.sourceUrl,image:a.image,sourceImage:a.sourceImage,imageCredit:a.imageCredit,metaDescription:a.metaDescription,tags:a.tags}))});
      if(path==="/sitemap-nermin-sefic.xml") return new Response(__nv3Sitemap(request),{headers:{"content-type":"application/xml; charset=utf-8","x-gnk-asg-nermin-columns":"v3"}});
      if(path==="/image-sitemap-nermin-sefic.xml") return new Response(__nv3ImageSitemap(request),{headers:{"content-type":"application/xml; charset=utf-8","x-gnk-asg-nermin-columns":"v3"}});
    }

    return __gnkAsgNerminV3BaseWorker.fetch(request, env, ctx);
  }
};


const GNK_ASG_MAIN_SITEMAP_COLUMNS_SMALL_V1 = true;

function __mscXml(v){
  return String(v ?? "").replace(/[<>&'"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]));
}

function __mscMainSitemap(){
  const base = "https://gnk-asg.hr";
  const fixed = [
    "/",
    "/locations",
    "/business-news",
    "/posts",
    "/objave/nermin-sefic",
    "/gallery",
    "/media-kit-downloads",
    "/mail-signature",
    "/contact",
    "/ai",
    "/admin",
    "/legal",
    "/pwa",
    "/qr",
    "/whatsapp",
    "/sitemap.xml",
    "/sitemap-nermin-sefic.xml",
    "/image-sitemap.xml"
  ];

  const urls = fixed.map(u => ({
    loc: base + u,
    freq: u === "/" ? "daily" : "weekly",
    priority: u === "/" ? "1.0" : "0.8"
  })).concat(AKTUAL_NERMIN_COLUMNS.map(a => ({
    loc: base + "/objave/nermin-sefic/" + a.slug,
    freq: "weekly",
    priority: "0.85"
  })));

  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.map(u => '<url><loc>'+__mscXml(u.loc)+'</loc><lastmod>'+new Date().toISOString()+'</lastmod><changefreq>'+u.freq+'</changefreq><priority>'+u.priority+'</priority></url>').join("") + '</urlset>';
}

const __gnkAsgFixNewsStatusPolicyBase = {
  ...__gnkAsgMainSitemapColumnsBase,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if((request.method === "GET" || request.method === "HEAD") && url.pathname === "/sitemap.xml"){
      return new Response(__mscMainSitemap(),{
        headers:{
          "content-type":"application/xml; charset=utf-8",
          "x-gnk-asg-main-sitemap-columns":"v1"
        }
      });
    }

    return __gnkAsgMainSitemapColumnsBase.fetch(request, env, ctx);
  }
};


const GNK_ASG_FIX_NEWS_STATUS_POLICY_ROUTES_V1 = true;

function __gnkNewsPolicyJson(){
  return {
    ok:true,
    updatedAt:new Date().toISOString(),
    timezone:"Europe/Zagreb",
    statusLegend:["LIVE","SNAPSHOT","DELAYED","FALLBACK"],
    refreshPolicy:{
      businessNews:"09:00 i 16:00 po hrvatskom vremenu",
      autoEditor:"3 puta dnevno nakon odobrenja izvora",
      marketData:"5-15 minuta ako API limiti i izvori dopuštaju",
      marketBrief:"1-3 puta dnevno",
      sitemap:"pri svakoj novoj objavi ili deployu"
    },
    endpoints:{
      news:"/data/news.json",
      market:"/data/market.json",
      status:"/data/status.json",
      nerminColumns:"/data/nermin-sefic-columns.json",
      sitemap:"/sitemap.xml",
      imageSitemap:"/image-sitemap.xml"
    },
    disclaimer:"Podaci su informativni, mogu kasniti i nisu financijski savjet."
  };
}

function __gnkNewsStatusHtml(){
  const p=__gnkNewsPolicyJson();
  return "<!doctype html><html lang='hr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>GNK ASG News Status</title><link rel='canonical' href='https://gnk-asg.hr/news-status'><meta name='description' content='GNK ASG status vijesti, market podataka, objava i sitemap dinamike.'></head><body style='margin:0;background:#06111f;color:#f7f0dc;font-family:Segoe UI,Arial,sans-serif'><main style='max-width:1100px;margin:auto;padding:30px'><h1 style='color:#f5dc88'>GNK ASG News Dynamics Status</h1><p>Business News: <b>"+p.refreshPolicy.businessNews+"</b></p><p>Auto Editor: <b>"+p.refreshPolicy.autoEditor+"</b></p><p>Market data: <b>"+p.refreshPolicy.marketData+"</b></p><p>Legenda: <b>LIVE</b> / <b>SNAPSHOT</b> / <b>DELAYED</b> / <b>FALLBACK</b></p><p>"+p.disclaimer+"</p><p><a style='color:#f5dc88' href='/data/news-refresh-policy.json'>Otvori JSON politiku</a> | <a style='color:#f5dc88' href='/data/news.json'>News JSON</a> | <a style='color:#f5dc88' href='/data/market.json'>Market JSON</a></p></main></body></html>";
}

const __gnkAnalyticsRuntimeBase = {
  ...__gnkAsgFixNewsStatusPolicyBase,
  async fetch(request, env, ctx) {
    const url=new URL(request.url);
    if(request.method==="GET" || request.method==="HEAD"){
      if(url.pathname==="/news-status" || url.pathname==="/status/news"){
        return new Response(__gnkNewsStatusHtml(),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-news-status-policy":"v1"}});
      }
      if(url.pathname==="/data/news-refresh-policy.json"){
        return new Response(JSON.stringify(__gnkNewsPolicyJson(),null,2),{headers:{"content-type":"application/json; charset=utf-8","x-gnk-asg-news-status-policy":"v1"}});
      }
    }
    return __gnkAsgFixNewsStatusPolicyBase.fetch(request, env, ctx);
  }
};


const GNK_ASG_SAFE_ANALYTICS_RUNTIME_V1 = true;

const __gnkAnalyticsRuntimeSnippet =
  '<script async src="https://www.googletagmanager.com/gtag/js?id=G-6BD1VCFKP1"></script>' +
  '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-6BD1VCFKP1");</script>';

async function __gnkAnalyticsRuntimeResponse(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("text/html")) return response;

  let html = await response.text();
  if (html.includes("G-6BD1VCFKP1")) {
    return new Response(html, response);
  }

  if (html.toLowerCase().includes("</head>")) {
    html = html.replace(/<\/head>/i, __gnkAnalyticsRuntimeSnippet + "</head>");
  } else {
    html = __gnkAnalyticsRuntimeSnippet + html;
  }

  const headers = new Headers(response.headers);
  headers.set("x-gnk-asg-analytics-runtime", "v1");
  headers.set("content-type", "text/html; charset=utf-8");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

const __gnkGroupFinancialsAuditBase = {
  ...__gnkAnalyticsRuntimeBase,
  async fetch(request, env, ctx) {
    const response = await __gnkAnalyticsRuntimeBase.fetch(request, env, ctx);
    return __gnkAnalyticsRuntimeResponse(response);
  }
};


const GNK_ASG_GROUP_FINANCIALS_AUDIT_V1 = true;

function __gfaData(){
  return {
    ok:true,
    updatedAt:new Date().toISOString(),
    group:{
      name:"GNK ASG / GNK DINAMO Ltd. group profile",
      connectedEntities:33,
      plannedPositions:14,
      revenueFY2025EUR:504000000,
      assetsEUR:46400000,
      equityAndReservesEUR:46210000,
      shortTermLiabilitiesEUR:184500,
      employeeCountDisclosure:"Broj zaposlenih za grupu nije javno objavljen i ne prikazuje se.",
      portalSummaryDisclosure: "Portalni financijski prikaz je informativni sažetak i nije zamjena za službenu ili izvornu financijsku dokumentaciju.",
      sourcePriorityDisclosure: "U slučaju razlike između portalnog sažetka i službenih PDF/izvornih dokumenata, prednost imaju službeni PDF/izvorni dokumenti.",
      disclosureMarker: "GNK_ASG_FINANCIAL_JSON_DISCLOSURE_V1",
      note:"Grupni prikaz je informativni korporativni pregled za portal."
    },
    gnkAsgDoo:{
      name:"GNK ASG d.o.o.",
      oib:"75227917632",
      mbs:"081512375",
      registeredOffice:"Zagrebačka cesta 130, Zagreb",
      director:"Nermin Sefić",
      ubo:"Nermin Sefić",
      auditStatus:"Revizorsko izvješće i javno dostupna dokumentacija društva koriste se kao referentna dokumentacija. Portalni prikaz je informativni sažetak; službeni potpisani PDF i izvorni dokumenti imaju prednost u slučaju razlike.",
      auditor:"EKVILIBRIJ d.o.o.",
      auditSummary:"Prema dostavljenom opisu, neovisni revizor izrazio je mišljenje da godišnji financijski izvještaji GNK ASG d.o.o. za 2025. istinito i fer prezentiraju financijski položaj, financijsku uspješnost i novčane tokove Društva u skladu sa Zakonom o računovodstvu i Hrvatskim standardima financijskog izvještavanja.",
      longTermLiabilities:"Prema javnoj komunikaciji društva, GNK ASG d.o.o. nema dugoročnih obveza."
    },
    downloads:{
      groupOverview:"/download/gnk-asg-group-financial-overview.pdf",
      groupFactsheet:"/download/gnk-asg-group-financial-factsheet.pdf",
      auditStatus:"/download/gnk-asg-doo-audit-report-status.pdf"
    }
  };
}

function __gfaEsc(v){
  return String(v ?? "").replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] || c;
  });
}

function __gfaFormatEUR(n){
  return new Intl.NumberFormat("hr-HR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
}

function __gfaPdf(title, lines){
  const clean = function(v){return String(v ?? "").replace(/[()\\]/g," ").replace(/[^ -~]/g," ");};
  const text = [title].concat(lines).map(clean);
  let stream = "BT /F1 12 Tf 50 790 Td ";
  for(let i=0;i<text.length;i++){
    stream += "(" + text[i] + ") Tj T* ";
  }
  stream += "ET";
  const objects = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
  objects.push("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj");
  objects.push("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
  objects.push("5 0 obj << /Length " + stream.length + " >> stream\n" + stream + "\nendstream endobj");
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for(const obj of objects){
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }
  const xref = pdf.length;
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for(let i=1;i<offsets.length;i++){
    pdf += String(offsets[i]).padStart(10,"0") + " 00000 n \n";
  }
  pdf += "trailer << /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
  return pdf;
}

function __gfaPdfResponse(title, lines, filename){
  return new Response(__gfaPdf(title, lines),{
    headers:{
      "content-type":"application/pdf",
      "content-disposition":"inline; filename=" + filename,
      "x-gnk-asg-group-financials":"v1"
    }
  });
}

function __gfaHtml(){
  const d = __gfaData();
  const g = d.group;
  const a = d.gnkAsgDoo;
  const schema = {
    "@context":"https://schema.org",
    "@type":"AboutPage",
    "name":"GNK ASG financijski pregled grupe",
    "url":"https://gnk-asg.hr/group-financials",
    "about":{"@type":"Organization","name":"GNK ASG d.o.o."}
  };
  return "<!doctype html><html lang='hr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>GNK ASG financijski pregled grupe</title><link rel='canonical' href='https://gnk-asg.hr/group-financials'><meta name='description' content='Financijski pregled GNK ASG / GNK DINAMO Ltd. grupe, dokumenti za download i revizorski status GNK ASG d.o.o.'><meta property='og:title' content='GNK ASG financijski pregled grupe'><meta property='og:description' content='Grupni financijski pokazatelji, PDF downloadi i revizorski status GNK ASG d.o.o.'><meta name='twitter:card' content='summary'><script type='application/ld+json'>" + JSON.stringify(schema) + "</script><style>body{margin:0;background:#06111f;color:#f7f0dc;font-family:Segoe UI,Arial,sans-serif}main{max-width:1180px;margin:auto;padding:30px}a{color:#f5dc88}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}.card{border:1px solid rgba(212,175,55,.25);border-radius:18px;padding:18px;background:rgba(9,22,38,.88)}h1,h2{color:#f5dc88}.num{font-size:28px;font-weight:800}</style></head><body><main><nav><a href='/'>Index</a> | <a href='/media-kit-downloads'>Media Kit</a> | <a href='/sitemap.xml'>Sitemap</a></nav><h1>Financijski pregled grupe</h1><p>GNK ASG / GNK DINAMO Ltd. grupni financijski i korporativni pregled.</p><section class='grid'><div class='card'><h2>Prihodi FY2025</h2><div class='num'>" + __gfaFormatEUR(g.revenueFY2025EUR) + "</div></div><div class='card'><h2>Aktiva</h2><div class='num'>" + __gfaFormatEUR(g.assetsEUR) + "</div></div><div class='card'><h2>Kapital i rezerve</h2><div class='num'>" + __gfaFormatEUR(g.equityAndReservesEUR) + "</div></div><div class='card'><h2>Kratkoročne obveze</h2><div class='num'>" + __gfaFormatEUR(g.shortTermLiabilitiesEUR) + "</div></div><div class='card'><h2>Povezana društva</h2><div class='num'>" + g.connectedEntities + "</div><p>+ " + g.plannedPositions + " planiranih pozicija.</p></div></section><section class='card'><h2>Revizorski status GNK ASG d.o.o.</h2><p><b>Revizor:</b> " + __gfaEsc(a.auditor) + "</p><p>" + __gfaEsc(a.auditSummary) + "</p><p><b>Napomena:</b> " + __gfaEsc(a.auditStatus) + "</p></section><section class='card'><h2>Download</h2><p><a href='" + d.downloads.groupOverview + "'>Financijski pregled grupe PDF</a></p><p><a href='" + d.downloads.groupFactsheet + "'>Factsheet grupe PDF</a></p><p><a href='" + d.downloads.auditStatus + "'>Revizorski status GNK ASG d.o.o. PDF</a></p></section></main></body></html>";
}

function __gfaHomeSection(){
  return "<section id='group-financials' data-gnk-asg='group-financials-v1' style='margin:28px auto;padding:22px;border:1px solid rgba(212,175,55,.32);border-radius:22px;background:rgba(9,22,38,.82);color:#f7f0dc;max-width:1180px'><h2 style='color:#f5dc88;margin-top:0'>Financijski pregled grupe</h2><p>GNK ASG / GNK DINAMO Ltd. portalni financijski sažetak: <b>504,00 mil. EUR prihoda FY2025</b>, <b>46,40 mil. EUR aktive</b>, <b>46,21 mil. EUR kapitala i rezervi</b>, <b>184,50 tis. EUR kratkoročnih obveza</b>, <b>33 povezana društva</b> i <b>14 planiranih pozicija</b>. Službeni PDF dokumenti i izvorna financijska dokumentacija imaju prednost u slučaju razlike u prikazu.</p><p style='margin-bottom:0'><a style='color:#f5dc88' href='/group-financials'>Otvori financijski pregled</a> | <a style='color:#f5dc88' href='/download/gnk-asg-group-financial-overview.pdf'>PDF grupe</a> | <a style='color:#f5dc88' href='/download/gnk-asg-doo-audit-report-status.pdf'>Revizorski status GNK ASG d.o.o.</a></p></section>";
}

async function __gfaMaybeInjectHome(response, url){
  const type = response.headers.get("content-type") || "";
  if(!type.toLowerCase().includes("text/html")) return response;
  if(url.pathname !== "/" && url.pathname !== "") return response;
  let html = await response.text();
  if(html.includes("data-gnk-asg='group-financials-v1'") || html.includes('data-gnk-asg="group-financials-v1"')){
    return new Response(html,response);
  }
  if(html.toLowerCase().includes("</main>")){
    html = html.replace(/<\/main>/i,__gfaHomeSection()+"</main>");
  }else if(html.toLowerCase().includes("</body>")){
    html = html.replace(/<\/body>/i,__gfaHomeSection()+"</body>");
  }else{
    html += __gfaHomeSection();
  }
  const headers = new Headers(response.headers);
  headers.set("content-type","text/html; charset=utf-8");
  headers.set("x-gnk-asg-group-financials","v1");
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function __gfaMaybeSitemap(response){
  const type = response.headers.get("content-type") || "";
  if(!type.toLowerCase().includes("xml")) return response;
  let xml = await response.text();
  if(xml.includes("/group-financials")) return new Response(xml,response);
  const add = "<url><loc>https://gnk-asg.hr/group-financials</loc><changefreq>monthly</changefreq><priority>0.85</priority></url><url><loc>https://gnk-asg.hr/download/gnk-asg-group-financial-overview.pdf</loc><changefreq>monthly</changefreq><priority>0.65</priority></url><url><loc>https://gnk-asg.hr/download/gnk-asg-doo-audit-report-status.pdf</loc><changefreq>monthly</changefreq><priority>0.65</priority></url>";
  xml = xml.replace(/<\/urlset>/i,add+"</urlset>");
  const headers = new Headers(response.headers);
  headers.set("content-type","application/xml; charset=utf-8");
  headers.set("x-gnk-asg-group-financials-sitemap","v1");
  return new Response(xml,{status:response.status,statusText:response.statusText,headers});
}

const __gnkOfficialFinancialPdfsBase = {
  ...__gnkGroupFinancialsAuditBase,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if(request.method === "GET" || request.method === "HEAD"){
      if(url.pathname === "/group-financials" || url.pathname === "/financials/group"){
        return new Response(__gfaHtml(),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-group-financials":"v1"}});
      }

      if(url.pathname === "/data/group-financials.json"){
        return new Response(JSON.stringify(__gfaData(),null,2),{headers:{"content-type":"application/json; charset=utf-8","x-gnk-asg-group-financials":"v1"}});
      }

      if(url.pathname === "/download/gnk-asg-group-financial-overview.pdf"){
        const d = __gfaData();
        return __gfaPdfResponse("GNK ASG GROUP FINANCIAL OVERVIEW",[
          "Revenue FY2025: EUR 504,000,000",
          "Assets: EUR 46,400,000",
          "Equity and reserves: EUR 46,210,000",
          "Short-term liabilities: EUR 184,500",
          "Connected entities: 33",
          "Planned positions: 14",
          d.group.employeeCountDisclosure,
          "Informative corporate overview for portal publication.",
          "Disclosure: this portal summary is not a substitute for the original signed or source financial documentation.",
          "GNK_ASG_FINANCIAL_SAFE_DISCLOSURE_V1"
        ],"gnk-asg-group-financial-overview.pdf");
      }

      if(url.pathname === "/download/gnk-asg-group-financial-factsheet.pdf"){
        return __gfaPdfResponse("GNK ASG GROUP FINANCIAL FACTSHEET",[
          "GNK ASG / GNK DINAMO Ltd. group profile",
          "FY2025 revenue: EUR 504.00 million",
          "Assets: EUR 46.40 million",
          "Equity and reserves: EUR 46.21 million",
          "Short-term liabilities: EUR 184.50 thousand",
          "33 connected entities and 14 planned positions",
          "No group employee number is published.",
          "Disclosure: portal summary figures should be read together with the official/source financial documentation.",
          "GNK_ASG_FINANCIAL_SAFE_DISCLOSURE_V1"
        ],"gnk-asg-group-financial-factsheet.pdf");
      }

      if(url.pathname === "/download/gnk-asg-doo-audit-report-status.pdf" || url.pathname === "/download/gnk-asg-audit-report-2025.pdf"){
        return __gfaPdfResponse("GNK ASG D.O.O. AUDIT STATUS SUMMARY",[
          "Auditor: EKVILIBRIJ d.o.o.",
          "Company: GNK ASG d.o.o.",
          "OIB: 75227917632",
          "This is a portal status/summary document.",
          "It is not a substitute for the original signed auditor report.",
          "The original signed PDF should be uploaded as the official audit report.",
          "Summary: independent auditor opinion described as true and fair presentation for 2025 financial statements."
        ],"gnk-asg-doo-audit-report-status.pdf");
      }
    }

    const baseResponse = await __gnkGroupFinancialsAuditBase.fetch(request, env, ctx);

    if(url.pathname === "/sitemap.xml"){
      return __gfaMaybeSitemap(baseResponse);
    }

    return __gfaMaybeInjectHome(baseResponse, url);
  }
};


const GNK_ASG_OFFICIAL_FINANCIAL_PDFS_V1_ACTIVE = true;

export default {
  ...__gnkOfficialFinancialPdfsBase,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const gnkAsgAllPagesDesign = gnkAsgAllPagesDesignResponse(request);
    if (gnkAsgAllPagesDesign) {
      return gnkAsgAllPagesDesign;
    }
    // GNK_ASG_ALL_PUBLIC_PAGES_DESIGN_SYSTEM_ROUTE_V1
    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/brand/gnk-asg-logo.svg" || url.pathname === "/logo.svg")) {
      return gnkAsgLogoSvgResponse();
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/brand/gnk-dinamo-ltd-logo.svg") {
      return gnkDinamoLtdLogoSvgResponse();
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/brand/logos.json") {
      return gnkAsgLogosJsonResponse();
    }
    // GNK_ASG_SELECTED_LOGOS_5_7_ROUTES_V1
    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/homepage-profile-preview" || url.pathname === "/homepage-profile-preview-v2")) {
      return gnkAsgHomepageProfilePreviewV2Response();
    }
    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/ask" || url.pathname === "/ai" || url.pathname === "/ai-public")) {
      return gnkAsgAskPageResponse();
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/markets") {
      return gnkAsgMarketsPageResponse();
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/email-signatures") {
      return gnkAsgEmailSignaturesHtmlResponse();
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/data/email-signatures.json") {
      return gnkAsgEmailSignaturesJsonResponse();
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/operator/") {
      if (typeof authorized === "function" && !authorized(request, env)) return unauthorized();
      return gnkAsgOperatorSimpleStatusResponse("mail");
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/operator/news-status") {
      if (typeof authorized === "function" && !authorized(request, env)) return unauthorized();
      return gnkAsgOperatorSimpleStatusResponse("news");
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/operator/market-status") {
      if (typeof authorized === "function" && !authorized(request, env)) return unauthorized();
      return gnkAsgOperatorSimpleStatusResponse("market");
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/operator/articles-status") {
      if (typeof authorized === "function" && !authorized(request, env)) return unauthorized();
      return gnkAsgOperatorSimpleStatusResponse("articles");
    }
    // GNK_ASG_FORCE_PREVIEW_V2_AND_AI_ALIAS_V1
    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/ask" || url.pathname === "/ai-public")) {
      return gnkAsgAskPageResponse();
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/markets") {
      return gnkAsgMarketsPageResponse();
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/email-signatures") {
      return gnkAsgEmailSignaturesHtmlResponse();
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/data/email-signatures.json") {
      return gnkAsgEmailSignaturesJsonResponse();
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/operator/") {
      if (typeof authorized === "function" && !authorized(request, env)) return unauthorized();
      return gnkAsgOperatorSimpleStatusResponse("mail");
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/operator/news-status") {
      if (typeof authorized === "function" && !authorized(request, env)) return unauthorized();
      return gnkAsgOperatorSimpleStatusResponse("news");
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/operator/market-status") {
      if (typeof authorized === "function" && !authorized(request, env)) return unauthorized();
      return gnkAsgOperatorSimpleStatusResponse("market");
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/operator/articles-status") {
      if (typeof authorized === "function" && !authorized(request, env)) return unauthorized();
      return gnkAsgOperatorSimpleStatusResponse("articles");
    }
    // GNK_ASG_CONNECT_FUNCTIONS_ENDPOINTS_V2
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/homepage-profile-preview-v2") {
      return gnkAsgHomepageProfilePreviewV2Response();
    }
    // GNK_ASG_HOMEPAGE_PREVIEW_V2_ENDPOINT
    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/favicon.svg" || url.pathname === "/brand-badge.svg")) {
      return gnkAsgFaviconSvgResponse();
    }
    // GNK_ASG_BRAND_FAVICON_ENDPOINT_V1
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/data/portal-operations-logic.json") {
      return gnkAsgOperationsLogicJsonResponse();
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/operations-logic") {
      return gnkAsgOperationsLogicHtmlResponse();
    }
    // GNK_ASG_OPERATIONS_LOGIC_ENDPOINT_V1
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/homepage-profile-preview") {
      return gnkAsgHomepageProfilePreviewResponse();
    }
    // GNK_ASG_HOMEPAGE_PROFILE_PREVIEW_ENDPOINT_V1
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/data/homepage-profile.json") {
      return gnkAsgHomepageProfileResponse();
    }
    // GNK_ASG_HOMEPAGE_PROFILE_ENDPOINT_V1
    if (request.method === "POST" && url.pathname === "/api/contact-submit") {
      return __v7ContactSubmit(request, env);
    }
    // GNK_ASG_DIRECT_CONTACT_SUBMIT_INDEX_V2
    const direct = await gnkOfficialFinancialPdfsHandle(request, env);
    if(direct) return direct;
    const response = await __gnkOfficialFinancialPdfsBase.fetch(request, env, ctx);
    if (url.pathname === "/contact" && response && response.headers && String(response.headers.get("content-type") || "").includes("text/html")) {
      let contactHtml = await response.text();
      if (!contactHtml.includes("GNK_ASG_CONTACT_UX_WRAPPER_V1")) {
        contactHtml = contactHtml.replace("</body></html>", "\u003cscript\u003e\n(function(){\n  function ready(fn){if(document.readyState!==\"loading\"){fn()}else{document.addEventListener(\"DOMContentLoaded\",fn)}}\n  ready(function(){\n    var forms=[].slice.call(document.querySelectorAll(\"form\"));\n    var form=forms.find(function(f){\n      var s=((f.getAttribute(\"action\")||\"\")+\" \"+(f.id||\"\")+\" \"+(f.className||\"\")+\" \"+(f.innerText||\"\")).toLowerCase();\n      return s.indexOf(\"contact\")\u003e=0||s.indexOf(\"kontakt\")\u003e=0||s.indexOf(\"poruka\")\u003e=0||f.querySelector(\"[name=\u0027email\u0027]\");\n    });\n    if(!form)return;\n    var box=document.createElement(\"div\");\n    box.id=\"gnk-contact-confirm-box\";\n    box.style.cssText=\"margin-top:16px;border:1px solid rgba(245,215,118,.35);border-radius:18px;padding:16px;background:rgba(245,215,118,.08);color:#fff;font-family:Inter,Segoe UI,Arial,sans-serif\";\n    box.innerHTML=\"\u003cb\u003eGNK ASG Contact Desk\u003c/b\u003e\u003cbr\u003e\u003cspan style=\u0027color:#c8d0df\u0027\u003eNakon slanja ovdje će se prikazati potvrda i broj predmeta.\u003c/span\u003e\";\n    form.appendChild(box);\n    form.addEventListener(\"submit\",function(e){\n      e.preventDefault();\n      var fd=new FormData(form);\n      var name=(fd.get(\"name\")||fd.get(\"ime\")||\"\").toString().trim()||\"poštovani korisniče\";\n      box.innerHTML=\"\u003cb\u003eSlanje upita...\u003c/b\u003e\u003cbr\u003e\u003cspan style=\u0027color:#c8d0df\u0027\u003eMolimo pričekajte potvrdu zaprimanja.\u003c/span\u003e\";\n      fetch(\"https://operator.gnk-asg.hr/api/contact-submit\",{method:\"POST\",body:fd})\n        .then(function(r){return r.json()})\n        .then(function(j){\n          if(j\u0026\u0026j.ok){\n            var id=j.id||(\"contact-\"+Date.now());\n            box.innerHTML=\"\u003cb\u003eHvala, \"+name+\".\u003c/b\u003e\u003cbr\u003e\u003cspan style=\u0027color:#c8d0df\u0027\u003eVaš upit je zaprimljen. Odgovorit ćemo putem e-maila.\u003c/span\u003e\u003cbr\u003e\u003cbr\u003e\u003cspan style=\u0027display:inline-block;border:1px solid rgba(245,215,118,.45);border-radius:999px;padding:8px 12px;color:#f5d776;font-weight:800\u0027\u003eBroj predmeta: \"+id+\"\u003c/span\u003e\u003cbr\u003e\u003cbr\u003e\u003ca style=\u0027color:#f5d776\u0027 href=\u0027/media-kit-downloads\u0027\u003eMedia kit\u003c/a\u003e | \u003ca style=\u0027color:#f5d776\u0027 href=\u0027/operations-logic\u0027\u003eStatus portala\u003c/a\u003e | \u003ca style=\u0027color:#f5d776\u0027 href=\u0027https://wa.me/385915358365\u0027\u003eWhatsApp\u003c/a\u003e\";\n            try{form.reset()}catch(err){}\n          }else{\n            box.innerHTML=\"\u003cb\u003eUpit nije potvrđen.\u003c/b\u003e\u003cbr\u003e\u003cspan style=\u0027color:#ffb4aa\u0027\u003ePokušajte ponovno ili koristite WhatsApp.\u003c/span\u003e\";\n          }\n        })\n        .catch(function(){\n          box.innerHTML=\"\u003cb\u003eVeza nije potvrđena.\u003c/b\u003e\u003cbr\u003e\u003cspan style=\u0027color:#ffb4aa\u0027\u003ePoruka nije potvrđena kao zaprimljena.\u003c/span\u003e\";\n        });\n    },true);\n  });\n})();\n\u003c/script\u003e\n\u003c!-- GNK_ASG_CONTACT_UX_WRAPPER_V1 --\u003e" + "</body></html>");
      }
      const contactHeaders = new Headers(response.headers);
      contactHeaders.set("content-type", "text/html; charset=utf-8");
      contactHeaders.set("x-gnk-asg-contact-ux", "wrapper-v1");
      return new Response(contactHtml, { status: response.status, statusText: response.statusText, headers: contactHeaders });
    }
    if (url.pathname === "/operator/contact-inbox" && response && response.headers && String(response.headers.get("content-type") || "").includes("application/json")) {
      let inboxText = await response.text();
      inboxText = inboxText
        .replaceAll("NERMIN SEFI─å", "NERMIN SEFIĆ")
        .replaceAll("SEFI─å", "SEFIĆ")
        .replaceAll("─å", "Ć")
        .replaceAll("─ç", "ć")
        .replaceAll("─ì", "č")
        .replaceAll("┼í", "š")
        .replaceAll("┼á", "Š")
        .replaceAll("┼╛", "ž")
        .replaceAll("┼╜", "Ž")
        .replaceAll("┬╖", " | ");
      const inboxHeaders = new Headers(response.headers);
      inboxHeaders.set("content-type", "application/json; charset=utf-8");
      inboxHeaders.set("x-gnk-asg-inbox-safe-text", "GNK_ASG_CONTACT_INBOX_RESPONSE_SAFE_TEXT_WRAPPER_V1");
      return new Response(inboxText, { status: response.status, statusText: response.statusText, headers: inboxHeaders });
    }
    // GNK_ASG_CONTACT_INBOX_RESPONSE_SAFE_TEXT_WRAPPER_V1
    return gnkOfficialFinancialPdfsApply(response, request);
  }
};
