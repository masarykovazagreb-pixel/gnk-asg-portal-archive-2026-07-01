// Javni pregled registra; planirana adresa nije potvrda postojećeg weba.
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function liveLink(country) {
  if (country.status !== 'live') return '';
  try {
    const u = new URL(country.liveUrl);
    if (u.protocol !== 'https:' || u.hostname !== 'gnk-asg.hr' || u.username || u.password || u.port || !u.pathname.startsWith('/kanal/')) return '';
    return `<a href="${esc(u.href)}">Otvori izdanje</a>`;
  } catch { return ''; }
}
export function renderWorldDirectory(registry, sources) {
  const countries = Array.isArray(registry?.countries) ? [...registry.countries] : [];
  countries.sort((a,b) => String(a.country).localeCompare(String(b.country),'hr'));
  const cards = countries.map(c => {
    const status = ({live:'Aktivno u registru',preparing:'U pripremi',planned:'Planirano'})[c.status] || 'Nije utvrđeno';
    const sourceEntry = sources?.countries?.[c.cca2];
    const records = Array.isArray(sourceEntry?.sources) ? sourceEntry.sources : [];
    const evidence = sourceEntry ? `U registru izvora: ${records.length} kandidata. Podaci zahtijevaju provjeru.` : 'U posebnom registru izvora nema zapisa za ovu državu.';
    const link = liveLink(c);
    return `<li class="wd-card" data-wd-country data-wd-status="${esc(c.status)}"><span class="wd-status">${esc(status)}</span><h4>${esc(c.country)}</h4><p>Glavni grad: ${esc(c.capital)}</p><p>${esc(evidence)}</p>${link || '<span class="wd-muted">Javno izdanje nije potvrđeno u ovom registru.</span>'}</li>`;
  }).join('\n');
  return `<!-- world-directory-v1:start -->
<section class="wd" id="svijet-drzave" aria-labelledby="wd-title">
<style>.wd{margin:2rem 0;padding:clamp(1rem,3vw,2rem);background:#101d2c;color:#f4f7fb;border:1px solid #40526a;border-radius:18px}.wd *{box-sizing:border-box}.wd a{color:#bfddff}.wd h2{font:800 clamp(1.7rem,4vw,2.6rem)/1.15 Georgia,serif;margin:.3rem 0}.wd-intro{max-width:78ch;color:#d5e0eb}.wd-controls{display:flex;flex-wrap:wrap;gap:.7rem;align-items:end}.wd-controls label{display:grid;gap:.3rem}.wd-controls input,.wd-controls select{font:inherit;color:#102030;background:#fff;border:1px solid #9baec2;border-radius:6px;padding:.55rem}.wd-grid{padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:.7rem}.wd-card{border:1px solid #41556b;border-radius:12px;background:#172a3e;padding:1rem}.wd-card h4{margin:.6rem 0;font-size:1rem}.wd-card p{margin:.4rem 0;font-size:.88rem;color:#d5e0eb}.wd-status{color:#ffdf9a;font-size:.76rem;font-weight:800}.wd-muted{font-size:.83rem;color:#d5e0eb}.wd [hidden]{display:none!important}</style>
<p>GNK ASG · AKTUAL MEDIA</p><h2 id="wd-title">Svijet: pregled država</h2><p class="wd-intro">Pretražite ${countries.length} država iz registra. „Aktivno” označava zapis u registru, ne provjeru dostupnosti uživo. Planirani projekti i adrese nisu dokaz da web postoji. Za nova izdanja trebaju izvori, prava, urednik i provjere prije objave.</p>
<p class="wd-intro">Registar država: ${esc(registry?.generatedFor || 'datum nije dostupan')}; zasebni registar izvora: ${esc(sources?.updated || 'datum nije dostupan')}. Taj registar ne pokriva nužno izvore postojećih kanala.</p>
<div class="wd-controls" data-wd-controls hidden><label for="wd-search">Država ili glavni grad<input id="wd-search" type="search" placeholder="Pretraži države"></label><label for="wd-filter">Status<select id="wd-filter"><option value="all">Svi statusi</option><option value="live">Aktivno u registru</option><option value="preparing">U pripremi</option><option value="planned">Planirano</option></select></label><p data-wd-result aria-live="polite"></p></div>
<ul class="wd-grid">${cards}</ul><p><a href="/izdanja/">Mreža izdanja</a> · <a href="/gnk-aktual/">AKTUAL MEDIA</a> · <a href="/">GNK ASG</a></p></section>
<script src="/assets/world-directory-v1.js" defer></script>
<!-- world-directory-v1:end -->`;
}
