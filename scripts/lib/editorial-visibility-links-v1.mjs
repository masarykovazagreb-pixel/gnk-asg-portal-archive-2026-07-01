// Canonical static publication link materialization for Content Queue Publish.
// No network, no independent writer: only called inside the serialized release job.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const allowedRoute = route => /^\/(?:komentari|objave|analize|gnk-aktual\/kolumne)\/[a-z0-9-]+\/$/.test(route);
const enforceRoute = route => {
  if (!allowedRoute(route)) throw new Error('Noncanonical editorial visibility route: '+route);
  return route;
};

export function addCommentListing(html, article) {
  const route=enforceRoute(article.route);
  const escaped=escapeHtml(route);
  if (html.includes('data-editorial-route="'+escaped+'"')) return {html, changed:false};
  const open=/<section\b(?=[^>]*\bclass\s*=\s*["'][^"']*\beditorial-grid\b[^"']*["'])[^>]*>/gi;
  const matches=[...html.matchAll(open)];
  if (matches.length!==1) throw new Error('Content queue: unique comments editorial-grid is required');
  const at=matches[0].index+matches[0][0].length;
  const closing=html.indexOf('</section>',at);
  if (closing<0) throw new Error('Content queue: comments editorial-grid has no closing section');
  const img=String(article.image||'').trim();
  if (!/^https:\/\/gnk-asg\.hr\/assets\/|^\/assets\//.test(img)) throw new Error('Content queue: missing local editorial image');
  const imgUrl=img.startsWith('https://gnk-asg.hr')?img.slice('https://gnk-asg.hr'.length):img;
  const kind=article.type==='objava'?'OBJAVA':'KOMENTAR';
  const card='<article class="editorial-card" data-editorial-route="'+escaped+'">'
    +'<img src="'+escapeHtml(imgUrl)+'" width="1200" height="675" loading="lazy" decoding="async" alt="'+escapeHtml(article.title)+' — tematska ilustracija">'
    +'<p class="eyebrow">'+kind+' · GNK ASG</p><h2><a href="'+escaped+'">'+escapeHtml(article.title)+'</a></h2>'
    +'<p>'+escapeHtml(article.description)+'</p><a href="'+escaped+'">Otvori komentar →</a></article>';
  let output=html.slice(0,at)+'\n'+card+html.slice(at);
  const countPattern=/(<p\b[^>]*class=["']editorial-listing-count["'][^>]*data-static-editorial-count=["'])\d+(["'][^>]*>)[^<]*/i;
  if (!countPattern.test(output)) throw new Error('Content queue: static editorial count marker missing');
  const count=[...output.matchAll(/data-editorial-route="[^"]+"/g)].length;
  output=output.replace(countPattern,(_,before,after)=>before+count+after+count+' objavljenih tekstova · sve poveznice dostupne su u statičkom HTML-u.');
  return {html:output,changed:true};
}

export function addAktualLink(html, article) {
  const route=enforceRoute(article.route);
  const escaped=escapeHtml(route);
  if (html.includes('href="'+escaped+'"')) return {html, changed:false};
  const marker=/<div\b(?=[^>]*\bclass=["'][^"']*\bam-editorial-links\b[^"']*["'])(?=[^>]*\bid=["']amEditorialLinks["'])[^>]*>/gi;
  const matches=[...html.matchAll(marker)];
  if (matches.length!==1) throw new Error('Content queue: AKTUAL canonical editorial-links marker missing or duplicated');
  const at=matches[0].index+matches[0][0].length;
  const close=html.indexOf('</div>',at);
  if(close<0) throw new Error('Content queue: AKTUAL editorial-links container has no closing div');
  const link='<a href="'+escaped+'">'+escapeHtml(article.title)+'</a>';
  return {html:html.slice(0,at)+'\n'+link+html.slice(at),changed:true};
}
