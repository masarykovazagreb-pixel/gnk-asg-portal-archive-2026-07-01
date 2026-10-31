#!/usr/bin/env node
/* Test oporavka zapisa izdanja iz stranice članka (scripts/region/recover-items-from-pages-v1.mjs).
   Fixture ima isti oblik kao objavljene stranice: kicker, h1, artmeta s izvorom, sažetak, slika.
   node tests/test-recover-items-v1.mjs */
import assert from 'node:assert/strict';
import { parsePage } from '../scripts/region/recover-items-from-pages-v1.mjs';

const channel = {
  id: 'beograd',
  lang: 'sr',
  sources: [{ id: 'n1', name: 'N1 Srbija', urls: ['https://n1info.rs/feed/'] }]
};

const page = `<main id="sadrzaj" class="article"><article>
<header class="arthead">
  <p class="kicker">Danas · Sport</p>
  <h1>UŽIVO Novak Đoković – Jan-Lenard Štruf &amp; test</h1>
  <p class="artmeta"><time datetime="2026-10-29T20:37:56.000Z">29. oktobra 2026.</time> · Izvor: <a href="https://n1info.rs/sport/test/" target="_blank" rel="external noopener nofollow">N1 Srbija ↗</a></p>
</header>
<figure class="artimg"><img src="https://gnk-asg.hr/api/img?u=https%3A%2F%2Fwww.n1info.rs%2Fwp-content%2Fslika.jpg&amp;w=1200" alt="Slika izvora" width="1200" height="675"><figcaption>Foto: N1</figcaption></figure>
<section class="quote"><h2>Sažetak izvora</h2><blockquote>Srpski teniser je u prvom kolu savladao protivnika.</blockquote></section>
</article></main>`;

{
  const res = parsePage(page, channel, 'beograd-2026-10-29-test-abc123');
  assert.equal(res.error, undefined, res.error);
  const it = res.item;
  assert.equal(it.slug, 'beograd-2026-10-29-test-abc123');
  assert.equal(it.title, 'UŽIVO Novak Đoković – Jan-Lenard Štruf & test');
  assert.equal(it.date, '2026-10-29T20:37:56.000Z');
  assert.equal(it.url, 'https://n1info.rs/sport/test/');
  assert.equal(it.source, 'n1');
  assert.equal(it.sourceName, 'N1 Srbija');
  assert.deepEqual(it.categories, ['Sport']);
  assert.equal(it.summary, 'Srpski teniser je u prvom kolu savladao protivnika.');
  assert.equal(it.image, 'https://www.n1info.rs/wp-content/slika.jpg', 'posrednik slika mora se razriješiti u izvorni URL');
  assert.equal(it.izvor_zapisa, 'stranica');
  assert.ok(['sport', 'drustvo', 'politika', 'rat', 'sigurnost', 'ekonomija', 'energija', 'ai'].includes(it.theme), it.theme);
}

{
  // Nepoznat izvor: id se izvodi iz naziva, ne ruši se.
  const res = parsePage(page.replace('N1 Srbija ↗', 'Nepoznati Portal ↗').replace('https://n1info.rs/sport/test/', 'https://portal.example.org/test/'), channel, 'x');
  assert.equal(res.item.sourceName, 'Nepoznati Portal');
  assert.equal(res.item.source, 'nepoznati-portal');
}

{
  // Nepotpuna stranica (bez izvora) mora dati grešku, a ne prazan zapis.
  const res = parsePage('<main><h1>Bez izvora</h1></main>', channel, 'y');
  assert.ok(res.error, 'nepotpuna stranica mora vratiti grešku');
  assert.equal(res.item, undefined);
}

{
  // SVG slika se ne uzima (pravilo posrednika).
  const res = parsePage(page.replace('slika.jpg', 'logo.svg'), channel, 'z');
  assert.equal(res.item.image, '');
}

console.log(JSON.stringify({ ok: true, tests: 4 }));
