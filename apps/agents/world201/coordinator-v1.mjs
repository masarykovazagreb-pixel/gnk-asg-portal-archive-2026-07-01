// Deterministic roles for source-linked news. No model, invented articles,
// external network access, approval, publication or personal bylines.
import {safeUrl} from '../../../scripts/lib/aktual-world-feed-http-v1.mjs';
import {diversifyHeadlines} from '../../../scripts/lib/aktual-world-selection-v1.mjs';

export function sourceBot(rows, now, maxAgeHours=72){
 if(!Number.isFinite(now)||!Number.isFinite(maxAgeHours)||maxAgeHours<=0)throw Error('Invalid clock or maximum age');
 if(!Array.isArray(rows))return [];
 return rows.flatMap(row=>{
  if(!row||typeof row.title!=='string'||typeof row.source!=='string')return [];
  const title=row.title.replace(/\s+/g,' ').trim(),source=row.source.replace(/\s+/g,' ').trim();
  const url=safeUrl(row.url),date=Date.parse(row.publishedAt),age=now-date;
  if(!title||!source||!url||!Number.isFinite(date)||age<0||age>maxAgeHours*3600000)return [];
  return [{title:title.slice(0,240),source:source.slice(0,120),url,publishedAt:new Date(date).toISOString()}];
 });
}

export function deskBot(rows, limit=30){
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid limit');
 return diversifyHeadlines(rows,limit);
}

export function countryAgent(country,rows,{now=Date.now(),maxAgeHours=72,limit=30}={}){
 if(!country||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(country.slug||''))throw Error('Invalid country');
 const vetted=sourceBot(rows,now,maxAgeHours),selected=deskBot(vetted,limit);
 return {slug:country.slug,language:country.language,status:selected.length?'candidates-available':'no-eligible-headlines',
  sourceBot:{input:Array.isArray(rows)?rows.length:0,accepted:vetted.length},
  deskBot:{selected:selected.length,distinctSourceLabels:new Set(selected.map(x=>x.source)).size},
  publication:'not-approved',selected};
}

export function masterAgent(registry,cache,{now=Date.now(),slug=null,maxAgeHours=72}={}){
 if(!Array.isArray(registry?.countries)||registry.countries.length!==201||new Set(registry.countries.map(c=>c.slug)).size!==201)throw Error('Expected 201 unique countries');
 if(!Number.isFinite(now))throw Error('Invalid clock');
 if(slug&&!registry.countries.some(c=>c.slug===slug))throw Error('Unknown country');
 const selected=slug?registry.countries.filter(c=>c.slug===slug):registry.countries;
 const countries=selected.map(c=>{
  const stamp=cache?.scopeUpdatedAt?cache.scopeUpdatedAt.countries?.[c.slug]:cache?.updatedAt;
  const time=Date.parse(stamp),age=now-time,valid=Number.isFinite(time)&&age>=0&&age<24*3600000;
  const result=countryAgent(c,valid?cache?.countries?.[c.slug]:[],{now,maxAgeHours});
  result.cacheStatus=!cache?'missing':valid?'fresh':'missing-or-stale';
  result.cacheUpdatedAt=valid?new Date(time).toISOString():null;
  result.briefs=result.selected.slice(0,5).map(row=>({headline:row.title,source:row.source,url:row.url,publishedAt:row.publishedAt,status:'lead-only',checksRequired:['facts','rights','language','editorial review']}));
  delete result.selected;
  return result;
 });
 return {version:'AKTUAL_WORLD_COORDINATOR_V1',scope:slug?'single-country':'201-countries',generatedAt:new Date(now).toISOString(),
  rolesPerCountry:['source-bot','desk-bot','country-agent'],rolesAre:'logical deterministic roles, not 603 independent services or people',
  administrator:'master-agent',noModel:true,automaticFullArticlePublishing:false,sourceHeadlinesAreVerifiedFacts:false,
  summary:{countries:countries.length,withCandidates:countries.filter(c=>c.deskBot.selected>0).length,withoutCandidates:countries.filter(c=>!c.deskBot.selected).length},countries};
}
