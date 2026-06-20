const AUTO_ARTICLES_KEY = "auto-editor:articles:v1";
const AUTO_USED_KEY = "auto-editor:used-topics:v1";
const MAX_ARTICLES = 1000;
const PRUNE_TO = 500;
const MIN_WORDS = 500;

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

    if (path === "/auto-editor" || path === "/auto-editor/") return html(listPage(await getArticles(env), "hr"));
    if (path === "/data/auto-editor.json" || path === "/data/publications-auto.json") return json(await publicFeed(env));
    if (path === "/api/auto-editor/status") return json(await status(env));
    if (path === "/api/auto-editor/run") return json(await runAutoEditor(env, "manual", true));
    if (path === "/auto-editor/sitemap.xml") return sitemap(await getArticles(env));

    const match = path.match(/^\/(auto-editor|objave|publications)\/([^\/]+)\/?$/);
    if (match) {
      const article = (await getArticles(env)).find(a => a.slug === match[2]);
      if (!article) return html(notFoundPage(match[1] === "publications" ? "en" : "hr"), 404);
      return html(articlePage(article, match[1] === "publications" ? "en" : "hr"));
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
    articleUrl: "https://gnk-asg.hr/objave/" + article.slug + "/",
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
    latest: articles.slice(0, 5).map(a => ({ title: a.titleHr || a.title, titleEn: a.titleEn || a.title, url: "/objave/" + a.slug + "/", enUrl: "/publications/" + a.slug + "/", publishedAt: a.publishedAt, wordCount: a.wordCountHr || a.wordCount, imageUrl: a.imageUrl }))
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
    sharedSource: "auto-editor:articles:v1",
    count: articles.length,
    items: articles.map(a => ({
      title: a.titleHr || a.title,
      titleHr: a.titleHr || a.title,
      titleEn: a.titleEn || a.title,
      slug: a.slug,
      url: "/objave/" + a.slug + "/",
      hrUrl: "/objave/" + a.slug + "/",
      enUrl: "/publications/" + a.slug + "/",
      canonical: "https://gnk-asg.hr/objave/" + a.slug + "/",
      imageUrl: a.imageUrl,
      imageAlt: a.imageAlt,
      summary: a.summaryHr || a.summary,
      summaryHr: a.summaryHr || a.summary,
      summaryEn: a.summaryEn || a.summary,
      sourceTitle: a.sourceTitle,
      sourceUrl: a.sourceUrl,
      sourceLang: a.sourceLang || "hr",
      publishedAt: a.publishedAt,
      wordCount: a.wordCountHr || a.wordCount,
      wordCountHr: a.wordCountHr || a.wordCount,
      wordCountEn: a.wordCountEn || a.wordCount,
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
  const titleHr = makeTitle(topic, "hr");
  const titleEn = makeTitle(topic, "en");
  const slug = slugify(titleHr + "-" + dateIso.slice(0, 13));

  let bodyHr = buildParagraphs(topic, titleHr, "hr").join("\n\n");
  let bodyEn = buildParagraphs(topic, titleEn, "en").join("\n\n");

  while (wordCount(bodyHr) < MIN_WORDS) bodyHr += "\n\n" + extraParagraph(topic, "hr");
  while (wordCount(bodyEn) < MIN_WORDS) bodyEn += "\n\n" + extraParagraph(topic, "en");

  const summaryHr = makeSummary(topic, titleHr, "hr");
  const summaryEn = makeSummary(topic, titleEn, "en");

  return {
    id: stableId(slug),
    topicKey: topic.topicKey,
    title: titleHr,
    titleHr,
    titleEn,
    slug,
    summary: summaryHr,
    summaryHr,
    summaryEn,
    body: bodyHr,
    bodyHr,
    bodyEn,
    wordCount: wordCount(bodyHr),
    wordCountHr: wordCount(bodyHr),
    wordCountEn: wordCount(bodyEn),
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
      canonical: "https://gnk-asg.hr/objave/" + slug + "/",
      alternateEn: "https://gnk-asg.hr/publications/" + slug + "/",
      description: summaryHr,
      descriptionEn: summaryEn,
      keywords: "GNK ASG, GNK DINAMO Ltd, Nermin Sefić, poslovne vijesti, business desk, tržišta, AI, financije, tehnologija"
    }
  };
}

function makeTitle(topic, language = "hr") {
  const fallback = language === "en" ? "Business topic of the day" : "Poslovna tema dana";
  const t = String(topic.title || fallback).replace(/\s+/g, " ").trim();
  if (/gnk asg/i.test(t)) return t;
  return language === "en" ? "Business review: " + t : "Poslovni pregled: " + t;
}

function makeSummary(topic, title, language = "hr") {
  const base = cleanText(topic.text || "");
  if (base.length > 80) return base.slice(0, 220);
  return language === "en"
    ? title + " — an original business analysis of a current topic selected from verified public sources."
    : title + " — autorska poslovna obrada aktualne teme izdvojene iz provjerljivih javnih izvora.";
}

function buildParagraphs(topic, title, language = "hr") {
  const source = topic.sourceTitle || (language === "en" ? "a public media source" : "javni medijski izvor");
  const original = cleanText(topic.text || topic.title || "");

  if (language === "en") {
    return [
      `${title} is one of the topics selected by the GNK ASG Auto Editor from current business and media sources. The initial information comes from ${source}. This article does not reproduce the source; it places the signal into a wider corporate, market and technology context. The topic matters because companies increasingly operate under the combined pressure of capital costs, inflation, energy prices, regulation, artificial intelligence, cyber risk and rapidly changing expectations from clients, partners and investors.`,

      `The first management question is why this development matters now. A news item can affect more than one operational area at the same time. Market movements influence financing and investment decisions. Technology developments influence productivity, governance and workforce organisation. Energy, commodity and interest-rate changes influence prices, margins and long-term planning. A company therefore needs a structured method that separates verified facts from interpretation and converts public information into a usable early-warning signal.`,

      `The original source summary is: ${original || "The RSS source did not provide a complete summary, so the analysis relies on the available headline, source attribution and broader business context."} This source statement is only the starting point. The relevant business assessment is whether the event can increase costs, create a market opportunity, change investor expectations, accelerate digital transformation, affect reputation or require additional compliance and operational safeguards.`,

      `For GNK ASG and GNK DINAMO Ltd., this type of daily review supports disciplined monitoring rather than reactive communication. The objective is to connect each topic with a documented source, publication time, image, metadata, search visibility and an archived analytical conclusion. Such a system improves transparency because readers can identify the original source while also understanding how the issue may relate to governance, investment, technology, sport economics and international business.`,

      `The practical response should include verification of the source, comparison with other reliable information, identification of affected business functions and a clear distinction between facts, assumptions and scenarios. Management should avoid making decisions from a single headline. The stronger approach is to document what changed, why it may matter, which indicators should be monitored and what action would become necessary if the risk or opportunity develops further.`,

      `In conclusion, this topic deserves continued attention because it may influence investment, communication, partnerships, costs and public positioning. The article is an original informational business analysis authored by Nermin Sefić for the GNK ASG portal. It is not financial, legal or investment advice. Readers should consult the cited original source for the underlying information, while this publication provides an independent corporate and market perspective.`
    ];
  }

  return [
    `${title} jedna je od tema koju je GNK ASG Auto Editor izdvojio iz aktualnih poslovnih i medijskih izvora. Polazna informacija dolazi iz izvora ${source}. Ovaj tekst ne prenosi izvorni članak, nego signal stavlja u širi korporativni, tržišni i tehnološki kontekst. Tema je važna jer kompanije istodobno djeluju pod utjecajem cijene kapitala, inflacije, energije, regulative, umjetne inteligencije, kibernetičkih rizika i promjenjivih očekivanja klijenata, partnera i investitora.`,

    `Prvo upravljačko pitanje glasi zašto je ova promjena važna upravo sada. Jedna vijest može istodobno utjecati na više poslovnih područja. Tržišna kretanja utječu na financiranje i investicijske odluke. Tehnološke promjene utječu na produktivnost, upravljanje i organizaciju rada. Promjene cijena energije, roba i kamata prelijevaju se na cijene, marže i dugoročno planiranje. Zato je potreban strukturirani postupak koji odvaja provjerljive činjenice od interpretacije i javnu informaciju pretvara u rani poslovni signal.`,

    `Izvorni sažetak teme glasi: ${original || "RSS izvor nije dostavio potpuni sažetak, pa se analiza temelji na dostupnom naslovu, navedenom izvoru i širem poslovnom kontekstu."} Ta je informacija samo početna točka. Poslovna procjena mora odgovoriti može li događaj povećati troškove, otvoriti tržišnu priliku, promijeniti očekivanja investitora, ubrzati digitalizaciju, utjecati na reputaciju ili zahtijevati dodatne regulatorne i operativne mjere zaštite.`,

    `Za GNK ASG i GNK DINAMO Ltd. ovakav dnevni pregled služi discipliniranom praćenju, a ne reaktivnoj komunikaciji. Cilj je svaku temu povezati s dokumentiranim izvorom, vremenom objave, slikom, metapodacima, vidljivošću u tražilicama i arhiviranim analitičkim zaključkom. Takav sustav povećava transparentnost jer čitatelj može prepoznati izvornu informaciju, ali i razumjeti moguću vezu s korporativnim upravljanjem, ulaganjima, tehnologijom, ekonomijom sporta i međunarodnim poslovanjem.`,

    `Praktičan odgovor uključuje provjeru izvora, usporedbu s drugim pouzdanim informacijama, utvrđivanje poslovnih funkcija na koje tema može utjecati te jasno odvajanje činjenica, pretpostavki i scenarija. Odluke se ne bi smjele temeljiti na jednom naslovu. Kvalitetniji pristup bilježi što se promijenilo, zašto bi to moglo biti važno, koje pokazatelje treba pratiti i koja bi radnja postala potrebna ako se rizik ili prilika dodatno razviju.`,

    `Zaključno, temu treba nastaviti pratiti jer može utjecati na ulaganja, komunikaciju, partnerstva, troškove i javno pozicioniranje. Tekst je izvorna informativna poslovna analiza autora Nermina Sefića za portal GNK ASG. Ne predstavlja financijski, pravni ni investicijski savjet. Čitatelj izvornu informaciju treba provjeriti na navedenom izvoru, dok ova objava daje neovisni korporativni i tržišni okvir.`
  ];
}

function extraParagraph(topic, language = "hr") {
  return language === "en"
    ? `An additional layer of analysis concerns timing and evidence. Useful corporate intelligence must record the publication date, the reliability of the source, the assumptions used in interpretation and the indicators that could confirm or reject the initial assessment. This is why the GNK ASG publishing model connects source attribution, editorial analysis, images, SEO metadata, archive status and a clear conclusion in one controlled process.`
    : `Dodatni sloj analize odnosi se na vrijeme i dokazivost. Korisna poslovna informacija mora sadržavati datum objave, procjenu pouzdanosti izvora, pretpostavke korištene u tumačenju i pokazatelje koji početnu procjenu mogu potvrditi ili osporiti. Zato GNK ASG model objave u jednom kontroliranom procesu povezuje izvor, uredničku analizu, sliku, SEO metapodatke, status arhive i jasan zaključak.`;
}

function articlePage(article, language = "hr") {
  const isEn = language === "en";
  const rawTitle = isEn ? (article.titleEn || article.title) : (article.titleHr || article.title);
  const rawSummary = isEn ? (article.summaryEn || article.summary) : (article.summaryHr || article.summary);
  const rawBody = isEn ? (article.bodyEn || article.body) : (article.bodyHr || article.body);
  const title = escapeHtml(rawTitle);
  const desc = escapeHtml(rawSummary);
  const canonical = "https://gnk-asg.hr/objave/" + article.slug + "/";
  const alternateEn = "https://gnk-asg.hr/publications/" + article.slug + "/";
  const image = absoluteUrl(article.imageUrl);
  const bodyHtml = String(rawBody || "").split(/\n\s*\n/).map(p => "<p>" + escapeHtml(p) + "</p>").join("\n");
  const words = isEn ? (article.wordCountEn || article.wordCount) : (article.wordCountHr || article.wordCount);

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": rawTitle,
    "description": rawSummary,
    "image": image,
    "inLanguage": isEn ? "en" : "hr",
    "author": { "@type": "Person", "name": "Nermin Sefić" },
    "publisher": { "@type": "Organization", "name": "GNK ASG", "url": "https://gnk-asg.hr" },
    "datePublished": article.publishedAt,
    "dateModified": article.modifiedAt || article.publishedAt,
    "mainEntityOfPage": canonical,
    "isBasedOn": article.sourceUrl
  }, null, 2);

  return `<!doctype html>
<html lang="${isEn ? "en" : "hr"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | GNK ASG</title>
<meta name="description" content="${desc}">
<meta name="keywords" content="${escapeHtml(article.seo?.keywords || "GNK ASG, GNK DINAMO Ltd, Nermin Sefić, business analysis")}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="hr" href="${canonical}">
<link rel="alternate" hreflang="en" href="${alternateEn}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${isEn ? alternateEn : canonical}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${jsonLd}</script>
${style()}
</head>
<body>
<main>
<nav>
<a href="/">${isEn ? "Home" : "Početna"}</a>
<a href="${isEn ? "/publications/" : "/objave/"}">${isEn ? "Publications" : "Objave"}</a>
<a href="${isEn ? canonical : alternateEn}">${isEn ? "Hrvatski" : "English"}</a>
<a href="/visual-index/">Visual Index</a>
<a href="/business-desk/">Business Desk</a>
</nav>
<article class="article">
<span class="badge">${isEn ? "Publication" : "Objava"} · ${escapeHtml(article.sourceGroup || "business")}</span>
<h1>${title}</h1>
<p class="meta">${isEn ? "Author" : "Autor"}: Nermin Sefić · ${formatDate(article.publishedAt)} · ${words} ${isEn ? "words" : "riječi"}</p>
<img class="cover" src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.imageAlt || rawTitle)}">
<div class="sourcebox">${isEn ? "Topic source" : "Izvor teme"}: <a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.sourceTitle)}</a>. ${isEn ? "This is an original GNK ASG business analysis." : "Tekst je izvorna poslovna obrada za GNK ASG."}</div>
${bodyHtml}
<p><strong>${isEn ? "Notice" : "Napomena"}:</strong> ${isEn ? "This text is informational and is not financial, legal or investment advice." : "Ovaj tekst je informativna poslovna analiza i ne predstavlja financijski, pravni ni investicijski savjet."}</p>
<a class="btn" href="${isEn ? "/publications/" : "/objave/"}">${isEn ? "Back to publications" : "Povratak na objave"}</a>
</article>
</main>
</body>
</html>`;
}

function listPage(articles, language = "hr") {
  const isEn = language === "en";
  const cards = articles.map(a => {
    const title = isEn ? (a.titleEn || a.title) : (a.titleHr || a.title);
    const summary = isEn ? (a.summaryEn || a.summary) : (a.summaryHr || a.summary);
    const url = isEn ? `/publications/${a.slug}/` : `/objave/${a.slug}/`;
    const words = isEn ? (a.wordCountEn || a.wordCount) : (a.wordCountHr || a.wordCount);
    return `<article class="card"><img src="${escapeHtml(a.imageUrl)}" alt="${escapeHtml(a.imageAlt || title)}"><div class="card-body"><div class="meta">${formatDate(a.publishedAt)} · ${words} ${isEn ? "words" : "riječi"}</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(summary)}</p><p class="meta">${isEn ? "Author" : "Autor"}: Nermin Sefić</p><a class="btn" href="${url}">${isEn ? "Open article" : "Otvori članak"}</a></div></article>`;
  }).join("\n");

  return `<!doctype html>
<html lang="${isEn ? "en" : "hr"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${isEn ? "GNK ASG Publications" : "GNK ASG Auto Editor"} | GNK ASG</title>
<meta name="description" content="${isEn ? "GNK ASG business publications with sources, images, SEO metadata and analysis by Nermin Sefić." : "GNK ASG poslovne objave s izvorima, slikama, SEO podacima i analizama autora Nermina Sefića."}">
<link rel="canonical" href="${isEn ? "https://gnk-asg.hr/publications/" : "https://gnk-asg.hr/auto-editor/"}">
<meta name="twitter:card" content="summary_large_image">
${style()}
</head>
<body>
<main>
<nav><a href="/">${isEn ? "Home" : "Početna"}</a><a href="/objave/">Objave</a><a href="/publications/">Publications</a><a href="/visual-index/">Visual Index</a><a href="/business-desk/">Business Desk</a></nav>
<section class="hero"><span class="badge">Auto Editor</span><h1>${isEn ? "GNK ASG Publications" : "GNK ASG Auto Editor"}</h1><p>${isEn ? "Three daily editorial reviews at 08:00, 12:00 and 17:00 Europe/Zagreb. Every article contains at least 500 words, a cited source, an image, SEO metadata and a clear conclusion." : "Tri dnevna urednička pregleda u 08:00, 12:00 i 17:00 po Zagrebu. Svaki članak ima najmanje 500 riječi, navedeni izvor, sliku, SEO metapodatke i jasan zaključak."}</p></section>
<section class="grid">${cards || `<article class="card"><div class="card-body"><h2>${isEn ? "No publications yet" : "Još nema članaka"}</h2></div></article>`}</section>
</main>
</body>
</html>`;
}

function notFoundPage(language = "hr") {
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