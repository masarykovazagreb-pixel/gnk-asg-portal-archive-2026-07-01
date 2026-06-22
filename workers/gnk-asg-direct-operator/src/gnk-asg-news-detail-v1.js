const GNK_ASG_NEWS_DETAIL_V1 = true;

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      "x-gnk-asg-news-detail": "v1"
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""), "https://gnk-asg.hr");
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function renderBody(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function normalizeId(path) {
  try {
    return decodeURIComponent(
      String(path || "")
        .replace(/^\/podijeli\/vijest\//, "")
        .replace(/\/$/, "")
    );
  } catch {
    return "";
  }
}

async function readNews(env) {
  if (!env.GNK_ASG_KV) return [];

  try {
    const raw = await env.GNK_ASG_KV.get("data:news:items");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function handleNewsDetailRoute(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const url = new URL(request.url);
  const path = url.pathname;

  if (!path.startsWith("/podijeli/vijest/")) return null;

  const id = normalizeId(path);
  const items = await readNews(env);
  const item = items.find(entry => String(entry?.id || "") === id);

  if (!item) {
    return htmlResponse(`<!doctype html>
<html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vijest nije pronađena | GNK ASG</title></head>
<body style="margin:0;background:#050d19;color:#f7f9fc;font-family:Arial,sans-serif"><main style="max-width:900px;margin:auto;padding:80px 20px"><h1>Vijest nije pronađena</h1><p><a style="color:#d4af37" href="/vijesti/">Natrag na vijesti</a></p></main></body></html>`, 404);
  }

  const title = String(item.title || "GNK ASG vijest").trim();
  const summary = String(item.summary || "").trim();
  const body = String(item.body || "").trim();
  const sourceUrl = safeUrl(item.sourceUrl || item.url || "");
  const canonical = `https://gnk-asg.hr/podijeli/vijest/${encodeURIComponent(id)}/`;
  const image = safeUrl(item.image || "");
  const published = String(item.published_at || item.publishedAt || item.createdAt || "");
  const category = String(item.category || item.group || "business");
  const source = String(item.source || "GNK ASG Intelligence Desk");
  const keywords = [
    "Nermin Sefić",
    "Nermin Sefic",
    "GNK ASG",
    "GNK ASG d.o.o.",
    "GNK DINAMO Ltd.",
    category,
    "poslovne vijesti",
    "tehnologija",
    "industrija"
  ].join(", ");

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: summary,
    datePublished: published,
    dateModified: String(item.updatedAt || published),
    mainEntityOfPage: canonical,
    author: { "@type": "Person", name: "Nermin Sefić" },
    publisher: {
      "@type": "Organization",
      name: "GNK ASG d.o.o.",
      url: "https://gnk-asg.hr/"
    },
    image: image ? [image] : undefined,
    about: [
      { "@type": "Person", name: "Nermin Sefić" },
      { "@type": "Organization", name: "GNK ASG d.o.o." },
      { "@type": "Organization", name: "GNK DINAMO Ltd." }
    ]
  }).replace(/</g, "\\u003c");

  return htmlResponse(`<!doctype html>
<html lang="hr" data-gnk-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHtml(title)} | GNK ASG</title>
<meta name="description" content="${escapeHtml(summary)}">
<meta name="keywords" content="${escapeHtml(keywords)}">
<meta name="author" content="Nermin Sefić">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(summary)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(summary)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<link rel="stylesheet" href="/assets/brand/gnk-asg-global-layer.css?v=20260622-news-detail-v1">
<script defer src="/assets/brand/gnk-asg-global-layer.js?v=20260622-news-detail-v1"></script>
<script type="application/ld+json">${schema}</script>
<style>
body{margin:0;background:#050d19;color:#f7f9fc;font-family:Inter,Arial,sans-serif}
main{max-width:940px;margin:auto;padding:112px 18px 64px}
article{border:1px solid rgba(212,175,55,.32);border-radius:24px;background:#09182a;padding:clamp(20px,4vw,42px);box-shadow:0 20px 60px rgba(0,0,0,.2)}
nav{margin-bottom:20px}nav a,.source-link{color:#d4af37;text-decoration:none;font-weight:900}
.meta{color:#d4af37;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
h1{font:700 clamp(2.2rem,6vw,4rem)/1.08 Georgia,serif;color:#fff}
.lead{font-size:1.15rem;color:#c3cfdf;line-height:1.65}
figure{margin:28px 0}figure img{width:100%;max-height:520px;object-fit:cover;border-radius:20px}figcaption{color:#9fb0c6;font-size:13px;margin-top:8px}
.content p{color:#d7e0ec;font-size:1.05rem;line-height:1.78}
.source-box{margin-top:32px;padding-top:24px;border-top:1px solid rgba(212,175,55,.25)}
</style>
</head>
<body>
<main>
<article>
<nav><a href="/vijesti/">← Poslovne vijesti</a> · <a href="/objave/">Objave</a> · <a href="/">GNK ASG</a></nav>
<div class="meta">${escapeHtml(category)} · ${escapeHtml(published)} · ${escapeHtml(source)}</div>
<h1>${escapeHtml(title)}</h1>
<p class="lead">${escapeHtml(summary)}</p>
${image ? `<figure><img src="${escapeHtml(image)}" alt="${escapeHtml(item.imageAlt || title)}" title="${escapeHtml(item.imageTitle || title)}"><figcaption>${escapeHtml(item.imageCaption || title)} · GNK ASG Visual Index</figcaption></figure>` : ""}
<div class="content">${body ? renderBody(body) : renderBody(summary)}</div>
${sourceUrl ? `<div class="source-box"><strong>Izvor informacija:</strong><br><a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Otvori izvor →</a></div>` : ""}
</article>
</main>
</body>
</html>`);
}

export { handleNewsDetailRoute };
