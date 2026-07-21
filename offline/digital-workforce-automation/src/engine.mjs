import crypto from 'node:crypto';

const FINANCIAL_CLASSES = new Set(['ACTUAL', 'COMMITTED', 'FORECAST', 'SIMULATED']);
const PUBLICATION_STATUS = 'DRAFT_ONLY';

function hashSeed(value) {
  return Number.parseInt(crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 8), 16);
}

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

function stableId(prefix, ...parts) {
  return `${prefix}_${crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12)}`;
}

function assertState(state) {
  if (!state || typeof state !== 'object') throw new TypeError('Company state is required.');
  if (!Array.isArray(state.projects) || !Array.isArray(state.agents)) {
    throw new TypeError('Company state must contain projects and agents arrays.');
  }
  for (const item of state.financials ?? []) {
    if (!FINANCIAL_CLASSES.has(item.classification)) {
      throw new Error(`Invalid financial classification: ${item.classification}`);
    }
  }
}

function createEvent(random, date, project) {
  const candidates = [
    ['MILESTONE_REACHED', 'Milestone je potvrđen dokazom i spreman je za internu provjeru.'],
    ['DEPENDENCY_AT_RISK', 'Vanjska ili međuprojektna ovisnost traži novu procjenu roka.'],
    ['QUALITY_REVIEW_REQUIRED', 'Rezultat je tehnički završen, ali nije prošao sadržajnu provjeru.'],
    ['SCOPE_CLARIFICATION', 'Tim je otkrio da zahtjev ima dvije moguće interpretacije.'],
    ['QUIET_PROGRESS', 'Nema eskalacije; rad je napredovao bez potrebe za sastankom.'],
    ['DECISION_REQUIRED', 'Za nastavak je potrebna odluka unutar već odobrenih ovlasti.']
  ];
  const [type, summary] = pick(random, candidates);
  return {
    id: stableId('evt', date, project.id, type),
    date,
    type,
    projectId: project.id,
    severity: type === 'DEPENDENCY_AT_RISK' ? 'medium' : type === 'DECISION_REQUIRED' ? 'high' : 'low',
    summary,
    evidenceRequired: type !== 'QUIET_PROGRESS'
  };
}

const VOICES = {
  al: {
    opening: ['Današnji fokus nije količina aktivnosti nego zatvaranje ključnih ovisnosti.', 'Prioritet je pretvoriti otvorena pitanja u jasne odluke i vlasnike.', 'Danas ćemo smanjiti operativnu neizvjesnost prije širenja opsega.'],
    close: ['Sve što nema dokaz ostaje nacrt.', 'Nijedna blokada neće biti skrivena iza općenite formulacije.', 'Objavljuje se rezultat, ne dojam aktivnosti.']
  },
  finance: {
    opening: ['Financijski učinak promatram kroz trag podataka, ne kroz optimističnu procjenu.', 'Prije zaključka odvajam stvarno, preuzeto, očekivano i simulirano.', 'Broj bez izvora i klasifikacije nije upravljačka informacija.'],
    close: ['Odstupanje se mora objasniti prije nego se koristi u odluci.', 'Simulacija ne smije izgledati kao knjiženi događaj.', 'Svaka brojka mora imati vlasnika i datum provjere.']
  },
  legal: {
    opening: ['Prvo provjeravam ovlast, izvor i mogući pravni učinak formulacije.', 'Brzina nije razlog da se preskoči granica odgovornosti.', 'Komentar mora jasno razlikovati činjenicu, procjenu i odluku.'],
    close: ['Bez pravne osnove nema obvezujuće formulacije.', 'Nacrt ostaje nacrt dok ovlaštena osoba ne odluči.', 'Rizik se opisuje precizno, bez dramatiziranja.']
  },
  technology: {
    opening: ['Tražim najmanju promjenu koja uklanja stvarni uzrok problema.', 'Prije proširenja sustava provjeravam observability, rollback i granice greške.', 'Tehnički završeno nije isto što i operativno pouzdano.'],
    close: ['Bez mjerljivog testa nema oznake gotovo.', 'Fallback mora biti jednostavniji od primarnog puta.', 'Sustav mora degradirati sigurno, ne glasno.']
  },
  operations: {
    opening: ['Danas zatvaramo vlasništvo nad zadacima i uklanjamo čekanja bez roka.', 'Operativni plan mora imati sljedeći potez, vlasnika i vrijeme provjere.', 'Neću sazvati sastanak ako se problem može riješiti jasnim zadatkom.'],
    close: ['Otvoreno pitanje bez vlasnika smatra se procesnim kvarom.', 'Sastanak mora završiti odlukom ili novim dokazom.', 'Završeno znači provjereno i predano dalje.']
  },
  communications: {
    opening: ['Javna poruka mora biti korisna, provjerljiva i različita od jučerašnje.', 'Ne objavljujemo internu buku; objavljujemo relevantnu promjenu.', 'Ton ostaje miran čak i kad je događaj važan.'],
    close: ['Bez nove vrijednosti nema nove objave.', 'Naslov ne smije biti jači od dokaza.', 'Različitost nije ukras nego zaštita od automatiziranog šuma.']
  }
};

function managerComment(random, agent, event, project) {
  const voice = VOICES[agent.voice] ?? VOICES.operations;
  return {
    id: stableId('comment', event.id, agent.id),
    authorId: agent.id,
    role: agent.role,
    projectId: project.id,
    eventId: event.id,
    text: `${pick(random, voice.opening)} ${event.summary} ${pick(random, voice.close)}`,
    status: PUBLICATION_STATUS,
    evidenceRefs: event.evidenceRequired ? [`project:${project.id}`, `event:${event.id}`] : [`project:${project.id}`]
  };
}

function shouldMeet(event) {
  return ['DEPENDENCY_AT_RISK', 'DECISION_REQUIRED', 'SCOPE_CLARIFICATION'].includes(event.type);
}

function createMeeting(date, event, project, agents) {
  if (!shouldMeet(event)) return null;
  const attendees = agents.filter((agent) => ['al', 'operations', 'finance', 'legal', 'technology'].includes(agent.voice)).slice(0, 5);
  return {
    id: stableId('meeting', date, event.id),
    date,
    title: `${project.name}: ${event.type.replaceAll('_', ' ').toLowerCase()}`,
    triggerEventId: event.id,
    attendeeIds: attendees.map((agent) => agent.id),
    agenda: ['potvrditi činjenice', 'odrediti vlasnika', 'odrediti rok provjere', 'zabilježiti odluku ili razlog odgode'],
    expectedOutcome: event.type === 'DECISION_REQUIRED' ? 'decision' : 'action-plan',
    status: 'DRAFT'
  };
}

function createTask(date, event, project, owner) {
  return {
    id: stableId('task', date, event.id, owner.id),
    date,
    projectId: project.id,
    ownerId: owner.id,
    title: event.type === 'QUIET_PROGRESS' ? `Dokumentirati napredak: ${project.name}` : `Obraditi ${event.type.toLowerCase().replaceAll('_', ' ')} za ${project.name}`,
    status: 'OPEN',
    priority: event.severity === 'high' ? 'P1' : event.severity === 'medium' ? 'P2' : 'P3',
    acceptanceCriteria: ['naveden dokaz', 'jasan zaključak', 'sljedeći korak i vlasnik', 'bez javne objave']
  };
}

function createDrafts(date, state, events, comments, meetings, tasks) {
  const byTab = {
    plan: [{ title: 'Dnevni operativni smjer', body: `${tasks.length} zadataka otvoreno je iz današnjih potvrđenih događaja.` }],
    bilten: [{ title: 'AL jutarnji briefing', body: `${events.length} događaja, ${meetings.length} opravdanih sastanaka i ${comments.length} stručnih komentara.` }],
    projekti: events.map((event) => ({ title: state.projects.find((p) => p.id === event.projectId)?.name ?? event.projectId, body: event.summary })),
    rizici: events.filter((event) => event.severity !== 'low').map((event) => ({ title: event.type, body: event.summary })),
    misljenja: comments.map((comment) => ({ title: comment.role, body: comment.text })),
    ovisnosti: events.filter((event) => event.type === 'DEPENDENCY_AT_RISK').map((event) => ({ title: 'Ovisnost pod nadzorom', body: event.summary })),
    zadaci: tasks.map((task) => ({ title: task.title, body: `${task.priority} · ${task.status}` })),
    krediti: (state.financials ?? []).filter((item) => item.classification === 'SIMULATED').map((item) => ({ title: `${item.name} — SIMULATED`, body: String(item.value) })),
    newsroom: events.filter((event) => event.type === 'MILESTONE_REACHED').map((event) => ({ title: 'Kandidat za objavu nakon provjere', body: event.summary })),
    workeri: tasks.map((task) => ({ title: `Aktivnost ${task.ownerId}`, body: task.title })),
    zapisnik: meetings.map((meeting) => ({ title: meeting.title, body: meeting.agenda.join('; ') }))
  };

  return Object.entries(byTab).flatMap(([tab, items]) => items.map((item, index) => ({
    id: stableId('draft', date, tab, index, item.title),
    date,
    tab,
    title: item.title,
    body: item.body,
    status: PUBLICATION_STATUS,
    publishAt: null,
    public: false
  })));
}

export function generateDailyCycle(state, date) {
  assertState(state);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date must use YYYY-MM-DD.');

  const random = rng(hashSeed(`${state.companyId}|${date}|offline-v1`));
  const events = state.projects.map((project) => createEvent(random, date, project));
  const comments = [];
  const meetings = [];
  const tasks = [];

  for (const [index, event] of events.entries()) {
    const project = state.projects.find((item) => item.id === event.projectId);
    const eligible = state.agents.filter((agent) => agent.active !== false && agent.voice !== 'al');
    const owner = eligible[index % eligible.length];
    comments.push(managerComment(random, owner, event, project));
    const meeting = createMeeting(date, event, project, state.agents);
    if (meeting) meetings.push(meeting);
    tasks.push(createTask(date, event, project, owner));
  }

  const al = state.agents.find((agent) => agent.voice === 'al');
  if (al && events.length) comments.unshift(managerComment(random, al, events[0], state.projects[0]));

  const drafts = createDrafts(date, state, events, comments, meetings, tasks);

  return {
    schemaVersion: 'offline-workforce-cycle/v1',
    mode: 'OFFLINE',
    date,
    timezone: 'Europe/Zagreb',
    companyId: state.companyId,
    events,
    comments,
    meetings,
    tasks,
    drafts,
    controls: {
      publicPublishingEnabled: false,
      cronEnabled: false,
      productionWritesEnabled: false,
      allDraftsArePrivate: drafts.every((draft) => draft.status === PUBLICATION_STATUS && draft.public === false)
    }
  };
}

export function validateCycle(cycle) {
  const errors = [];
  if (cycle.mode !== 'OFFLINE') errors.push('Cycle mode must be OFFLINE.');
  if (cycle.controls?.publicPublishingEnabled !== false) errors.push('Public publishing must be disabled.');
  if (cycle.drafts?.some((draft) => draft.status !== PUBLICATION_STATUS || draft.public !== false || draft.publishAt !== null)) {
    errors.push('Every publication item must remain private DRAFT_ONLY with no publish time.');
  }
  const normalized = new Set();
  for (const comment of cycle.comments ?? []) {
    const key = comment.text.toLocaleLowerCase('hr-HR').replace(/\s+/g, ' ').trim();
    if (normalized.has(key)) errors.push(`Duplicate manager comment: ${comment.id}`);
    normalized.add(key);
  }
  return { ok: errors.length === 0, errors };
}
