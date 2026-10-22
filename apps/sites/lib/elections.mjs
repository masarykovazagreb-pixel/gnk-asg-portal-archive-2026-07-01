/**
 * IZBORI U SRBIJI — nadzorni desk.
 *
 * Ne izmišlja ništa. Svaki zapis dolazi iz arhive osam gradskih izdanja
 * AKTUAL MEDIA (apps/region/data/*.json), koju svaka dva sata osvježava
 * dnevni ciklus. Ako medij objavi, zapis ulazi; ako ne objavi, ne ulazi.
 *
 * Desk mjeri ono što se može izbrojiti u arhivi: koliko zapisa, iz kojih
 * medija, kojih dana i koliko ih spominje incidente. Ne mjeri izlaznost,
 * ne prognozira rezultat i ne prenosi ankete kao činjenice.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CHANNELS = ['beograd', 'zagreb', 'sarajevo', 'ljubljana', 'budimpesta', 'rim', 'sofija', 'bukurest'];
const CITY = { beograd: 'Beograd', zagreb: 'Zagreb', sarajevo: 'Sarajevo', ljubljana: 'Ljubljana', budimpesta: 'Budimpešta', rim: 'Rim', sofija: 'Sofija', bukurest: 'Bukurešt' };
const COUNTRY = { beograd: 'RS', zagreb: 'HR', sarajevo: 'BA', ljubljana: 'SI', budimpesta: 'HU', rim: 'IT', sofija: 'BG', bukurest: 'RO' };
const COUNTRY_NAME = { RS: 'Srbija', HR: 'Hrvatska', BA: 'Bosna i Hercegovina', SI: 'Slovenija', HU: 'Mađarska', IT: 'Italija', BG: 'Bugarska', RO: 'Rumunjska', GB: 'Ujedinjeno Kraljevstvo', US: 'Sjedinjene Države', QA: 'Katar', DE: 'Njemačka' };

const SERBIA = /srbij|beograd|novi sad|niš\b|kragujevac|subotica|sombor|čačak|valjevo|leskovac|vranje|zrenjanin|pančevo|kruševac|kraljevo|sandžak|vojvodin|kosov|brnabić|dačić|đilas|tepić|vučić|sns\b|studentska lista/i;
const ELECTION = /izbor|glasa|birač|birack|kampanj|predizborn|koalicij|opozicij|mandat|\brik\b|izborn/i;
const INCIDENT = /incident|sukob|policij|uhapš|uhaps|prived|napad|pretnj|nasilj|ozlijeđ|povrijeđ|nered|protest|ranjen|hapšenj|pritvor|siledž|guranje|blokad/i;
const SURVEY = /anket|istraživanj|procjen|europe elects|nspm|javno mnijenj/i;

const electionHits = (text) => (text.match(ELECTION) || []).length;

/**
 * Kriterij: Srbija (ili njezin grad/akter) MORA biti u tekstu, a izbori moraju
 * biti u naslovu ili se u sažetku pojaviti barem dvaput. Time se izbacuju
 * kolumne koje izbore spomenu usput, a zadržavaju tekstovi koji ih stvarno
 * obrađuju.
 */
export const matchesItem = (title, summary = '') => {
  const serbiaHits = (text) => (text.match(SERBIA) || []).length;
  if (!(serbiaHits(title) >= 1 || serbiaHits(summary) >= 2)) return false;
  return ELECTION.test(title) || electionHits(summary) >= 2;
};
export const matchesText = (text) => matchesItem(text, '');

export function collect(portalRoot) {
  const store = new Map();
  for (const channel of CHANNELS) {
    const file = join(portalRoot, 'apps', 'region', 'data', `${channel}.json`);
    if (!existsSync(file)) continue;
    let data;
    try { data = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    for (const item of data.items || []) {
      if (!matchesItem(item.title || '', item.summary || '')) continue;
      const url = item.url || '';
      if (!url || store.has(url)) continue;
      store.set(url, {
        title: item.title || '',
        summary: item.summary || '',
        url,
        source: item.sourceName || 'nepoznat izvor',
        date: (item.date || '').slice(0, 10),
        time: (item.date || '').slice(11, 16),
        channel,
        city: CITY[channel] || channel,
        country: COUNTRY[channel] || '',
        via: 'arhiva',
        incident: INCIDENT.test(item.title || '') || INCIDENT.test(item.summary || ''),
        survey: SURVEY.test(`${item.title || ''} ${item.summary || ''}`),
      });
    }
  }
  // drugi sloj: javni feedovi iz data/izbori-extra.json (Srbija, HR, BiH, SAD, UK…)
  const extraFile = join(portalRoot, 'apps', 'sites', 'data', 'izbori-extra.json');
  if (existsSync(extraFile)) {
    try {
      const extra = JSON.parse(readFileSync(extraFile, 'utf8'));
      for (const item of extra.items || []) {
        if (!item.url || store.has(item.url)) continue;
        if (!item.date) continue;
        store.set(item.url, {
          title: item.title || '',
          summary: item.summary || '',
          url: item.url,
          source: item.source || 'nepoznat izvor',
          date: item.date.slice(0, 10),
          time: item.date.slice(11, 16),
          channel: 'feed',
          feedId: item.sourceId || '',
          city: item.city || '',
          country: item.country || '',
          incident: INCIDENT.test(item.title || '') || INCIDENT.test(item.summary || ''),
          survey: SURVEY.test(`${item.title || ''} ${item.summary || ''}`),
          via: 'feed',
        });
      }
    } catch { /* neispravna datoteka ne ruši build */ }
  }
  return [...store.values()].sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
}

const pct = (part, whole) => (whole ? ((part / whole) * 100).toFixed(1).replace('.', ',') : '0,0');
const dayLabel = (iso) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}. ${iso.slice(0, 4)}.`;

function counts(items, key) {
  const map = new Map();
  for (const item of items) map.set(item[key], (map.get(item[key]) || 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function lastUpdated(portalRoot) {
  let stamp = '';
  for (const channel of CHANNELS) {
    const file = join(portalRoot, 'apps', 'region', 'data', `${channel}.json`);
    if (!existsSync(file)) continue;
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      if (data.updatedAt && data.updatedAt > stamp) stamp = data.updatedAt;
    } catch { /* preskoči neispravnu datoteku */ }
  }
  return stamp;
}

export function metrics(items) {
  const byChannel = counts(items.filter((item) => item.via === 'arhiva'), 'channel');
  const bySource = counts(items, 'source');
  const byDay = counts(items, 'date').sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const incidents = items.filter((item) => item.incident);
  const surveys = items.filter((item) => item.survey);
  const byCountry = counts(items, 'country').filter(([code]) => code);
  const days = byDay.length;
  const newest = items[0]?.date || '';
  return {
    total: items.length,
    channels: byChannel.length,
    sources: bySource.length,
    days,
    newest,
    incidents: incidents.length,
    surveyMentions: surveys.length,
    byChannel,
    bySource,
    byCountry,
    feedItems: items.filter((item) => item.via === 'feed').length,
    feedSources: new Set(items.filter((item) => item.via === 'feed').map((item) => item.source)).size,
    byDay,
    incidentShare: pct(incidents.length, items.length),
    serbiaShare: pct(byChannel.find(([id]) => id === 'beograd')?.[1] || 0, items.length),
  };
}

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const itemRow = (item) => `<tr><td><time datetime="${item.date}">${dayLabel(item.date)} ${item.time}</time></td><td><a href="${esc(item.url)}" target="_blank" rel="external noopener">${esc(item.title)}</a><br><span style="color:#8b9bad;font-size:12px">${esc(item.source)} · ${esc(item.city)}</span></td></tr>`;

export function buildElectionDesk(portalRoot) {
  const items = collect(portalRoot);
  const m = metrics(items);
  const stamp = lastUpdated(portalRoot) || `${m.newest}T06:00:00Z`;
  m.updatedAt = stamp;
  const updatedDay = stamp.slice(0, 10);
  const updatedLabel = `${Number(updatedDay.slice(8, 10))}. ${Number(updatedDay.slice(5, 7))}. ${updatedDay.slice(0, 4)}.`;
  const latest = items.slice(0, 12);
  const incidents = items.filter((item) => item.incident);
  const surveys = items.filter((item) => item.survey);

  const table = (rows, caption = '') => `<table>${caption ? `<caption style="caption-side:top;text-align:left;color:#8b9bad;font-size:12px;padding-bottom:6px">${esc(caption)}</caption>` : ''}<thead><tr><th>Vrijeme</th><th>Objava</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;

  const statCards = (lang) => `<div class="stat">
    <div><b>${m.total}</b><span>${lang === 'en' ? 'items tracked' : 'zapisa u arhivi'}</span></div>
    <div><b>${m.sources}</b><span>${lang === 'en' ? 'media outlets' : 'medija'}</span></div>
    <div><b>${m.channels}</b><span>${lang === 'en' ? 'city editions' : 'gradskih izdanja'}</span></div>
    <div><b>${m.feedItems}</b><span>${lang === 'en' ? 'items from public feeds' : 'zapisa iz javnih feedova'}</span></div>
    <div><b>${m.incidents}</b><span>${lang === 'en' ? 'items mentioning incidents' : 'zapisa koji spominju incident'}</span></div>
  </div>`;

  const sourceTable = `<table><thead><tr><th>Medij</th><th>Zapisa</th></tr></thead><tbody>${m.bySource.map(([name, n]) => `<tr><td>${esc(name)}</td><td>${n}</td></tr>`).join('')}</tbody></table>`;
  const channelTable = `<table><thead><tr><th>Izdanje</th><th>Zapisa</th><th>Udio</th></tr></thead><tbody>${m.byChannel.map(([id, n]) => `<tr><td>${esc(CITY[id] || id)}</td><td>${n}</td><td>${pct(n, m.total)} %</td></tr>`).join('')}${m.feedItems ? `<tr><td>${'Javni feedovi (izvan arhive)'}</td><td>${m.feedItems}</td><td>${pct(m.feedItems, m.total)} %</td></tr>` : ''}</tbody></table>`;
  const countryTable = `<table><thead><tr><th>Država izvora</th><th>Zapisa</th><th>Udio</th></tr></thead><tbody>${m.byCountry.map(([code, n]) => `<tr><td>${esc(COUNTRY_NAME[code] || code)}</td><td>${n}</td><td>${pct(n, m.total)} %</td></tr>`).join('')}</tbody></table>`;
  const dayTable = `<table><thead><tr><th>Dan</th><th>Zapisa</th></tr></thead><tbody>${m.byDay.map(([day, n]) => `<tr><td><time datetime="${day}">${dayLabel(day)}</time></td><td>${n}</td></tr>`).join('')}</tbody></table>`;

  const methodHr = [
    'Desk ne anketira i ne prognozira. Ima dva sloja izvora: arhivu osam gradskih izdanja AKTUAL MEDIA, koju osvježava dnevni ciklus, i javne RSS/Atom feedove srpskih, hrvatskih, bosanskih, britanskih, američkih i drugih medija. Oba sloja prolaze isti kriterij, a isti URL se broji samo jednom.',
    'Zato brojke na ovoj stranici mjere medijsku pokrivenost, ne stvarnost: 40 zapisa o istom skupu nije 40 skupova. Kad se brojka može pogrešno pročitati, uz nju stoji objašnjenje.',
    'Incident se broji po ključnim riječima u naslovu i sažetku (policija, sukob, hapšenje, napad, protest, blokada). To je grubo mjerenje i tako je označeno — ne tvrdimo da je svaki takav zapis incident ni da su svi incidenti zabilježeni.',
  ];
  const methodEn = [
    'The desk does not poll and does not forecast. It has two source layers: the archive of eight AKTUAL MEDIA city editions, refreshed by the daily cycle, and public RSS/Atom feeds from Serbian, Croatian, Bosnian, British, American and other outlets. Both layers pass the same criterion, and the same URL is counted once.',
    'So the numbers here measure media coverage, not reality: 40 items about one rally are not 40 rallies. Where a figure can be misread, it is explained next to the figure.',
    'An incident is counted by keywords in the title and summary (police, clash, arrest, attack, protest, blockade). That is a rough measure and it is labelled as such — we do not claim every such item is an incident, nor that every incident is captured.',
  ];

  const pages = [
    {
      slug: '',
      nav: { hr: 'Početna', en: 'Home' },
      kicker: { hr: 'Nadzorni desk · privremeno izdanje', en: 'Monitoring desk · temporary edition' },
      title: {
        hr: `Izbori u Srbiji: ${m.total} zapisa iz ${m.sources} medija`,
        en: `Serbia’s election: ${m.total} items from ${m.sources} outlets`,
      },
      lead: {
        hr: 'Ovaj desk prati što mediji u Srbiji, Hrvatskoj, Bosni i Hercegovini i Sjedinjenim Državama objavljuju o izborima — i to ne prepisuje, nego broji i povezuje. Svaki zapis ima medij, grad, datum i poveznicu na izvornik.',
        en: 'This desk follows what media in Serbia, Croatia, Bosnia and Herzegovina and the United States publish about the election — and it does not copy, it counts and links. Every item has an outlet, a city, a date and a link to the original.',
      },
      sections: [
        { h: { hr: 'Brojke iz arhive', en: 'Numbers from the archive' }, p: { hr: [`Desk je pokrenut 22. 10. 2026. i radi do završetka izbornog procesa. Ovo nisu rezultati izbora ni procjena izlaznosti: ovo je broj objava u arhivi, po mediju i po danu, s metodom na dnu stranice. Arhiva je osvježena ${updatedLabel}`], en: [`The desk started on 22 October 2026 and runs until the electoral process ends. These are not election results or turnout estimates: they are counts of published items in the archive, by outlet and by day, with the method at the bottom. The archive was refreshed on ${updatedLabel}`] }, html: { hr: statCards('hr'), en: statCards('en') } },
        { h: { hr: 'Najnovije', en: 'Latest' }, p: { hr: ['Zadnjih dvanaest zapisa, bez odabira i bez izostavljanja.'], en: ['The last twelve items, without selection or omission.'] }, html: { hr: table(latest.map(itemRow), 'Zadnjih dvanaest zapisa, po vremenu objave.'), en: table(latest.map(itemRow), 'The last twelve items, by publication time.') } },
        { h: { hr: 'Sigurnost i incidenti', en: 'Safety and incidents' }, p: { hr: [`${m.incidents} zapisa (${m.incidentShare} %) u arhivi spominje incident, sukob, policiju, hapšenje ili blokadu. Popis je na posebnoj stranici, s istim pravilom: svaki zapis ima izvornik.`], en: [`${m.incidents} items (${m.incidentShare}%) in the archive mention an incident, clash, police, arrest or blockade. The list is on a separate page, with the same rule: every item has an original.`] }, html: { hr: table(incidents.slice(0, 6).map(itemRow), 'Šest najnovijih zapisa koji spominju incident.'), en: table(incidents.slice(0, 6).map(itemRow), 'The six most recent items mentioning an incident.') } },
      ],
      faq: [
        { q: { hr: 'Je li ovo izborna prognoza?', en: 'Is this an election forecast?' }, a: { hr: 'Nije. Desk broji medijske objave. Ne objavljuje ankete kao rezultate, ne procjenjuje izlaznost i ne predviđa pobjednika.', en: 'No. The desk counts media items. It does not report polls as results, estimate turnout, or predict a winner.' } },
        { q: { hr: 'Koliko često se osvježava?', en: 'How often is it updated?' }, a: { hr: 'Kad se osvježi arhiva izdanja — u pravilu svaka dva sata. Stranica se gradi iz istih datoteka, pa se brojke ne mogu razilaziti s arhivom.', en: 'Whenever the editions archive refreshes — usually every two hours. The page is built from the same files, so the figures cannot drift from the archive.' } },
      ],
      images: [0, 1, 2, 3],
      updated: updatedDay,
    },
    {
      slug: 'pregled',
      nav: { hr: 'Pregled', en: 'All items' },
      kicker: { hr: 'Pregled', en: 'All items' },
      title: { hr: `Svi zapisi: ${m.total} objava`, en: `All items: ${m.total} published` },
      lead: {
        hr: 'Cijeli popis, poredan po vremenu objave. Bez filtriranja po političkoj opciji i bez izostavljanja neugodnih zapisa.',
        en: 'The complete list, ordered by publication time. No filtering by political option and no omission of uncomfortable items.',
      },
      sections: [
        { h: { hr: 'Po danu', en: 'By day' }, p: { hr: ['Dan s najviše zapisa je dan s najviše objava, ne nužno dan s najviše događaja.'], en: ['The day with the most items is the day with the most coverage, not necessarily the day with the most events.'] }, html: { hr: dayTable, en: dayTable } },
        { h: { hr: 'Svi zapisi', en: 'All items' }, p: { hr: ['Ako je poveznica mrtva, zapis ostaje u arhivi s naslovom i datumom — brisanje bi bilo uređivanje povijesti.'], en: ['If a link dies, the item stays in the archive with its title and date — deleting it would be editing history.'] }, html: { hr: table(items.map(itemRow), 'Cijeli popis, po vremenu objave.'), en: table(items.map(itemRow), 'The complete list, by publication time.') } },
      ],
      faq: [],
      images: [1, 4],
      updated: updatedDay,
    },
    {
      slug: 'statistika',
      nav: { hr: 'Statistika', en: 'Statistics' },
      kicker: { hr: 'Statistika', en: 'Statistics' },
      title: { hr: 'Tko piše i koliko: mediji, gradovi, dani', en: 'Who writes and how much: outlets, cities, days' },
      lead: {
        hr: 'Tablica pokazuje samo jedno: koliko je zapisa koji zadovoljavaju kriterij iz metodologije. Ne pokazuje naklonost, ne pokazuje doseg i ne pokazuje istinitost.',
        en: 'The table shows one thing only: how many items meet the method’s criterion. It does not show bias, reach or truth.',
      },
      sections: [
        { h: { hr: 'Mediji', en: 'Outlets' }, p: { hr: ['Broj zapisa po mediju u promatranom razdoblju.'], en: ['Items per outlet in the observed period.'] }, html: { hr: sourceTable, en: sourceTable } },
        { h: { hr: 'Države izvora', en: 'Source countries' }, p: { hr: ['Zemlja medija, ne zemlja događaja. Desk čita Srbiju, Hrvatsku, BiH, Britaniju, SAD i druge feedove — ali samo kad zapis prođe kriterij.'], en: ['The outlet’s country, not the event’s. The desk reads Serbia, Croatia, Bosnia, Britain, the US and other feeds — but only when an item passes the criterion.'] }, html: { hr: countryTable, en: countryTable } },
        { h: { hr: 'Gradska izdanja', en: 'City editions' }, p: { hr: ['Iz kojeg izdanja je zapis ušao u arhivu — to je put preuzimanja, ne mjesto događaja.'], en: ['Which edition the item entered the archive through — that is the ingestion path, not the location of the event.'] }, html: { hr: channelTable, en: channelTable } },
        { h: { hr: 'Dani', en: 'Days' }, p: { hr: ['Raspodjela po danu objave.'], en: ['Distribution by publication day.'] }, html: { hr: dayTable, en: dayTable } },
        { h: { hr: 'Ankete u arhivi', en: 'Polls in the archive' }, p: { hr: [`${m.surveyMentions} zapisa spominje anketu ili istraživanje. Desk ih ne prenosi kao rezultat — samo bilježi da postoje i tko ih je objavio.`], en: [`${m.surveyMentions} items mention a poll or survey. The desk does not report them as results — it records that they exist and who published them.`] }, html: { hr: surveys.length ? table(surveys.slice(0, 10).map(itemRow)) : '<p style="color:#8b9bad">Nema zapisa.</p>', en: surveys.length ? table(surveys.slice(0, 10).map(itemRow)) : '<p style="color:#8b9bad">No items.</p>' } },
      ],
      faq: [],
      images: [2, 3],
      updated: updatedDay,
    },
    {
      slug: 'sigurnost',
      nav: { hr: 'Sigurnost', en: 'Safety' },
      kicker: { hr: 'Sigurnost', en: 'Safety' },
      title: { hr: `Incidenti i napetost: ${m.incidents} zapisa`, en: `Incidents and tension: ${m.incidents} items` },
      lead: {
        hr: 'Ovaj popis nije popis incidenata — to je popis objava koje spominju incident. Razlika je važna i zato stoji u prvoj rečenici.',
        en: 'This is not a list of incidents — it is a list of items that mention an incident. The difference matters, which is why it is in the first sentence.',
      },
      sections: [
        { h: { hr: 'Što se broji', en: 'What is counted' }, p: { hr: ['Ključne riječi: policija, sukob, hapšenje, napad, prijetnja, nasilje, protest, blokada, ozljeda. Ako medij napiše „mirno“ i ne spomene nijednu, zapis ne ulazi u ovaj popis.'], en: ['Keywords: police, clash, arrest, attack, threat, violence, protest, blockade, injury. If an outlet writes “calm” and mentions none, the item does not enter this list.'] }, html: { hr: table(incidents.map(itemRow), 'Svi zapisi s incidentnim rječnikom.'), en: table(incidents.map(itemRow), 'All items carrying incident vocabulary.') } },
        { h: { hr: 'Što ovaj desk ne radi', en: 'What this desk does not do' }, p: { hr: ['Ne objavljuje imena osumnjičenih, ne prenosi snimke nasilja i ne zaključuje o krivnji. Ako je netko uhićen, to je činjenica iz medija, ne presuda.'], en: ['It does not publish suspects’ names, does not repost footage of violence, and does not conclude guilt. If someone was arrested, that is a media fact, not a verdict.'] }, html: { hr: '', en: '' } },
      ],
      faq: [],
      images: [3, 5],
      updated: updatedDay,
    },
    {
      slug: 'izvori',
      nav: { hr: 'Izvori', en: 'Sources' },
      kicker: { hr: 'Izvori', en: 'Sources' },
      title: { hr: 'Mediji koje desk čita', en: 'Outlets the desk reads' },
      lead: {
        hr: 'Desk ne bira medije po naklonosti. U arhivu ulazi sve što osam gradskih izdanja preuzme, a javni feedovi se čitaju po fiksnom popisu. Oba popisa su javna i mijenjaju se kad se promijeni izvor.',
        en: 'The desk does not pick outlets by sympathy. The archive carries whatever the eight city editions ingest, and public feeds are read from a fixed list. Both lists are public and change when the source does.',
      },
      sections: [
        { h: { hr: 'Popis s brojem zapisa', en: 'The list with item counts' }, p: { hr: ['Broj zapisa nije ocjena kvalitete. Medij koji objavi više tekstova ima više zapisa.'], en: ['An item count is not a quality rating. An outlet that publishes more has more items.'] }, html: { hr: sourceTable, en: sourceTable } },
        { h: { hr: 'Kako provjeriti zapis', en: 'How to check an item' }, p: { hr: ['Svaki zapis vodi na izvornik. Ako se naslov u međuvremenu promijeni, u arhivi ostaje onaj koji je bio u trenutku preuzimanja — i to je jedina verzija koju ovaj desk može jamčiti.'], en: ['Every item links to the original. If a headline later changes, the archive keeps the one captured at ingestion — and that is the only version this desk can vouch for.'] }, html: { hr: '', en: '' } },
      ],
      faq: [],
      images: [4, 0],
      updated: updatedDay,
    },
    {
      slug: 'metodologija',
      nav: { hr: 'Metodologija', en: 'Method' },
      kicker: { hr: 'Metodologija', en: 'Method' },
      title: { hr: 'Kako desk broji i gdje su granice', en: 'How the desk counts, and where the limits are' },
      lead: { hr: 'Metoda je kratka i provjerljiva: arhiva, kriterij, brojanje. Sve ostalo je interpretacija koja se ne objavljuje.', en: 'The method is short and checkable: archive, criterion, count. Everything else is interpretation we do not publish.' },
      sections: [
        { h: { hr: 'Kriterij', en: 'Criterion' }, p: { hr: methodHr, en: methodEn } },
        { h: { hr: 'Granice', en: 'Limits' }, p: {
          hr: ['Arhiva nije cijeli internet. Medij koji nije u arhivi ne ulazi u brojku — pa ni veliki međunarodni mediji ako ih gradsko izdanje ne preuzme. Desk zato ne tvrdi da je popis potpun.'],
          en: ['The archive is not the whole internet. An outlet outside the archive does not enter the count — including large international outlets if no city edition picks them up. The desk therefore does not claim the list is complete.'],
        }, html: { hr: '', en: '' } },
      ],
      faq: [
        { q: { hr: 'Zašto desk ne objavljuje izlaznost?', en: 'Why does the desk not publish turnout?' }, a: { hr: 'Zato što je izlaznost podatak izbornih tijela, a ne medijska procjena. Kad izborna tijela objave brojku, desk je može prenijeti s izvorom — do tada je nema.', en: 'Because turnout is data from electoral bodies, not a media estimate. Once an electoral body publishes a figure, the desk can report it with a source — until then it does not exist here.' } },
      ],
      images: [5, 1],
      updated: updatedDay,
    },
  ];

  const withImages = pages.map((page) => ({
    ...page,
    images: (page.images || []).map((index) => `/img/${'izbori-srbija'}-art-${index + 1}.svg`),
  }));
  return {
    items,
    metrics: m,
    latest,
    incidents,
    surveys,
    pages: Object.fromEntries(withImages.map((page) => [page.slug, page])),
  };
}
