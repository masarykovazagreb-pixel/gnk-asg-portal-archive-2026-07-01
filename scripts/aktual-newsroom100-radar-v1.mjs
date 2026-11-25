// AKTUAL MEDIA — source-linked candidate radar (NOT AI-generated articles).
// Does not reuse publisher article bodies, their photos, or claim independent verification.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const terms={
  politika:/izbor|vlada|parlament|europa|european|president|minister|rat|war|peace|summit|sanction/i,
  gospodarstvo:/econom|trade|invest|market|bank|inflation|rate|inflacij|tržišt|business|profit|earnings|deal|merger/i,
  tehnologija:/artificial intelligence|\bAI\b|chip|cloud|cyber|tech|digital|robot|software|nvidia|data center/i,
  sport:/football|nogomet|champion|league|olympic|tennis|f1|formula|košark|sport|atp|nba/i,
  znanost:/climate|emissions|health|medical|science|vaccine|research|weather|energy|klimats/i,
  kultura:/film|book|music|festival|art|concert|culture|glazb|knjig|kazališt/i,
};
const localImpact=/potres|poplav|požar|nevrijeme|evakuacij|proračun|sabor|vlada|izbor|inflacij|štrajk|promet|sigurnost/i;
const impact=/ukraine|election|crisis|strike|inflation|central bank|eu commission|european union|sanction|security|cyber|flood|earthquake/i;
function normalize(s){return String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()}
const genericWords=new Set(["news","report","briefing","coverage","independent","today","latest","breaking","vijesti","danas","najnovije","izvjesce","izvjestaj"]);
function tokens(s){return new Set(normalize(s).split(" ").filter(w=>w.length>=4&&!genericWords.has(w)))}
function similarity(a,b){const x=tokens(a),y=tokens(b);let shared=0;for(const t of x)if(y.has(t))shared++;return shared/Math.max(1,new Set([...x,...y]).size)}
function safeSource(e){
  const raw=String(e.sourceUrl||e.url||"");
  try{const u=new URL(raw);if(u.protocol!=="https:"||!u.hostname.includes(".")||u.username||u.password||(u.port&&u.port!=="443")||/^(?:\d+\.){3}\d+$/.test(u.hostname)||/\.(?:local|internal|localhost)$/.test(u.hostname))return null;
    u.hash="";for(const key of [...u.searchParams.keys()])if(/^utm_/i.test(key)||/^(?:fbclid|gclid|mc_cid|mc_eid)$/i.test(key))u.searchParams.delete(key);
    u.searchParams.sort();
    return {url:u.toString(),host:u.hostname.replace(/^www\./,"")};
  }catch{return null}
}
export function rankCandidates(items,{now=new Date(),limit=100}={}){
  if(!Array.isArray(items))throw new Error("Feed must be a JSON array");
  const candidates=[],seenLinks=new Set(),seenTitles=new Set();
  for(const e of items){
    if(!e||typeof e.title!=="string")continue;
    const src=safeSource(e);if(!src)continue;
    const title=e.title.trim(),norm=normalize(title);
    if(title.length<24||title.length>190||seenLinks.has(src.url)||seenTitles.has(norm))continue;
    const pub=new Date(e.publishedAt||e.published_at||e.date||"");
    const ageH=Number.isFinite(pub.getTime())?(now-pub)/3.6e6:10000;
    if(ageH>72||ageH<0)continue;
    seenLinks.add(src.url);seenTitles.add(norm);
    const topic=Object.entries(terms).filter(([,regex])=>regex.test(title)).map(([name])=>name);
    const freshness=Math.round(35*Math.max(0,1-ageH/72));
    const local=/(?:^|\.)hr$/.test(src.host)||/^(?:hr|hrvatska|croatia|zagreb)$/i.test(String(e.region||""));
    const publicInterest=impact.test(title)||localImpact.test(title);
    const base=Math.min(100,15+freshness+(publicInterest?22:0)+(local?20:0)+Math.min(8,topic.length*4));
    candidates.push({headlineFromSource:title,sourceUrl:src.url,sourceName:String(e.source||src.host),domain:src.host,sourceDate:pub.toISOString(),topics:topic.length?topic:["opće"],priorityScore:base,localPriorityHint:local,publicInterestHint:publicInterest,sourceOnly:true,factsIndependentlyChecked:false,imageReuseAllowed:false,articleWritten:false,editorApproved:false,publicationState:"research-brief-only"});
  }
  candidates.sort((a,b)=>b.priorityScore-a.priorityScore || b.sourceDate.localeCompare(a.sourceDate) || a.headlineFromSource.localeCompare(b.headlineFromSource));
  const chosen=[],byDomain=new Map();
  for(const c of candidates){
    if(chosen.length>=limit)break;
    if((byDomain.get(c.domain)||0)>=Math.max(4,Math.ceil(limit/8)))continue;
    const similar=chosen.find(o=>similarity(o.headlineFromSource,c.headlineFromSource)>=0.72);
    if(similar)continue;
    byDomain.set(c.domain,(byDomain.get(c.domain)||0)+1);
    chosen.push({...c,rank:chosen.length+1});
  }
  return {version:"AKTUAL_NEWSROOM100_RADAR_V1",generatedAt:now.toISOString(),target:limit,candidateCount:chosen.length,coverageSources:[...byDomain.keys()].length,notPublished:true,notice:"Source-linked research assignments only. No fact-check, photo license or original article is implied.",candidates:chosen};
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  const feed=JSON.parse(fs.readFileSync("apps/portal/data/news.json","utf8"));
  // Add existing Zagreb source leads, not article bodies. Missing/invalid local data fails closed with a visible warning.
  const localPath="apps/region/data/zagreb.json";
  let local=[];
  try{const archive=JSON.parse(fs.readFileSync(localPath,"utf8"));if(!Array.isArray(archive.items))throw Error("missing items");local=archive.items.map(e=>({...e,region:"zagreb"}));}catch(e){console.warn("Zagreb source leads unavailable:",e.message)}
  const result=rankCandidates([...local,...feed],{limit:100});
  if(process.argv.includes("--stdout")){console.log(JSON.stringify(result,null,2));process.exit(0)}
  const output="ops/aktual-media/newsroom100-candidates.json";
  if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n")}
  console.log(JSON.stringify({target:result.target,sourceBackedAssignments:result.candidateCount,sources:result.coverageSources,publicationState:"NOT_PUBLISHED",output},null,2));
}
