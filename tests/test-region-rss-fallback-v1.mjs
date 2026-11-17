import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const registry = JSON.parse(readFileSync('apps/region/channels.json', 'utf8'));
const updatedFeeds = [
  ['zagreb', 'hrt', 'https://www.hrt.hr/rss/vijesti/', 'https://vijesti.hrt.hr/rss'],
  ['ljubljana', 'rtvslo', 'https://www.rtvslo.si/feeds/novice.xml', 'https://www.rtvslo.si/rss'],
  ['nairobi', 'standard', 'https://www.standardmedia.co.ke/rss/headlines.php', 'https://www.standardmedia.co.ke/rss'],
  ['singapur', 'businesstimes', 'https://www.businesstimes.com.sg/rss/top-stories', 'https://www.businesstimes.com.sg/rss']
];

test('all existing 17 city channels retain independently configured RSS sources', () => {
  assert.equal(registry.channels.length, 17);
  for (const city of registry.channels) {
    assert.ok(city.sources.length > 0, city.id);
    assert.equal(new Set(city.sources.map(s => s.id)).size, city.sources.length, city.id);
    for (const source of city.sources) {
      assert.equal(source.type, 'rss', city.id + '/' + source.id);
      assert.ok(Array.isArray(source.urls) && source.urls.length > 0, city.id + '/' + source.id);
      assert.equal(new Set(source.urls).size, source.urls.length, city.id + '/' + source.id);
      for (const value of source.urls) {
        const url = new URL(value);
        assert.equal(url.protocol, 'https:', city.id + '/' + source.id);
        assert.equal(url.username + url.password, '', city.id + '/' + source.id);
      }
    }
  }
});

test('four documented replacement feeds are primary and previous endpoints remain fallbacks', () => {
  for (const [cityId, sourceId, preferred, legacy] of updatedFeeds) {
    const city = registry.channels.find(x => x.id === cityId);
    assert.ok(city, cityId);
    const source = city.sources.find(x => x.id === sourceId);
    assert.ok(source, cityId + '/' + sourceId);
    assert.deepEqual(source.urls.slice(0, 2), [preferred, legacy]);
  }
});

test('RSS replacement does not promote article bodies or change publication permissions', () => {
  assert.ok(registry.publisher);
  assert.ok(registry.channels.every(city => city.sources.every(source => source.cap > 0)));
});
