// S+Chat — dohvat iz javne baze znanja portala.
//
// Baza ima 542 pitanja u 21 skupini (apps/portal/data/knowledge-base.json).
// Ovaj modul radi dvije stvari, bez ijednog mrežnog poziva:
//   1. pronađe najbliže zapise za pitanje (leksičko podudaranje s
//      hrvatskim i engleskim pojmovima prevedenim na isti korijen,
//      bez dijakritike, s težinom naziva skupine),
//   2. iz njih sastavi pošten odgovor kad model nije dostupan.
//
// Nema izmišljanja: ako ništa ne prođe prag, modul to kaže i uputi na
// kontakt obrazac, umjesto da nagađa.

import { KB_ENTRIES, KB_GROUPS, KB_VERSION, KB_SOURCE_TOTAL } from './knowledge-base.generated-v1.js';

export const RETRIEVAL_VERSION = 'GNK_ASG_CHAT_RETRIEVAL_V3_20261021';

const STOPWORDS = new Set([
  // hrvatski
  'je', 'su', 'sam', 'smo', 'ste', 'bio', 'bila', 'bilo', 'biti', 'i', 'te', 'ni', 'u', 'na', 'za', 'od', 'do',
  'po', 'pri', 'iz', 'sa', 's', 'k', 'ka', 'ko', 'li', 'se', 'da', 'ne', 'sto', 'što', 'koji', 'koja', 'koje',
  'kojem', 'kojim', 'koliko', 'koliki', 'kolika', 'kolike', 'kakav', 'kakva', 'kakvo', 'kakve', 'kakvi',
  'kako', 'gdje', 'kada', 'zasto', 'zašto', 'tko', 'šta', 'sta', 'ili', 'ali', 'pa', 'ima', 'imaju', 'bih',
  'biti', 'moze', 'želi', 'zeli', 'zna', 'znate', 'reci', 'recite', 'molim', 'pitanje', 'odgovor',
  'moze', 'može', 'mogu', 'li', 'ovo', 'ona', 'on', 'oni', 'to', 'ta', 'ti', 'sve', 'svi', 'nije', 'jesu',
  'postoji', 'postoje', 'treba', 'trebam', 'zelim', 'želim', 'molim', 'hvala', 'dobar', 'dan', 'cao', 'ćao',
  // engleski
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'of', 'to', 'in', 'on', 'for', 'with', 'and',
  'or', 'what', 'who', 'how', 'many', 'much', 'where', 'when', 'why', 'which', 'does', 'do', 'did', 'can',
  'could', 'please', 'hello', 'hi', 'there', 'it', 'this', 'that', 'about', 'tell', 'me', 'i', 'you',
  // slabi glagoli: ne nose temu, a ruše pokrivenost upita
  'bavi', 'baviti', 'bave', 'cime', 'čime', 'odakle', 'dolazi', 'dolaze', 'radi', 'rade', 'drzi', 'drži',
]);

/* Isti pojam na hrvatskom i engleskom mora pasti na isti ključ.
   Bez ovoga "How do I contact the portal?" ne nalazi zapis
   "Kako se šalje službeni upit?", jer su "contact" i "kontakt"
   dva različita niza. Tablica je mala i ručno provjerena: ključ je
   četveroznakovni korijen engleske riječi, vrijednost hrvatski korijen
   koji postoji u bazi. */
const CROSS_LANGUAGE = new Map(Object.entries({
  comp: 'drus', busi: 'drus', corpor: 'drus',
  grou: 'grup',
  page: 'stran', site: 'stran', websi: 'stran',
  news: 'vije', story: 'vije', stori: 'vije',
  refr: 'osvj', upda: 'osvj', updo: 'osvj',
  cont: 'kont', email: 'mail', mail: 'mail',
  reve: 'prih', inco: 'prih', profi: 'dobi',
  fina: 'fina', audit: 'revi', state: 'izvj', repor: 'izvj',
  asse: 'akti', equi: 'kapi',
  bili: 'dvoj', langu: 'jezi', trans: 'prij',
  mark: 'trzi', pric: 'cije', inve: 'inve', advi: 'savj',
  auto: 'auto', robo: 'auto',
  know: 'znan', base: 'baza', ques: 'pita', answ: 'odgo',
  assi: 'asist', chat: 'asist',
  priv: 'priv', pers: 'osob', data: 'poda',
  imag: 'slik', phot: 'foto', sour: 'izvo', lice: 'lice',
  righ: 'prav', copy: 'autor',
  offi: 'sluz', requ: 'upit', medi: 'medi', pres: 'medi',
  lega: 'prav', term: 'uvje', poli: 'poli',
  syst: 'sust', stat: 'stan', heal: 'zdra',
  week: 'tjed', dail: 'dnev', edit: 'izda',
  dire: 'dire', owne: 'vlas', foun: 'osni',
  sear: 'pret', find: 'pret',
}));

const DIACRITICS = { 'đ': 'd', 'Đ': 'd' };

export function normalize(text) {
  return String(text || '')
    .replace(/[đĐ]/g, (c) => DIACRITICS[c])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* Hrvatski i engleski se ovdje ne morfološki obrađuju — dovoljan je
   zajednički prefiks od četiri znaka: "grad" i "gradova", "izvor" i
   "izvora", "franc" i "francuske" tako se sretnu bez rječnika oblika. */
function stem(token) {
  const key = token.length > 4 ? token.slice(0, 4) : token;
  return CROSS_LANGUAGE.get(key) || key;
}

export function tokens(text) {
  const out = [];
  for (const raw of normalize(text).split(' ')) {
    if (!raw || raw.length < 2) continue;
    if (STOPWORDS.has(raw)) continue;
    if (/^\d+$/.test(raw) && raw.length < 2) continue;
    out.push(stem(raw));
  }
  return out;
}

/* Indeks se gradi jednom, pri prvom pitanju. Za 535 zapisa to je
   nekoliko milisekundi, a štedi rad na svakoj poruci. */
let INDEX = null;

/* Dio pitanja prije navodnika je NAMJERA ("Što se tvrdi u komentaru"),
   a dio u navodnicima je NASLOV članka. Namjera mora nositi više:
   inače upit "kakvo je vrijeme" pogodi naslov komentara koji slučajno
   sadrži riječ "vrijeme" i odgovori o nečem sasvim drugom. */
function splitQuestion(question) {
  const text = String(question || '');
  const marks = ['„', '“', '"'];
  let cut = -1;
  for (const mark of marks) {
    const at = text.indexOf(mark);
    if (at > 0 && (cut < 0 || at < cut)) cut = at;
  }
  if (cut < 0) return { intent: text, title: '' };
  return { intent: text.slice(0, cut), title: text.slice(cut) };
}

function buildIndex() {
  const entries = [];
  const byKey = [];
  KB_ENTRIES.forEach((row) => {
    const [group, question, answer, url] = row;
    entries.push({ group, question, answer, url: url || '' });
    const weights = new Map();
    const known = new Set();
    const add = (text, weight) => {
      for (const key of tokens(text)) {
        known.add(key);
        const current = weights.get(key) || 0;
        if (weight > current) weights.set(key, weight);
      }
    };
    const { intent, title } = splitQuestion(question);
    add(intent, 5);
    add(group, 3);
    add(title, 1.5);
    add(answer, 0.8);
    const intentKeys = new Set([...tokens(intent), ...tokens(group)]);
    // Naziv skupine je tema, ne samo još jedna riječ: upit "kako
    // kontaktirati portal" mora prije svega pasti u skupinu Kontakt.
    const groupKeys = new Set(tokens(group));
    byKey.push({ weights, intentKeys, groupKeys, known });
  });
  // Rijetki pojmovi nose više od onih koji se ponavljaju u svakom
  // drugom zapisu ("hrvatska", "portal"). Bez toga upit sklizne na
  // susjednu temu koja samo dijeli čestu riječ.
  const df = new Map();
  for (const row of byKey) {
    for (const key of row.weights.keys()) df.set(key, (df.get(key) || 0) + 1);
  }
  const total = entries.length;
  const idf = new Map();
  for (const [key, count] of df) idf.set(key, Math.log((total + 1) / (count + 1)) + 1);
  // Stranica → skupine: ako ijedan zapis spominje stranicu, cijela
  // njegova skupina je o toj stranici blizu. Tako "Pitaj o ovoj stranici"
  // radi i za stranice koje baza opisuje kroz više zapisa.
  const contexts = new Set();
  const contextGroups = new Map();
  const entryContexts = [];
  entries.forEach((entry, index) => {
    const own = contextsOf(entry);
    entryContexts.push(own);
    for (const path of own) {
      contexts.add(path);
      if (!contextGroups.has(path)) contextGroups.set(path, new Set());
      contextGroups.get(path).add(entry.group);
      void index;
    }
  });
  INDEX = { entries, byKey, idf, groups: KB_GROUPS, contexts, contextGroups, entryContexts };
  return INDEX;
}

export function knowledgeStats() {
  const index = INDEX || buildIndex();
  return {
    entries: KB_SOURCE_TOTAL,
    indexed: KB_ENTRIES.length,
    groups: KB_GROUPS.length,
    contexts: index.contexts.size,
    version: KB_VERSION,
  };
}

/* Kontekst je putanja javne stranice ("/gnk-aktual/"). Prihvaćamo samo
   oblik koji postoji u bazi, bez upita i bez pokušaja da se proširi. */
export function normalizeContextPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.length > 120) return '';
  if (!/^\/[a-z0-9][a-z0-9\-_/]*$/i.test(raw)) return '';
  const path = raw.endsWith('/') ? raw : `${raw}/`;
  const index = INDEX || buildIndex();
  return index.contexts.has(path) ? path : '';
}

export function pathsIn(text) {
  const out = new Set();
  const raw = String(text || '');
  for (const match of raw.matchAll(/gnk-asg\.hr(\/[A-Za-z0-9\-_/]*)?/g)) {
    const path = (match[1] || '/').replace(/[.,;:]+$/, '');
    if (!path || path === '/') continue;
    out.add(path.endsWith('/') ? path : `${path}/`);
  }
  return out;
}

function contextsOf(entry) {
  const out = new Set(pathsIn(entry.answer));
  if (entry.url && entry.url !== '/') out.add(entry.url.endsWith('/') ? entry.url : `${entry.url}/`);
  return out;
}

/**
 * Vrati najbliže zapise. Prag je namjerno konzervativan: bolje je reći
 * "nemam to u bazi" nego odgovoriti susjednom temom.
 */
export function search(query, { limit = 5, contextPath = '' } = {}) {
  const index = INDEX || buildIndex();
  const queryKeys = tokens(query);
  if (!queryKeys.length) return [];
  const normalizedQuery = normalize(query);
  const context = normalizeContextPath(contextPath);
  const entryContexts = index.entryContexts || [];
  const contextGroups = index.contextGroups || new Map();
  const scored = [];

  for (let i = 0; i < index.entries.length; i += 1) {
    const { weights, intentKeys, groupKeys } = index.byKey[i];
    let score = 0;
    let matched = 0;
    let intentMatched = 0;
    let coveredIdf = 0;
    let totalIdf = 0;
    for (const key of queryKeys) {
      const idf = index.idf.get(key) || 1;
      totalIdf += idf;
      const weight = weights.get(key);
      if (!weight) continue;
      score += weight * idf;
      coveredIdf += idf;
      matched += 1;
      if (intentKeys.has(key)) intentMatched += 1;
      if (groupKeys.has(key)) score += 2 * idf;
    }
    if (!score) continue;
    const entry = index.entries[i];
    const normalizedQuestion = normalize(entry.question);
    if (normalizedQuery.length >= 10 && normalizedQuestion.includes(normalizedQuery)) score += 24;
    // Stranica s koje je pitanje postavljeno je kontekst, ne filter:
    // zapisi koji opisuju tu stranicu dobiju prednost, ali upit i dalje
    // mora sam pogoditi temu. Tako "Pitaj o ovoj stranici" ne može
    // proizvesti odgovor o nečemu što na stranici nije.
    if (context) {
      // Izravni spomen stranice vrijedi više od pripadnosti skupini.
      if (entryContexts[i].has(context)) score += 12;
      else if (contextGroups.get(context)?.has(entry.group)) score += 5;
    }
    const coverage = totalIdf ? coveredIdf / totalIdf : 0;
    score += coverage * 6;
    scored.push({
      ...entry,
      score: Math.round(score * 100) / 100,
      matched,
      intentMatched,
      coverage: Math.round(coverage * 100) / 100,
    });
  }

  // Tri uvjeta relevantnosti:
  //  1. barem jedan pojam mora pogoditi namjeru pitanja ili skupinu —
  //     pogodak samo u naslovu članka nije odgovor na pitanje;
  //  2. težinski pokriveni dio upita mora biti veći od polovice;
  //  3. ukupna težina mora prijeći prag koji raste s brojem pojmova.
  scored.sort((a, b) =>
    b.score - a.score ||
    b.matched - a.matched ||
    a.question.length - b.question.length);

  // Pojam koji se u cijeloj bazi ne pojavljuje nijednom je signal da
  // pitanje izlazi iz domene portala ("dostava", "francuska"). Tada
  // radije pošteno odbijamo nego da odgovorimo susjednom temom.
  const unknown = queryKeys.filter((key) =>
    !index.entries.some((_, i) => index.byKey[i].known.has(key)));
  const relevant = scored.filter((entry) =>
    entry.intentMatched > 0 &&
    entry.coverage >= 0.5 &&
    entry.score >= 8 + 4 * queryKeys.length &&
    !(queryKeys.length > 1 && unknown.length));
  return relevant.slice(0, limit);
}

const URL_IN_TEXT = /gnk-asg\.hr(\/[A-Za-z0-9\-_/%.]*)?/g;

function sourcesFrom(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const collected = [];
    if (entry.url) collected.push(entry.url);
    for (const match of entry.answer.match(URL_IN_TEXT) || []) {
      const path = (match.replace(/^gnk-asg\.hr/, '') || '/').replace(/[.,;:]+$/, '');
      collected.push(path || '/');
    }
    for (const raw of collected) {
      const path = raw.startsWith('/') ? raw : `/${raw}`;
      const url = path === '/' ? 'https://gnk-asg.hr/' : `https://gnk-asg.hr${path.endsWith('/') ? path : `${path}/`}`;
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({ url, title: entry.question });
    }
  }
  return out.slice(0, 4);
}

const GREETINGS = /^(bok|cao|ćao|dobar dan|dobro jutro|dobra vecer|dobra večer|pozdrav|hello|hi|hey|good morning|good evening|zdravo)\b/;

export function isGreeting(query) {
  return GREETINGS.test(normalize(query));
}

export function isThanks(query) {
  return /^(hvala|thanks|thank you|ok|okej|super|odlicno|odlično)\b/.test(normalize(query));
}

function cleanAnswer(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

/**
 * Odgovor bez modela: uzima najbolji zapis iz baze, po potrebi spaja
 * drugi iz druge skupine i vraća poveznice. Nikad ne dodaje činjenice
 * kojih nema u bazi.
 */
export function knowledgeAnswer(query, lang = 'hr', options = {}) {
  const contextPath = normalizeContextPath(options.contextPath);
  const hits = search(query, { limit: 4, contextPath });
  if (!hits.length) {
    return {
      reply: lang === 'en'
        ? 'I do not have that in the portal knowledge base. I can answer about GNK ASG, the GNK DINAMO group, the portal sections, markets, the knowledge base and the contact channels. For anything else, please use the contact form: https://gnk-asg.hr/en/contact/'
        : 'To pitanje nije u javnoj bazi znanja portala. Mogu odgovoriti o GNK ASG-u, grupi GNK DINAMO, dijelovima portala, tržištima, bazi znanja i kontaktima. Za ostalo vas najbolje vodi kontakt obrazac: https://gnk-asg.hr/contact/',
      hits: [],
      sources: [],
      followUps: [],
      matched: false,
    };
  }

  const primary = hits[0];
  const parts = [cleanAnswer(primary.answer)];
  if (hits.length > 1 && hits[1].group !== primary.group && hits[1].score >= primary.score * 0.8) {
    const secondary = cleanAnswer(hits[1].answer);
    if (secondary && secondary !== parts[0]) parts.push(secondary);
  }

  return {
    reply: parts.join('\n\n'),
    hits,
    sources: sourcesFrom(hits.slice(0, 2)),
    followUps: followUpQuestions(primary.group, primary.question),
    matched: true,
  };
}

const EN_START = /^(what|which|how|is|are|does|do|can|who|where|when|why)\b/i;

/** Tri srodna pitanja iz iste skupine — korisna kao sljedeći korak.
    Na engleskom pitanju prvo nudimo engleska pitanja iz iste skupine. */
export function followUpQuestions(group, excludeQuestion, lang = 'hr', limit = 3) {
  const pool = (INDEX || buildIndex()).entries.filter(
    (entry) => entry.group === group && entry.question !== excludeQuestion,
  );
  const preferred = lang === 'en'
    ? pool.filter((entry) => EN_START.test(entry.question))
    : pool.filter((entry) => !EN_START.test(entry.question));
  // Skupina bez engleskih zapisa ne smije engleskom čitatelju
  // ponuditi hrvatska pitanja — radije opće engleske prijedloge.
  if (lang === 'en' && !preferred.length) return suggestions('en').slice(0, limit);
  const ordered = [...preferred, ...pool.filter((entry) => !preferred.includes(entry))];
  return ordered.slice(0, limit).map((entry) => entry.question);
}

export function suggestions(lang = 'hr') {
  return lang === 'en'
    ? [
        'What are the 2025 financial results?',
        'What is GNK ASG d.o.o.?',
        'How does the GNK DINAMO group work?',
        'Which portal sections exist?',
      ]
    : [
        'Koji su financijski pokazatelji za 2025.?',
        'Što je GNK ASG d.o.o.?',
        'Kakav je odnos GNK ASG-a i GNK DINAMO Ltd.?',
        'Koje sve cjeline postoje na portalu?',
      ];
}
