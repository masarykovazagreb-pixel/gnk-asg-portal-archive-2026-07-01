
const GNK_ASG_NEWS_AUTOMATION_V2 = true;
const AUTO_EDITOR_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const REFRESH_HOURS_ZAGREB = new Set([9, 16]);

const SOURCE_FEEDS = [
  { source: "BBC Business", category: "business", region: "world", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { source: "BBC Technology", category: "technology", region: "world", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { source: "The Guardian Business", category: "business", region: "world", url: "https://www.theguardian.com/uk/business/rss" },
  { source: "The Guardian Technology", category: "technology", region: "world", url: "https://www.theguardian.com/uk/technology/rss" },
  { source: "EURACTIV", category: "region", region: "Europe", url: "https://www.euractiv.com/feed/" },
  { source: "Balkan Green Energy News", category: "industry", region: "region", url: "https://balkangreenenergynews.com/feed/" }
];

const SEO_ENTITY_TERMS = [
  "Nermin Sefić",
  "Nermin Sefic",
  "GNK ASG",
  "GNK ASG d.o.o.",
  "GNK DINAMO Ltd.",
  "poslovanje",
  "business",
  "tehnologija",
  "industrija",
  "umjetna inteligencija"
];

const REJECT_TERMS = [
  "discount",
  "coupon",
  "shopping",
  "fashion",
  "celebrity",
  "recipe",
  "horoscope",
  "lottery",
  "travel tips",
  "gift guide",
  "best deals",
  "sale"
];

const IMPORTANCE_TERMS = [
  "investment",
  "investicija",
  "artificial intelligence",
  "umjetna inteligencija",
  "technology",
  "tehnologija",
  "industry",
  "industrija",
  "energy",
  "energija",
  "economy",
  "gospodarstvo",
  "market",
  "tržište",
  "regulation",
  "regulativa",
  "merger",
  "acquisition",
  "supply chain",
  "semiconductor",
  "cloud",
  "cybersecurity",
  "productivity",
  "infrastructure",
  "europe",
  "balkan",
  "croatia"
];

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      ...extraHeaders
    }
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate"
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function normalizeSpace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return String(value || "objava")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110) || "objava";
}

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function safeUrl(value, base = "https://gnk-asg.hr") {
  try {
    const url = new URL(String(value || ""), base);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function nowIso() {
  return new Date().toISOString();
}

function store(env) {
  return env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
}

async function readJson(env, key, fallback = null) {
  const kv = store(env);
  if (!kv) return fallback;
  try {
    const raw = await kv.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(env, key, value, ttl = null) {
  const kv = store(env);
  if (!kv) return false;
  try {
    const options = ttl ? { expirationTtl: ttl } : undefined;
    await kv.put(key, JSON.stringify(value, null, 2), options);
    return true;
  } catch {
    return false;
  }
}

async function readList(env, key) {
  const value = await readJson(env, key, []);
  return Array.isArray(value) ? value : [];
}

async function writeList(env, key, items, max = 500) {
  return writeJson(env, key, items.slice(0, max));
}

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickTag(block, tag) {
  const expression = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = String(block || "").match(expression);
  return match ? decodeXml(match[1]) : "";
}

function pickLink(block) {
  const textLink = pickTag(block, "link");
  if (textLink) return textLink;
  const attributeLink = String(block || "").match(/<link[^>]+href=["']([^"']+)["']/i);
  return attributeLink ? decodeXml(attributeLink[1]) : "";
}

function rssItems(xml, feed) {
  const blocks =
    String(xml || "").match(/<item[\s\S]*?<\/item>/gi) ||
    String(xml || "").match(/<entry[\s\S]*?<\/entry>/gi) ||
    [];

  return blocks.slice(0, 12).map((block, index) => {
    const title = pickTag(block, "title");
    const summary =
      pickTag(block, "description") ||
      pickTag(block, "summary") ||
      pickTag(block, "content");
    const url = safeUrl(pickLink(block));
    const publishedAt =
      pickTag(block, "pubDate") ||
      pickTag(block, "published") ||
      pickTag(block, "updated") ||
      nowIso();

    return {
      id: slugify(`${feed.source}-${index}-${title}`),
      title: normalizeSpace(title),
      summary: normalizeSpace(summary).slice(0, 700),
      url,
      sourceUrl: url,
      source: feed.source,
      category: feed.category,
      group: feed.category,
      region: feed.region,
      publishedAt,
      published_at: publishedAt
    };
  }).filter(item => item.title && item.url);
}

async function fetchSourceItems() {
  const items = [];
  const errors = [];

  for (const feed of SOURCE_FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          "user-agent": "GNK-ASG-News-Automation/2.0",
          "accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
        }
      });

      const body = await response.text();

      if (!response.ok) {
        errors.push({ source: feed.source, status: response.status });
        continue;
      }

      items.push(...rssItems(body, feed));
    } catch (error) {
      errors.push({
        source: feed.source,
        error: String(error?.message || error)
      });
    }
  }

  const seen = new Set();
  const deduplicated = items.filter(item => {
    const key = String(item.url || item.title).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => {
    return Date.parse(right.publishedAt || 0) - Date.parse(left.publishedAt || 0);
  });

  return { items: deduplicated.slice(0, 100), errors };
}

async function refreshExternalNews(env) {
  const result = await fetchSourceItems();
  const data = {
    ok: true,
    status: result.items.length ? "LIVE" : "FALLBACK",
    updatedAt: nowIso(),
    count: result.items.length,
    sources: SOURCE_FEEDS.map(feed => feed.source),
    errors: result.errors,
    items: result.items
  };

  await writeJson(env, "data:news:external", data);
  await writeJson(env, "automation:news-refresh:last", {
    ok: true,
    updatedAt: data.updatedAt,
    count: data.count,
    status: data.status,
    errors: data.errors
  });

  return data;
}

async function readStaticNews(request, env) {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") return [];

  try {
    const assetUrl = new URL("/data/news.json", request.url);
    const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), {
      method: "GET",
      headers: { accept: "application/json" }
    }));

    if (!response.ok) return [];
    const parsed = await response.json();
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
    return [];
  } catch {
    return [];
  }
}

function newsTimestamp(item) {
  const raw =
    item?.published_at ||
    item?.publishedAt ||
    item?.createdAt ||
    item?.updatedAt ||
    "";
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeNewsItem(item) {
  if (!item || typeof item !== "object") return null;
  const url = safeUrl(item.url || item.sourceUrl || "");
  const title = normalizeSpace(item.title);
  if (!title || !url) return null;

  return {
    ...item,
    id: String(item.id || `news-${newsTimestamp(item)}-${slugify(title)}`),
    kind: String(item.kind || "news"),
    title,
    summary: normalizeSpace(item.summary || item.description || ""),
    url,
    sourceUrl: url,
    source: normalizeSpace(item.source || item.region || item.category || "GNK ASG"),
    region: normalizeSpace(item.region || item.source || "GNK ASG"),
    group: normalizeSpace(item.group || item.category || "business"),
    category: normalizeSpace(item.category || item.group || "business"),
    publishedAt:
      item.publishedAt ||
      item.published_at ||
      item.createdAt ||
      item.updatedAt ||
      nowIso(),
    published_at:
      item.published_at ||
      item.publishedAt ||
      item.createdAt ||
      item.updatedAt ||
      nowIso()
  };
}

async function mergedNewsFeed(request, env) {
  const manual = await readList(env, "data:news:items");
  const externalData = await readJson(env, "data:news:external", { items: [] });
  const external = Array.isArray(externalData?.items) ? externalData.items : [];
  const fallback = await readStaticNews(request, env);

  const seen = new Set();
  const items = [...manual, ...external, ...fallback]
    .map(normalizeNewsItem)
    .filter(item => {
      if (!item) return false;
      const key = String(item.id || item.url || item.title).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => newsTimestamp(right) - newsTimestamp(left))
    .slice(0, 500);

  return {
    ok: true,
    status: externalData?.status || (external.length ? "LIVE" : "SNAPSHOT"),
    updatedAt:
      externalData?.updatedAt ||
      items[0]?.publishedAt ||
      items[0]?.published_at ||
      nowIso(),
    source: "GNK_ASG_MERGED_NEWS_V2",
    counts: {
      manual: manual.length,
      external: external.length,
      static: fallback.length,
      total: items.length
    },
    items
  };
}

function zagrebParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zagreb",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date).reduce((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    isoLocal: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`
  };
}

async function claimSlot(env, key) {
  const kv = store(env);
  if (!kv) return true;

  const existing = await kv.get(key);
  if (existing) return false;

  await kv.put(key, nowIso(), { expirationTtl: 60 * 60 * 48 });
  return true;
}

function requestToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);

  return String(
    (bearer && bearer[1]) ||
    request.headers.get("x-news-publish-token") ||
    request.headers.get("x-operator-token") ||
    request.headers.get("x-admin-token") ||
    request.headers.get("x-gnk-asg-token") ||
    ""
  ).trim();
}

function safeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  if (!a || !b || a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

function operatorAuthorized(request, env) {
  const candidate = requestToken(request);
  const expected = [
    env.NEWS_PUBLISH_TOKEN,
    env.OPERATOR_TOKEN,
    env.GNK_ASG_OPERATOR_TOKEN,
    env.ADMIN_TOKEN,
    env.GNK_ASG_ADMIN_TOKEN
  ].map(value => String(value || "").trim()).filter(Boolean);

  return expected.some(value => safeEqual(candidate, value));
}

function desiredCategory(hour) {
  const rotation = ["business", "technology", "industry", "region"];
  return rotation[Math.floor(hour / 3) % rotation.length];
}

function candidateScore(item, desired) {
  const text = `${item.title} ${item.summary}`.toLowerCase();

  if (REJECT_TERMS.some(term => text.includes(term))) return -10000;

  let score = 0;
  if (item.category === desired) score += 18;
  if (item.region === "Europe" || item.region === "region") score += 6;

  for (const term of IMPORTANCE_TERMS) {
    if (text.includes(term)) score += 2;
  }

  const timestamp = Date.parse(item.publishedAt || "");
  if (Number.isFinite(timestamp)) {
    const ageHours = Math.max(0, (Date.now() - timestamp) / 3600000);
    if (ageHours <= 6) score += 12;
    else if (ageHours <= 24) score += 8;
    else if (ageHours <= 72) score += 3;
    else score -= 6;
  }

  score += Math.min(6, Math.floor(item.summary.length / 120));
  return score;
}

async function selectTopic(env) {
  const sourceResult = await fetchSourceItems();
  const history = await readList(env, "auto-editor:history");
  const usedUrls = new Set(history.slice(0, 300).map(entry => String(entry.sourceUrl || "").toLowerCase()));
  const desired = desiredCategory(zagrebParts().hour);

  const ranked = sourceResult.items
    .map(item => ({ item, score: candidateScore(item, desired) }))
    .filter(entry => entry.score > -1000)
    .sort((left, right) => right.score - left.score);

  const primaryEntry =
    ranked.find(entry => !usedUrls.has(String(entry.item.url).toLowerCase())) ||
    ranked[0] ||
    null;

  if (!primaryEntry) {
    return {
      ok: false,
      error: "no_suitable_source",
      errors: sourceResult.errors
    };
  }

  const primary = primaryEntry.item;
  const related = ranked
    .filter(entry =>
      entry.item.url !== primary.url &&
      (entry.item.category === primary.category || entry.item.region === primary.region)
    )
    .slice(0, 2)
    .map(entry => entry.item);

  return {
    ok: true,
    desiredCategory: desired,
    primary,
    related,
    sourceErrors: sourceResult.errors
  };
}

function parseModelJson(raw) {
  const text = String(raw || "").trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("model_json_parse_failed");
  }
}

async function generateArticle(env, topic) {
  if (!env.AI || typeof env.AI.run !== "function") {
    throw new Error("AI_binding_missing");
  }

  const sources = [topic.primary, ...topic.related].map(item => ({
    title: item.title,
    summary: item.summary,
    source: item.source,
    url: item.url,
    category: item.category,
    region: item.region,
    publishedAt: item.publishedAt
  }));

  const systemPrompt = [
    "Ti si glavni urednik GNK ASG Intelligence Deska.",
    "Piši originalan analitički članak na standardnom hrvatskom jeziku.",
    "Članak mora imati najmanje 650 i najviše 950 riječi.",
    "Teme su isključivo poslovanje, business, tehnologija, industrija i važna regionalna ili svjetska gospodarska pitanja.",
    "Ne kopiraj rečenice iz izvora i ne koristi duge citate.",
    "Ne izmišljaj brojke, imena, datume ili tvrdnje koje nisu u dostavljenim izvorima.",
    "Objasni važnost teme, poslovne posljedice, regionalni ili europski kontekst i dodaj vlastiti GNK ASG zaključak.",
    "Autor je Nermin Sefić.",
    "Vrati isključivo JSON bez markdowna s ključevima: title, summary, body, category, region, seoTitle, seoDescription, keywords."
  ].join(" ");

  const baseUserPrompt = JSON.stringify({
    task: "Napiši novu GNK ASG objavu na temelju navedenih izvora.",
    requiredEntities: SEO_ENTITY_TERMS,
    desiredCategory: topic.desiredCategory,
    sources
  }, null, 2);

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await env.AI.run(AUTO_EDITOR_MODEL, {
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `${baseUserPrompt}\nPokušaj ${attempt}. ${
              attempt > 1
                ? "Prethodni rezultat nije zadovoljio duljinu ili strukturu. Napiši 750 do 900 riječi i valjani JSON."
                : ""
            }`
          }
        ],
        temperature: 0.25,
        max_tokens: 4096
      });

      const raw =
        result?.response ||
        result?.result?.response ||
        result?.output_text ||
        result?.text ||
        "";

      const parsed = parseModelJson(raw);
      const title = normalizeSpace(parsed.title);
      const summary = normalizeSpace(parsed.summary);
      const body = String(parsed.body || "").trim();

      if (!title || title.length < 25) throw new Error("title_too_short");
      if (!summary || summary.length < 100) throw new Error("summary_too_short");
      if (wordCount(body) < 500) throw new Error(`body_too_short_${wordCount(body)}`);

      return {
        title,
        summary,
        body,
        category: normalizeSpace(parsed.category || topic.primary.category || "business"),
        region: normalizeSpace(parsed.region || topic.primary.region || "svijet"),
        seoTitle: normalizeSpace(parsed.seoTitle || title).slice(0, 75),
        seoDescription: normalizeSpace(parsed.seoDescription || summary).slice(0, 170),
        keywords: Array.from(new Set([
          ...SEO_ENTITY_TERMS,
          ...(Array.isArray(parsed.keywords) ? parsed.keywords.map(normalizeSpace) : [])
        ])).filter(Boolean).slice(0, 24),
        sources
      };
    } catch (error) {
      lastError = String(error?.message || error);
    }
  }

  throw new Error(`auto_editor_generation_failed:${lastError || "unknown"}`);
}

async function chooseImage(env, category, title) {
  const assets = await readList(env, "assets:list");
  const candidates = assets.filter(asset =>
    String(asset?.mime || "").toLowerCase().startsWith("image/")
  );

  const preferred = candidates.sort((left, right) => {
    const leftText = `${left.title || ""} ${left.alt || ""} ${left.folder || ""}`.toLowerCase();
    const rightText = `${right.title || ""} ${right.alt || ""} ${right.folder || ""}`.toLowerCase();
    return Number(rightText.includes(category)) - Number(leftText.includes(category));
  });

  for (const asset of preferred.slice(0, 20)) {
    const candidate = safeUrl(
      asset.newsProxyUrl ||
      asset.publicUrl ||
      asset.suggestedPublicPath ||
      ""
    );

    if (!candidate) continue;

    try {
      const response = await fetch(candidate, { method: "HEAD" });
      if (response.ok) {
        return {
          url: candidate,
          title: normalizeSpace(asset.title || title),
          alt: normalizeSpace(asset.alt || `${title} – GNK ASG analiza`),
          caption: normalizeSpace(asset.caption || `GNK ASG Intelligence Desk – ${title}`),
          credit: "GNK ASG Visual Index"
        };
      }
    } catch {
    }
  }

  return {
    url: "https://gnk-asg.hr/assets/insights/ai-razvojni-alati-stvarna-cijena-gnk-asg.svg",
    title,
    alt: `${title} – GNK ASG analiza`,
    caption: `GNK ASG Intelligence Desk – ${title}`,
    credit: "GNK ASG Visual Index"
  };
}

function appendSources(body, sources) {
  const lines = sources
    .filter(source => source.url)
    .map((source, index) =>
      `${index + 1}. ${source.source}: ${source.title} – ${source.url}`
    );

  return `${String(body || "").trim()}

Izvori informacija:
${lines.join("\n")}

Autor: Nermin Sefić`;
}

async function publishArticle(env, topic, generated) {
  const now = nowIso();
  const slug = slugify(generated.title);
  const id = `auto-${now.replace(/[^0-9]/g, "").slice(0, 14)}-${slug.slice(0, 55)}`;
  const canonical = `https://gnk-asg.hr/objave/${slug}/`;
  const image = await chooseImage(env, generated.category, generated.title);
  const body = appendSources(generated.body, generated.sources);

  if (wordCount(body) < 500) {
    throw new Error("published_body_below_500_words");
  }

  const article = {
    id,
    kind: "article",
    type: "article",
    lang: "hr",
    language: "hr",
    title: generated.title,
    slug,
    summary: generated.summary,
    excerpt: generated.summary,
    body,
    category: generated.category,
    group: generated.category,
    region: generated.region,
    image: image.url,
    imageAlt: image.alt,
    imageTitle: image.title,
    imageCaption: image.caption,
    imageCredit: image.credit,
    author: "Nermin Sefić",
    source: "GNK ASG Intelligence Desk",
    sourceUrl: topic.primary.url,
    sources: generated.sources,
    status: "published",
    approvedForPublic: true,
    createdAt: now,
    updatedAt: now,
    approvedAt: now,
    publishedAt: now,
    published_at: now,
    canonical,
    publicUrl: `/objave/${slug}/`,
    seo: {
      title: generated.seoTitle,
      description: generated.seoDescription,
      keywords: generated.keywords,
      canonical,
      author: "Nermin Sefić",
      entities: ["Nermin Sefić", "GNK ASG d.o.o.", "GNK DINAMO Ltd."]
    },
    schema: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: generated.title,
      description: generated.seoDescription,
      datePublished: now,
      dateModified: now,
      mainEntityOfPage: canonical,
      author: {
        "@type": "Person",
        name: "Nermin Sefić"
      },
      publisher: {
        "@type": "Organization",
        name: "GNK ASG d.o.o.",
        url: "https://gnk-asg.hr/"
      },
      image: {
        "@type": "ImageObject",
        url: image.url,
        caption: image.caption,
        creditText: image.credit
      },
      about: [
        { "@type": "Person", name: "Nermin Sefić" },
        { "@type": "Organization", name: "GNK ASG d.o.o." },
        { "@type": "Organization", name: "GNK DINAMO Ltd." }
      ]
    }
  };

  const approved = await readList(env, "publish:approved");
  const articles = await readList(env, "data:articles:items");
  const news = await readList(env, "data:news:items");
  const history = await readList(env, "auto-editor:history");

  const nextApproved = [
    article,
    ...approved.filter(item => item?.slug !== slug && item?.sourceUrl !== topic.primary.url)
  ].slice(0, 500);

  const nextArticles = [
    article,
    ...articles.filter(item => item?.slug !== slug && item?.sourceUrl !== topic.primary.url)
  ].slice(0, 500);

  const teaser = {
    id: `news-${id}`,
    kind: "news",
    lang: "hr",
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    body: "",
    url: canonical,
    sourceUrl: canonical,
    source: "GNK ASG Intelligence Desk",
    region: article.region,
    group: article.category,
    category: article.category,
    image: article.image,
    imageAlt: article.imageAlt,
    publishedAt: now,
    published_at: now,
    share_url: `/podijeli/vijest/news-${id}/`,
    status: "published",
    createdAt: now,
    updatedAt: now
  };

  const nextNews = [
    teaser,
    ...news.filter(item => item?.url !== canonical && item?.title !== article.title)
  ].slice(0, 500);

  const historyEntry = {
    articleId: id,
    title: article.title,
    slug,
    sourceUrl: topic.primary.url,
    source: topic.primary.source,
    publishedAt: now,
    category: article.category,
    wordCount: wordCount(body)
  };

  const saved = {
    approved: await writeList(env, "publish:approved", nextApproved),
    articles: await writeList(env, "data:articles:items", nextArticles),
    news: await writeList(env, "data:news:items", nextNews),
    history: await writeList(env, "auto-editor:history", [historyEntry, ...history], 500),
    item: await writeJson(env, `article:${id}`, article)
  };

  await writeJson(env, "auto-editor:last", {
    ok: true,
    version: "GNK_ASG_NEWS_AUTOMATION_V2",
    model: AUTO_EDITOR_MODEL,
    articleId: id,
    title: article.title,
    slug,
    publicUrl: article.publicUrl,
    sourceUrl: topic.primary.url,
    publishedAt: now,
    wordCount: wordCount(body),
    saved
  });

  return { article, teaser, saved };
}

async function runAutoEditor(env) {
  const startedAt = nowIso();

  try {
    const topic = await selectTopic(env);
    if (!topic.ok) {
      const skipped = {
        ok: false,
        skipped: true,
        error: topic.error,
        startedAt,
        finishedAt: nowIso(),
        sourceErrors: topic.errors || []
      };
      await writeJson(env, "auto-editor:last", skipped);
      return skipped;
    }

    const generated = await generateArticle(env, topic);
    const published = await publishArticle(env, topic, generated);

    return {
      ok: true,
      version: "GNK_ASG_NEWS_AUTOMATION_V2",
      model: AUTO_EDITOR_MODEL,
      startedAt,
      finishedAt: nowIso(),
      desiredCategory: topic.desiredCategory,
      source: topic.primary,
      article: published.article,
      saved: published.saved
    };
  } catch (error) {
    const failure = {
      ok: false,
      error: String(error?.message || error),
      startedAt,
      finishedAt: nowIso()
    };
    await writeJson(env, "auto-editor:last", failure);
    return failure;
  }
}

async function automationStatus(env) {
  return {
    ok: true,
    version: "GNK_ASG_NEWS_AUTOMATION_V2",
    timezone: "Europe/Zagreb",
    newsRefreshSchedule: ["09:00", "16:00"],
    autoEditorSchedule: "svaka 3 sata",
    minimumWords: 500,
    model: AUTO_EDITOR_MODEL,
    seoEntities: ["Nermin Sefić", "GNK ASG d.o.o.", "GNK DINAMO Ltd."],
    lastNewsRefresh: await readJson(env, "automation:news-refresh:last", null),
    lastAutoEditor: await readJson(env, "auto-editor:last", null),
    lastScheduledRun: await readJson(env, "automation:scheduled:last", null)
  };
}

function renderBody(body) {
  return String(body || "")
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderSources(sources) {
  const items = Array.isArray(sources) ? sources : [];
  if (!items.length) return "";

  return `<section class="sources">
    <h2>Izvori informacija</h2>
    <ol>
      ${items.map(source => `<li><a href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.source)} — ${escapeHtml(source.title)}</a></li>`).join("")}
    </ol>
  </section>`;
}

async function publicationListHtml(env, english = false) {
  const items = await readList(env, "publish:approved");
  const cards = items.length
    ? items.map(item => `
      <article class="pub-card">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy">` : ""}
        <small>${escapeHtml(item.category || "business")} · ${escapeHtml(item.publishedAt || "")}</small>
        <h2>${escapeHtml(item.title || "Bez naslova")}</h2>
        <p>${escapeHtml(item.summary || "")}</p>
        <a href="${english ? `/publications/${escapeHtml(item.slug)}/` : `/objave/${escapeHtml(item.slug)}/`}">${english ? "Open article" : "Otvori objavu"} →</a>
      </article>
    `).join("")
    : `<div class="empty">${english ? "No published articles yet." : "Još nema objavljenih tekstova."}</div>`;

  return htmlResponse(`<!doctype html>
<html lang="${english ? "en" : "hr"}" data-gnk-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${english ? "Publications & Insights" : "Objave i analize"} | GNK ASG</title>
<meta name="description" content="${english ? "GNK ASG publications, business analysis and technology insights." : "GNK ASG objave, poslovne analize, tehnologija i industrija."}">
<meta name="keywords" content="${escapeHtml(SEO_ENTITY_TERMS.join(", "))}">
<link rel="canonical" href="https://gnk-asg.hr/${english ? "publications" : "objave"}/">
<link rel="stylesheet" href="/assets/brand/gnk-asg-global-layer.css?v=20260622-automation-v2">
<script defer src="/assets/brand/gnk-asg-global-layer.js?v=20260622-automation-v2"></script>
<style>
body{margin:0;background:#050d19;color:#f7f9fc;font-family:Inter,Arial,sans-serif}
main{width:min(1220px,calc(100% - 28px));margin:auto;padding:112px 0 58px}
.hero,.pub-card,.empty{border:1px solid rgba(212,175,55,.32);border-radius:22px;background:#09182a}
.hero{padding:28px}.hero small,.pub-card small{color:#d4af37;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.hero h1{margin:8px 0;color:#fff;font:700 clamp(2.2rem,6vw,4.2rem)/1.05 Georgia,serif}
.hero p,.pub-card p{color:#c3cfdf;line-height:1.6}
.actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}.actions a,.pub-card a{color:#d4af37;text-decoration:none;font-weight:900}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:16px}
.pub-card{padding:18px;background:#0d2340}.pub-card img{width:100%;height:210px;object-fit:cover;border-radius:16px}
.pub-card h2{color:#fff;font-size:1.18rem;line-height:1.4}.empty{padding:22px;margin-top:16px;color:#c3cfdf}
</style>
</head>
<body>
<main>
<section class="hero">
<small>GNK ASG Intelligence Desk</small>
<h1>${english ? "Publications & Insights" : "Objave i analize"}</h1>
<p>${english ? "Original GNK ASG analysis of business, technology, industry and important regional or global developments." : "Izvorne analize GNK ASG-a o poslovanju, tehnologiji, industriji te važnim regionalnim i svjetskim događajima."}</p>
<div class="actions"><a href="/">${english ? "Home" : "Početna"}</a><a href="${english ? "/objave/" : "/publications/"}">${english ? "HR" : "EN"}</a><a href="${english ? "/news/" : "/vijesti/"}">${english ? "Business News" : "Poslovne vijesti"}</a></div>
</section>
<section class="grid">${cards}</section>
</main>
</body>
</html>`);
}

async function publicationDetailHtml(env, slug, english = false) {
  const items = await readList(env, "publish:approved");
  const item = items.find(entry => String(entry?.slug || "") === String(slug || ""));

  if (!item) {
    return htmlResponse("<!doctype html><html><head><meta charset=\"utf-8\"><title>Objava nije pronađena</title></head><body><h1>Objava nije pronađena</h1></body></html>", 404);
  }

  const canonical = item.canonical || `https://gnk-asg.hr/objave/${item.slug}/`;
  const seo = item.seo || {};
  const keywords = Array.from(new Set([
    ...SEO_ENTITY_TERMS,
    ...(Array.isArray(seo.keywords) ? seo.keywords : [])
  ])).join(", ");
  const schema = JSON.stringify(item.schema || {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.summary,
    datePublished: item.publishedAt,
    author: { "@type": "Person", name: "Nermin Sefić" },
    publisher: { "@type": "Organization", name: "GNK ASG d.o.o." }
  }).replace(/</g, "\\u003c");

  return htmlResponse(`<!doctype html>
<html lang="${english ? "en" : "hr"}" data-gnk-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHtml(seo.title || item.title)}</title>
<meta name="description" content="${escapeHtml(seo.description || item.summary)}">
<meta name="keywords" content="${escapeHtml(keywords)}">
<meta name="author" content="Nermin Sefić">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/objave/${escapeHtml(item.slug)}/">
<link rel="alternate" hreflang="en" href="https://gnk-asg.hr/publications/${escapeHtml(item.slug)}/">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(seo.title || item.title)}">
<meta property="og:description" content="${escapeHtml(seo.description || item.summary)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${escapeHtml(item.image || "")}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(seo.title || item.title)}">
<meta name="twitter:description" content="${escapeHtml(seo.description || item.summary)}">
<meta name="twitter:image" content="${escapeHtml(item.image || "")}">
<link rel="stylesheet" href="/assets/brand/gnk-asg-global-layer.css?v=20260622-automation-v2">
<script defer src="/assets/brand/gnk-asg-global-layer.js?v=20260622-automation-v2"></script>
<script type="application/ld+json">${schema}</script>
<style>
body{margin:0;background:#050d19;color:#f7f9fc;font-family:Inter,Arial,sans-serif}
main{max-width:940px;margin:auto;padding:112px 18px 64px}
article{border:1px solid rgba(212,175,55,.32);border-radius:24px;background:#09182a;padding:clamp(20px,4vw,42px);box-shadow:0 20px 60px rgba(0,0,0,.2)}
nav{margin-bottom:20px}nav a,.sources a{color:#d4af37;text-decoration:none;font-weight:900}
.meta{color:#d4af37;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
h1{font:700 clamp(2.2rem,6vw,4rem)/1.08 Georgia,serif;color:#fff}
h2{color:#d4af37;font-family:Georgia,serif}
.lead{font-size:1.15rem;color:#c3cfdf;line-height:1.65}
figure{margin:28px 0}figure img{width:100%;max-height:520px;object-fit:cover;border-radius:20px}figcaption{color:#9fb0c6;font-size:13px;margin-top:8px}
.content p{color:#d7e0ec;font-size:1.05rem;line-height:1.78}
.sources{margin-top:34px;padding-top:24px;border-top:1px solid rgba(212,175,55,.25)}.sources li{margin:10px 0;color:#c3cfdf}
</style>
</head>
<body>
<main>
<article>
<nav><a href="${english ? "/publications/" : "/objave/"}">← ${english ? "Publications" : "Objave"}</a> · <a href="/">GNK ASG</a></nav>
<div class="meta">${escapeHtml(item.category || "business")} · ${escapeHtml(item.publishedAt || "")} · Nermin Sefić</div>
<h1>${escapeHtml(item.title)}</h1>
<p class="lead">${escapeHtml(item.summary || "")}</p>
${item.image ? `<figure><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || item.title)}" title="${escapeHtml(item.imageTitle || item.title)}"><figcaption>${escapeHtml(item.imageCaption || "")} · ${escapeHtml(item.imageCredit || "GNK ASG Visual Index")}</figcaption></figure>` : ""}
<div class="content">${renderBody(item.body)}</div>
${renderSources(item.sources)}
</article>
</main>
</body>
</html>`);
}

async function publicManualRefresh(request, env) {
  if (request.method === "GET") {
    return jsonResponse({
      ok: true,
      endpoint: "/api/news-refresh",
      method: "POST",
      rateLimitSeconds: 300
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  const last = await readJson(env, "automation:public-refresh:last", null);
  const lastTime = Date.parse(last?.updatedAt || "");

  if (Number.isFinite(lastTime) && Date.now() - lastTime < 300000) {
    const retryAfter = Math.ceil((300000 - (Date.now() - lastTime)) / 1000);
    return jsonResponse({
      ok: false,
      error: "refresh_cooldown",
      retryAfter
    }, 429, { "retry-after": String(retryAfter) });
  }

  await writeJson(env, "automation:public-refresh:last", {
    updatedAt: nowIso(),
    ip: request.headers.get("cf-connecting-ip") || ""
  }, 600);

  const result = await refreshExternalNews(env);
  return jsonResponse(result);
}

async function runOperatorTask(request, env, task) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (!operatorAuthorized(request, env)) {
    return jsonResponse({ ok: false, error: "authorization_required" }, 401);
  }

  if (task === "refresh") {
    return jsonResponse(await refreshExternalNews(env));
  }

  if (task === "editor") {
    const result = await runAutoEditor(env);
    return jsonResponse(result, result.ok ? 200 : 500);
  }

  const news = await refreshExternalNews(env);
  const editor = await runAutoEditor(env);
  return jsonResponse({
    ok: news.ok && editor.ok,
    news,
    editor,
    updatedAt: nowIso()
  }, news.ok && editor.ok ? 200 : 500);
}

async function handleNewsAutomationRoute(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS" && path === "/api/news-refresh") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "https://gnk-asg.hr",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "600"
      }
    });
  }

  if (path === "/data/news.json") {
    return jsonResponse(await mergedNewsFeed(request, env), 200, {
      "x-gnk-asg-news-automation": "v2"
    });
  }

  if (path === "/api/news-refresh") {
    return publicManualRefresh(request, env);
  }

  if (path === "/data/news-automation-status.json" || path === "/operator/news-automation/status") {
    return jsonResponse(await automationStatus(env));
  }

  if (path === "/data/auto-editor.json") {
    return jsonResponse({
      ok: true,
      updatedAt: nowIso(),
      items: await readList(env, "publish:approved")
    });
  }

  if (path === "/operator/news-refresh") {
    return runOperatorTask(request, env, "refresh");
  }

  if (path === "/operator/auto-editor/run") {
    return runOperatorTask(request, env, "editor");
  }

  if (path === "/operator/news-automation/run") {
    return runOperatorTask(request, env, "all");
  }

  if (request.method === "GET" && (path === "/objave" || path === "/objave/")) {
    return publicationListHtml(env, false);
  }

  if (request.method === "GET" && (path === "/publications" || path === "/publications/")) {
    return publicationListHtml(env, true);
  }

  if (request.method === "GET" && path.startsWith("/objave/")) {
    const slug = path.replace(/^\/objave\//, "").replace(/\/$/, "");
    if (slug) return publicationDetailHtml(env, slug, false);
  }

  if (request.method === "GET" && path.startsWith("/publications/")) {
    const slug = path.replace(/^\/publications\//, "").replace(/\/$/, "");
    if (slug) return publicationDetailHtml(env, slug, true);
  }

  return null;
}

async function runNewsAutomation(event, env, ctx) {
  const local = zagrebParts();
  const result = {
    ok: true,
    version: "GNK_ASG_NEWS_AUTOMATION_V2",
    cron: event?.cron || "",
    timezone: "Europe/Zagreb",
    local,
    startedAt: nowIso(),
    newsRefresh: null,
    autoEditor: null
  };

  if (REFRESH_HOURS_ZAGREB.has(local.hour)) {
    const refreshKey = `automation:slot:news:${local.date}:${String(local.hour).padStart(2, "0")}`;
    if (await claimSlot(env, refreshKey)) {
      result.newsRefresh = await refreshExternalNews(env);
    } else {
      result.newsRefresh = { ok: true, skipped: true, reason: "slot_already_completed" };
    }
  }

  if (local.hour % 3 === 0) {
    const editorKey = `automation:slot:editor:${local.date}:${String(local.hour).padStart(2, "0")}`;
    if (await claimSlot(env, editorKey)) {
      result.autoEditor = await runAutoEditor(env);
    } else {
      result.autoEditor = { ok: true, skipped: true, reason: "slot_already_completed" };
    }
  }

  result.finishedAt = nowIso();
  result.ok =
    (!result.newsRefresh || result.newsRefresh.ok !== false) &&
    (!result.autoEditor || result.autoEditor.ok !== false);

  await writeJson(env, "automation:scheduled:last", result);

  const history = await readList(env, "automation:scheduled:history");
  await writeList(env, "automation:scheduled:history", [result, ...history], 200);

  return result;
}

export {
  handleNewsAutomationRoute,
  runNewsAutomation,
  refreshExternalNews,
  runAutoEditor
};
