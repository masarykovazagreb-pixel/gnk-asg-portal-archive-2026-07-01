// Generates up to 3 LinkedIn drafts per day (morning/midday/evening,
// Zagreb time) into KV for approval via /linkedin-daily/. Runs from the
// existing cron trigger (*/15 * * * *) in the main worker -- each tick
// checks whether the current Zagreb hour matches one of the 3 slots and
// whether that slot's draft has already been generated today; if not, it
// generates one and stores it.
//
// This intentionally reuses existing, already-published site images
// (no live image generation inside the Worker) so every draft always has
// a real, on-site picture behind it.

const SLOTS = [
  { hour: 8, kind: 'news' },
  { hour: 13, kind: 'editorial' },
  { hour: 18, kind: 'project' },
];

const EDITORIAL_ROTATION = [
  { id: 'objave', url: 'https://gnk-asg.hr/objave/', image: 'https://gnk-asg.hr/assets/editorial/objave-800.webp',
    text: 'Novi tjedan, nove analize.\n\nNa Objavama pratimo financije, tehnologiju i korporativno upravljanje — svaki tekst s izvorima i uredničkim odobrenjem.\n\nPročitajte najnovije:' },
  { id: 'analize', url: 'https://gnk-asg.hr/analize/', image: 'https://gnk-asg.hr/assets/editorial/analize-card.webp',
    text: 'AI, kapital i energija nisu odvojene teme — jedan su sustav.\n\nGNK ASG Intelligence Desk povezuje ih u dubinske analize s naglaskom na transparentnost podataka.\n\nPogledajte:' },
  { id: 'komentari', url: 'https://gnk-asg.hr/komentari/', image: 'https://gnk-asg.hr/assets/editorial/komentari-card-v2.webp',
    text: 'Brzina bez odgovornosti nije napredak.\n\nKratki autorski komentari Nermina Sefića o tržištima, tehnologiji i poslovnom upravljanju.\n\nPročitajte:' },
];

const PROJECT_ROTATION = [
  { id: 'group-network', url: 'https://gnk-asg.hr/group-network/', image: 'https://gnk-asg.hr/assets/editorial/group-network-card.webp',
    text: '33 povezana društva. 12 lokacija u širenju. Jedna mreža.\n\nInteraktivni prikaz globalne mreže GNK DINAMO Ltd. Grupe.\n\nPogledajte:' },
  { id: 'the-code', url: 'https://gnk-asg.hr/the-code/', image: 'https://gnk-asg.hr/assets/editorial/the-code-card-hr.webp',
    text: '7. listopada 2026. New York. Aktivacija globalne mreže.\n\nTHE CODE — trenutak kada 45 povezanih društava postaje jedan sustav.\n\nSaznajte više:' },
  { id: 'ideje', url: 'https://gnk-asg.hr/ideje-u-djelovanju/', image: 'https://gnk-asg.hr/assets/editorial/ideje-card-hr.webp',
    text: 'Ideja bez provedbe ostaje samo ideja.\n\nNa Ideje u djelovanju pratimo koje zamisli GNK DINAMO Ltd. Grupe aktivno pretvara u konkretne korake.\n\nPogledajte:' },
];

function zagrebHour(date) {
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Zagreb' });
  return Number(fmt.format(date));
}

function zagrebDateKey(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }); // en-CA -> YYYY-MM-DD
  return fmt.format(date);
}

function dayOfYear(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  return Math.floor((date - start) / 86400000);
}

async function fetchTopNewsItem(env) {
  try {
    const res = await fetch('https://gnk-asg.hr/api/public-news-feed', { cf: { cacheTtl: 0 } });
    if (!res.ok) return null;
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.posts || data.items || data.news || []);
    const first = items.find(it => it && it.title);
    if (!first) return null;
    return {
      id: 'news',
      url: first.sourceUrl || first.url || 'https://gnk-asg.hr/gnk-aktual/',
      image: first.imageUrl || first.image || 'https://gnk-asg.hr/assets/editorial/aktual-media-800.webp',
      text: `${first.title}\n\nIzvor: ${first.sourceName || first.source || 'GNK ASG Newsroom'}. Pregled najnovijih vijesti iz gospodarstva, tehnologije i digitalne imovine:`,
    };
  } catch (_) {
    return null;
  }
}

async function pickContent(kind, env, doy) {
  if (kind === 'news') {
    const item = await fetchTopNewsItem(env);
    if (item) return item;
    return EDITORIAL_ROTATION[doy % EDITORIAL_ROTATION.length];
  }
  if (kind === 'editorial') return EDITORIAL_ROTATION[doy % EDITORIAL_ROTATION.length];
  return PROJECT_ROTATION[doy % PROJECT_ROTATION.length];
}

export async function maybeGenerateLinkedInDrafts(env, now = new Date()) {
  if (!env.GNK_ASG_CONFIG_KV) return;
  const hour = zagrebHour(now);
  const dateKey = zagrebDateKey(now);
  const doy = dayOfYear(now);

  const slot = SLOTS.find(s => s.hour === hour);
  if (!slot) return;

  const markerKey = `linkedin:generated:${dateKey}:${slot.hour}`;
  const already = await env.GNK_ASG_CONFIG_KV.get(markerKey);
  if (already) return;

  const content = await pickContent(slot.kind, env, doy);
  if (!content) return;

  const draftId = `${dateKey}-${slot.hour}`;
  const postText = `${content.text}\n${content.url}\n\n#GNKASG #GNKDINAMO #NerminSefic`;
  const draft = {
    draftId,
    status: 'pending',
    kind: slot.kind,
    contentId: content.id,
    postText,
    imageUrl: content.image,
    projectUrl: content.url,
    generatedAt: now.toISOString(),
  };

  await env.GNK_ASG_CONFIG_KV.put(`linkedin:draft:${draftId}`, JSON.stringify(draft));
  await env.GNK_ASG_CONFIG_KV.put(markerKey, '1', { expirationTtl: 172800 }); // 2 days

  // Maintain a small rolling list of the most recent pending draft ids for the UI.
  let list = [];
  try {
    const listRaw = await env.GNK_ASG_CONFIG_KV.get('linkedin:recent_drafts');
    if (listRaw) list = JSON.parse(listRaw);
  } catch (_) { /* ignore */ }
  list = [draftId, ...list.filter(id => id !== draftId)].slice(0, 10);
  await env.GNK_ASG_CONFIG_KV.put('linkedin:recent_drafts', JSON.stringify(list));
}
