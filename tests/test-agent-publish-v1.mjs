#!/usr/bin/env node
// Test objave pregleda AI agenata: samo odobreno i provjereno ulazi na web.
// Dokazuje: odobrena stavka dobiva HR i EN stranicu s JSON-LD-om, hreflang parom,
// AI oznakom i autorom-agentom; stavka koja ne prolazi provjere se ne objavljuje;
// popisi i sitemap postoje.
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publish, reviewProblems } from '../scripts/publish-agent-reviews-v1.mjs';

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

const root = mkdtempSync(join(tmpdir(), 'pub-agents-'));
const queueDir = join(root, 'queue');
const portal = join(root, 'portal');
mkdirSync(queueDir, { recursive: true });
mkdirSync(portal, { recursive: true });

const disclosure = {
  hr: 'Tekst je pripremio AI agent GNK ASG iz javnih izvora navedenih u tekstu. Objavu je odobrio AI kontrolni agent AGENT-KONTROLA-001.',
  en: 'This text was prepared by a GNK ASG AI agent from the public sources named in the text. The publication was approved by the AI control agent AGENT-KONTROLA-001.',
};
const src = (i) => ({
  title: `Naslov ${i}`, publisher: 'Izdavač', url: `https://izvor.example/${i}`, date: '2026-10-29', excerpt: 'Izvadak.',
});
const good = {
  id: 'pregled-test-2026-10-29', channel: 'test', city: 'Test', run_date: '2026-10-29', source_lang: 'en',
  status: 'approved-by-agent', writer: 'AGENT-PISAC-001',
  items: [src(1), src(2), src(3)],
  hr: {
    title: 'Pregled: Test, 29.10.2026.',
    description: 'Pregled za Test s tri naslova iz javnih izvora, datum 29.10.2026., s poveznicama na izvornike i AI oznakom za svaki tekst.',
    paragraphs: ['Pregled za Test za 29.10.2026.: tri naslova iz javnih izvora.', 'Izdavač, 29.10.2026.: „Naslov 1“. Izvor: https://izvor.example/1'],
  },
  en: {
    title: 'Overview: Test, 2026-10-29',
    description: 'Overview for Test with three headlines from public sources, dated 2026-10-29, linked to the originals and marked as AI-prepared text.',
    paragraphs: ['Overview for Test on 2026-10-29: three headlines from public sources.', 'Publisher, 2026-10-29: “Headline 1”. Source: https://izvor.example/1'],
  },
  hashtags: ['#AKTUALMEDIA', '#GNKASG', '#Test'],
  links: ['/kanal/test/', '/gnk-aktual/', '/izdanja/', '/gnk-aktual/mreza/', '/status/', '/agenti/'],
  disclosure,
  review: { decision: 'approved', reasons: [] },
};
const bad = structuredClone(good);
bad.id = 'pregled-los-2026-10-29';
bad.hr.description = 'Prekratko.';

writeFileSync(join(queueDir, 'queue-2026-10-29.json'), JSON.stringify({ schema: 'test', run_date: '2026-10-29', items: [good, bad] }));

check(reviewProblems(good).length === 0, `dobra stavka mora proći provjere: ${reviewProblems(good).join('; ')}`);
check(reviewProblems(bad).some((p) => p.includes('opis')), 'prekratak opis mora biti odbijen');

const res = publish({ queueDir, portal, check: false });
check(res.published === 1, `objavljena mora biti 1 stavka, bilo ${res.published}`);
check(!existsSync(join(portal, 'agenti', 'pregledi', 'pregled-los-2026-10-29')), 'loša stavka se ne smije objaviti');

const hrPath = join(portal, 'agenti', 'pregledi', good.id, 'index.html');
const enPath = join(portal, 'en', 'agents', 'reviews', good.id, 'index.html');
check(existsSync(hrPath) && existsSync(enPath), 'HR i EN stranica moraju postojati');

if (existsSync(hrPath) && existsSync(enPath)) {
  const hr = readFileSync(hrPath, 'utf8');
  const en = readFileSync(enPath, 'utf8');
  const ldOf = (h) => JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const hrLd = ldOf(hr);
  const article = hrLd['@graph'].find((g) => g['@type'] === 'Article');
  check(article && article.author && article.author.name === 'AGENT-PISAC-001', 'autor u JSON-LD mora biti AI agent');
  check(article && article.editor && article.editor['@id'], 'urednik mora biti Nermin Sefić (preko @id)');
  check(!/<meta name="author" content="Nermin/.test(hr), 'meta autor ne smije biti Nermin Sefić');
  check(hr.includes('rel="canonical" href="https://gnk-asg.hr/agenti/pregledi/' + good.id + '/"'), 'HR canonical mora biti točan');
  check(hr.includes('hreflang="en" href="https://gnk-asg.hr/en/agents/reviews/' + good.id + '/"'), 'HR mora imati hreflang na EN');
  check(en.includes('hreflang="hr" href="https://gnk-asg.hr/agenti/pregledi/' + good.id + '/"'), 'EN mora imati hreflang na HR');
  check(en.includes('lang="en"') && hr.includes('lang="hr"'), 'jezik stranice mora biti točan');
  check(hr.includes('AI agent GNK ASG') && en.includes('AI agent GNK ASG'), 'AI oznaka mora biti vidljiva na obje stranice');
  check((hr.match(/href="https?:\/\//g) || []).length >= 6, 'HR stranica mora imati ≥6 poveznica');
  check(hr.includes('#AKTUALMEDIA') && hr.includes('article:tag'), 'hashtagovi moraju biti vidljivi i u meta podacima');
  check(hr.includes('data-am-author="v1"'), 'autorska traka urednika mora biti na stranici');
}

check(existsSync(join(portal, 'agenti', 'pregledi', 'index.html')), 'HR popis mora postojati');
check(existsSync(join(portal, 'en', 'agents', 'reviews', 'index.html')), 'EN popis mora postojati');
const sm = existsSync(join(portal, 'agent-reviews-sitemap.xml')) ? readFileSync(join(portal, 'agent-reviews-sitemap.xml'), 'utf8') : '';
check(sm.includes('/agenti/pregledi/' + good.id + '/') && sm.includes('/en/agents/reviews/' + good.id + '/'), 'sitemap mora sadržavati HR i EN URL');

rmSync(root, { recursive: true, force: true });

if (fails.length) {
  console.error('FAIL agent publish:\n- ' + fails.join('\n- '));
  process.exit(1);
}
console.log('PASS agent publish: odobreno se objavljuje u HR i EN s JSON-LD, hreflang, AI oznakom i autorom-agentom; neprovjereno se ne objavljuje.');
