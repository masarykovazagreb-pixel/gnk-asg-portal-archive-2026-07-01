/**
 * AKTUAL MEDIA /top-teme/ evidence policy.
 * A partial midnight feed must not replace the last source-verifiable edition.
 * No publishing, network, paid APIs, or repository writes in this module.
 */
import { URL } from 'node:url';
const DAY=/^\d{4}-\d{2}-\d{2}$/;
export const isValidDay = day => {
  if(typeof day!=='string'||!DAY.test(day))return false;
  const date=new Date(day+'T00:00:00.000Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;
};
export const sourceKey = item => {
  const s=String(item?.source??'').trim();
  return s&&s!=='?'?s:null;
};
export const hasHttpsEvidence = item => {
  try{
    const u=new URL(String(item?.srcUrl||item?.url||''));
    return u.protocol==='https:'&&Boolean(u.hostname)&&!u.username&&!u.password;
  }catch{return false;}
};
export function selectEvidenceDay(items,{minHeadlines=40,minSources=6}={}){
  if(!Number.isInteger(minHeadlines)||minHeadlines<2||!Number.isInteger(minSources)||minSources<2)throw Error('Unsafe editorial evidence thresholds');
  const days=new Map();
  for(const item of items){
    const day=String(item?.date??'').slice(0,10);
    if(!isValidDay(day))continue;
    if(!days.has(day))days.set(day,[]);
    days.get(day).push(item);
  }
  const available=[...days.keys()].sort().reverse();
  const inspected=available.map(day=>{
    const rows=days.get(day);
    const sources=new Set(rows.filter(x=>sourceKey(x)&&hasHttpsEvidence(x)).map(sourceKey));
    return {day,headlines:rows.length,verifiableSources:sources.size,qualified:rows.length>=minHeadlines&&sources.size>=minSources};
  });
  return {latestAvailable:available[0]||null,latestQualified:inspected.find(x=>x.qualified)?.day||null,inspected};
}
export function sourceSupportedThemes(themes){
  return themes.filter(theme=>{
    const sources=new Set((theme?.items||[]).filter(x=>sourceKey(x)&&hasHttpsEvidence(x)).map(sourceKey));
    return sources.size>=2;
  });
}
export function retainableEvidence(data){
  return Boolean(data&&isValidDay(data.generatedFor)&&Array.isArray(data.themes)&&data.themes.length>0
    &&data.themes.every(theme=>Array.isArray(theme.quotes)&&theme.quotes.length>=2
      &&new Set(theme.quotes.filter(q=>sourceKey(q)&&hasHttpsEvidence(q)).map(sourceKey)).size>=2));
}
