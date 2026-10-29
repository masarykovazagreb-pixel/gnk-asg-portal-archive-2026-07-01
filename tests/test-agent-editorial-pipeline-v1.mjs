#!/usr/bin/env node
// Test agenata: pisac i AI kontrolni agent na fiksnim izvorima.
// Dokazuje: dobar pregled se odobrava; tanak tekst, zabranjeni pojam, izmišljeni
// broj, predugi citat i zastarjeli izvori se odbijaju ili ne ulaze u red.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runWriter, selectItems } from '../apps/agents/writer-agent-v1.mjs';
import { reviewDraft, reviewQueue, isHrOrEn } from '../apps/agents/control-agent-v1.mjs';
import { POLICY, APPROVER_ID, words, killSwitchState } from '../apps/agents/lib/policy-v1.mjs';

const NOW = new Date('2026-10-29T10:00:00Z');
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

const LONG = 'Gradska uprava objavila je novi plan obnove javnih prostora u središtu grada, uz radove na pješačkim zonama, rasvjeti i zelenim površinama tijekom sljedećih mjeseci. Projekt se financira iz vlastitih sredstava i fondova, a javna rasprava o detaljima otvorena je za sve građane.';
const item = (n, over = {}) => ({
  slug: `s-${n}`,
  title: `Naslov vijesti broj ${n} o gradskim radovima`,
  summary: LONG,
  date: `2026-10-${String(28 - (n % 2)).padStart(2, '0')}T0${(n % 9) + 1}:15:00.000Z`,
  url: `https://izvor${n}.example.hr/vijest/${n}`,
  sourceName: `Izvor ${n}`,
  ...over,
});

const dir = mkdtempSync(join(tmpdir(), 'agent-test-'));
try {
  const src = join(dir, 'src');
  mkdirSync(src);
  // Dobar kanal: 6 svježih stavki.
  writeFileSync(join(src, 'dobri.json'), JSON.stringify({ city: 'Dobrigrad', lang: 'hr', items: [1, 2, 3, 4, 5, 6].map((n) => item(n)) }));
  // Tanak kanal: 1 stavka.
  writeFileSync(join(src, 'tanki.json'), JSON.stringify({ city: 'Tankigrad', lang: 'hr', items: [item(7)] }));
  // Zastarjeli kanal: sve starije od tri dana.
  writeFileSync(join(src, 'stari.json'), JSON.stringify({ city: 'Starigrad', lang: 'hr', items: [item(8, { date: '2026-10-20T08:00:00.000Z' })] }));
  // Kanal sa zabranjenim pojmom u naslovu.
  writeFileSync(join(src, 'pbn.json'), JSON.stringify({ city: 'Pbngrad', lang: 'hr', items: [1, 2, 3, 4, 5, 6].map((n) => item(n + 20, { title: n === 1 ? 'PBN mreža za rangiranje' : `Vijest ${n} o radovima` })) }));

  const queue = runWriter({ sources: src, now: NOW });
  const byChannel = Object.fromEntries(queue.items.map((d) => [d.channel, d]));
  check(byChannel.dobri, 'writer nije napravio pregled za dobar kanal');
  check(byChannel.tanki, 'writer nije napravio pregled za tanki kanal (kontrola ga treba odbiti)');
  check(!byChannel.stari, 'zastarjeli izvori ne smiju ući u red');
  check(byChannel.dobri && byChannel.dobri.items.length === 6, 'dobar kanal treba 6 stavki');

  const { queue: reviewed, decisions } = reviewQueue(queue, { now: NOW });
  const dec = Object.fromEntries(decisions.map((d) => [d.id, d]));
  const good = dec[byChannel.dobri.id];
  check(good && good.decision === 'approved', `dobar pregled mora proći: ${good?.reasons?.join('; ')}`);
  check(decisions.every((d) => d.reviewed_by === APPROVER_ID), 'odluke mora donijeti AI kontrolni agent');
  const thin = dec[byChannel.tanki.id];
  check(thin && thin.decision === 'rejected' && thin.reasons.some((r) => r.includes('tanak tekst')), 'tanki tekst mora biti odbijen kao tanak');
  const pbn = dec[byChannel.pbn.id];
  check(pbn && pbn.decision === 'rejected' && pbn.reasons.some((r) => r.includes('zabranjeni')), 'zabranjeni pojam mora biti odbijen');
  check(reviewed.items.every((d) => d.review && d.status !== 'draft'), 'svaka objava mora dobiti status i odluku');
  check(words(byChannel.dobri.hr.paragraphs.join(' ')) >= POLICY.bodyMinWords, 'dobar HR tekst mora imati najmanje 150 riječi');

  // Pojedinačna pravila nad dobrim pregledom.
  const base = structuredClone(byChannel.dobri);
  const fabricated = structuredClone(base);
  fabricated.hr.paragraphs[1] += ' Ukupno 999 radnika na projektu.';
  check(reviewDraft(fabricated, { now: NOW }).reasons.some((r) => r.includes('brojevi bez izvora')), 'izmišljeni broj mora biti odbijen');
  const quote = structuredClone(base);
  quote.items[0].excerpt = Array.from({ length: 40 }, (_, i) => `riječ${i}`).join(' ');
  check(reviewDraft(quote, { now: NOW }).reasons.some((r) => r.includes('izvadak')), 'predugi citat mora biti odbijen');
  const noLinks = structuredClone(base);
  noLinks.links = noLinks.links.slice(0, 3);
  check(reviewDraft(noLinks, { now: NOW }).reasons.some((r) => r.includes('linkova')), 'premalo linkova mora biti odbijeno');
  const noDisclosure = structuredClone(base);
  noDisclosure.en.paragraphs = noDisclosure.en.paragraphs.filter((p) => !p.startsWith('This text was prepared'));
  check(reviewDraft(noDisclosure, { now: NOW }).reasons.some((r) => r.includes('AI oznaka')), 'bez AI oznake nema odobrenja');
  const http = structuredClone(base);
  http.items[0].url = 'http://izvor.example.hr/x';
  check(reviewDraft(http, { now: NOW }).reasons.some((r) => r.includes('HTTPS')), 'http izvor mora biti odbijen');

  const jp = structuredClone(base);
  jp.items[0].excerpt = '製造業のAIネイティブ化の道筋は、将来のAIの役割から逆算して描くことができる。';
  check(reviewDraft(jp, { now: NOW }).reasons.some((r) => r.includes('latiničnom')), 'izvor na nelatiničnom pismu mora biti odbijen bez prijevoda');
  const garbled = structuredClone(base);
  garbled.items[1].title = 'Microsoft 7?9 mjesec rast prihoda';
  check(reviewDraft(garbled, { now: NOW }).reasons.some((r) => r.includes('pokvarenim')), 'pokvareni znakovi u izvoru moraju biti odbijeni');

  const huLang = structuredClone(base);
  huLang.source_lang = 'hu';
  check(reviewDraft(huLang, { now: NOW }).reasons.some((r) => r.includes('nema prijevoda')), 'kanal na tuđem jeziku mora biti odbijen');
  const hu = structuredClone(base);
  hu.items[2].excerpt = 'A város új közterületi terv szerint újítja fel a főteret és a parkokat a következő években.';
  check(reviewDraft(hu, { now: NOW }).reasons.some((r) => r.includes('ne izgleda kao hrvatski')), 'mađarski izvadak mora biti odbijen bez prijevoda');
  check(isHrOrEn(LONG) && isHrOrEn('The city council approved the new plan for the central square and the parks.'), 'HR i EN tekst moraju proći jezičnu provjeru');

  const horo = selectItems({ lang: 'hr', items: [item(9, { title: 'Dnevni horoskop za 29.10.: Ribama se smiješi ljubavni preokret' })] }, NOW);
  check(horo.length === 0, 'horoskop nije aktualna vijest i ne smije ući u pregled');

  // Odabir stavki: svježina i HTTPS.
  const pickedLang = selectItems({ lang: 'hu', items: [item(4)] }, NOW);
  check(pickedLang.length === 0, 'stavke na tuđem jeziku ne smiju ući u pregled');
  const picked = selectItems({ lang: 'hr', items: [item(1), item(2, { date: '2026-10-01T00:00:00Z' }), item(3, { url: 'http://x.example/y' })] }, NOW);
  check(picked.length === 1, `svježi HTTPS filter mora ostaviti 1 stavku, ostavio ${picked.length}`);

  // Validator mora prihvatiti red koji je sam napravio.
  check(queue.items.every((d) => d.writer && d.governance === undefined), 'pisac ne smije sam postavljati odluku o odobrenju');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// Kill switch: isključen, nedostaje ili neispravan → agenti stoje (sigurni zadani režim).
{
  const dir = mkdtempSync(join(tmpdir(), 'ks-'));
  const on = join(dir, 'on.json'); const off = join(dir, 'off.json'); const bad = join(dir, 'bad.json');
  writeFileSync(on, JSON.stringify({ enabled: true })); writeFileSync(off, JSON.stringify({ enabled: false })); writeFileSync(bad, '{nije json');
  check(killSwitchState(on).enabled === true, 'uključen kill switch mora dopustiti rad');
  check(killSwitchState(off).enabled === false, 'isključen kill switch mora zaustaviti agente');
  check(killSwitchState(join(dir, 'nema.json')).enabled === false, 'nedostajuća datoteka mora zaustaviti agente');
  check(killSwitchState(bad).enabled === false, 'neispravan kill switch mora zaustaviti agente');
  check(killSwitchState().enabled === true, 'stvarni kill switch u ops/ mora biti uključen');
}

if (fails.length) {
  console.error('FAIL agent editorial pipeline:\n- ' + fails.join('\n- '));
  process.exit(1);
}
console.log('PASS agent editorial pipeline: dobar pregled odobren; tanak, zabranjen, izmišljen broj, predug citat, premalo linkova, bez AI oznake i http izvor odbijeni; zastarjeli izvori isključeni.');
