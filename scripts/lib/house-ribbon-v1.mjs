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
  if (typeof html !== 'string') return { html, changed: false };
  if (/http-equiv=["']refresh["']/i.test(html) || /name=["']robots["'][^>]*\bnoindex\b/i.test(html)) {
    return { html, changed: false };
  }
  const bodyMatch = html.match(/<body\b[^>]*>/i);
  const lang = (html.match(/<html[^>]*\blang=["']([a-z]{2})/i) || [])[1] || 'hr';

  /* Traka stoji na vrhu tijela, iznad zaglavlja — nikad unutar <main>, jer bi
     ondje ulazila u mjeru članka i u brojanje riječi. */
  if (!bodyMatch) {
    if (html.includes(HOUSE_RIBBON_MARK)) return { html, changed: false };
    const headerEnd = html.indexOf('</header>');
    if (headerEnd < 0) return { html, changed: false };
    const at = headerEnd + '</header>'.length;
    let inject = `\n${houseRibbonHtml(lang)}`;
    if (!html.includes('house-ribbon-v1.css')) inject += `\n<link rel="stylesheet" href="${HOUSE_RIBBON_CSS}">`;
    return { html: `${html.slice(0, at)}${inject}${html.slice(at)}`, changed: true };
  }

  const bodyEnd = bodyMatch.index + bodyMatch[0].length;
  const head = html.slice(0, bodyEnd);
  let tail = html.slice(bodyEnd);
  /* Ispravno mjesto je prije prvog <main>; traka pronađena dublje u tijelu
     (unutar članka) smatra se pogrešno postavljenom i premješta se. */
  const firstMark = tail.indexOf(HOUSE_RIBBON_MARK);
  const firstMain = tail.search(/<main\b/i);
  const hadRibbon = firstMark >= 0 && firstMark < 400 && (firstMain < 0 || firstMark < firstMain);

  /* Stariji prolaz mogao je traku ostaviti dublje u dokumentu (nakon
     zaglavlja, unutar <main>). Takva se traka uklanja i postavlja na vrh. */
  if (!hadRibbon && tail.includes(HOUSE_RIBBON_MARK)) {
    tail = tail.replace(/<div class="am-ribbon">[\s\S]*?<\/div>\s*/g, '');
    tail = tail.replace(/<link rel="stylesheet" href="\/assets\/house-ribbon-v1\.css[^"]*">\s*/g, '');
  }
  if (hadRibbon) return { html, changed: false };

  let inject = `\n${houseRibbonHtml(lang)}`;
  if (!head.includes('house-ribbon-v1.css')) inject += `\n<link rel="stylesheet" href="${HOUSE_RIBBON_CSS}">`;
  return { html: `${head}${inject}${tail}`, changed: true };
}
