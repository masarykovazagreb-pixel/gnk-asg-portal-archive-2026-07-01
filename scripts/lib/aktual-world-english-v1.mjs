/**
 * Original English-language directory for every AKTUAL World country.
 * Local routes are currently written in Croatian; never claim they are
 * translated into country.language until their actual text is localized.
 */
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const urlOk = value => {
  try { const u=new URL(value); return u.protocol==='https:' && !u.username && !u.password && u.hostname!=='localhost'; }
  catch { return false; }
};
export function englishCountryUrl(country,base) {
  return base+'media/'+country.slug+'/en/';
}
export function buildCountryEnglishPage(country,base) {
  const local=base+'media/'+country.slug+'/';
  const english=englishCountryUrl(country,base);
  const title='AKTUAL MEDIA '+country.nameEn+' | English news source directory';
  const description='Discover original publishers and news sources for '+country.nameEn+
    '. Independent media links, editorial safeguards and access to 201 national editions.';
  const sources=(country.sourcesList||[]).filter(s=>urlOk(s.url)).map(s=>
    '<li><a href="'+esc(s.url)+'" rel="external noopener noreferrer" target="_blank">'+esc(s.name)+'</a>'+
    (s.category?'<small>'+esc(s.category)+'</small>':'')+'</li>').join('\n');
  const jsonld=JSON.stringify({
    '@context':'https://schema.org','@type':'CollectionPage',name:title,url:english,
    description,inLanguage:'en',isAccessibleForFree:true,
    about:{'@type':'Place',name:country.nameEn,address:{'@type':'PostalAddress',addressCountry:country.code}},
    publisher:{'@type':'Organization',name:'AKTUAL MEDIA d.o.o.',url:base}
  }).replace(/</g,'\\u003c');
  const css='*{box-sizing:border-box}body{margin:0;background:#081421;color:#eef3f9;font:16px/1.65 system-ui,sans-serif}a{color:#f0cd78}a:focus-visible{outline:3px solid #f0cd78;outline-offset:3px}.wrap{max-width:1120px;padding:24px clamp(16px,5vw,60px);margin:auto}.hero{border-block:1px solid #334c63;padding:40px 0}.hero h1{font:700 clamp(32px,5vw,62px)/1.06 Georgia,serif;margin:14px 0}.lead{color:#b9cadc;max-width:75ch}.grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(230px,.8fr);gap:35px;padding:28px 0}h2{font:700 28px/1.2 Georgia,serif}.source-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;list-style:none;padding:0}.source-list li{padding:14px;background:#10263b;border:1px solid #31506c;border-radius:12px}.source-list small{display:block;color:#b9cadc}.langs{display:flex;gap:15px;flex-wrap:wrap;margin-top:24px}.langs a{padding:8px 15px;border:1px solid #6684a0;border-radius:9px}.langs a[aria-current=page]{background:#f0cd78;color:#0a1522}aside{padding:10px 20px;border-left:3px solid #f0cd78;background:#0e2032}footer{border-top:1px solid #334c63;color:#b9cadc}@media(max-width:720px){.grid{grid-template-columns:1fr}}';
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>'+esc(title)+'</title>',
    '<meta name="description" content="'+esc(description)+'">',
    '<meta name="robots" content="index,follow,max-image-preview:large">',
    '<link rel="canonical" href="'+esc(english)+'">',
    '<link rel="alternate" hreflang="hr" href="'+esc(local)+'">',
    '<link rel="alternate" hreflang="en" href="'+esc(english)+'">',
    '<link rel="alternate" hreflang="x-default" href="'+esc(local)+'">',
    '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">',
    '<link rel="stylesheet" href="/assets/am-design-v1.css">',
    '<meta property="og:type" content="website">',
    '<meta property="og:title" content="'+esc(title)+'">',
    '<meta property="og:description" content="'+esc(description)+'">',
    '<meta property="og:url" content="'+esc(english)+'">',
    '<meta property="og:locale" content="en_US">',
    '<meta name="twitter:card" content="summary">',
    '<script type="application/ld+json">'+jsonld+'</script>',
    '<style>'+css+'</style></head><body>',
    '<header class="wrap"><a href="'+esc(base)+'">AKTUAL MEDIA</a> / <a href="'+esc(base)+'media/">Country editions</a></header>',
    '<main class="wrap">',
    '<section class="hero"><p>ENGLISH COUNTRY EDITION / '+esc(country.code)+'</p>',
    '<h1>'+esc(country.flag)+' '+esc(country.nameEn)+' — independent news sources</h1>',
    '<p class="lead">'+esc(description)+'</p>',
    '<nav class="langs" aria-label="Language options">',
    '<a href="'+esc(local)+'" lang="hr">Hrvatski</a>',
    '<a href="'+esc(english)+'" lang="en" aria-current="page">English</a>',
    '</nav></section>',
    '<div class="grid"><section><h2>External news sources</h2>',
    '<p class="lead">This directory lists '+String((country.sourcesList||[]).length)+' configured source entries for '+esc(country.nameEn)+
       '. Listing a publisher is not a guarantee that its RSS feed works or that every story is independently verified.</p>',
    '<ul class="source-list">'+sources+'</ul></section>',
    '<aside><h2>Our editorial method</h2>',
    '<p>External headlines are topic leads only. AKTUAL MEDIA checks material facts and prepares independently written drafts, with source citations, original titles and separately licensed images. Without reliable evidence, no article should be published.</p>',
    '<p>This page lists news sources; it does not represent the publishers or reprint their articles.</p>',
    '<p><a href="'+esc(local)+'feed.xml">RSS source-link feed</a></p>',
    '<p><a href="/radio/">AKTUAL RADIO</a></p></aside></div>',
    '<section><h2>Explore more editions</h2><p><a href="'+esc(base)+'media/">201 country directories</a> · <a href="/kanal/zagreb/">Croatia and Zagreb</a></p></section>',
    '</main><footer class="wrap"><p>AKTUAL MEDIA d.o.o. · Editor-in-chief: <a href="/nermin-sefic/">Nermin Sefić</a> · <a href="'+esc(base)+'">Newsroom</a></p></footer>',
    '</body></html>'
  ].join('\n');
}
export function addEnglishCountrySwitch(existingHtml,country,base) {
  const en=englishCountryUrl(country,base);
  let html=existingHtml;
  if(!/<link\b[^>]*hreflang=["']en["']/i.test(html)) {
    if(!html.includes('</head>'))throw Error('MISSING_HEAD:'+country.slug);
    html=html.replace('</head>','<link rel="alternate" hreflang="en" href="'+esc(en)+'">\n</head>');
  }
  if(!html.includes('data-english-switch="aktual-v1"')) {
    if(!/<body\b[^>]*>/i.test(html))throw Error('MISSING_BODY:'+country.slug);
    const switcher='<nav data-english-switch="aktual-v1" aria-label="Jezik / Language" style="display:flex;gap:14px;flex-wrap:wrap;padding:12px 20px;background:#13283a;border-bottom:1px solid #425c76"><a lang="hr" href="'+esc(base+'media/'+country.slug+'/')+'" aria-current="page">Hrvatski</a><a lang="en" href="'+esc(en)+'">English</a></nav>';
    html=html.replace(/<body\b[^>]*>/i,tag=>tag+'\n'+switcher);
  }
  // Existing full text is Croatian. The registry's country language is NOT the page language.
  html=html.replace(/(<meta property="og:locale" content=")[^"]+("\s*>)/i,'$1hr_HR$2');
  return html;
}
export function countrySitemapEntries(country,base) {
  const hr=base+'media/'+country.slug+'/';
  const en=englishCountryUrl(country,base);
  const alternates='<xhtml:link rel="alternate" hreflang="hr" href="'+esc(hr)+'"/>'+
    '<xhtml:link rel="alternate" hreflang="en" href="'+esc(en)+'"/>'+
    '<xhtml:link rel="alternate" hreflang="x-default" href="'+esc(hr)+'"/>';
  return [hr,en].map(url=>'  <url><loc>'+esc(url)+'</loc>'+alternates+'</url>');
}
