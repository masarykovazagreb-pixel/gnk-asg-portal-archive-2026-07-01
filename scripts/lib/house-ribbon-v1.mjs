/**
 * Traka kuće kao funkcija, da je svaki generator može upotrijebiti bez
 * ponavljanja HTML-a. Vraća novi HTML i zastavicu je li nešto dodano.
 *
 * Pravila:
 *  - preskače preusmjerenja i noindex stranice — one nisu javni sadržaj;
 *  - traka stoji na vrhu tijela, iznad zaglavlja, ali **ispod** veze za
 *    preskok sadržaja: ona mora ostati prva veza u <body> (WCAG 2.4.1);
 *  - nikad ne ulazi u <main> — ondje bi ulazila u mjeru članka i u brojanje
 *    riječi koje provjerava Direct Static Editorial Policy;
 *  - idempotentna je: drugi prolaz ne mijenja ništa.
 */
export const HOUSE_RIBBON_MARK = 'am-ribbon';
export const HOUSE_RIBBON_CSS = '/assets/house-ribbon-v1.css?v=20261024';

const RIBBON_DIV = '<div class="am-ribbon">';
const RIBBON_BLOCK = /<div class="am-ribbon">[\s\S]*?<\/div>\s*/g;
const RIBBON_LINK = /<link rel="stylesheet" href="\/assets\/house-ribbon-v1\.css[^"]*">\s*/g;
const SKIP_LINK = /<a[^>]*class="(?:skip-to-content|skip)"[^>]*>[\s\S]*?<\/a>/i;

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function houseRibbonHtml(lang = 'hr') {
  const en = lang === 'en';
  const alt = en ? 'AKTUAL MEDIA — network mark' : 'AKTUAL MEDIA — znak mreže';
  const label = en ? 'AKTUAL MEDIA — network home' : 'AKTUAL MEDIA — matična mreža';
  const edition = en ? 'AKTUAL MEDIA network' : 'mreža AKTUAL MEDIA';
  return `<div class="${HOUSE_RIBBON_MARK}"><a class="${HOUSE_RIBBON_MARK}-brand" href="https://gnk-asg.hr/" rel="external noopener" aria-label="${esc(label)}"><img src="/assets/brand/aktual-media-mark.svg" alt="${esc(alt)}" width="72" height="72" loading="lazy" decoding="async"><span>AKTUAL MEDIA</span></a><span class="${HOUSE_RIBBON_MARK}-ed"><b>${esc(edition)}</b></span></div>`;
}

/* Traka je dobro postavljena kad stoji prije <main>, a iza veze za preskok. */
function placementOk(tail) {
  const mark = tail.indexOf(RIBBON_DIV);
  if (mark < 0) return false;
  const mainAt = tail.search(/<main\b/i);
  if (mainAt >= 0 && mark > mainAt) return false;
  const skip = tail.match(SKIP_LINK);
  if (skip && skip.index < mark) return true;
  if (skip && skip.index > mark) return false;
  return mark < 400;
}

/* Mjesto umetanja: odmah nakon veze za preskok ako postoji, inače na početak
   tijela — u oba slučaja iznad zaglavlja i izvan <main>. */
function insertionIndex(tail) {
  const skip = tail.match(SKIP_LINK);
  if (skip) return skip.index + skip[0].length;
  const mainAt = tail.search(/<main\b/i);
  const headerAt = tail.search(/<header\b/i);
  const limit = [mainAt, headerAt].filter((value) => value >= 0);
  return limit.length ? Math.min(...limit) : 0;
}

export function applyHouseRibbon(html) {
  if (typeof html !== 'string') return { html, changed: false };
  if (/http-equiv=["']refresh["']/i.test(html) || /name=["']robots["'][^>]*\bnoindex\b/i.test(html)) {
    return { html, changed: false };
  }
  const lang = (html.match(/<html[^>]*\blang=["']([a-z]{2})/i) || [])[1] || 'hr';
  const bodyMatch = html.match(/<body\b[^>]*>/i);

  if (!bodyMatch) {
    if (placementOk(html) || html.includes(HOUSE_RIBBON_MARK)) return { html, changed: false };
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

  if (placementOk(tail)) return { html, changed: false };

  /* Traka na pogrešnom mjestu (unutar <main>, ispod zaglavlja ili iznad veze
     za preskok) uklanja se i postavlja na svoje mjesto. */
  if (tail.includes(HOUSE_RIBBON_MARK)) {
    tail = tail.replace(RIBBON_BLOCK, '').replace(RIBBON_LINK, '');
  }

  const at = insertionIndex(tail);
  let inject = `\n${houseRibbonHtml(lang)}`;
  if (!head.includes('house-ribbon-v1.css')) inject += `\n<link rel="stylesheet" href="${HOUSE_RIBBON_CSS}">`;
  return { html: `${head}${tail.slice(0, at)}${inject}${tail.slice(at)}`, changed: true };
}
