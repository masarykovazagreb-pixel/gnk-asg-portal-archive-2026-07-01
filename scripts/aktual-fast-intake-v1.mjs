// AKTUAL MEDIA FAST PUBLISH v1 — GitHub Actions form -> guarded existing publisher.
// No external credentials, API keys or rights to third-party media are inferred.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root=process.cwd();
const env=process.env;
function fail(message){throw new Error("FAST PUBLISH: "+message)}
const esc=x=>String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
function readJSON(p){return JSON.parse(fs.readFileSync(path.join(root,p),"utf8"))}
function write(p,data){const target=path.join(root,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data)}
function validUrl(input){
  let u;try{u=new URL(String(input).trim())}catch{fail("Neispravan izvor: "+input)}
  if(u.protocol!=="https:"||!u.hostname.includes(".")||u.username||u.password)fail("Izvor mora biti javni HTTPS URL.");
  if(/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u.hostname))fail("Privatni izvor nije dozvoljen.");
  return u.toString();
}
export function prepareFastPublication(input, options={}){
  const base=options.root||root;
  const now=options.now||new Date();
  const headline=String(input.FAST_TITLE||"").trim().replace(/\s+/g," ");
  const slug=String(input.FAST_SLUG||"").trim().toLowerCase();
  const article=String(input.FAST_BODY||"").replace(/\r\n?/g,"\n").trim();
  if(!headline||headline.length<18||headline.length>145)fail("Naslov mora imati 18-145 znakova.");
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>95)fail("Slug: samo mala slova, brojevi i crtice.");
  const words=article.split(/\s+/).filter(Boolean);
  if(words.length<90||words.length>4500)fail("Tekst mora sadržavati 90-4500 riječi. Ne dodaj prazno punjenje.");
  if(input.FAST_APPROVAL!=="OBJAVI"||input.FAST_FACTS_VERIFIED!=="true"||input.FAST_ORIGINALITY_VERIFIED!=="true"){
    fail("Za javnu objavu potrebna je jedna potvrda urednika o činjenicama i originalnosti (OBJAVI).");
  }
  const rawSources=String(input.FAST_SOURCES||"").split(/[\r\n;]+/).map(s=>s.trim()).filter(Boolean);
  const sources=[...new Set(rawSources.map(validUrl))];
  if(sources.length<2||sources.length>10||new Set(sources.map(s=>new URL(s).hostname.replace(/^www\./,""))).size<2){
    fail("Za vijest su nužne najmanje dvije različite HTTPS domene izvora (najviše deset URL-ova).");
  }
  const qp=path.join(base,"content/factory-queue/queue.json");
  const queue=JSON.parse(fs.readFileSync(qp,"utf8"));
  const htmlPath="content/factory-queue/objave/"+slug+".html";
  const publicPath="apps/portal/objave/"+slug+"/index.html";
  if(queue.items.some(i=>i.slug===slug)||fs.existsSync(path.join(base,htmlPath))||fs.existsSync(path.join(base,publicPath))){
    fail("Ovaj slug već postoji; nema prepisivanja objavljenog sadržaja.");
  }
  const site="https://gnk-asg.hr";
  const url=site+"/objave/"+slug+"/";
  let image="/assets/editorial/aktual-fast-"+slug+".svg";
  let mediaNote="Originalna ilustracija AKTUAL MEDIA";
  const supplied=String(input.FAST_IMAGE_PATH||"").trim();
  if(supplied){
    if(!/^\/assets\/[a-zA-Z0-9/_-]+\.(?:webp|avif|png|jpg|jpeg|svg)$/.test(supplied))fail("Fotografija mora biti postojeća lokalna datoteka /assets/...");
    if(!fs.existsSync(path.join(base,"apps/portal"+supplied)))fail("Fotografija nije prenesena u javne assets.");
    const license=String(input.FAST_IMAGE_LICENSE||"").trim();
    if(!["owned","licensed","cc-by","public-domain"].includes(license))fail("Za preuzetu fotografiju navedite pravnu osnovu/licencu.");
    const credit=String(input.FAST_IMAGE_CREDIT||"").trim();
    if(license!=="owned"&&!credit)fail("Za tuđu fotografiju obavezan je fotograf/izvor.");
    if(["cc-by","licensed"].includes(license)&&!String(input.FAST_IMAGE_LICENSE_URL||"").trim())fail("Obavezna je poveznica na dozvolu/licencu.");
    if(input.FAST_IMAGE_LICENSE_URL)validUrl(input.FAST_IMAGE_LICENSE_URL);
    image=supplied;
    mediaNote="Fotografija: "+(credit||"vlastita redakcijska arhiva")+"; prava: "+license;
  }
  const zgDate=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Zagreb",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
  const zgTime=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Zagreb",hour:"2-digit",minute:"2-digit",hour12:false}).format(now);
  const iso=now.toISOString();
  const summary=article.replace(/\s+/g," ").slice(0,155).replace(/\s+\S*$/,"");
  const paragraphs=article.split(/\n\s*\n/).map(p=>"<p>"+esc(p.replace(/\s*\n\s*/g," "))+"</p>").join("\n");
  const sourcesHtml=sources.map((s,i)=>'<li><a href="'+esc(s)+'" rel="noopener noreferrer" target="_blank">Izvor '+(i+1)+": "+esc(new URL(s).hostname)+"</a></li>").join("\n");
  const ld={"@context":"https://schema.org","@type":"NewsArticle",headline,description:summary,inLanguage:"hr",mainEntityOfPage:url,url,datePublished:iso,dateModified:iso,image:[site+image],author:{"@type":"Organization",name:"Redakcija AKTUAL MEDIA"},publisher:{"@type":"Organization",name:"AKTUAL MEDIA",url:site+"/gnk-aktual/"},citation:sources};
  const html='<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    "<title>"+esc(headline)+" | AKTUAL MEDIA</title>"+
    '<meta name="description" content="'+esc(summary)+'"><meta name="robots" content="index,follow,max-image-preview:large">'+
    '<meta name="author" content="Redakcija AKTUAL MEDIA"><link rel="canonical" href="'+url+'">'+
    '<meta property="og:type" content="article"><meta property="og:title" content="'+esc(headline)+'">'+
    '<meta property="og:description" content="'+esc(summary)+'"><meta property="og:url" content="'+url+'">'+
    '<meta property="og:image" content="'+site+image+'"><meta name="twitter:card" content="summary_large_image">'+
    '<meta property="article:published_time" content="'+iso+'">'+
    '<script type="application/ld+json">'+JSON.stringify(ld).replace(/</g,"\\u003c")+'</script>'+
    '<style>body{margin:0;background:#fff;color:#17243a;font:17px/1.75 system-ui,sans-serif}main{width:min(760px,90vw);margin:4rem auto}header{background:#081932;color:white;padding:1.2rem 5vw}header a{color:#fff}h1{line-height:1.2;font-size:clamp(2rem,4vw,3.2rem)}article p{margin:1.15em 0}a{color:#1355a0}img{max-width:100%;height:auto}figure{margin:1.8rem 0}figcaption,small{color:#5c6570}aside{border-top:1px solid #ddd;margin-top:2.5rem;padding-top:1rem}footer{padding:2rem 5vw;background:#081932;color:white}footer a{color:white}</style>'+
    '</head><body><header><a href="/gnk-aktual/">AKTUAL MEDIA</a> / Vijesti</header><main><article><h1>'+esc(headline)+'</h1>'+
    '<p class="article-meta">Redakcija AKTUAL MEDIA · <time datetime="'+iso+'">'+esc(zgDate)+" "+esc(zgTime)+'</time> · Sadržaj pripremljen uz AI podršku kada je primijenjena</p>'+
    '<figure><img src="'+esc(image)+'" alt="'+esc(headline)+'" loading="eager" decoding="async"><figcaption>'+esc(mediaNote)+'</figcaption></figure>'+
    paragraphs+'</article><aside><h2>Izvori i provjera</h2><ol>'+sourcesHtml+'</ol><p>Izvori služe provjeri navoda; tekst je zasebna redakcijska obrada. Za ispravak se obratite redakciji.</p></aside></main>'+
    '<footer><a href="/gnk-aktual/">Povratak na AKTUAL MEDIA</a></footer></body></html>\n';
  const id="AMF-"+zgDate.replace(/-/g,"")+"-"+crypto.createHash("sha256").update(slug).digest("hex").slice(0,12);
  if(queue.items.some(i=>i.id===id))fail("Kolizija ID.");
  const queueEntry={id,date:zgDate,time:zgTime,category:"objave",slug,title:headline,author:"AKTUAL MEDIA redakcija",sourceUrls:sources,photoRights:mediaNote,editorialApproval:"confirmed-in-dispatch"};
  if(!supplied){
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0b1d39"/><rect x="64" y="75" width="12" height="440" fill="#ddb15b"/><text x="110" y="175" font-family="sans-serif" font-size="55" fill="white" font-weight="700">AKTUAL MEDIA</text><text x="110" y="255" font-family="sans-serif" font-size="30" fill="#e5bd71">ORIGINALNA REDAKCIJSKA ILUSTRACIJA</text><text x="110" y="500" font-family="sans-serif" font-size="25" fill="white">'+esc(headline.slice(0,64))+'</text></svg>';
    const target=path.join(base,"apps/portal"+image);
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,svg);
  }
  const queueFile=path.join(base,htmlPath);
  fs.mkdirSync(path.dirname(queueFile),{recursive:true});fs.writeFileSync(queueFile,html);
  queue.items.push(queueEntry);
  fs.writeFileSync(qp,JSON.stringify(queue,null,2)+"\n");
  return {id,slug,title:headline,sourceCount:sources.length,wordCount:words.length,image,queued:true,publicUrl:url,claim:"QUEUED_NOT_YET_LIVE"};
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){console.log(JSON.stringify(prepareFastPublication(env),null,2))}
