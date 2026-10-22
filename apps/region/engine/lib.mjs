/**
 * AKTUAL MEDIA REGIONAL — zajednička jezgra.
 *
 * Pravila koja ovaj modul čuva:
 *  - nikad se ne izmišlja tvrdnja, brojka ni citat; radi se samo s onim što
 *    izvor stvarno objavi (naslov, sažetak, datum, poveznica);
 *  - svaki zapis nosi poveznicu na izvornik;
 *  - autorski potpis ide organizaciji (AKTUAL MEDIA), a Nermin Sefić je
 *    naveden kao urednik izdanja, ne kao autor strojnih osvrta.
 */

export const UA = 'AKTUAL-MEDIA-Regional/1.0 (+https://gnk-asg.hr/izdanja/)';

/* ---------- mreža ---------- */

export async function fetchText(url, { timeout = 15000, tries = 2 } = {}) {
  let lastError;
  for (let i = 0; i < tries; i += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html;q=0.8, */*;q=0.5' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text || text.length < 80) throw new Error('empty response');
      return text;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
    if (i + 1 < tries) await new Promise((r) => setTimeout(r, 700 + i * 900));
  }
  throw lastError || new Error('fetch failed');
}

export async function fetchJSON(url, options) {
  const text = await fetchText(url, options);
  return JSON.parse(text);
}

/* ---------- tekst ---------- */

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c',
  ndash: '\u2013', mdash: '\u2014', hellip: '\u2026', bdquo: '\u201e',
  bdquor: '\u201d', laquo: '\u00ab', raquo: '\u00bb', middot: '\u00b7',
  scaron: '\u0161', Scaron: '\u0160', zcaron: '\u017e', Zcaron: '\u017d',
  ccaron: '\u010d', Ccaron: '\u010c', cacute: '\u0107', Cacute: '\u0106',
  dz: '\u01c6', Dz: '\u01c4', eacute: '\u00e9', egrave: '\u00e8',
  agrave: '\u00e0', ograve: '\u00f2', ugrave: '\u00f9', aacute: '\u00e1',
  iacute: '\u00ed', oacute: '\u00f3', uacute: '\u00fa', auml: '\u00e4',
  ouml: '\u00f6', uuml: '\u00fc', Eacute: '\u00c9', eur: '\u20ac',
  copy: '\u00a9', reg: '\u00ae', trade: '\u2122', deg: '\u00b0', percnt: '%'
};

export function decode(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeChar(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => safeChar(parseInt(num, 10)))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, name) => (name in NAMED ? NAMED[name] : m));
}

const safeChar = (code) => {
  try { return String.fromCodePoint(code); } catch { return ''; }
};

export function stripTags(value = '') {
  return decode(String(value).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncate(value = '', max = 240) {
  const text = String(value).trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\-\u2013\u2014]$/, '')}\u2026`;
}

/* ---------- slug ---------- */

const TRANSLIT = {
  'č': 'c', 'ć': 'c', 'ž': 'z', 'š': 's', 'đ': 'd',
  'Č': 'C', 'Ć': 'C', 'Ž': 'Z', 'Š': 'S', 'Đ': 'D',
  'ő': 'o', 'ű': 'u', 'Ő': 'O', 'Ű': 'U',
  'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ț': 't', 'Ă': 'A', 'Â': 'A', 'Î': 'I', 'Ș': 'S', 'Ț': 'T',
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u',
  'ä': 'a', 'ö': 'o', 'ü': 'u', 'ß': 'ss', 'ñ': 'n', 'ç': 'c',
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'dj', 'е': 'e', 'ж': 'z', 'з': 'z', 'и': 'i',
  'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r',
  'с': 's', 'т': 't', 'ћ': 'c', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'c', 'џ': 'dz', 'ш': 's',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Ђ': 'Dj', 'Е': 'E', 'Ж': 'Z', 'З': 'Z', 'И': 'I',
  'Ј': 'J', 'К': 'K', 'Л': 'L', 'Љ': 'Lj', 'М': 'M', 'Н': 'N', 'Њ': 'Nj', 'О': 'O', 'П': 'P', 'Р': 'R',
  'С': 'S', 'Т': 'T', 'Ћ': 'C', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'C', 'Џ': 'Dz', 'Ш': 'S'
};

export function translit(value = '') {
  return [...String(value)].map((ch) => TRANSLIT[ch] || ch).join('');
}

export function slugify(value = '', max = 58) {
  const words = translit(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(Boolean);
  const out = [];
  let length = 0;
  for (const word of words) {
    if (length + word.length + 1 > max) break;
    out.push(word);
    length += word.length + 1;
  }
  return out.join('-') || 'osvrt';
}

export function hash6(value = '') {
  let h = 2166136261;
  for (let i = 0; i < String(value).length; i += 1) {
    h ^= String(value).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

/* ---------- datumi ---------- */

export const ISO_DAY = (date = new Date()) => date.toISOString().slice(0, 10);

export function parseDate(value) {
  if (!value) return null;
  const numeric = /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim()) ? `${String(value).trim()}T09:00:00Z` : value;
  const d = new Date(numeric);
  if (Number.isNaN(d.getTime())) return null;
  const now = Date.now();
  if (d.getTime() > now + 6 * 3600 * 1000) return new Date(now - 3600 * 1000);
  if (d.getTime() < Date.UTC(2000, 0, 1)) return null;
  return d;
}

const MONTHS = {
  hr: ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'],
  sr: ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'],
  bs: ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'augusta', 'septembra', 'oktobra', 'novembra', 'decembra'],
  hu: ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'],
  sl: ['januarja', 'februarja', 'marca', 'aprila', 'maja', 'junija', 'julija', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'],
  it: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
  bg: ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'],
  ro: ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']
};

export function longDate(day, lang = 'hr') {
  const [y, m, d] = String(day).split('-').map(Number);
  const month = (MONTHS[lang] || MONTHS.hr)[m - 1] || '';
  if (lang === 'hu') return `${y}. ${month} ${d}.`;
  if (lang === 'bg') return `${d} ${month} ${y} г.`;
  return `${d}. ${month} ${y}.`;
}

export function shortDate(day, lang = 'hr') {
  const [, m, d] = String(day).split('-').map(Number);
  if (lang === 'en') {
    const t = Date.parse(`${day}T00:00:00Z`);
    if (Number.isFinite(t)) return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  if (lang === 'hu') return `${m}. ${d}.`;
  if (lang === 'bg') return `${d}.${String(m).padStart(2, '0')}`;
  return `${d}. ${m}.`;
}

/**
 * Vrijeme objave u zoni izdanja.
 *
 * Dan bez sata ne kazuje je li izdanje svježe ili stalo — a upravo to čitatelj
 * i tražilica trebaju znati. Vraća datum, sat i strojni ISO zapis.
 */
export function stampLocal(iso, lang = 'hr', timeZone = 'Europe/Zagreb') {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  let date;
  try {
    date = d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric', timeZone });
  } catch {
    date = d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Zagreb' });
  }
  let time;
  try {
    time = d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
  } catch {
    time = d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Zagreb' });
  }
  const day = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(d);
  return { date, time, day, iso: d.toISOString(), stamp: `${date} · ${time}` };
}

export function isoWeek(day) {
  const date = new Date(`${day}T00:00:00Z`);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/* ---------- teme ---------- */

export const THEMES = [
  { id: 'sigurnost', color: '#c9506a',
    words: ['obavještaj', 'obavestaj', 'tajn', 'špijun', 'spijun', 'cia', 'bnd', 'szo', 'mossad', 'fsb', 'gru', 'nato', 'sigurnosn', 'sigurnost', 'dezinform', 'propagand', 'hibridn', 'agent', 'agentura', 'uhod', 'prislušk', 'prislusk', 'kibernet', 'cyber', 'hakir', 'haker', 'ransom', 'malver', 'phishing', 'ddos', 'enisa', 'cert', 'sigurnosni incident', 'titkos', 'hirszerzes', 'kibernetika', 'biztonsag', 'varnost', 'obvescevaln', 'sicurezza', 'cyber', 'spionaj', 'сигурност', 'разузнаване', 'кибер', 'securitate', 'spionaj', 'cyber', 'securitate cibernetica',] },
  { id: 'rat', color: '#b3482f',
    words: ['rat', 'ratn', 'eskalacij', 'sukob', 'front', 'ofenziv', 'napad', 'raket', 'dron', 'artiljer', 'civiln', 'žrtv', 'zrtv', 'migracij', 'izbeglic', 'refugee', 'fegyver', 'háború', 'vojn', 'vojska', 'armij', 'ukrajin', 'gaza', 'izrael', 'hezbollah', 'hamas', 'krim', 'nuklearn', 'háború', 'haboru', 'eskalacio', 'vojna', 'escalation', 'guerra', 'escalation', 'война', 'ескалация', 'razboi', 'escaladare',] },
  { id: 'potres', color: '#a9833f',
    words: ['potres', 'zemljotres', 'earthquake', 'seizm', 'richter', 'magnitud', 'epicentar', 'tsunami', 'poplav', 'požar', 'pozar', 'erupcij', 'oluj', 'nevrijeme', 'katastrof', 'vulkan', 'földrengés', 'foldrenges', 'potres', 'terremoto', 'земетресение', 'cutremur',] },
  { id: 'politika', color: '#5d7bd5',
    words: ['vlad', 'parlament', 'izbor', 'izbori', 'predsednik', 'predsjednik', 'ministar', 'premijer', 'stranka', 'opozicij', 'koalicij', 'sabor', 'skupštin', 'skupstin', 'ue', 'komisij', 'brisel', 'sanctions', 'sankcij', 'diplomat', 'veleposlan', 'ustav', 'referendum', 'kormány', 'választás', 'miniszter', 'kormany', 'valasztas', 'parlament', 'miniszter', 'vlada', 'volitve', 'politik', 'governo', 'elezioni', 'правителство', 'избори', 'парламент', 'guvern', 'alegeri',] },
  { id: 'ekonomija', color: '#2f9e78',
    words: ['privred', 'gospodarstv', 'ekonomij', 'ekonomi', 'inflacij', 'kamata', 'kamatn', 'banka', 'bankar', 'berza', 'burz', 'tržišt', 'trzist', 'investic', 'kapital', 'dug', 'budžet', 'budzet', 'porez', 'plać', 'placa', 'nezaposlen', 'izvoz', 'uvoz', 'bdi', 'rast', 'recesij', 'kredit', 'gazdaság', 'infláció', 'jegybank', 'gazdasag', 'inflacio', 'jegybank', 'gospodarstvo', 'inflacija', 'economia', 'inflazione', 'mercato', 'икономика', 'инфлация', 'пазар', 'economie', 'inflatie', 'piata',] },
  { id: 'ai', color: '#7b61d1',
    words: ['umjetn', 'veštačk', 'vestack', 'inteligencij', 'ai ', ' ai', 'algorit', 'model', 'chatgpt', 'openai', 'robot', 'automatizac', 'kvantn', 'kvantum', 'digitaliz', 'softver', 'platform', 'data cent', 'mesterséges', 'mesterseges', 'intelligencia', 'algoritmus', 'umetna', 'inteligenca', 'intelligenza', 'artificiale', 'изкуствен', 'интелект', 'inteligenta', 'artificiala',] },
  { id: 'energija', color: '#c58b2a',
    words: ['energij', 'struja', 'elektran', 'plin', 'gas', 'naft', 'benzin', 'goriv', 'cijen', 'cena', 'solarn', 'vjetro', 'vjetar', 'nuklearn', 'hidro', 'mreža', 'mreza', 'energet', 'energia', 'energija', 'energetika', 'elektromos', 'energia', 'energie', 'електроенергия', 'енергетика', 'energie', 'gaze naturale',] },
  { id: 'sport', color: '#2a8fbf',
    words: ['utakmic', 'utakmica', 'fudbal', 'nogomet', 'košark', 'kosark', 'tenis', 'olimp', 'prvenstv', 'liga', 'klub', 'trener', 'gol', 'pobjed', 'pobed', 'poraz', 'final', 'derbi', 'sport', 'atlet', 'plivanj', 'rukomet', 'odbojk', 'šport', 'košark', 'formula 1', 'moto', 'merkozes', 'foci', 'kosarlabda', 'tekma', 'nogomet', 'partita', 'calcio', 'мач', 'футбол', 'meci', 'fotbal',] },
  { id: 'drustvo', color: '#9a6fb0',
    words: ['zdravstv', 'bolnic', 'lijek', 'obrazovan', 'škol', 'skol', 'univerzitet', 'student', 'kulturu', 'kultura', 'film', 'muzik', 'koncert', 'medij', 'novinar', 'cenzur', 'prava', 'migracij', 'socijal', 'penzij', 'mirovin', 'stanov', 'nekretnin', 'grad', 'egeszseg', 'korhaz', 'oktatas', 'iskola', 'zdravstvo', 'bolnisnica', 'salute', 'scuola', 'здраве', 'училище', 'sanatate', 'scoala'] }
];

export function themeFor(text = '') {
  const haystack = ` ${String(text).toLowerCase().replace(/\s+/g, ' ')} `;
  let best = { id: 'drustvo', score: 0 };
  for (const theme of THEMES) {
    let score = 0;
    for (const word of new Set(theme.words)) {
      const needle = word.trim();
      if (!needle) continue;
      let index = haystack.indexOf(needle);
      while (index !== -1) {
        // Riječ mora početi na granici riječi: "rat" ne smije pogoditi "obrat"
        // ni "Katarina", a "grad" ne smije pogoditi "Beograd".
        const before = haystack[index - 1] || ' ';
        if (!/[a-zà-ž0-9]/.test(before)) score += 1;
        index = haystack.indexOf(needle, index + needle.length);
        if (score > 40) break;
      }
    }
    // Kod izjednačenja sport ima prednost: sportski tekstovi često spominju
    // ambasadore, klubove i institucije koje bi inače povukle drugu temu.
    if (score > best.score || (score === best.score && score > 0 && theme.id === 'sport' && best.id !== 'sport')) best = { id: theme.id, score };
  }
  return THEMES.find((t) => t.id === best.id) || THEMES[THEMES.length - 1];
}

export const themeLabel = (id, strings) => strings.themes?.[id] || id;

/* ---------- rezultati (sport) ---------- */

export function scoreFromTitle(title = '') {
  const match = String(title).match(/(\d{1,2})\s*[:\-\u2013]\s*(\d{1,2})(?!\d)/);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (a > 120 || b > 120) return null;
  return { home: a, away: b, label: `${a}:${b}` };
}

/* ---------- HTML fragmenti ---------- */

export function hashtags(list = []) {
  const unique = [...new Set(list.filter(Boolean))];
  return unique.map((tag) => `<a class="tag" href="/tema/${slugify(tag.replace(/^#/, ''))}/" rel="tag">${esc(tag)}</a>`).join(' ');
}

export function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
