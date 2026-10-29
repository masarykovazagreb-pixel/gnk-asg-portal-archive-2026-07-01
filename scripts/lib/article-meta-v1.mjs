/**
 * META OPIS ČLANKA — jedno pravilo za generator i za naknadnu popravku.
 *
 * Pravila (ista u build.mjs i u strengthen-article-meta-v1.mjs):
 *  - prefiks strojnih oznaka („What to check:”, „確認すべき点:”) se skida;
 *  - ako je sažetak prekratak (< 80 znakova), dodaje se naslov, izvor, kanal i datum;
 *  - opis se skraćuje na najviše 200 znakova, na granici riječi;
 *  - opis nikad nije prazan (naslov je posljednja rezerva).
 * Opis je metapodatak, ne sadržaj stranice: ništa se ne izmišlja, sve dolazi iz
 * naslova, sažetka, naziva izvora, naziva kanala i datuma objave.
 */

const MAX = 200;
const MIN = 80;
const PREFIX = /^\s*(What to check|確認すべき点|Što provjeriti|Što treba provjeriti|Ce qu'il faut vérifier|Was zu prüfen ist)\s*[:：]\s*/i;

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

export function clip(s, max = MAX) {
  const t = clean(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  const head = sp > max * 0.6 ? cut.slice(0, sp) : cut;
  return head.replace(/[,;:\-–—\s]+$/u, '') + '…';
}

/**
 * @param {{title?: string, summary?: string, sourceName?: string, channelTitle?: string, date?: string}} a
 * @returns {string}
 */
export function articleMetaDescription(a) {
  const title = clean(a.title);
  const source = clean(a.sourceName);
  const channel = clean(a.channelTitle);
  const date = clean(a.date).slice(0, 10);
  let core = clean(a.summary).replace(PREFIX, '');
  if (!core) core = title;
  if (core.length < MIN) {
    const parts = [];
    if (title && !core.includes(title)) parts.push(title);
    parts.push(core);
    let s = parts.filter(Boolean).join('. ').replace(/\.\.+/g, '.');
    if (source && !s.includes(source)) s += ` (${source})`;
    if (s.length < MIN && channel) s += `. ${channel}${date ? ', ' + date : ''}`;
    core = s;
  }
  if (!/[.!?…)]$/.test(core)) core += '.';
  return clip(core, MAX);
}
