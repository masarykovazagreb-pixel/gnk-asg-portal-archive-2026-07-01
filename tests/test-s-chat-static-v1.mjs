#!/usr/bin/env node
/*
 * S+Chat — ugovor koji se ne smije tiho pokvariti.
 *
 * Provjerava četiri stvari koje su se prije razilazile:
 *   1. stranica i njezin engleski blizanac postoje i imaju iste elemente,
 *   2. klijent stvarno čita tok (SSE), može zaustaviti odgovor i izvesti
 *      razgovor, i ne ubacuje korisnikov tekst kao HTML,
 *   3. agent ima tri razine odgovora i pošteno odbija pitanja izvan baze,
 *   4. baza znanja u modulu odgovara izvoru (535 pitanja), a ugovor o
 *      AI suklađen je s pravilnikom.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const get = (p) => readFileSync(p, 'utf8');
const HR = 'apps/portal/s-chat/index.html';
const EN = 'apps/portal/en/s-chat/index.html';
const CSS = 'apps/portal/assets/s-chat-v2.css';
const JS = 'apps/portal/assets/s-chat-v2.js';
const AGENT = 'workers/gnk-asg-direct-operator/src/s-chat-agent-v1.js';
const RETRIEVAL = 'workers/gnk-asg-direct-operator/src/chat-retrieval-v1.js';

for (const file of [HR, EN, CSS, JS, AGENT, RETRIEVAL]) {
  assert.ok(existsSync(file), `missing ${file}`);
}
execFileSync(process.execPath, ['--check', JS], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', AGENT], { stdio: 'pipe' });

const hr = get(HR);
const en = get(EN);
const css = get(CSS);
const js = get(JS);

/* ---------- 1. stranica ---------- */

assert.match(hr, /<html lang="hr">/);
assert.match(en, /<html lang="en">/);
assert.match(hr, /<link rel="canonical" href="https:\/\/gnk-asg\.hr\/s-chat\/">/);
assert.match(en, /<link rel="canonical" href="https:\/\/gnk-asg\.hr\/en\/s-chat\/">/);
assert.match(hr, /hreflang="en" href="https:\/\/gnk-asg\.hr\/en\/s-chat\/"/);
assert.match(en, /hreflang="hr" href="https:\/\/gnk-asg\.hr\/s-chat\/"/);

for (const id of ['scApp', 'scThread', 'scScroll', 'scForm', 'scInput', 'scSend', 'scStop', 'scAnnounce',
  'scStatus', 'scExport', 'scNew', 'scHistoryList', 'scSuggest', 'scRail', 'scRailToggle', 'scKbCount']) {
  assert.ok(hr.includes(`id="${id}"`), `HR missing #${id}`);
  assert.ok(en.includes(`id="${id}"`), `EN missing #${id}`);
}

assert.match(hr, /maxlength="800"/);
assert.match(hr, /Razgovarate s umjetnom inteligencijom/);
assert.match(en, /You are talking to artificial intelligence/);
assert.match(hr, /s-chat-v2\.js\?v=/);
assert.match(hr, /s-chat-v2\.css\?v=/);
assert.match(en, /s-chat-v2\.js\?v=/);

/* Svaki javni razgovor mora imati put natrag na portal i na urednika. */
for (const page of [hr, en]) {
  const links = new Set([...page.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]));
  assert.ok(links.size >= 12, `expected at least 12 internal links, found ${links.size}`);
  assert.ok(page.includes('/nermin-sefic/'), 'editor link missing');
  assert.ok(/#AKTUALMEDIA/.test(page), 'hashtags missing');
  assert.match(page, /"@type":"WebSite"/);
  assert.match(page, /"@id":"https:\/\/gnk-asg\.hr\/#website"/);
  assert.match(page, /"@type":"BreadcrumbList"/);
}

/* ---------- 2. klijent ---------- */

assert.match(js, /const ENDPOINT = '\/api\/s-chat'/);
assert.match(js, /const HEALTH = '\/api\/s-chat\/health'/);
assert.match(js, /localStorage/);
assert.match(js, /AbortController/);
assert.match(js, /controller\.abort\(\)/);
assert.match(js, /text\/event-stream/);
assert.match(js, /event === 'delta'/);
assert.match(js, /event === 'done'/);
assert.match(js, /renderMarkdown/);
assert.match(js, /escapeHtml/);
assert.match(js, /URL\.createObjectURL/);
assert.match(js, /maxlength="800"|MAX_CHARS = 800/);
assert.match(js, /aria-busy/);
/* Čitač ekrana ne smije čitati tok slovo po slovo. */
assert.match(hr, /id="scThread" role="log" aria-live="off"/);
assert.match(hr, /id="scAnnounce"/);
assert.match(js, /function announce/);
assert.match(js, /T\.answerReady/);

/* Korisnikov tekst nikad ne smije ići izravno u innerHTML. */
assert.doesNotMatch(js, /innerHTML\s*=\s*(question|raw)\b/);
assert.match(js, /innerHTML = text \? renderMarkdown\(text\)/);

/* ---------- 3. CSS ---------- */

assert.match(css, /@media \(max-width: 900px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /\.sc-msg-user \.sc-bubble/);
assert.match(css, /\.sc-source\b/);

/* ---------- 4. agent ---------- */

const agent = get(AGENT);
assert.match(agent, /S_CHAT_PATH = '\/api\/s-chat'/);
assert.match(agent, /S_CHAT_HEALTH_PATH = '\/api\/s-chat\/health'/);
assert.match(agent, /RATE_LIMIT_PER_HOUR/);
assert.match(agent, /OPENAI_API_KEY/);
assert.match(agent, /env\.AI/);
assert.match(agent, /knowledgeAnswer/);
assert.match(agent, /text\/event-stream/);
assert.match(agent, /streamOpenAI/);
assert.match(agent, /streamWorkersAi/);
assert.doesNotMatch(agent, /sk-[A-Za-z0-9]{20,}/, 'no hard-coded API keys');

const load = (file) => import(pathToFileURL(path.resolve(file)).href);
const { handleSChat, S_CHAT_VERSION } = await load(AGENT);
const { knowledgeStats, search } = await load(RETRIEVAL);
assert.match(S_CHAT_VERSION, /S_CHAT_AGENT/);
const stats = knowledgeStats();
// Broj unosa raste kad se baza dopuni; ugovor je da modul prati bazu i da
// nijedna skupina ne nestane. Zato se čita baza, a ne zamrznuti broj.
const kb = JSON.parse(fs.readFileSync('apps/portal/data/knowledge-base.json', 'utf8'));
const kbEntries = kb.skupine.reduce((n, g) => n + (g.pitanja || []).length, 0);
assert.equal(stats.entries, kbEntries, 'knowledge module drifted from the base');
assert.ok(stats.entries >= 535, 'knowledge base shrank below the published floor');
assert.ok(stats.groups >= 20, 'knowledge groups drifted');

/* health */
const health = await handleSChat(new Request('https://gnk-asg.hr/api/s-chat/health'), {});
assert.equal(health.status, 200);
const healthBody = await health.json();
assert.equal(healthBody.ok, true);
assert.ok(['openai', 'workers-ai', 'knowledge'].includes(healthBody.llm));
assert.equal(healthBody.streaming, true);
assert.equal(healthBody.knowledge.entries, kbEntries, 'health endpoint must report the live knowledge count');

/* metoda */
const badMethod = await handleSChat(new Request('https://gnk-asg.hr/api/s-chat', { method: 'GET' }), {});
assert.equal(badMethod.status, 405);

/* prazna poruka */
const empty = await handleSChat(new Request('https://gnk-asg.hr/api/s-chat', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: '  ' }),
}), {});
assert.equal(empty.status, 400);

/* tok: poznato pitanje */
const answer = await handleSChat(new Request('https://gnk-asg.hr/api/s-chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
  body: JSON.stringify({ message: 'Koji su financijski pokazatelji GNK ASG-a za 2025.?' }),
}), {});
assert.equal(answer.status, 200);
assert.match(answer.headers.get('content-type'), /text\/event-stream/);
const stream = await answer.text();
assert.match(stream, /event: meta/);
assert.match(stream, /event: delta/);
assert.match(stream, /event: done/);
assert.match(stream, /"mode":"knowledge"/);
assert.ok(stream.includes('504,00'), 'financial fact missing from the answer');
assert.ok(!stream.includes('undefined'), 'answer leaked undefined');

/* tok: pitanje izvan baze — agent mora odbiti, ne nagađati */
const refused = await handleSChat(new Request('https://gnk-asg.hr/api/s-chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.10' },
  body: JSON.stringify({ message: 'Kakvo je vrijeme u Zagrebu sutra?' }),
}), {});
const refusedText = await refused.text();
assert.match(refusedText, /"matched":false/);
assert.match(refusedText, /kontakt obrazac|contact form/);

/* dohvat: domena portala prolazi, strana tema ne */
assert.ok(search('Tko je Nermin Sefić?').length > 0);
assert.equal(search('predsjednik vlade hrvatske').length, 0);
assert.equal(search('koliko košta dostava').length, 0);

/* ---------- 5. upravljanje ---------- */

const governance = JSON.parse(get('config/splus-chat-ai-governance-v1.json'));
assert.equal(governance.aiGovernance.usedAI, true);
assert.equal(governance.aiGovernance.directAiInteraction, true);
assert.equal(governance.aiGovernance.chatbotIdentifiedAsAI, true);
assert.equal(governance.technicalControls.endpoint, 'POST /api/s-chat');
assert.equal(governance.technicalControls.inputMaxCharacters, 800);
assert.equal(governance.technicalControls.streaming, true);
assert.equal(governance.technicalControls.knowledgeGrounding.entries, 535);
execFileSync(process.execPath, ['scripts/check-ai-act-governance-v1.mjs',
  '--candidate', 'config/splus-chat-ai-governance-v1.json', '--strict'], { stdio: 'pipe' });

console.log('S+Chat: stranica HR/EN, tok odgovora, baza znanja (535), odbijanje izvan domene i AI ugovor — PASS');
