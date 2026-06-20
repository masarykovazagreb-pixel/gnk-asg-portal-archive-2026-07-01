(() => {
  const root = document.getElementById("publication-grid");
  if (!root) return;

  const pageLanguage = document.body.dataset.publicationPage === "en" ? "en" : "hr";
  const countNode = document.getElementById("publication-count");

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const absolute = value => {
    const text = String(value || "");
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    return new URL(text, window.location.origin).href;
  };

  const dateValue = value => {
    const timestamp = Date.parse(value || "");
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  const normalizeStatic = item => ({
    ...item,
    kind: "static",
    titleHr: item.titleHr || item.title,
    titleEn: item.titleEn || item.title,
    summaryHr: item.summaryHr || item.summary,
    summaryEn: item.summaryEn || item.summary,
    hrUrl: item.hrUrl || item.originalUrl || item.url,
    enUrl: item.enUrl || item.originalUrl || item.url
  });

  const normalizeAuto = item => ({
    ...item,
    id: item.id || `auto-${item.slug}`,
    language: item.sourceLang === "en" ? "EN" : "HR",
    kind: "auto",
    titleHr: item.titleHr || item.title,
    titleEn: item.titleEn || item.title,
    summaryHr: item.summaryHr || item.summary,
    summaryEn: item.summaryEn || item.summary,
    hrUrl: item.hrUrl || `/objave/${item.slug}/`,
    enUrl: item.enUrl || `/publications/${item.slug}/`,
    canonical: item.canonical || absolute(`/objave/${item.slug}/`)
  });

  const fetchJson = async url => {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}`, {
      cache: "no-store",
      headers: { accept: "application/json" }
    });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  };

  const card = item => {
    const isEn = pageLanguage === "en";
    const title = isEn ? item.titleEn : item.titleHr;
    const summary = isEn ? item.summaryEn : item.summaryHr;
    const url = isEn ? item.enUrl : item.hrUrl;
    const language = item.language || (isEn ? "EN" : "HR");
    const section = item.kind === "auto"
      ? (isEn ? "GNK ASG Auto Publication" : "GNK ASG Auto objava")
      : (item.section || (isEn ? "Publication" : "Objava"));
    const action = isEn ? "Open publication →" : "Otvori objavu →";
    const words = item.wordCountEn || item.wordCountHr || item.wordCount;
    const metaWords = words ? `<span>${esc(words)} ${isEn ? "words" : "riječi"}</span>` : "";

    return `<article class="card" data-language="${esc(language)}" data-search="${esc(`${title} ${summary} ${section}`.toLowerCase())}">
      <a class="image-link" href="${esc(url)}">
        <img src="${esc(item.imageUrl)}" alt="${esc(item.imageAlt || title)}" loading="lazy" decoding="async">
      </a>
      <div class="card-body">
        <div class="meta"><span>${esc(language)}</span><span>${esc(section)}</span>${metaWords}<time datetime="${esc(item.publishedAt)}">${esc(String(item.publishedAt || "").slice(0, 10))}</time></div>
        <h2><a href="${esc(url)}">${esc(title)}</a></h2>
        <p>${esc(summary)}</p>
        <a class="open" href="${esc(url)}">${action}</a>
      </div>
    </article>`;
  };

  const render = items => {
    const deduped = new Map();

    for (const item of items) {
      const key = `${item.kind}:${item.slug || item.id || item.canonical}`;
      if (!deduped.has(key)) deduped.set(key, item);
    }

    const sorted = [...deduped.values()].sort((a, b) => dateValue(b.publishedAt) - dateValue(a.publishedAt));

    if (sorted.length) {
      root.innerHTML = sorted.map(card).join("");
      if (countNode) countNode.textContent = String(sorted.length);
      window.dispatchEvent(new CustomEvent("gnk-publications-rendered", { detail: { count: sorted.length } }));
    }
  };

  Promise.allSettled([
    fetchJson("/data/publications.json"),
    fetchJson("/data/publications-auto.json")
  ]).then(results => {
    const items = [];

    if (results[0].status === "fulfilled" && Array.isArray(results[0].value.items)) {
      items.push(...results[0].value.items.map(normalizeStatic));
    }

    if (results[1].status === "fulfilled" && Array.isArray(results[1].value.items)) {
      items.push(...results[1].value.items.map(normalizeAuto));
    }

    if (items.length) render(items);
  });
})();