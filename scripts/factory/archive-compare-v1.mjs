#!/usr/bin/env node
// Čita dva git stabla; nikada ne spaja, ne prepisuje i ne briše članke.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const fields = ['title','date','url','source','sourceName'];
export function compareArchive(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) throw new TypeError('Nedostaju zapisi');
  const build = rows => {
    const map = new Map(), duplicate = new Set();
    for (const row of rows) {
      if (!row || typeof row.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) throw new Error('Nevaljan slug u arhivi');
      if (map.has(row.slug)) duplicate.add(row.slug);
      else map.set(row.slug,row);
    }
    return { map, duplicate: [...duplicate].sort() };
  };
  const a=build(left), b=build(right), onlyLeft=[], onlyRight=[], differing=[];
  for(const [slug,item] of a.map) {
    const peer=b.map.get(slug);
    if(!peer) {onlyLeft.push(slug);continue;}
    const changed=fields.filter(k=>String(item[k]??'') !== String(peer[k]??''));
    if(changed.length) differing.push({slug,fields:changed});
  }
  for(const slug of b.map.keys()) if(!a.map.has(slug)) onlyRight.push(slug);
  return {leftCount:left.length,rightCount:right.length,common:a.map.size-onlyLeft.length,
    onlyLeft:onlyLeft.sort(),onlyRight:onlyRight.sort(),differing:differing.sort((x,y)=>x.slug.localeCompare(y.slug)),
    duplicateLeft:a.duplicate,duplicateRight:b.duplicate};
}

// Usporedba datoteka odvojeno od metapodataka: prisutnost u git stablu ne
// dokazuje da je stranica javno dostupna niti da je uređivački odobrena.
export function compareArticlePages(channel, leftItems, rightItems, leftPaths, rightPaths) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(channel) || !Array.isArray(leftItems) || !Array.isArray(rightItems) || !Array.isArray(leftPaths) || !Array.isArray(rightPaths)) throw new TypeError('Nevaljani podaci stranica');
  const prefix=`apps/portal/kanal/${channel}/clanak/`;
  const pages = paths => new Set(paths.flatMap(p => {
    if (typeof p !== 'string' || !p.startsWith(prefix)) return [];
    const match=p.slice(prefix.length).match(/^([a-z0-9]+(?:-[a-z0-9]+)*)\/index\.html$/);
    return match ? [match[1]] : [];
  }));
  const a=pages(leftPaths),b=pages(rightPaths), ai=new Set(leftItems.map(i=>i.slug)),bi=new Set(rightItems.map(i=>i.slug));
  const minus=(x,y)=>[...x].filter(v=>!y.has(v)).sort();
  return {leftCount:a.size,rightCount:b.size,onlyLeft:minus(a,b),onlyRight:minus(b,a),
    orphanLeft:minus(a,ai),orphanRight:minus(b,bi),
    recordWithoutPageLeft:minus(ai,a),recordWithoutPageRight:minus(bi,b)};
}

function git(root, args) {
  return execFileSync('git', ['-C',root,...args], {encoding:'utf8',maxBuffer:128*1024*1024});
}
function main() {
  const args=process.argv.slice(2);
  if(args.length!==2 || args.some(a=>!/^([a-f0-9]{40})$/.test(a))) throw new Error('Uporaba: node scripts/factory/archive-compare-v1.mjs <puni SHA> <puni SHA>');
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const [left,right]=args;
  for(const ref of args) git(root,['cat-file','-e',`${ref}^{commit}`]);
  const parse=(ref,file)=>JSON.parse(git(root,['show',`${ref}:${file}`]));
  const lch=parse(left,'apps/region/channels.json').channels, rch=parse(right,'apps/region/channels.json').channels;
  if (!Array.isArray(lch)||!Array.isArray(rch)) throw new Error('Nedostaju registri kanala');
  const ids=[...new Set([...lch,...rch].map(c=>c.id))].sort();
  const lset=new Set(lch.map(c=>c.id)),rset=new Set(rch.map(c=>c.id));
  const pagePaths=ref=>git(root,['ls-tree','-r','-z','--name-only',ref,'--','apps/portal/kanal']).split('\0').filter(Boolean);
  const leftPaths=pagePaths(left),rightPaths=pagePaths(right);
  const results=[];
  for(const id of ids) {
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('Nevaljan ID kanala');
    if(!lset.has(id)||!rset.has(id)) {results.push({channel:id,missingRegistry:lset.has(id)?'right':'left'});continue;}
    const file=`apps/region/data/${id}.json`;
    try {
      const a=parse(left,file).items,b=parse(right,file).items;
      results.push({channel:id,...compareArchive(a,b),pages:compareArticlePages(id,a,b,leftPaths,rightPaths)});
    }
    catch(error) { results.push({channel:id,error:`nije moguće usporediti: ${error.message}`}); }
  }
  console.log(JSON.stringify({left,right,channels:results,note:'Usporedba zapisa i putanja HTML datoteka po slugu, ne njihovog sadržaja. Nije spajanje ni dokaz prava ili javne objave.'},null,2));
  if(results.some(r=>r.error||r.missingRegistry||r.duplicateLeft?.length||r.duplicateRight?.length)) process.exitCode=1;
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {main();} catch(error) {console.error(error.message);process.exitCode=2;}
}
