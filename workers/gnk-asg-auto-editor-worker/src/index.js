const AUTO_ARTICLES_KEY = "auto-editor:articles:v1";
const AUTO_USED_KEY = "auto-editor:used-topics:v1";
const MAX_ARTICLES = 1000;
const PRUNE_TO = 500;
const MIN_WORDS = 300;

const SOURCES = [
  { id: "index-novac", title: "Index.hr - Novac", url: "https://www.index.hr/rss/vijesti-novac", lang: "hr", group: "local", weight: 95 },
  { id: "index-vijesti", title: "Index.hr - Vijesti", url: "https://www.index.hr/rss/vijesti", lang: "hr", group: "local", weight: 78 },
  { id: "index-svijet", title: "Index.hr - Svijet", url: "https://www.index.hr/rss/vijesti-svijet", lang: "hr", group: "local", weight: 80 },
  { id: "bbc-business", title: "BBC Business", url: "http://newsrss.bbc.co.uk/rss/newsonline_uk_edition/business/rss.xml", lang: "en", group: "world", weight: 92 },
  { id: "bbc-world", title: "BBC World", url: "http://newsrss.bbc.co.uk/rss/newsonline_uk_edition/world/rss.xml", lang: "en", group: "world", weight: 82 },
  { id: "bbc-technology", title: "BBC Technology", url: "http://newsrss.bbc.co.uk/rss/newsonline_uk_edition/technology/rss.xml", lang: "en", group: "world", weight: 88 },
  { id: "guardian-business", title: "The Guardian Business", url: "https://www.theguardian.com/business/rss", lang: "en", group: "world", weight: 90 },
  { id: "guardian-technology", title: "The Guardian Technology", url: "https://www.theguardian.com/technology/rss", lang: "en", group: "world", weight: 88 },
  { id: "euronews-business", title: "Euronews Business", url: "https://www.euronews.com/rss?format=mrss&level=theme&name=business", lang: "en", group: "world", weight: 85 },
  { id: "euronews-next", title: "Euronews Next", url: "https://www.euronews.com/rss?format=mrss&level=vertical&name=next", lang: "en", group: "world", weight: 82 },
  { id: "google-croatia-business", title: "Google News Croatia Business", url: "https://news.google.com/rss/search?q=business%20Croatia%20finance%20markets&hl=hr&gl=HR&ceid=HR:hr", lang: "hr", group: "fallback", weight: 75 },
  { id: "google-world-business", title: "Google News World Business", url: "https://news.google.com/rss/search?q=world%20business%20markets%20AI%20finance&hl=en-US&gl=US&ceid=US:en", lang: "en", group: "fallback", weight: 78 }
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/auto-editor" || path === "/auto-editor/") return html(listPage(await getArticles(env)));
    if (path === "/data/auto-editor.json") return json(await publicFeed(env));
    if (path === "/api/auto-editor/status") return json(await status(env));
    if (path === "/api/auto-editor/run") return json(await runAutoEditor(env, "manual", true));
    if (path === "/auto-editor/sitemap.xml") return sitemap(await getArticles(env));

    const match = path.match(/^\/auto-editor\/([^\/]+)\/?$/);
    if (match) {
      const article = (await getArticles(env)).find(a => a.slug === match[1]);
      if (!article) return html(notFoundPage(), 404);
      return html(articlePage(article));
    }

    return json({ ok: false, error: "not_found", worker: "gnk-asg-auto-editor", path }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(scheduledRun(env));
  }
};

async function scheduledRun(env) {
  const slot = zagrebSlot(new Date());
  if (!["08", "12", "17"].includes(slot.hour)) {
    return { ok: true, skipped: true, reason: "not_target_hour_zagreb", slot };
  }

  const runKey = "auto-editor:last-run:" + slot.date + ":" + slot.hour;
  const last = await kvGet(env, runKey);
  if (last) return { ok: true, skipped: true, reason: "already_done", slot };

  const result = await runAutoEditor(env, "cron-" + slot.date + "-" + slot.hour, false);

  if (result.ok && result.published) {
    await kvPut(env, runKey, new Date().toISOString());
  }

  return result;
}

function zagrebSlot(date) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(date).reduce((a, x) => { a[x.type] = x.value; return a; }, {});
  return { date: p.year + "-" + p.month + "-" + p.day, hour: p.hour };
}

async function runAutoEditor(env, trigger, force) {
  const fetched = [];
  const sourceResults = [];

  for (const source of SOURCES) {
    const result = await fetchSource(source);
    sourceResults.push(result.summary);
    fetched.push(...result.items);
  }

  const used = await readJson(env, AUTO_USED_KEY) || [];
  const articles = await getArticles(env);
  const selected = selectTopic(fetched, used, articles);

  if (!selected) {
    return { ok: false, published: false, trigger, error: "no_topic_available", sourceResults };
  }

  const visual = await chooseVisual(selected);
  const article = buildArticle(selected, visual, trigger);

  articles.unshift(article);

  let pruned = false;
  let stored = dedupeArticles(articles);

  if (stored.length > MAX_ARTICLES) {
    stored = stored.slice(0, PRUNE_TO);
    pruned = true;
  }

  const newUsed = [selected.topicKey, ...used].slice(0, 600);

  await writeJson(env, AUTO_ARTICLES_KEY, stored);
  await writeJson(env, AUTO_USED_KEY, newUsed);

  return {
    ok: true,
    published: true,
    trigger,
    articleUrl: "https://gnk-asg.hr/auto-editor/" + article.slug + "/",
    article,
    wordCount: article.wordCount,
    image: article.imageUrl,
    sourceResults,
    storedCount: stored.length,
    maxArticles: MAX_ARTICLES,
    pruneTo: PRUNE_TO,
    prunedOldest50Percent: pruned
  };
}

async function status(env) {
  const articles = await getArticles(env);
  return {
    ok: true,
    worker: "gnk-asg-auto-editor",
    updatedAt: new Date().toISOString(),
    schedule: "08:00, 12:00 i 17:00 Europe/Zagreb",
    cronUtcCoverage: "0 6,7,10,11,15,16 * * * with Europe/Zagreb guard",
    minWords: MIN_WORDS,
    author: "Nermin Sefić",
    articleCount: articles.length,
    maxArticles: MAX_ARTICLES,
    pruneTo: PRUNE_TO,
    visualSource: "https://gnk-asg.hr/data/visual-index.json",
    latest: articles.slice(0, 5).map(a => ({ title: a.title, url: "/auto-editor/" + a.slug + "/", publishedAt: a.publishedAt, wordCount: a.wordCount, imageUrl: a.imageUrl }))
  };
}

async function publicFeed(env) {
  const articles = await getArticles(env);
  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    author: "Nermin Sefić",
    schedule: "08:00, 12:00 i 17:00 Europe/Zagreb",
    minWords: MIN_WORDS,
    count: articles.length,
    items: articles.map(a => ({
      title: a.title,
      slug: a.slug,
      url: "/auto-editor/" + a.slug + "/",
      canonical: "https://gnk-asg.hr/auto-editor/" + a.slug + "/",
      imageUrl: a.imageUrl,
      imageAlt: a.imageAlt,
      summary: a.summary,
      sourceTitle: a.sourceTitle,
      sourceUrl: a.sourceUrl,
      publishedAt: a.publishedAt,
      wordCount: a.wordCount,
      author: a.author
    }))
  };
}

async function fetchSource(source) {
  const summary = { id: source.id, title: source.title, url: source.url, ok: false, itemCount: 0, error: null };
  try {
    const r = await fetch(source.url, {
      headers: { "user-agent": "GNK-ASG-AutoEditor/1.0", "accept": "application/rss+xml,application/xml,text/xml,*/*" },
      cf: { cacheTtl: 900, cacheEverything: false }
    });
    const text = await r.text();
    if (!r.ok) throw new Error("HTTP " + r.status);
    const items = parseFeed(text, source).slice(0, 40);
    summary.ok = items.length > 0;
    summary.itemCount = items.length;
    return { summary, items };
  } catch (e) {
    summary.error = String(e && e.message ? e.message : e);
    return { summary, items: [] };
  }
}

function selectTopic(items, used, existingArticles) {
  const usedSet = new Set(used || []);
  const existingSet = new Set((existingArticles || []).map(a => a.topicKey));
  const candidates = items
    .filter(x => x.title && x.link)
    .map(x => {
      const keywordScore = topicScore(x.title + " " + x.text);
      const recency = Math.max(0, 48 - ((Date.now() - Date.parse(x.publishedAt || new Date().toISOString())) / 3600000));
      x.score = (x.sourceWeight || 50) + keywordScore + recency;
      x.topicKey = stableId((x.title || "") + "|" + (x.link || ""));
      return x;
    })
    .filter(x => !usedSet.has(x.topicKey) && !existingSet.has(x.topicKey))
    .sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

function topicScore(text) {
  const s = String(text || "").toLowerCase();
  const terms = [
    "business", "markets", "market", "finance", "inflation", "fed", "rates", "ai", "artificial intelligence", "technology",
    "energy", "oil", "gold", "bitcoin", "crypto", "croatia", "europe", "investment", "stocks", "economy", "bank",
    "poslov", "trži", "burz", "inflacij", "kamate", "umjetna inteligencija", "tehnolog", "nafta", "zlato", "ulaganj", "gospodar"
  ];
  let score = 0;
  for (const t of terms) if (s.includes(t)) score += 10;
  return score;
}

async function chooseVisual(topic) {
  try {
    const r = await fetch("https://gnk-asg.hr/data/visual-index.json?cb=" + Date.now(), { cache: "no-store" });
    const j = await r.json();
    const items = Array.isArray(j.items) ? j.items : [];
    const preferred = items.filter(x => x.category === "auto-business");
    const pool = preferred.length ? preferred : items;
    if (pool.length) {
      const idx = Math.abs(hashCode(topic.title + topic.category)) % pool.length;
      const chosen = pool[idx];
      return { url: chosen.url, alt: chosen.alt || chosen.title || "GNK ASG business visual", title: chosen.title || "GNK ASG Visual" };
    }
  } catch (e) {}

  return {
    url: "https://gnk-asg.hr/assets/visual-index/auto-business-visuals/01-gnk-asg-global-boardroom.svg",
    alt: "GNK ASG business visual",
    title: "GNK ASG Business Visual"
  };
}

function buildArticle(topic, visual, trigger) {
  const now = new Date();
  const dateIso = now.toISOString();
  const title = makeTitle(topic);
  const slug = slugify(title + "-" + dateIso.slice(0, 13));
  const paragraphs = buildParagraphs(topic, title);
  let body = paragraphs.join("\n\n");

  while (wordCount(body) < MIN_WORDS) {
    body += "\n\n" + extraParagraph(topic);
  }

  const words = wordCount(body);
  const summary = makeSummary(topic, title);

  return {
    id: stableId(slug),
    topicKey: topic.topicKey,
    title,
    slug,
    summary,
    body,
    wordCount: words,
    author: "Nermin Sefić",
    publishedAt: dateIso,
    modifiedAt: dateIso,
    trigger,
    sourceTitle: topic.sourceTitle,
    sourceUrl: topic.link || topic.sourceUrl,
    sourceFeed: topic.sourceUrl,
    sourceGroup: topic.sourceGroup,
    sourceLang: topic.lang,
    originalTitle: topic.title,
    originalExcerpt: topic.text,
    imageUrl: visual.url,
    imageAlt: visual.alt,
    imageTitle: visual.title,
    seo: {
      canonical: "https://gnk-asg.hr/auto-editor/" + slug + "/",
      description: summary,
      keywords: "GNK ASG, GNK DINAMO Ltd, Nermin Sefić, poslovne vijesti, business desk, auto editor, tržišta, AI, financije, tehnologija"
    }
  };
}

function makeTitle(topic) {
  const t = String(topic.title || "Poslovna tema dana").replace(/\s+/g, " ").trim();
  if (/gnk asg/i.test(t)) return t;
  return "Poslovni pregled: " + t;
}

function makeSummary(topic, title) {
  const base = cleanText(topic.text || "");
  if (base.length > 80) return base.slice(0, 220);
  return title + " — autorska poslovna obrada najvažnije teme koju je Auto Editor izdvojio iz aktualnih izvora.";
}

function buildParagraphs(topic, title) {
  const source = topic.sourceTitle || "javni medijski izvor";
  const original = cleanText(topic.text || topic.title || "");
  const lang = topic.lang || "hr";

  return [
    `${title} jedna je od tema koju je GNK ASG Auto Editor izdvojio iz aktualnih poslovnih i medijskih izvora. Polazna informacija dolazi iz izvora ${source}, a obrada je pripremljena kao poslovni komentar za GNK ASG portal. Tema je važna jer se poslovno okruženje sve brže mijenja pod utjecajem tržišta kapitala, tehnologije, geopolitike, inflacije, energije i digitalne infrastrukture.`,

    `U osnovi, ova tema pokazuje da kompanije više ne mogu promatrati vijesti izolirano. Svaki naslov treba povezati s pitanjem troška kapitala, operativnog rizika, reputacije, digitalne spremnosti i sposobnosti brze prilagodbe. Ako vijest govori o tržištima, ona utječe na investicijske odluke. Ako govori o tehnologiji ili umjetnoj inteligenciji, ona utječe na produktivnost i organizaciju rada. Ako govori o energiji, inflaciji ili kamatama, ona se prelijeva na cijene, marže i planiranje.`,

    `Izvorni sažetak teme glasi: ${original || "RSS izvor nije dostavio potpuni sažetak, pa je tema obrađena kroz poslovni kontekst i dostupne naslovne signale."} Ova rečenica nije dovoljna sama za sebe. Za menadžment je bitno razumjeti što tema znači u praksi: može li povećati troškove, otvoriti tržišnu priliku, promijeniti očekivanja investitora, ubrzati digitalizaciju ili stvoriti potrebu za dodatnim oprezom.`,

    `Za GNK ASG i GNK DINAMO Ltd. ovakav tip dnevnog poslovnog pregleda ima funkciju ranog signala. Cilj nije kopirati medije, nego iz medijskih signala izgraditi strukturirani poslovni sloj: naslov, izvor, slika, kontekst, SEO podaci i arhiva. Time portal postaje korisniji jer povezuje javne informacije s poslovnom logikom, tržišnim razmišljanjem i internim razvojem digitalnih alata.`,

    `Zaključno, tema zahtijeva pažljivo praćenje jer može utjecati na odluke o ulaganjima, komunikaciji, partnerstvima i javnom pozicioniranju. Ovaj tekst je informativna poslovna analiza, potpisuje ga Nermin Sefić kao autor uredničkog pregleda, i ne predstavlja financijski, pravni ni investicijski savjet. Čitatelj za izvornu informaciju treba otvoriti navedeni izvor, dok GNK ASG Business Desk daje širi poslovni okvir.`
  ];
}

function extraParagraph(topic) {
  return `Dodatni poslovni kontekst ove teme odnosi se na potrebu da se svaka odluka temelji na provjerljivom izvoru, jasnom vremenskom okviru i razumijevanju šireg tržišnog okruženja. U dinamičnim uvjetima nije dovoljno imati samo informaciju; potrebno je imati sustav koji informaciju pretvara u pregled, arhivu, signal i odluku. Upravo zato GNK ASG Auto Editor povezuje temu, izvor, sliku, SEO i status objave u jedinstveni dnevni proces.`;
}

function articlePage(article) {
  const title = escapeHtml(article.title);
  const desc = escapeHtml(article.summary);
  const canonical = article.seo?.canonical || ("https://gnk-asg.hr/auto-editor/" + article.slug + "/");
  const image = absoluteUrl(article.imageUrl);
  const bodyHtml = article.body.split(/\n\s*\n/).map(p => "<p>" + escapeHtml(p) + "</p>").join("\n");

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.summary,
    "image": image,
    "author": { "@type": "Person", "name": "Nermin Sefić" },
    "publisher": { "@type": "Organization", "name": "GNK ASG", "url": "https://gnk-asg.hr" },
    "datePublished": article.publishedAt,
    "dateModified": article.modifiedAt || article.publishedAt,
    "mainEntityOfPage": canonical
  }, null, 2);

  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | GNK ASG Auto Editor</title>
<meta name="description" content="${desc}">
<meta name="keywords" content="${escapeHtml(article.seo?.keywords || "GNK ASG, GNK DINAMO Ltd, Nermin Sefić, poslovne vijesti")}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${jsonLd}</script>
${style()}
</head>
<body>
<main>
<nav><a href="/">Početna</a><a href="/auto-editor/">Auto Editor</a><a href="/visual-index/">Visual Index</a><a href="/business-desk/">Business Desk</a><a href="/vijesti/">Vijesti</a></nav>
<article class="article">
<span class="badge">Auto Editor · ${escapeHtml(article.sourceGroup || "business")}</span>
<h1>${title}</h1>
<p class="meta">Autor: Nermin Sefić · ${formatDate(article.publishedAt)} · ${article.wordCount} riječi</p>
<img class="cover" src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.imageAlt || article.title)}">
<div class="sourcebox">Izvor teme: <a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.sourceTitle)}</a>. Tekst je autorska poslovna obrada za GNK ASG Auto Editor.</div>
${bodyHtml}
<p><strong>Napomena:</strong> Ovaj tekst je informativna poslovna analiza i ne predstavlja financijski, pravni ni investicijski savjet.</p>
<a class="btn" href="/auto-editor/">Povratak na Auto Editor</a>
</article>
</main>
</body>
</html>`;
}

function listPage(articles) {
  const cards = articles.map(a => `<article class="card"><img src="${escapeHtml(a.imageUrl)}" alt="${escapeHtml(a.imageAlt || a.title)}"><div class="card-body"><div class="meta">${formatDate(a.publishedAt)} · ${a.wordCount} riječi</div><h2>${escapeHtml(a.title)}</h2><p>${escapeHtml(a.summary)}</p><p class="meta">Autor: Nermin Sefić</p><a class="btn" href="/auto-editor/${a.slug}/">Otvori članak</a></div></article>`).join("\n");

  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GNK ASG Auto Editor | Dnevni poslovni članci</title>
<meta name="description" content="GNK ASG Auto Editor automatski objavljuje poslovne članke u 08:00, 12:00 i 17:00 po hrvatskom vremenu, sa slikom, SEO podacima i autorom Nermin Sefić.">
<link rel="canonical" href="https://gnk-asg.hr/auto-editor/">
<meta property="og:title" content="GNK ASG Auto Editor">
<meta property="og:description" content="Automatski dnevni poslovni članci s izvorima, slikama, SEO podacima i minimalno 300 riječi.">
<meta name="twitter:card" content="summary_large_image">
${style()}
</head>
<body>
<main>
<nav><a href="/">Početna</a><a href="/visual-index/">Visual Index</a><a href="/business-desk/">Business Desk</a><a href="/vijesti/">Vijesti</a><a href="/api/auto-editor/run">Ručno pokreni</a></nav>
<section class="hero"><span class="badge">Auto Editor</span><h1>GNK ASG Auto Editor</h1><p>Automatsko objavljivanje u 08:00, 12:00 i 17:00 po hrvatskom vremenu. Svaki članak ima najmanje 300 riječi, sliku iz Visual Index kataloga, SEO/meta podatke i autora Nermin Sefić.</p></section>
<section class="grid">${cards || '<article class="card"><div class="card-body"><h2>Još nema članaka</h2><p>Pokreni ručno /api/auto-editor/run ili pričekaj raspored.</p></div></article>'}</section>
</main>
</body>
</html>`;
}

function notFoundPage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Nije pronađeno</title>${style()}</head><body><main><section class="hero"><h1>Nije pronađeno</h1><a class="btn" href="/auto-editor/">Auto Editor</a></section></main></body></html>`;
}

function sitemap(articles) {
  const urls = [
    `<url><loc>https://gnk-asg.hr/auto-editor/</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>`,
    ...articles.map(a => `<url><loc>https://gnk-asg.hr/auto-editor/${escapeXml(a.slug)}/</loc><lastmod>${escapeXml(a.modifiedAt || a.publishedAt)}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`)
  ].join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store" } });
}

function style() {
  return `<style>
:root{--bg:#050812;--panel:#0b1324;--gold:#d4af37;--text:#f4f6fb;--muted:#aab3c4}
body{margin:0;background:radial-gradient(circle at top,#10245a 0,#050812 44%,#02040a 100%);color:var(--text);font-family:Arial,Helvetica,sans-serif}
main{max-width:1180px;margin:0 auto;padding:24px}
nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
nav a,.btn{display:inline-flex;text-decoration:none;border-radius:999px;padding:10px 14px;font-weight:900;border:1px solid rgba(212,175,55,.55);background:rgba(255,255,255,.06);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8)}
.hero,.article,.card{border:1px solid rgba(212,175,55,.32);border-radius:22px;background:rgba(11,19,36,.92);box-shadow:0 24px 80px rgba(0,0,0,.32)}
.hero,.article{padding:20px;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.card{overflow:hidden}
.card img{width:100%;height:185px;object-fit:cover;background:#07162f}
.card-body{padding:16px}
.cover{width:100%;border-radius:22px;border:1px solid rgba(212,175,55,.32);margin:16px 0;max-height:560px;object-fit:cover}
.badge{display:inline-flex;border:1px solid rgba(212,175,55,.6);border-radius:999px;padding:7px 11px;color:#d4af37;font-weight:900;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
h1{font-size:40px;line-height:1.08;margin:12px 0}h2{font-size:20px;line-height:1.2;margin-top:0}
p,li{color:#dfe7f8;line-height:1.66;font-size:17px}.card p{color:#aab3c4}
.meta{color:#d4af37;font-weight:900;font-size:13px;letter-spacing:.06em;text-transform:uppercase}.sourcebox{border-left:4px solid #d4af37;padding-left:14px;color:#aab3c4;margin:16px 0}
@media(max-width:760px){main{padding:16px}h1{font-size:30px}.btn,nav a{width:calc(100% - 30px)}}
</style>`;
}

function parseFeed(xml, source) {
  const text = String(xml || "");
  const blocks = [...rssBlocks(text, "item"), ...rssBlocks(text, "entry")];
  return blocks.map(block => {
    const title = clean(tag(block, "title"));
    const link = clean(tag(block, "link")) || clean(linkHref(block));
    const publishedAt = normalizeDate(clean(tag(block, "pubDate")) || clean(tag(block, "published")) || clean(tag(block, "updated")));
    const raw = tag(block, "description") || tag(block, "summary") || tag(block, "content") || tag(block, "content:encoded");
    const text = clean(raw);
    return { title, link: link || source.url, text, publishedAt, sourceTitle: source.title, sourceUrl: source.url, sourceGroup: source.group, lang: source.lang, sourceWeight: source.weight || 50, category: "business" };
  }).filter(x => x.title || x.link);
}

function rssBlocks(text, tagName) {
  return Array.from(String(text || "").matchAll(new RegExp("<" + tagName + "\\b[\\s\\S]*?<\\/" + tagName + ">", "gi"))).map(m => m[0]);
}

function tag(text, name) {
  const p = name.replace(":", "\\:");
  const m = String(text || "").match(new RegExp("<" + p + "\\b[^>]*>([\\s\\S]*?)<\\/" + p + ">", "i"));
  return m ? decode(m[1].replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "")) : "";
}

function linkHref(text) {
  const m = String(text || "").match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return m ? m[1] : "";
}

function clean(value) {
  return decode(String(value || "")).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanText(value) { return clean(value).slice(0, 600); }

function decode(value) {
  return String(value || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function normalizeDate(value) {
  const d = Date.parse(value || "");
  return Number.isFinite(d) ? new Date(d).toISOString() : new Date().toISOString();
}

async function getArticles(env) {
  const data = await readJson(env, AUTO_ARTICLES_KEY);
  return Array.isArray(data) ? data : [];
}

function dedupeArticles(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.slug || item.topicKey || item.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));
}

async function readJson(env, key) {
  try {
    const raw = await env.GNK_ASG_KV.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

async function writeJson(env, key, value) {
  await env.GNK_ASG_KV.put(key, JSON.stringify(value, null, 2));
}

async function kvGet(env, key) {
  try { return await env.GNK_ASG_KV.get(key); } catch (e) { return null; }
}

async function kvPut(env, key, value) {
  try { await env.GNK_ASG_KV.put(key, value); return true; } catch (e) { return false; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } });
}

function html(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function slugify(value) {
  return String(value || "auto-editor")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 92);
}

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function hashCode(value) {
  let h = 0;
  const s = String(value || "");
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h;
}

function stableId(value) { return "a" + (hashCode(value) >>> 0).toString(16); }
function absoluteUrl(url) { return /^https?:\/\//i.test(url) ? url : "https://gnk-asg.hr" + url; }
function formatDate(value) { try { return new Intl.DateTimeFormat("hr-HR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Zagreb" }).format(new Date(value)); } catch(e) { return value || ""; } }
function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escapeXml(value) { return escapeHtml(value); }