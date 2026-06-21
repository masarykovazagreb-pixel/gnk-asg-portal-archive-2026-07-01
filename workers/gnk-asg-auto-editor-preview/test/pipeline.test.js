import {
  AUTO_EDITOR_KEYS,
  generateEditorialDraft,
  selectTopic,
  validateGenerated
} from '../src/pipeline.js';

class MemoryKv {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
    this.puts = 0;
  }
  async get(key) {
    return this.values.get(key) || null;
  }
  async put(key, value) {
    this.puts += 1;
    this.values.set(key, value);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function words(word, count) {
  return Array.from({ length: count }, (_, index) => `${word}${index + 1}`).join(' ');
}

const now = new Date('2026-06-21T07:15:00Z');
const news = {
  ok: true,
  status: 'LIVE',
  updatedAt: now.toISOString(),
  items: [
    {
      title: 'Umjetna inteligencija mijenja poslovne procese u Europi',
      summary: 'Europske kompanije sve više primjenjuju umjetnu inteligenciju u automatizaciji, analitici i poslovnom odlučivanju.',
      url: 'https://example.com/ai-business-europe',
      source: 'BBC Technology',
      category: 'Technology',
      publishedAt: '2026-06-21T06:45:00Z'
    }
  ]
};
const market = {
  ok: true,
  status: 'LIVE',
  updatedAt: now.toISOString(),
  crypto: [{ symbol: 'BTC', priceEur: 90000 }]
};
const catalog = {
  items: [
    {
      id: 'img-ai-001',
      url: 'https://gnk-asg.hr/r2/seo-gallery/ai-technology/ai-business.webp',
      src: 'https://gnk-asg.hr/r2/seo-gallery/ai-technology/ai-business.webp',
      category: 'AI i tehnologija',
      title: 'AI i poslovna tehnologija',
      alt: 'Umjetna inteligencija i poslovna tehnologija u korporativnom okruženju',
      caption: 'GNK ASG vizual za AI i tehnologiju.',
      credit: 'GNK ASG',
      width: 2048,
      height: 1152,
      mimeType: 'image/webp',
      status: 'ready',
      eligible: true,
      keywords: ['AI', 'tehnologija', 'poslovanje']
    }
  ]
};

const topic = selectTopic({ news, market, drafts: [], now });
assert(topic?.kind === 'news', 'Fresh trusted news should be selected before the generic market topic.');
assert(topic.category === 'AI i tehnologija', 'Technology topic category mapping failed.');

const shortValidation = validateGenerated({
  category: 'AI i tehnologija',
  sources: [{ title: 'Izvor', url: 'https://example.com/source' }],
  hr: { title: 'Naslov', summary: 'Sažetak', body: 'Prekratko', whyItMatters: 'Važno', conclusion: 'Zaključak' },
  en: { title: 'Title', summary: 'Summary', body: 'Too short', whyItMatters: 'Important', conclusion: 'Conclusion' }
});
assert(!shortValidation.ok, 'Sub-500-word content must fail validation.');
assert(shortValidation.errors.some(item => item.startsWith('hr_minimum_500_words_not_met')), 'HR minimum-word failure is missing.');
assert(shortValidation.errors.some(item => item.startsWith('en_minimum_500_words_not_met')), 'EN minimum-word failure is missing.');

const baseValues = {
  [AUTO_EDITOR_KEYS.news]: JSON.stringify(news),
  [AUTO_EDITOR_KEYS.market]: JSON.stringify(market),
  [AUTO_EDITOR_KEYS.catalogs[0]]: JSON.stringify(catalog),
  [AUTO_EDITOR_KEYS.catalogs[1]]: JSON.stringify([]),
  [AUTO_EDITOR_KEYS.catalogs[2]]: JSON.stringify([])
};

const shortStore = new MemoryKv(baseValues);
const rejected = await generateEditorialDraft({ GNK_ASG_KV: shortStore }, {
  now,
  slot: '2026-06-21@09:15',
  generate: async () => ({
    category: 'AI i tehnologija',
    keywords: ['AI'],
    sources: [{ title: topic.title, url: topic.url }],
    hr: { title: 'Kratko', summary: 'Kratak sažetak', body: 'Premalo riječi', whyItMatters: 'Važno je.', conclusion: 'Zaključak.' },
    en: { title: 'Short', summary: 'Short summary', body: 'Not enough words', whyItMatters: 'It matters.', conclusion: 'Conclusion.' }
  })
});
assert(rejected.blocked && rejected.reason === 'article_validation_failed', 'Invalid generated article must be blocked.');
assert(!(await shortStore.get(AUTO_EDITOR_KEYS.drafts)), 'Rejected article must not create a draft record.');

const validGenerated = {
  category: 'AI i tehnologija',
  keywords: ['umjetna inteligencija', 'poslovanje', 'Europa'],
  sources: [{ title: topic.title, url: topic.url, publisher: topic.source }],
  hr: {
    title: 'Umjetna inteligencija i nova struktura europskih poslovnih procesa',
    summary: 'Analiza utjecaja umjetne inteligencije na automatizaciju, upravljanje podatcima i poslovno odlučivanje u Europi.',
    body: words('analiza', 470),
    whyItMatters: words('važnost', 25),
    conclusion: words('zaključak', 25)
  },
  en: {
    title: 'Artificial intelligence and the new structure of European business processes',
    summary: 'An analysis of how artificial intelligence affects automation, data management and business decisions in Europe.',
    body: words('analysis', 470),
    whyItMatters: words('importance', 25),
    conclusion: words('conclusion', 25)
  }
};

const validStore = new MemoryKv(baseValues);
const accepted = await generateEditorialDraft({ GNK_ASG_KV: validStore }, {
  now,
  slot: '2026-06-21@09:15',
  generate: async () => validGenerated
});
assert(accepted.ok && accepted.stored && !accepted.published, 'Valid article must be stored as an unpublished draft.');
assert(accepted.draft.status === 'pending_review' && accepted.draft.approved === false, 'Preview article must require review.');
assert(accepted.draft.author === 'Nermin Sefić', 'Required author is missing.');
assert(accepted.draft.translations.hr.wordCount >= 500, 'HR draft must contain at least 500 words.');
assert(accepted.draft.translations.en.wordCount >= 500, 'EN draft must contain at least 500 words.');
assert(accepted.draft.sources[0].url === topic.url, 'Selected source must be retained.');
assert(accepted.draft.image.id === 'img-ai-001' && !accepted.draft.image.fallback, 'Eligible topic image must be selected.');
assert(accepted.draft.routes.hr.startsWith('/objave/'), 'HR route is incorrect.');
assert(accepted.draft.routes.en.startsWith('/publications/'), 'EN route is incorrect.');
assert(accepted.draft.routes.canonical === accepted.draft.routes.hr, 'Canonical must point to the HR route.');
assert(accepted.draft.translations.hr.seo.hreflangEn === accepted.draft.routes.en, 'HR/EN hreflang relation is missing.');
assert(accepted.draft.translations.en.schema.image['@type'] === 'ImageObject', 'ImageObject schema is missing.');
assert(accepted.draft.rollback.productionTouched === false, 'Draft must record that production was not touched.');

const storedDrafts = JSON.parse(await validStore.get(AUTO_EDITOR_KEYS.drafts));
assert(storedDrafts.length === 1 && storedDrafts[0].id === accepted.draft.id, 'Draft was not stored in the shared source.');
const usage = JSON.parse(await validStore.get(AUTO_EDITOR_KEYS.imageUsage));
assert(usage.length === 1 && usage[0].imageId === 'img-ai-001', 'Image usage log was not stored.');

const sensitiveStore = new MemoryKv(baseValues);
const sensitive = await generateEditorialDraft({ GNK_ASG_KV: sensitiveStore }, {
  now,
  slot: 'manual-preview',
  generate: async () => ({
    ...validGenerated,
    hr: { ...validGenerated.hr, title: 'Sud i ugovor u poslovnom upravljanju' },
    en: { ...validGenerated.en, title: 'Court and contract issues in business governance' }
  })
});
assert(sensitive.ok && sensitive.draft.status === 'held_sensitive', 'Sensitive content must be held for review.');

const noStorage = await generateEditorialDraft({}, { now, generate: async () => validGenerated });
assert(noStorage.blocked && noStorage.reason === 'storage_missing', 'Missing storage must block generation before AI execution.');

console.log('Auto Editor pipeline test passed: topic selection, 500-word HR/EN gate, sources, image, SEO, shared draft, sensitive hold and no production publish.');
