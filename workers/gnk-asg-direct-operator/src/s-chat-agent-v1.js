// GNK ASG S+Chat — agent.
//
// Jedan endpoint, tri razine odgovora, jedna istina o tome što je
// odgovorilo:
//
//   1. OpenAI (env.OPENAI_API_KEY) — teče riječ po riječ.
//   2. Workers AI (env.AI) — teče riječ po riječ, bez vanjskog ključa.
//   3. Baza znanja portala — kad modela nema, odgovor dolazi izravno
//      iz 535 provjerenih zapisa i to se izričito kaže.
//
// Model nikad ne odgovara napamet: u sustavnu uputu ulazi samo ono što
// je dohvaćeno iz baze za to pitanje, uz popis dopuštenih poveznica.
// Ako pitanje nije o portalu, agent to kaže i uputi na kontakt.

import { knowledgeAnswer, knowledgeStats, search, suggestions, followUpQuestions } from './chat-retrieval-v1.js';
import { KB_VERSION } from './knowledge-base.generated-v1.js';

export const S_CHAT_VERSION = 'GNK_ASG_S_CHAT_AGENT_V1_20261020';
export const S_CHAT_PATH = '/api/s-chat';
export const S_CHAT_HEALTH_PATH = '/api/s-chat/health';

const MAX_MESSAGE = 800;
const MAX_HISTORY_TURNS = 8;
const RATE_LIMIT_PER_HOUR = 30;
const RATE_WINDOW_SECONDS = 3600;
const UPSTREAM_TIMEOUT_MS = 25000;

const store = (env) => env?.GNK_ASG_CONFIG_KV || env?.GNK_ASG_KV || null;
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
});

function pathOf(request) {
  return new URL(request.url).pathname.replace(/\/+$/, '') || '/';
}

async function rateLimited(env, ip) {
  const kv = store(env);
  if (!kv) return false;
  const key = `s-chat:rate:${ip}`;
  let count = 0;
  try {
    const raw = await kv.get(key);
    count = raw ? Number(JSON.parse(raw).count) || 0 : 0;
  } catch {}
  if (count >= RATE_LIMIT_PER_HOUR) return true;
  try {
    await kv.put(key, JSON.stringify({ count: count + 1 }), { expirationTtl: RATE_WINDOW_SECONDS });
  } catch {}
  return false;
}

/* ---------------- sustavna uputa ----------------

   Model dobiva točno ono što je dohvaćeno, ništa više. Tako ne može
   "popuniti" brojku koju nema u bazi, a korisnik dobiva poveznicu na
   stranicu s koje odgovor dolazi. */

function systemPrompt(lang, hits) {
  const contextLines = hits.map((hit, index) =>
    `[${index + 1}] (${hit.group}) ${hit.question}\n${hit.answer.slice(0, 900)}`).join('\n\n');

  if (lang === 'en') {
    return `You are GNK ASG S+Chat, the public assistant of the corporate portal gnk-asg.hr.

Rules:
- Answer in English, concisely: two to four sentences, unless the user asks for detail.
- Use ONLY the context below. Never invent numbers, names, dates or sources.
- If the context does not contain the answer, say so plainly and point to https://gnk-asg.hr/en/contact/.
- Do not give legal, tax, audit, financial or investment advice.
- Do not claim partnership, ranking or status that the context does not state.
- Mention that you are an AI assistant at most once, when it is genuinely useful.
- You may add at most one internal link, taken only from the context.

Context:
${contextLines || '(no matching record)'}`;
  }
  return `Ti si GNK ASG S+Chat, javni asistent korporativnog portala gnk-asg.hr.

Pravila:
- Odgovaraj na hrvatskom, kratko: dvije do četiri rečenice, osim kad korisnik traži detalj.
- Koristi ISKLJUČIVO kontekst ispod. Nikad ne izmišljaj brojke, imena, datume ni izvore.
- Ako kontekst ne sadrži odgovor, reci to jasno i uputi na https://gnk-asg.hr/contact/.
- Ne daj pravne, porezne, revizorske, financijske ni investicijske savjete.
- Ne tvrdi partnerstvo, rangiranje ni status kojeg kontekst ne navodi.
- Napomeni da si AI asistent najviše jednom, kad je to stvarno korisno.
- Možeš dodati najviše jednu internu poveznicu, samo iz konteksta.

Kontekst:
${contextLines || '(nema podudarnog zapisa)'}`;
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .slice(-MAX_HISTORY_TURNS * 2)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 1200) }));
}

/* ---------------- streaming ---------------- */

const encoder = new TextEncoder();
function sse(event, data) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function streamResponse(run) {
  const stream = new ReadableStream({
    start(controller) {
      const send = (event, data) => {
        try { controller.enqueue(sse(event, data)); } catch {}
      };
      run(send)
        .catch((error) => send('error', { message: String(error?.message || error).slice(0, 200) }))
        .finally(() => {
          try { controller.close(); } catch {}
        });
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
      'x-gnk-s-chat': S_CHAT_VERSION,
    },
  });
}

/* ---------------- OpenAI ---------------- */

async function streamOpenAI(env, messages, send, timeoutSignal) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      stream: true,
      max_tokens: 400,
      temperature: 0.2,
      messages,
    }),
    signal: timeoutSignal,
  });
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`openai_${response.status}:${text.slice(0, 120)}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let chars = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const token = JSON.parse(payload)?.choices?.[0]?.delta?.content;
          if (token) { chars += token.length; send('delta', { text: token }); }
        } catch {}
      }
    }
  }
  return chars;
}

/* ---------------- Workers AI ---------------- */

async function streamWorkersAi(env, messages, send, timeoutSignal) {
  const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
    messages,
    max_tokens: 400,
    temperature: 0.2,
    stream: true,
  }, { signal: timeoutSignal });
  if (!result || typeof result.getReader !== 'function') {
    // Neki modeli vrate gotov objekt umjesto streama.
    const text = String(result?.response || '').trim();
    if (!text) throw new Error('workers_ai_empty');
    send('delta', { text });
    return text.length;
  }
  const reader = result.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let chars = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          const token = parsed?.response ?? parsed?.choices?.[0]?.delta?.content;
          if (token) { chars += String(token).length; send('delta', { text: String(token) }); }
        } catch {}
      }
    }
  }
  return chars;
}

/* ---------------- odgovor ---------------- */

function detectLang(text) {
  const sample = String(text || '').toLowerCase();
  const english = (sample.match(/\b(the|what|how|who|which|is|are|does|do|can|of|and|for|with)\b/g) || []).length;
  const croatian = (sample.match(/\b(je|su|koji|koja|koje|kako|što|sto|tko|koliko|gdje|kada|zašto|zasto|li)\b/g) || []).length;
  return english > croatian ? 'en' : 'hr';
}

/* Poveznica na izvor smije doći samo iz zapisa koji je stvarno blizu
   najboljeg pogotka — inače uz točan odgovor stoji poveznica na
   susjednu temu i izgleda kao da je odande. */
function pageLinks(hits, lang) {
  if (!hits.length) return [];
  const top = hits[0].score || 1;
  const seen = new Set();
  const out = [];
  for (const hit of hits) {
    if (!hit.url) continue;
    if (hit.score < top * 0.7) continue;
    const url = hit.url === '/' ? 'https://gnk-asg.hr/' : `https://gnk-asg.hr${hit.url.endsWith('/') ? hit.url : `${hit.url}/`}`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: hit.question });
  }
  if (!out.length) {
    out.push({
      url: lang === 'en' ? 'https://gnk-asg.hr/en/knowledge-center/' : 'https://gnk-asg.hr/knowledge-center/',
      title: lang === 'en' ? 'Portal knowledge base' : 'Baza znanja portala',
    });
  }
  return out.slice(0, 3);
}

export async function handleSChat(request, env) {
  const path = pathOf(request);

  if (path === S_CHAT_HEALTH_PATH) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'GET, HEAD' });
    }
    const stats = knowledgeStats();
    const llm = env?.OPENAI_API_KEY ? 'openai' : (env?.AI ? 'workers-ai' : 'knowledge');
    return json({
      ok: true,
      version: S_CHAT_VERSION,
      llm,
      knowledge: { ...stats, generatedFor: KB_VERSION },
      rateLimit: { perHour: RATE_LIMIT_PER_HOUR, scope: 'per-ip-hourly' },
      streaming: true,
      history: { mode: 'client-and-server', maxTurns: MAX_HISTORY_TURNS },
      disclaimer: 'Odgovori su informativni i temelje se na javnoj bazi znanja portala.',
    });
  }

  if (path !== S_CHAT_PATH) return null;
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const message = String(body?.message || '').trim();
  if (!message) return json({ ok: false, error: 'empty_message' }, 400);
  if (message.length > MAX_MESSAGE) {
    return json({ ok: false, error: 'message_too_long', max: MAX_MESSAGE }, 400);
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (await rateLimited(env, ip)) {
    return json({ ok: false, error: 'rate_limited', retryAfter: 3600 }, 429, { 'retry-after': '3600' });
  }

  const lang = body?.lang === 'en' || body?.lang === 'hr' ? body.lang : detectLang(message);
  const history = sanitizeHistory(body?.history);
  const hits = search(message, { limit: 4 });
  const sources = pageLinks(hits, lang);
  const knowledge = knowledgeAnswer(message, lang);

  return streamResponse(async (send) => {
    send('meta', {
      id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      lang,
      sources,
      followUps: hits.length ? followUpQuestions(hits[0].group, hits[0].question, lang) : suggestions(lang),
      knowledgeVersion: KB_VERSION,
      matched: hits.length > 0,
    });

    if (!hits.length) {
      // Nema podloge u bazi: agent ne nagađa. Odgovor je unaprijed
      // poznat, pa nema smisla trošiti model na njega.
      const message = lang === 'en'
        ? 'I do not have that in the portal knowledge base, and I will not guess. I can answer about GNK ASG, the GNK DINAMO group, the portal sections, the markets, the knowledge base and the contact channels. For anything else, the contact form is the right route: https://gnk-asg.hr/en/contact/'
        : 'To pitanje nije u javnoj bazi znanja portala i ne želim nagađati. Mogu odgovoriti o GNK ASG-u, grupi GNK DINAMO, dijelovima portala, tržištima, bazi znanja i kontaktima. Za ostalo vas najbolje vodi kontakt obrazac: https://gnk-asg.hr/contact/';
      send('delta', { text: message });
      send('done', { ok: true, mode: 'knowledge', chars: message.length, matched: false });
      return;
    }

    const messages = [
      { role: 'system', content: systemPrompt(lang, hits) },
      ...history,
      { role: 'user', content: message },
    ];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      if (env?.OPENAI_API_KEY) {
        const chars = await streamOpenAI(env, messages, send, controller.signal);
        send('done', { ok: true, mode: 'openai', chars, matched: true });
        return;
      }
      if (env?.AI) {
        const chars = await streamWorkersAi(env, messages, send, controller.signal);
        send('done', { ok: true, mode: 'workers-ai', chars, matched: true });
        return;
      }
      send('delta', { text: knowledge.reply });
      send('done', { ok: true, mode: 'knowledge', chars: knowledge.reply.length, matched: true });
    } catch (error) {
      // Model je pao — baza i dalje zna odgovor. Bolje koristan
      // odgovor iz baze nego prazna pogreška.
      send('delta', { text: knowledge.reply });
      send('done', {
        ok: true,
        mode: 'knowledge-fallback',
        chars: knowledge.reply.length,
        matched: true,
        upstreamError: String(error?.message || error).slice(0, 120),
      });
    } finally {
      clearTimeout(timer);
    }
  });
}
