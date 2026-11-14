/**
 * Retired external experimental-world promotion.
 *
 * This adapter preserves the old import path used by aktual-central.mjs, but
 * replaces the third-party temporary site with the self-hosted AKTUAL SIGNAL
 * directory. No iframe, tracker, remote URL or demonstrational news counts.
 */
const VIEW_START='<!-- AKTUAL-WORLD-PREVIEW:START -->';
const VIEW_END='<!-- AKTUAL-WORLD-PREVIEW:END -->';
const WORLD_START='<!-- AM-WORLD-PROMO:START -->';
const WORLD_END='<!-- AM-WORLD-PROMO:END -->';
const HUB_START='<!-- AM-WORLD-GATEWAY:START -->';
const HUB_END='<!-- AM-WORLD-GATEWAY:END -->';
const LOCAL='/gnk-aktual/signal/';
const ZAGREB='/kanal/zagreb/signal/';

const NATIVE_HUB=[
 '<!-- AM-WORLD-GATEWAY:START -->',
 '<link rel="stylesheet" href="/assets/aktual-signal-promo-v1.css">',
 '<section class="am-signal-promo" aria-labelledby="amSignalTitle">',
 '<div><span class="am-signal-tag">AKTUAL MEDIA / FIRST-PARTY SIGNAL</span>',
 '<h2 id="amSignalTitle">Jedan svijet.<br>17 gradskih perspektiva.</h2>',
 '<p>Pretraži javne arhive regionalnih izdanja, datum objave, tematski kontekst i stvarne rezultate posljednjih RSS provjera. Neovisna provjera tvrdnji i autorska prava ostaju zasebne uredničke obveze.</p>',
 '<div class="am-signal-actions">',
 '<a href="/gnk-aktual/signal/">Globalni radar 17 gradova →</a>',
 '<a href="/kanal/zagreb/signal/">Hrvatski izvori i teme →</a>',
 '</div><p class="am-signal-meta"><b>17 gradskih izdanja · 14 jezika.</b> Prikazane brojke su arhivska statistika, ne procjena stvarnog 24/7 rada medijskih izvora.</p></div>',
 '<nav class="am-signal-panel" aria-label="Glavni regionalni radari">',
 '<a href="/kanal/zagreb/signal/"><span><strong>Zagreb</strong><small>HR / MEDIJSKA ARHIVA</small></span><i aria-hidden="true">↗</i></a>',
 '<a href="/kanal/beograd/signal/"><span><strong>Beograd</strong><small>SR / REGIONALNI PREGLED</small></span><i aria-hidden="true">↗</i></a>',
 '<a href="/kanal/singapur/signal/"><span><strong>Singapur</strong><small>EN / GLOBALNA PERSPEKTIVA</small></span><i aria-hidden="true">↗</i></a>',
 '</nav></section>',
 '<!-- AM-WORLD-GATEWAY:END -->'
].join('\n');
const LEGACY_HOST=['j1hex9qg03f0-d','.space-z.ai'].join('');
const LEGACY_URL='https://'+LEGACY_HOST+'/';

function stripRegion(page,start,end){
 const i=page.indexOf(start),j=i<0?-1:page.indexOf(end,i);
 if((i<0)!==(j<0))throw Error('broken experimental world promo markers');
 return i<0?page:page.slice(0,i)+page.slice(j+end.length);
}
export function worldPreviewBanner(){return NATIVE_HUB;}
export function applyWorldPreview(page){
 if(typeof page!=='string')throw TypeError('expected-HTML');
 page=stripRegion(page,VIEW_START,VIEW_END);
 page=stripRegion(page,WORLD_START,WORLD_END);
 const start=page.indexOf(HUB_START),end=start<0?-1:page.indexOf(HUB_END,start);
 if((start<0)!==(end<0))throw Error('broken world gateway markers');
 if(start>=0)page=page.slice(0,start)+NATIVE_HUB+page.slice(end+HUB_END.length);
 else {
  const promo=page.indexOf('<!-- AKTUAL-PROMO:END -->');
  const mast=page.indexOf('<section class="am-masthead"');
  const at=promo>=0?promo+'<!-- AKTUAL-PROMO:END -->'.length:mast;
  if(at<0)throw Error('AKTUAL main editorial insertion point missing');
  page=page.slice(0,at)+'\n'+NATIVE_HUB+'\n'+page.slice(at);
 }
 // Fail closed on legacy external-origin links if any remain after removing
 // retired takeover sections. Do not preserve query strings.
 page=page.split(LEGACY_URL+'?country=hrvatska').join(ZAGREB);
 page=page.split(LEGACY_URL+'?city=zagreb').join(ZAGREB);
 page=page.split(LEGACY_URL).join(LOCAL);
 page=page.split(encodeURIComponent(LEGACY_URL+'?country=hrvatska'))
          .join(encodeURIComponent('https://gnk-asg.hr'+ZAGREB));
 return page;
}
