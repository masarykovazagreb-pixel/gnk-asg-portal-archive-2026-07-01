// Pure selectors for the optional fifth external destination: Telegram.
// UBO/editor affiliation must never be rewritten as authorship of unrelated articles.
import {publicationState, publicationInstant} from './publication-gate-v2.mjs';
const ORIGIN='https://gnk-asg.hr';
const ROUTE=/^\/(?:objave|komentari|analize|gnk-aktual\/kolumne)\/[a-z0-9/_-]+\/$/i;
const blocked=new Set(['draft','hold','held','blocked','cancelled','scheduled']);
export const clean=(s,n=180)=>[...String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()].slice(0,n).join('');
export function telegramCandidates({featured={},registry={},posted={},now=new Date(),maxAgeDays=7}={}){
  const seen=new Set(),out=[];
  for(const item of [...(featured.items||[]),...(registry.items||[])]){
    const p=String(item?.path||'');
    if(!ROUTE.test(p)||seen.has(p)||posted[p])continue;
    seen.add(p);
    const original={...item,publishedAt:item.distributionOriginalPublishedAt||item.publishedAt||item.datePublished};
    const at=publicationInstant(original);
    if(!at||at>now||now-at>maxAgeDays*86400000||blocked.has(String(item.status||'').toLowerCase()))continue;
    if(publicationState(original,now)!=='published'||!clean(item.title,250))continue;
    const canonical=ORIGIN+p;
    if(item.url && item.url!==canonical)continue;
    out.push({path:p,canonical,title:clean(item.title,230),description:clean(item.description||item.summary||'',230),publishedAt:at.toISOString(),source:item.sourceName||''});
  }
  return out.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
}
export function telegramMessage(article){
  const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const text='<b>'+escape(article.title)+'</b>\n'+(article.description?escape(article.description)+'\n':'')+
    '<a href="'+escape(article.canonical)+'">Izvornik: AKTUAL MEDIA / GNK ASG</a>';
  if([...text].length>4096)throw new Error('Telegram text limit exceeded');
  return text;
}
