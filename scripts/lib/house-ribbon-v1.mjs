/**
 * Traka kuće kao funkcija, da je svaki generator može upotrijebiti bez
 * ponavljanja HTML-a. Vraća novi HTML i zastavicu je li nešto dodano.
 *
 * Pravila:
 *  - ne dira stranicu koja već ima traku (`am-ribbon`);
 *  - preskače preusmjerenja i noindex stranice — one nisu javni sadržaj;
 *  - traži `</header>` jer se traka veže na zaglavlje, ne na tijelo članka.
 */
export const HOUSE_RIBBON_MARK = 'am-ribbon';
export const HOUSE_RIBBON_CSS = '/assets/house-ribbon-v1.css?v=20261024';

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function houseRibbonHtml(lang = 'hr') {
  const en = lang === 'en';
  const alt = en ? 'AKTUAL MEDIA — network mark' : 'AKTUAL MEDIA — znak mreže';
  const label = en ? 'AKTUAL MEDIA — network home' : 'AKTUAL MEDIA — matična mreža';
  const edition = en ? 'AKTUAL MEDIA network' : 'mreža AKTUAL MEDIA';
  return `<div class="${HOUSE_RIBBON_MARK}"><a class="${HOUSE_RIBBON_MARK}-brand" href="https://gnk-asg.hr/" rel="external noopener" aria-label="${esc(label)}"><img src="/assets/brand/aktual-media-mark.svg" alt="${esc(alt)}" width="72" height="72" loading="lazy" decoding="async"><span>AKTUAL MEDIA</span></a><span class="${HOUSE_RIBBON_MARK}-ed"><b>${esc(edition)}</b></span></div>`;
}

export function applyHouseRibbon(html) {
  if (typeof html !== 'string' || html.includes(HOUSE_RIBBON_MARK)) return { html, changed: false };
  if (/http-equiv=["']refresh["']/i.test(html) || /name=["']robots["'][^>]*\bnoindex\b/i.test(html)) {
    return { html, changed: false };
  }
  const headerEnd = html.indexOf('</header>');
  if (headerEnd < 0) return { html, changed: false };
  const lang = (html.match(/<html[^>]*\blang=["']([a-z]{2})/i) || [])[1] || 'hr';
  const at = headerEnd + '</header>'.length;
  let inject = `\n${houseRibbonHtml(lang)}`;
  if (!html.includes('house-ribbon-v1.css')) inject += `\n<link rel="stylesheet" href="${HOUSE_RIBBON_CSS}">`;
  return { html: `${html.slice(0, at)}${inject}${html.slice(at)}`, changed: true };
}
