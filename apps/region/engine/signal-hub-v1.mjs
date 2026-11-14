/**
 * AKTUAL SIGNAL global gateway — first-party and self-contained.
 * No embed, reverse proxy, dependency or hidden external application URL.
 * Real channel analytics are built by signal-desk-v1.mjs.
 */
const escapeHtml=value=>String(value??'')
 .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const safeSlug=value=>String(value||'').replace(/[^a-z0-9_-]/gi,'');
export function signalHubPage(channels,{refresh='',ribbon='',author='',impressum=''}={}){
 const list=Array.isArray(channels)?channels:[];
 const langs=new Set(list.map(c=>c.lang));
 const continents=[...new Set(list.map(c=>String(c.continent||'Globalno')))].sort();
 const cards=list.map(c=>{
  const id=safeSlug(c.id),city=escapeHtml(c.city),country=escapeHtml(c.country);
  const cont=escapeHtml(c.continent||'Globalno'),lang=escapeHtml(c.lang||'');
  return '<article class="sh-card" data-sh-card data-continent="'+cont+
   '" data-name="'+escapeHtml((c.city+' '+c.country+' '+c.title).toLowerCase())+'">'+
    '<a href="/kanal/'+id+'/signal/" class="sh-card-link" aria-label="AKTUAL SIGNAL — '+city+', '+country+'">'+
    '<img src="/assets/izdanja/'+id+'-440.webp" alt="" loading="lazy" decoding="async" width="440" height="295">'+
    '<span class="sh-card-copy"><small>'+cont+' · '+lang+'</small>'+
    '<strong>'+city+'</strong><span>'+country+'</span><em>Urednički radar →</em></span></a></article>';
 }).join('');
 const ld={
  '@context':'https://schema.org','@type':'CollectionPage',
  '@id':'https://gnk-asg.hr/gnk-aktual/signal/#webpage',
  url:'https://gnk-asg.hr/gnk-aktual/signal/',name:'AKTUAL SIGNAL — globalni radar 17 gradova',
  description:'Pristup arhivskim analizama, lokalnim pokazateljima i provjerama RSS izvora kroz AKTUAL MEDIA.',
  inLanguage:'hr',isPartOf:{'@id':'https://gnk-asg.hr/gnk-aktual/#webpage'},
  mainEntity:{'@type':'ItemList',numberOfItems:list.length,itemListElement:list.map((c,i)=>({
   '@type':'ListItem',position:i+1,name:c.title,url:'https://gnk-asg.hr/kanal/'+safeSlug(c.id)+'/signal/'
  }))}
 };
 return '<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
 '<title>AKTUAL SIGNAL — globalni urednički radar | AKTUAL MEDIA</title>'+
 '<meta name="description" content="AKTUAL SIGNAL: pregled medijskih arhiva, izvora i regionalnih izdanja AKTUAL MEDIA u 17 gradova. Naslovi nisu automatski provjerene vijesti.">'+
 '<meta name="robots" content="index,follow,max-image-preview:large">'+
 '<meta name="author" content="AKTUAL MEDIA">'+
 '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">'+
 '<link rel="canonical" href="https://gnk-asg.hr/gnk-aktual/signal/">'+
 '<meta property="og:type" content="website"><meta property="og:site_name" content="AKTUAL MEDIA">'+
 '<meta property="og:title" content="AKTUAL SIGNAL — 17 gradskih radara">'+
 '<meta property="og:description" content="Lokalne arhive, izvori, vremenski trendovi i regionalne perspektive.">'+
 '<meta property="og:image" content="https://gnk-asg.hr/assets/atlas/aktual-media-atlas-1600.webp">'+
 '<meta property="og:url" content="https://gnk-asg.hr/gnk-aktual/signal/">'+
 '<meta name="twitter:card" content="summary_large_image">'+
 '<script type="application/ld+json">'+JSON.stringify(ld).replace(/</g,'\\u003c')+'</script>'+
 '<link rel="stylesheet" href="/gnk-aktual/signal/assets/aktual-signal-hub-v1.css"></head>'+
 '<body><a class="sh-skip" href="#signal-main">Preskoči na sadržaj</a>'+ribbon+
 '<header class="sh-header"><a href="/gnk-aktual/" class="sh-brand"><span>AKTUAL</span> MEDIA.</a>'+
 '<nav aria-label="Primarna navigacija"><a href="/gnk-aktual/">Naslovnica</a><a href="/izdanja/">Izdanja</a><a href="/status/">Status</a><a href="/gnk-aktual/metodologija/">Metodologija</a></nav></header>'+
 '<main id="signal-main"><section class="sh-hero"><div class="sh-hero-media" aria-hidden="true"></div>'+
 '<div class="sh-hero-content"><p class="sh-kicker">AKTUAL MEDIA / WORLD INTELLIGENCE</p>'+
 '<h1>Svijet. <em>17 gradova.</em><br>Jedan urednički radar.</h1>'+
 '<p>Odaberi grad i istraži vremenske trendove, posljednje provjere medijskih izvora i javnu arhivu. Svi podaci dolaze iz vlastitih regionalnih zapisa.</p>'+
 '<div class="sh-hero-actions"><a href="#gradovi">Istraži 17 gradova <span aria-hidden="true">↘</span></a>'+
 '<a href="/gnk-aktual/">Povratak u AKTUAL MEDIA</a></div></div>'+
 '<div class="sh-hero-numbers"><div><strong>'+list.length+'</strong><span>gradskih izdanja</span></div><div><strong>'+langs.size+'</strong><span>jezika</span></div><div><strong>RSS</strong><span>izvorno povezano</span></div></div></section>'+
 '<section class="sh-explainer" aria-label="Granice podataka"><span class="sh-kicker">TRANSPARENTNOST</span>'+
 '<p>Ovo je istraživački pregled medijskog pokrivanja, ne automatska potvrda da je neki događaj istinit. Zelene i crvene oznake prikazuju rezultat posljednje evidentirane provjere izvora; ne jamče njegov trenutačni rad. Nema prijenosa tuđih fotografija bez dokumentiranih prava.</p></section>'+
 '<section class="sh-directory" id="gradovi" data-sh-directory><div class="sh-heading"><div>'+
 '<span class="sh-kicker">EUROPA / AMERIKE / AFRIKA / AZIJA / OCEANIJA</span><h2>Globalna mreža gradskih izdanja</h2></div>'+
 '<span>Svaki grad ima zasebnu stranicu AKTUAL SIGNAL.</span></div>'+
 '<div class="sh-filter"><label>Pretraži grad ili zemlju<input type="search" data-sh-search placeholder="npr. Zagreb, Singapore…" autocomplete="off"></label>'+
 '<label>Kontinent<select data-sh-continent><option value="">Svi kontinenti</option>'+
 continents.map(c=>'<option value="'+escapeHtml(c)+'">'+escapeHtml(c)+'</option>').join('')+
 '</select></label></div><p class="sh-count" role="status" aria-live="polite">Prikazano: <strong data-sh-count>'+list.length+'</strong> / '+list.length+'</p>'+
 '<div class="sh-cards">'+cards+'</div><p class="sh-empty" data-sh-empty hidden>Nema gradova za ovaj odabir.</p></section>'+
 '<section class="sh-bottom"><div><span class="sh-kicker">UREDNIČKI STANDARD</span><h2>Više izvora. Manje pretpostavki.</h2>'+
 '<p>Izvori se uspoređuju i potpisuju. Automatski sažeci nisu nezavisna istraživačka izvješća, a neprovjereni AI nacrti ne objavljuju se bez uredničkog odobrenja.</p></div>'+
 '<a href="/kanal/zagreb/signal/">Otvori zagrebački radar →</a></section></main>'+
 '<footer class="sh-footer"><a href="/gnk-aktual/">AKTUAL MEDIA</a><span>Izdavač: AKTUAL MEDIA d.o.o. · Pregled javnih izvora</span>'+
 '<a href="/gnk-aktual/metodologija/">Metodologija i ispravci</a></footer>'+author+impressum+
 '<script src="/gnk-aktual/signal/assets/aktual-signal-hub-v1.js" defer></script>'+refresh+'</body></html>';
}
