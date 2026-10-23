// Regional article URL integrity gate: never overwrite two articles at one path.
// Pure, deterministic, read-only normalization. Does not publish or modify source archives.
import {createHash} from 'node:crypto';

const safeSlug=s=>typeof s==='string'&&s.length<=120&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
const safeUrl=s=>{
  try{
    const u=new URL(s);
    if(u.protocol!=='https:'||u.username||u.password||!u.hostname)return null;
    u.hash='';
    return u.href;
  }catch{return null}
};
const stableSort=(a,b)=>String(b.date||'').localeCompare(String(a.date||''))||
  String(a.slug||'').localeCompare(String(b.slug||''))||
  String(a.url||'').localeCompare(String(b.url||''))||
  String(a.title||'').localeCompare(String(b.title||''));

export function normalizeRegionalArticles(input){
  if(!Array.isArray(input))throw new TypeError('Regional article input must be an array');
  const rows=input.filter(x=>x&&typeof x==='object').sort(stableSort);
  const sourceSeen=new Set(),slugSeen=new Set(),unique=[];
  const stats={input:input.length,accepted:0,invalid:input.length-rows.length,duplicateSources:0,slugCollisionsResolved:0};
  // Retain the newest record for each identical source URL (RSS updates are common).
  for(const row of rows){
    const source=safeUrl(row.url);
    if(!safeSlug(row.slug)||!source||typeof row.title!=='string'||!row.title.trim()){
      stats.invalid++;continue;
    }
    if(sourceSeen.has(source)){stats.duplicateSources++;continue}
    sourceSeen.add(source);
    unique.push({row,source});
  }
  // Allocate the original slug to the oldest article: later collisions must not
  // steal an established canonical URL from the older archived story.
  const allocation=[...unique].sort((a,b)=>
    String(a.row.date||'').localeCompare(String(b.row.date||'')) || String(a.row.slug).localeCompare(String(b.row.slug)) || a.source.localeCompare(b.source));
  const assigned=new Map();
  for(const {row,source} of allocation){
    let slug=row.slug;
    if(slugSeen.has(slug)){
      const digest=createHash('sha256').update(source).digest('hex').slice(0,12);
      const prefix=slug.slice(0,107).replace(/-+$/,'');
      slug=prefix+'-'+digest;
      if(!safeSlug(slug)||slugSeen.has(slug)){
        // Hash/path collision is a hard error, never silently overwrite an article.
        throw new Error('Unresolvable regional article slug collision: '+slug);
      }
      stats.slugCollisionsResolved++;
    }
    slugSeen.add(slug);
    assigned.set(source,slug);
  }
  const items=unique.map(({row,source})=>({...row,slug:assigned.get(source)}));
  stats.accepted=items.length;
  if(stats.input!==stats.accepted+stats.invalid+stats.duplicateSources){
    throw new Error('Regional article normalization count mismatch');
  }
  return {items,stats};
}
