// Promotional link to an external preview. Keep it separate from news and feeds.
const URL = 'https://j1hex9qg03f0-d.space-z.ai/?country=hrvatska';
const START = '<!-- AKTUAL-WORLD-PREVIEW:START -->';
const END = '<!-- AKTUAL-WORLD-PREVIEW:END -->';

export function worldPreviewBanner() {
  return `${START}
<link rel="stylesheet" href="/assets/aktual-world-preview-v1.css">
<aside class="am-world-preview" aria-labelledby="am-world-preview-title">
  <div class="am-world-preview__copy">
    <p class="am-world-preview__eyebrow">AKTUAL MEDIA · SPECIJALNA NAJAVA</p>
    <p class="am-world-preview__flash">HRVATSKA NA SVJETSKOJ KARTI</p>
    <strong class="am-world-preview__title" id="am-world-preview-title">SVIJET JE<br><span>BLIŽE NEGO IKAD.</span></strong>
    <p class="am-world-preview__lead">Uđite u eksperimentalni pregled izdanja Hrvatska i istražite izvore i teme na jednom mjestu.</p>
    <p class="am-world-preview__note">Vanjski probni prikaz može sadržavati demonstracijske vijesti. Dostupnost i ažurnost izvora nisu zajamčene.</p>
    <a class="am-world-preview__cta" href="${URL}" target="_blank" rel="external noopener noreferrer">OTVORI PREGLED HRVATSKE <span aria-hidden="true">↗</span><span class="am-world-preview__sr"> (vanjska stranica, otvara se u novoj kartici)</span></a>
  </div>
  <div class="am-world-preview__art" aria-hidden="true"><span>HR</span><strong>WORLD<br>PREVIEW</strong><i>AKTUAL MEDIA</i></div>
</aside>
${END}`;
}

export function applyWorldPreview(page) {
  const promoStart = '<!-- AKTUAL-PROMO:START -->';
  const promoEnd = '<!-- AKTUAL-PROMO:END -->';
  const start = page.indexOf(promoStart), end = page.indexOf(promoEnd, start);
  if (start < 0 || end < 0) throw new Error('AKTUAL promotional region missing; refusing to overwrite page');
  let block = page.slice(start, end + promoEnd.length);
  const changes = [
    [/<h2 id="amPromoTitle">[^<]*<\/h2>/, '<h2 id="amPromoTitle">HRVATSKA NA SVJETSKOJ KARTI!</h2>'],
    [/<p class="am-promo-lead" id="amPromoLead">[^<]*<\/p>/, '<p class="am-promo-lead" id="amPromoLead">Otkrijte eksperimentalni pregled Hrvatske: izvori i teme na jednom mjestu. Vanjska probna stranica može sadržavati demonstracijske vijesti; njihova ažurnost nije zajamčena.</p>'],
    [/<ul class="am-promo-grid">[\s\S]*?<\/ul>/, `<ul class="am-promo-grid"><li><a href="${URL}" target="_blank" rel="external noopener noreferrer"><span>PROBNI PRIKAZ</span><b>Hrvatska</b><i>Otkrijte izvore i teme ↗</i></a></li></ul>`],
    [/<a class="am-promo-cta" href="[^"]*"(?:[^>]*)>[^<]*<\/a>/, `<a class="am-promo-cta" href="${URL}" target="_blank" rel="external noopener noreferrer">Otvori pregled Hrvatske ↗</a>`],
  ];
  for (const [pattern, replacement] of changes) {
    if (!pattern.test(block)) throw new Error(`AKTUAL modal contract missing: ${pattern}`);
    block = block.replace(pattern, replacement);
  }
  // Remove only the old popup's unrelated share buttons, not the navigation or floating widgets.
  block = block.replace(/\s*<a class="am-promo-share"[^>]*>[\s\S]*?<\/a>/g, '');
  const share = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(URL) + '&amp;text=' + encodeURIComponent('AKTUAL MEDIA — probni pregled Hrvatske');
  block = block.replace('<button type="button" class="am-promo-later"', `<a class="am-promo-share" href="${share}" target="_blank" rel="external noopener noreferrer nofollow">Podijeli pregled na X ↗</a>\n      <button type="button" class="am-promo-later"`);
  page = page.slice(0, start) + block + page.slice(end + promoEnd.length);
  const oldStart = page.indexOf(START), oldEnd = page.indexOf(END);
  if ((oldStart < 0) !== (oldEnd < 0) || (oldStart >= 0 && oldEnd < oldStart)) throw new Error('Malformed preview markers');
  if (oldStart >= 0) return page.slice(0, oldStart) + worldPreviewBanner() + page.slice(oldEnd + END.length);
  const at = page.indexOf(promoEnd) + promoEnd.length;
  return page.slice(0, at) + '\n' + worldPreviewBanner() + page.slice(at);
}
