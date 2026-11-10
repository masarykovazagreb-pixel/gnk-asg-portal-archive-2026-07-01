/** Conservative, idempotent metadata enrichment for PUBLIC, indexable static pages.
 * Keeps existing page identity, title, description, canonical and authorship.
 * Only reuses page-provided content; never generates SEO keyword-stuffing. */
function attr(tag,name){
  // Attribute names are an internal fixed allowlist: name, property, rel, content, href.
  const hit=String(tag).match(new RegExp("(?:^|\\s)"+name+"\\s*=\\s*([\"'])([\\s\\S]*?)\\1","i"));
  return hit?hit[2]:'';
}
function metaValue(html,field,key){
  for(const match of String(html).matchAll(/<meta\b[^>]*>/gi))if(attr(match[0],field).toLowerCase()===key.toLowerCase())return attr(match[0],'content');
  return '';
}
function linkValue(html,rel){
  for(const match of String(html).matchAll(/<link\b[^>]*>/gi))if(attr(match[0],'rel').toLowerCase().split(/\s+/).includes(rel))return attr(match[0],'href');
  return '';
}
const decode=s=>String(s).replace(/&(amp|quot|lt|gt|#39|apos);/gi,(_,x)=>({amp:'&',quot:'"',lt:'<',gt:'>', '#39':"'",apos:"'"}[x.toLowerCase()]));
const esc=s=>String(s).replace(/[&<>"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]));
const normalize=s=>decode(s).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const urlIsOwn=url=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='gnk-asg.hr'&&!u.search&&!u.hash}catch{return false}};
export function enrichSitewideMeta(html,{route='/',siteName}={}){
  if(typeof html!=='string')return html;
  const headEnd=html.search(/<\/head\s*>/i),headStart=html.search(/<head(?:\s[^>]*)?>/i);
  if(headStart<0||headEnd<0||headEnd<=headStart)return html;
  const head=html.slice(0,headEnd);
  if(/http-equiv\s*=\s*["']refresh["']/i.test(head)||/\bnoindex\b/i.test(metaValue(head,'name','robots')))return html;
  const title=normalize((head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)||[])[1]||'');
  const description=normalize(metaValue(head,'name','description'));
  const canonical=decode(linkValue(head,'canonical'));
  if(!title||!description||!urlIsOwn(canonical))return html;
  const image=decode(metaValue(head,'property','og:image'));
  const isMedia=/^\/(?:en\/)?(?:gnk-aktual|aktual-media)(?:\/|$)/i.test(route);
  const name=siteName||(isMedia?'AKTUAL MEDIA':'GNK ASG');
  const additions=[];
  const add=(field,key,value)=>{if(value&&!metaValue(head,field,key))additions.push(`<meta ${field}="${esc(key)}" content="${esc(value)}">`);};
  add('property','og:title',title);
  add('property','og:description',description);
  add('property','og:url',canonical);
  add('property','og:site_name',name);
  add('name','twitter:card',image?'summary_large_image':'summary');
  add('name','twitter:title',title);
  add('name','twitter:description',description);
  if(image)add('name','twitter:image',image);
  if(!additions.length)return html;
  return html.slice(0,headEnd)+additions.join('\n')+'\n'+html.slice(headEnd);
}
