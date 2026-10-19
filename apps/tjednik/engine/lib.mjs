/**
 * Zajedničke funkcije za GNK ASG BUSINESS TJEDNIK.
 * Bez vanjskih ovisnosti: HTML, feedovi i sitemap generiraju se ručno.
 */

export const BASE_DEFAULT = 'https://gnk-asg-tjednik.pages.dev/';

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—',
  hellip: '…', bdquo: '„', ldquor: '„', rdquor: '“', copy: '©', reg: '®',
  eacute: 'é', egrave: 'è', aacute: 'á', agrave: 'à', iacute: 'í', oacute: 'ó',
  uacute: 'ú', scaron: 'š', Scaron: 'Š', zcaron: 'ž', Zcaron: 'Ž', ccaron: 'č',
  Ccaron: 'Č', cacute: 'ć', Cacute: 'Ć', dstrok: 'đ', Dstrok: 'Đ'
};

export const decode = (s = '') =>
  String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, k) => ENTITIES[k] ?? m);

export const stripTags = (s = '') =>
  decode(String(s).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

export const slugify = (s = '', max = 72) => {
  const map = { č: 'c', ć: 'c', đ: 'd', š: 's', ž: 'z', Č: 'c', Ć: 'c', Đ: 'd', Š: 's', Ž: 'z' };
  const full = String(s)
    .replace(/[čćđšžČĆĐŠŽ]/g, (c) => map[c])
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (full.length <= max) return full;
  const cut = full.slice(0, max);
  return (cut.includes('-') ? cut.slice(0, cut.lastIndexOf('-')) : cut).replace(/-+$/g, '');
};

export const hash = (s = '') => {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 6);
};

export const isoDate = (d = new Date()) => new Date(d).toISOString();

export const hrDate = (d) =>
  new Date(d).toLocaleDateString('hr-HR', { timeZone: 'Europe/Zagreb', day: 'numeric', month: 'long', year: 'numeric' });

export const hrDateTime = (d) =>
  new Date(d).toLocaleString('hr-HR', {
    timeZone: 'Europe/Zagreb', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

export const dayKey = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));

/** ISO tjedan, npr. 2026-W43 */
export const weekKey = (d = new Date()) => {
  const date = new Date(Date.UTC(new Date(d).getUTCFullYear(), new Date(d).getUTCMonth(), new Date(d).getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const weekStart = (key) => {
  const [y, w] = key.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (w - 1) * 7);
  return monday;
};

export const weekRangeLabel = (key) => {
  const start = weekStart(key);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const f = (d) => d.toLocaleDateString('hr-HR', { timeZone: 'UTC', day: 'numeric', month: 'numeric' });
  return `${f(start)} – ${f(end)}. ${end.getUTCFullYear()}.`;
};

export const prevWeekKey = (key) => {
  const start = weekStart(key);
  start.setUTCDate(start.getUTCDate() - 7);
  return weekKey(start);
};

/* ---------- teme i kritička pitanja ---------- */

export const THEMES = {
  financije: {
    label: 'Financije',
    words: ['banka', 'bankar', 'bank', 'kamat', 'kredit', 'dug', 'obveznic', 'prinos', 'inflacij', 'inflation', 'likvid', 'kapital', 'porez', 'tax', 'proračun', 'budget', 'financij', 'financ']
  },
  trziste: {
    label: 'Tržišta',
    words: ['tržišt', 'market', 'dionic', 'burz', 'nafta', 'oil', 'energij', 'energy', 'plin', 'gas', 'struj', 'cijen', 'price', 'poskup', 'sirovin', 'izvoz', 'export', 'uvoz', 'import', 'trgovin', 'retail', 'sales']
  },
  regulacija: {
    label: 'Regulacija',
    words: ['zakon', 'uredb', 'direktiv', 'vlada', 'government', 'ministarstv', ' eu ', 'europsk', 'komisij', 'sud', 'court', 'regulator', 'hanfa', 'kazn', 'rok', 'policy']
  },
  tehnologija: {
    label: 'Tehnologija i AI',
    words: ['umjetna inteligencija', 'umjetn', 'ai-', ' ai ', 'softver', 'software', 'tehnolog', 'tech', 'digital', 'startup', 'cyber', 'internet', 'aplikacij', 'robot', 'model']
  },
  rad: {
    label: 'Rad i plaće',
    words: ['zaposlen', 'radnik', 'otkaz', 'sindikat', 'plać', 'wage', 'mirovin', 'pension', 'tržište rada', 'posao', 'job', 'karijer', 'zapošljavan']
  },
  tvrtke: {
    label: 'Tvrtke',
    words: ['tvrtk', 'kompanij', 'company', 'preuzimanj', 'acquisition', 'investicij', 'investment', 'tvornic', 'factory', 'poslovanj', 'business', 'uprav', 'direktor', 'ceo', 'brend', 'brand', 'kupac', 'proizvod']
  },
  nekretnine: {
    label: 'Nekretnine i gradnja',
    words: ['nekretnin', 'real estate', 'stan', 'gradnj', 'construction', 'zemljišt', 'najam', 'rent', 'građev', 'infrastruktur', 'infrastructure', 'projekt']
  },
  potrosnja: {
    label: 'Potrošnja',
    words: ['potrošač', 'consumer', 'kupovn', 'maloprodaj', 'dućan', 'trgovac', 'turiz', 'travel', 'putnik', 'hotel']
  }
};

export const themeFor = (text = '') => {
  const t = ` ${String(text).toLowerCase()} `;
  let best = { id: 'poslovanje', label: 'Poslovanje', score: 0 };
  for (const [id, def] of Object.entries(THEMES)) {
    let score = 0;
    for (const w of def.words) {
      const weight = w.includes(' ') ? 3 : 1;
      let from = 0;
      while (true) {
        const i = t.indexOf(w, from);
        if (i === -1) break;
        score += weight;
        from = i + w.length;
      }
    }
    if (score > best.score) best = { id, label: def.label, score };
  }
  return { id: best.id, label: best.label };
};

export const CHECKS = {
  financije: [
    'Koje je referentno razdoblje za svaki navedeni iznos i je li usporedba s istim razdobljem prošle godine?',
    'Je li iznos bruto ili neto, nominalan ili realan, i uključuje li tečajne razlike?',
    'Postoji li dokument iz kojeg se iznos može provjeriti (izvještaj, odluka, ugovor), a ne samo izjava?'
  ],
  trziste: [
    'Je li kretanje cijene povezano s uzrokom koji tekst navodi ili se samo dogodilo u isto vrijeme?',
    'Koliki je uzorak i razdoblje na kojem se temelji tvrdnja o trendu?',
    'Tko je izvor procjene — institucija, analitičar ili prodajni materijal?'
  ],
  regulacija: [
    'Je li riječ o usvojenom propisu, prijedlogu ili najavi, i koji je točan datum primjene?',
    'Na koga se obveza odnosi i postoji li prijelazno razdoblje?',
    'Je li tekst naveo broj akta ili poveznicu na službeni tekst?'
  ],
  tehnologija: [
    'Je li tvrdnja o učinku rezultat mjerenja ili scenarija dobavljača?',
    'Koji su podaci ulaz, koja je metrika izlaz i može li se postupak ponoviti?',
    'Je li riječ o pilotu, proizvodnom sustavu ili najavi, i tko njime upravlja?'
  ],
  rad: [
    'Je li broj zaposlenih trenutno stanje ili kumulativni podatak kroz razdoblje?',
    'Uključuje li plaća sve dodatke i je li prikazana medijana ili prosjek?',
    'Postoji li kolektivni ugovor ili interna odluka koja objašnjava promjenu?'
  ],
  tvrtke: [
    'Je li promjena posljedica rasta, akvizicije ili promjene računovodstvene politike?',
    'Kakav je odnos prihoda, dobiti i novčanog toka u istom razdoblju?',
    'Je li tvrtka dio grupe i gdje se u strukturi nalaze preuzeta imovina i obveze?'
  ],
  nekretnine: [
    'Je li cijena po kvadratu prosjek, medijana ili jedinični primjer?',
    'Uključuje li projekt PDV, komunalni doprinos i troškove financiranja?',
    'Postoji li dozvola i tko je investitor u trenutku objave?'
  ],
  potrosnja: [
    'Je li podatak o potrošnji nominalan ili realan, i je li očišćen od inflacije?',
    'Koliki je udio ispitanika ili transakcija u ukupnom tržištu?',
    'Razlikuje li tekst sezonski efekt od stvarne promjene navika?'
  ],
  poslovanje: [
    'Koja je razlika između naslova i onoga što izvor stvarno kaže?',
    'Postoji li brojka u tekstu, i može li se provjeriti u primarnom dokumentu?',
    'Tko ima interes da priča bude objavljena upravo sada i u tom obliku?'
  ]
};

export const UNIVERSAL_CHECKS = [
  'Navodi li tekst ime izvora i njegovu funkciju, ili se poziva na „izvore bliske“?',
  'Postoji li u tekstu najmanje jedan podatak koji se može provjeriti neovisno o sugovorniku?'
];

export const numberIn = (s = '') => /\d/.test(String(s));
