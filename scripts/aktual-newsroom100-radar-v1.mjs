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
const impact=/ukraine|election|crisis|strike|inflation|central bank|eu commission|european union|sanction|security|cyber|flood|earthquake/i;
function normalize(s){return String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()}
function tokens(s){return new Set(normalize(s).split(" ").filter(w=>w.length>=4))}
function similarity(a,b){const x=tokens(a),y=tokens(b);let shared=0;for(const t of x)if(y.has(t))shared++;return shared/Math.max(1,Math.min(x.size,y.size))}
function safeSource(e){
  const raw=String(e.sourceUrl||e.url||"");
  try{const u=new URL(raw);if(u.protocol!=="https:"||!u.hostname.includes("."))return null;
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
    seenLinks.add(src.url);seenTitles.add(norm);
    const pub=new Date(e.publishedAt||e.published_at||"");
    const ageH=Number.isFinite(pub.getTime())?Math.max(0,(now-pub)/3.6e6):10000;
    if(ageH>72)continue;
    const topic=Object.entries(terms).filter(([,regex])=>regex.test(title)).map(([name])=>name);
    const freshness=Math.round(40*Math.max(0,1-ageH/72));
    const base=Math.min(100,20+freshness+(impact.test(title)?22:0)+Math.min(15,topic.length*7));
    candidates.push({headlineFromSource:title,sourceUrl:src.url,sourceName:String(e.source||src.host),domain:src.host,sourceDate:pub.toISOString(),topics:topic.length?topic:["opće"],priorityScore:base,sourceOnly:true,factsIndependentlyChecked:false,imageReuseAllowed:false,articleWritten:false,editorApproved:false,publicationState:"research-brief-only"});
  }
  candidates.sort((a,b)=>b.priorityScore-a.priorityScore || a.headlineFromSource.localeCompare(b.headlineFromSource));
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
  const result=rankCandidates(feed,{limit:100});
  const output=process.argv.includes("--stdout")?null:"ops/aktual-media/newsroom100-candidates.json";
  if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n")}
  console.log(JSON.stringify({target:result.target,sourceBackedAssignments:result.candidateCount,sources:result.coverageSources,publicationState:"NOT_PUBLISHED",output},null,2));
}
