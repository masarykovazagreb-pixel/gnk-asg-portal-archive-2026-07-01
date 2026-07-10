// GNK_ASG_AI_NEWSROOM_WRITER_V1
// Zaseban worker. NE dira postojeći gnk-asg-direct-operator cron
// (koji ostaje isključivo email-status-sync, kako je testirano u
// deploy-public-portal-assets-safe.yml).
//
// Što radi (jednom dnevno, cron):
// 1. Čita javni news.json (već agregirane, stvarne vijesti).
// 2. Bira do 3 teme dana (najnovije, iz dopuštenih kategorija).
// 3. Za svaku temu traži od GNK AI (ai-assist-worker) IZVORNI kratki
//    komentar/analizu (ne kopira izvorni tekst - autorsko pravo).
// 4. Upisuje u POSTOJEĆI red news-auto-publication/enqueue, koji već
//    ima svoj sigurnosni klasifikator (blokira pravno/financijsko/
//    osobne podatke za ručni pregled) - ovaj worker ga ne zaobilazi.
//
// Transparentnost: svaki upis jasno navodi da je izvorni komentar
// AI-orkestriran, s bylineom prema kod-shemi (GNK-ASG-HR-WORKER-NEWS),
// nikad izmišljeno ljudsko ime.

const ENQUEUE_ENDPOINT = 'https://gnk-asg.hr/api/news-auto-publication/enqueue';
const AI_ASSIST_ENDPOINT = 'https://gnk-asg.hr/api/ai-assist';
const NEWS_SOURCE_URL = 'https://gnk-asg.hr/data/news.json';
const BYLINE = 'GNK-ASG-HR-WORKER-NEWS · AI-orkestrirano';
const MAX_TOPICS_PER_RUN = 3;

// Iste dopuštene kategorije kao postojeći klasifikator - ne pokušavamo
// zaobići pravni/financijski/osobni-podaci filter tako da biramo
// samo teme koje već prolaze kao source-summary-business/technology.
const SAFE_CATEGORIES = new Set([
  'source-summary-business',
  'source-summary-technology',
  'source-summary-markets',
  'source-summary-fintech'
]);

function clean(v) { return String(v || '').trim(); }

async function pickTopics(env) {
  const res = await fetch(NEWS_SOURCE_URL, { cf: { cacheTtl: 0 } });
  if (!res.ok) throw new Error(`news_fetch_failed_${res.status}`);
  const articles = await res.json();
  if (!Array.isArray(articles)) throw new Error('news_format_unexpected');

  // Preskoči teme koje sadrže pravne/osobne/financijske signale -
  // isti duh kao postojeći backend klasifikator, primijenjen ranije
  // da se ne troši AI poziv na temu koja će svejedno ići u ručni pregled.
  const riskPattern = /court|lawsuit|legal|sud|tužb|passport|osobni podaci|personal data|profit|revenue|dobit|prihod/i;

  return articles
    .filter(a => a && a.title && a.summary && !riskPattern.test(`${a.title} ${a.summary}`))
    .slice(0, MAX_TOPICS_PER_RUN);
}

async function writeCommentary(topic, lang) {
  const prompt = [
    'Napiši izvorni, kratak poslovni komentar (120-180 riječi) o sljedećoj temi dana.',
    'Ne prepisuj izvorni tekst - napiši vlastitu analizu i kontekst.',
    'Ton: poslovno, oprezno, neutralno. Ne izmišljaj činjenice izvan danog konteksta.',
    'Na kraju ne dodaji potpis, on se dodaje automatski.',
    '',
    `Naslov teme: ${topic.title}`,
    `Sažetak teme: ${topic.summary}`,
    `Izvor: ${topic.source || 'nepoznat'}`
  ].join('\n');

  const res = await fetch(AI_ASSIST_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      task: 'newsroom_commentary',
      style: 'corporate',
      lang,
      subject: topic.title,
      context: 'GNK ASG Newsroom - dnevni AI-orkestrirani komentar',
      text: prompt
    })
  });
  if (!res.ok) throw new Error(`ai_assist_failed_${res.status}`);
  const data = await res.json();
  if (!data || !data.text) throw new Error('ai_assist_empty');
  return { text: data.text, aiGenerated: !!data.ai };
}

async function enqueuePost(topic, commentary, lang) {
  const summary = `${BYLINE}${commentary.aiGenerated ? '' : ' (predložak, AI nedostupan)'}.\n\n${commentary.text}`.slice(0, 700);
  const payload = {
    title: topic.title,
    summary,
    sourceName: 'GNK ASG Newsroom',
    sourceUrl: clean(topic.url || ''),
    imageUrl: clean(topic.image || '/assets/gnk-gold-logo.svg'),
    imageCredit: clean(topic.imageCredit || 'GNK ASG'),
    category: 'source-summary-business'
  };
  const res = await fetch(ENQUEUE_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`enqueue_failed_${res.status}`);
  return res.json();
}

async function runDailyNewsroom(env) {
  const results = { ok: true, processed: 0, queued: 0, manualReview: 0, errors: [] };
  try {
    const topics = await pickTopics(env);
    for (const topic of topics) {
      try {
        const commentary = await writeCommentary(topic, 'hr');
        const enqueued = await enqueuePost(topic, commentary, 'hr');
        results.processed++;
        if (enqueued && enqueued.post && enqueued.post.status === 'queued') results.queued++;
        else results.manualReview++;
      } catch (err) {
        results.errors.push({ topic: topic.title, error: err.message || String(err) });
      }
    }
  } catch (err) {
    results.ok = false;
    results.errors.push({ error: err.message || String(err) });
  }
  return results;
}

export default {
  async fetch(request, env) {
    // Ručno pokretanje radi testiranja - GET vraća status, POST pokreće odmah.
    if (request.method === 'GET') {
      return new Response(JSON.stringify({
        ok: true,
        service: 'GNK ASG AI Newsroom Writer',
        note: 'POST za ručno pokretanje dnevnog ciklusa (inače se pokreće cronom).'
      }, null, 2), { headers: { 'content-type': 'application/json' } });
    }
    if (request.method === 'POST') {
      const result = await runDailyNewsroom(env);
      return new Response(JSON.stringify(result, null, 2), {
        status: result.ok ? 200 : 500,
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response('Method not allowed', { status: 405 });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDailyNewsroom(env));
  }
};
