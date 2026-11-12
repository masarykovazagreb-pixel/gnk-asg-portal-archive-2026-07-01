import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkHubCounts } from '../scripts/check-hub-counts-v1.mjs';

const channels = Array.from({ length: 17 }, (_, i) => ({ id: `city${i}`, base: `https://example.test/city${i}/` }));
const counts = channels.map((c, i) => ({ id: c.id, count: i + 1 }));
const total = counts.reduce((n, c) => n + c.count, 0);

function html(lang) {
  const word = lang === 'hr' ? 'tekstova' : 'stories';
  return `<div class="am-mast-side right">AKTUAL MEDIA DESK<br>${total} ${lang === 'en' ? 'texts' : 'tekstova'} ·</div><ul class="amh-stats"><li><b>${total}</b><span>${lang === 'en' ? 'texts in the archive' : 'tekstova u arhivi'}</span></li></ul><p class="amm-count"><b>${total}</b></p><h2 id="amcTitle">${total} ${word}</h2>` +
    channels.map((c, i) => `<a class="amx-link" href="${c.base}" aria-label="city — ${i + 1} ${word} — open">`).join('') +
    channels.slice(0, 8).map((c, i) => `<a class="amm-pin" href="${c.base}" aria-label="city — ${i + 1} ${word} — open">`).join('');
}

test('provjera hvata stari zbroj, krug i kartu u oba jezika', () => {
  for (const lang of ['hr', 'en']) {
    const h = html(lang);
    assert.deepEqual(checkHubCounts(h, channels, counts, lang), []);
    assert.notEqual(checkHubCounts(h.replace(`<b>${total}</b>`, '<b>0</b>'), channels, counts, lang).length, 0);
    assert.notEqual(checkHubCounts(h.replace(` — 17 ${lang === 'hr' ? 'tekstova' : 'stories'} —`, ' — 3 stories —'), channels, counts, lang).length, 0);
    assert.notEqual(checkHubCounts(h.replace('class="amm-pin"', 'class="stale"'), channels, counts, lang).length, 0);
  }
});

test('provjera otkriva zastarjelo zaglavlje i traku', () => {
  for (const lang of ['hr', 'en']) {
    const h = html(lang);
    assert.ok(checkHubCounts(h.replace('DESK<br>153', 'DESK<br>0'), channels, counts, lang).includes('zbroj u zaglavlju'));
    assert.ok(checkHubCounts(h.replace('<ul class="amh-stats"><li><b>153', '<ul class="amh-stats"><li><b>0'), channels, counts, lang).includes('zbroj u hero traci'));
  }
});

test('provjera hvata zastarjeli Zagreb u stvarnom amx-link podiumu', () => {
  for (const lang of ['hr', 'en']) {
    const word = lang === 'en' ? 'stories' : 'tekstova';
    const zagrebBase = 'https://gnk-asg.hr/kanal/zagreb/';
    const withZagreb = [...channels, { id: 'zagreb', base: zagrebBase }];
    const allCounts = [...counts, { id: 'zagreb', count: 9 }];
    const h = html(lang).replaceAll('153', '162') +
      `<a class="amx-link" href="${zagrebBase}" rel="external noopener" aria-label="AKTUAL MEDIA KANAL ZAGREB — Hrvatska — 9 ${word} — otvori izdanje">`;
    assert.deepEqual(checkHubCounts(h, withZagreb, allCounts, lang), []);
    assert.ok(
      checkHubCounts(h.replace(`ZAGREB — Hrvatska — 9 ${word} —`, `ZAGREB — Hrvatska — 420 ${word} —`), withZagreb, allCounts, lang)
        .includes('Zagreb u najavi'),
      `${lang}: stale Zagreb podium count must be rejected`
    );
  }
});
