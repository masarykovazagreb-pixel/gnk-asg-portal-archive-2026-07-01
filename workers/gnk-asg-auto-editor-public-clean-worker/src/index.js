const VERSION = "gnk-asg-auto-editor-public-clean-v1";
const BASE = "https://gnk-asg.hr";

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[c]));
}

function nowIso() {
  return new Date().toISOString();
}

function ymd() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function articles() {
  const d = ymd();

  const rows = [
    {
      slot: "08:00",
      focus: "GNK ASG",
      entity: "GNK ASG d.o.o.",
      title: `GNK ASG dnevni poslovni pregled: AI, digitalna imovina i javne poslovne informacije ${d}`,
      excerpt: "Jutarnji pregled GNK ASG portala povezuje poslovne informacije, AI asistenta, digitalnu imovinu i javni komunikacijski sloj.",
      body: [
        "GNK ASG d.o.o. kroz javni portal razvija poslovni, tehnološki i informativni sloj koji povezuje financijski profil, AI asistenta, Business Desk, Visual Index i Auto Editor.",
        "Ovaj dnevni pregled strukturira teme koje se odnose na GNK ASG, GNK ASG d.o.o., Nermina Sefića i GNK DINAMO Ltd. u kontekstu javnih poslovnih informacija, digitalne imovine i tehnološke infrastrukture.",
        "Sadržaj je informativan i ne predstavlja pravni, financijski, porezni ili investicijski savjet."
      ]
    },
    {
      slot: "12:00",
      focus: "Nermin Sefić",
      entity: "Nermin Sefić",
      title: `Nermin Sefić i GNK ASG Intelligence Desk: podnevni tehnološki i poslovni sažetak ${d}`,
      excerpt: "Podnevni sažetak jača entitetski okvir Nermina Sefića, GNK ASG Intelligence Deska i javnog poslovnog sadržaja portala.",
      body: [
        "Nermin Sefić u javnom komunikacijskom okviru portala GNK ASG povezuje se s poslovnim, tehnološkim i dokumentacijskim slojem portala.",
        "GNK ASG Intelligence Desk služi kao organizirani prostor za objave, poslovne informacije, AI teme, digitalnu imovinu, javne dokumente i poveznice prema GNK ASG d.o.o. i GNK DINAMO Ltd.",
        "Ovaj tekst pomaže tražilicama i korisnicima da razumiju entitetsku povezanost pojmova Nermin Sefić, GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., AI asistent i Auto Editor."
      ]
    },
    {
      slot: "17:00",
      focus: "GNK DINAMO Ltd.",
      entity: "GNK DINAMO Ltd.",
      title: `GNK DINAMO Ltd. i GNK ASG: međunarodni poslovni kontekst, sport, tehnologija i governance ${d}`,
      excerpt: "Popodnevni pregled povezuje GNK DINAMO Ltd. i GNK ASG kroz međunarodni poslovni, sportski, tehnološki i korporativni kontekst.",
      body: [
        "GNK DINAMO Ltd. u javnoj komunikaciji portala GNK ASG predstavlja međunarodni poslovni i korporativni kontekst povezan sa sportom, tehnologijom, financijama i governance okvirom.",
        "GNK ASG d.o.o., GNK DINAMO Ltd. i Nermin Sefić u sadržajnoj strukturi portala povezani su kroz SEO hubove, Auto Editor objave, Business Desk, Visual Index i AI Gateway.",
        "Ovaj sadržaj služi kao javni informativni pregled i ne predstavlja službeni registar, pravno mišljenje ili financijski savjet."
      ]
    }
  ];

  return rows.map((a, i) => {
    const slug = `${d}-${slugify(a.focus)}-${i + 1}`;
    return {
      id: slug,
      slug,
      slot: a.slot,
      focus: a.focus,
      entity: a.entity,
      title: a.title,
      excerpt: a.excerpt,
      summary: a.excerpt,
      body: a.body,
      language: "hr",
      author: "GNK ASG Intelligence Desk / Nermin Sefić",
      publishedAt: `${d}T${a.slot}:00+02:00`,
      updatedAt: nowIso(),
      canonical: `${BASE}/auto-editor/${slug}/`,
      url: `${BASE}/auto-editor/${slug}/`,
      tags: ["GNK ASG", "GNK ASG d.o.o.", "GNK DINAMO Ltd.", "Nermin Sefić", "Nermin Sefic", "AI", "digitalna imovina", "poslovne informacije"]
    };
  });
}

function feedJson() {
  return JSON.stringify({
    updatedAt: nowIso(),
    schedule: "08:00, 12:00, 17:00 Europe/Zagreb",
    overview: `${BASE}/auto-editor/`,
    sitemap: `${BASE}/auto-editor/sitemap.xml`,
    articles: articles()
  }, null, 2);
}

function sitemapXml() {
  const urls = [
    `${BASE}/auto-editor/`,
    ...articles().map(a => a.url),
    `${BASE}/seo/nermin-sefic/`,
    `${BASE}/seo/gnk-asg/`,
    `${BASE}/seo/gnk-dinamo-ltd/`
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${esc(u)}</loc><lastmod>${ymd()}</lastmod><changefreq>daily</changefreq><priority>0.80</priority></url>`).join("\n")}
</urlset>`;
}

function layout(title, description, canonical, body, jsonLd) {
  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="keywords" content="GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., Nermin Sefić, Nermin Sefic, Auto Editor, AI, digitalna imovina, poslovne informacije">
<meta name="author" content="GNK ASG">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${esc(canonical)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
:root{--navy:#07162f;--gold:#d4af37;--muted:#697789;--bg:#f5f7fb}
*{box-sizing:border-box}
body{margin:0;background:linear-gradient(180deg,#f8fafc,#eef3fa 45%,#f8fafc);color:var(--navy);font-family:Arial,Helvetica,sans-serif}
.top{background:#07162f;color:#f4d66b;text-align:center;padding:12px 16px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
.wrap{max-width:1060px;margin:0 auto;padding:28px 18px 42px}
.card{background:#fff;border:1px solid rgba(212,175,55,.34);border-radius:28px;box-shadow:0 18px 50px rgba(7,22,47,.10);padding:24px}
.eyebrow{color:#8a6a11;font-weight:900;letter-spacing:.16em;text-transform:uppercase;font-size:13px;margin-bottom:12px}
h1{font-family:Georgia,serif;font-size:42px;line-height:1.05;margin:0 0 18px;letter-spacing:-.03em}
p{font-size:17px;line-height:1.65;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:18px}
.item{border:1px solid rgba(212,175,55,.30);border-radius:22px;background:#fff;padding:16px;text-decoration:none;color:var(--navy)}
.item strong{display:block;font-size:18px;margin-bottom:8px}
.item span{display:block;color:var(--muted);font-size:14px;line-height:1.45}
.meta{color:#8a6a11;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.links{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.links a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:10px 14px;border:2px solid rgba(212,175,55,.80);border-radius:999px;color:var(--navy);background:#fff;font-weight:900;text-decoration:none;text-transform:uppercase;font-size:12px}
.links a.primary{background:var(--navy);color:#fff;border-color:var(--gold)}
@media(max-width:520px){h1{font-size:34px}.wrap{padding:20px 14px 34px}.card{padding:20px}}
</style>
</head>
<body>
<div class="top">GNK ASG · Auto Editor</div>
<main class="wrap">${body}</main>
</body>
</html>`;
}

function indexPage() {
  const list = articles();
  const cards = list.map(a => `<a class="item" href="/auto-editor/${esc(a.slug)}/"><strong>${esc(a.title)}</strong><span>${esc(a.excerpt)}</span><span class="meta">${esc(a.slot)} · ${esc(a.focus)}</span></a>`).join("");

  const body = `<article class="card">
<div class="eyebrow">3 objave dnevno</div>
<h1>GNK ASG Auto Editor</h1>
<p>Ovdje se prikazuju automatske uredničke objave koje se pripremaju tri puta dnevno za GNK ASG, Nermina Sefića i GNK DINAMO Ltd. Sadržaj je informativan, strukturiran i namijenjen javnom poslovnom portalu.</p>
<div class="grid">${cards}</div>
<nav class="links">
<a class="primary" href="/">Portal</a>
<a href="/data/auto-editor.json">JSON feed</a>
<a href="/auto-editor/sitemap.xml">Sitemap</a>
<a href="/seo/nermin-sefic/">Nermin Sefić</a>
<a href="/seo/gnk-asg/">GNK ASG</a>
<a href="/seo/gnk-dinamo-ltd/">GNK DINAMO Ltd.</a>
</nav>
</article>`;

  return layout(
    "GNK ASG Auto Editor | 3 dnevne objave",
    "GNK ASG Auto Editor objavljuje tri dnevna teksta za GNK ASG, Nermina Sefića, GNK DINAMO Ltd., AI, digitalnu imovinu i poslovne informacije.",
    `${BASE}/auto-editor/`,
    body,
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "GNK ASG Auto Editor",
      "url": `${BASE}/auto-editor/`,
      "description": "GNK ASG Auto Editor objave",
      "mainEntity": list.map(a => ({ "@type": "Article", "headline": a.title, "url": a.url }))
    }
  );
}

function articlePage(article) {
  const paragraphs = article.body.map(p => `<p>${esc(p)}</p>`).join("");

  const body = `<article class="card">
<div class="eyebrow">${esc(article.slot)} · ${esc(article.focus)}</div>
<h1>${esc(article.title)}</h1>
<p class="meta">Autor: ${esc(article.author)} · Objavljeno: ${esc(article.publishedAt)}</p>
${paragraphs}
<nav class="links">
<a class="primary" href="/auto-editor/">Sve objave</a>
<a href="/">Portal</a>
<a href="/data/auto-editor.json">JSON feed</a>
<a href="/seo/nermin-sefic/">Nermin Sefić</a>
<a href="/seo/gnk-asg/">GNK ASG</a>
<a href="/seo/gnk-dinamo-ltd/">GNK DINAMO Ltd.</a>
</nav>
</article>`;

  return layout(
    `${article.title} | GNK ASG Auto Editor`,
    article.excerpt,
    article.canonical,
    body,
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "description": article.excerpt,
      "author": { "@type": "Person", "name": "Nermin Sefić" },
      "publisher": { "@type": "Organization", "name": "GNK ASG d.o.o.", "url": BASE },
      "datePublished": article.publishedAt,
      "dateModified": article.updatedAt,
      "mainEntityOfPage": article.canonical,
      "about": article.tags
    }
  );
}

function response(body, type, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": type,
      "cache-control": "no-store, no-cache, must-revalidate",
      "x-gnk-asg-auto-editor-public-clean": VERSION,
      "x-robots-tag": "index, follow"
    }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const p = url.pathname.replace(/\/+$/, "");

    if (p === "/auto-editor/sitemap.xml") {
      return response(sitemapXml(), "application/xml; charset=utf-8");
    }

    if (p === "/auto-editor" || p === "/auto-editor/") {
      return response(indexPage(), "text/html; charset=utf-8");
    }

    if (p.startsWith("/auto-editor/")) {
      const slug = p.replace("/auto-editor/", "").replace(/\/$/, "");
      const article = articles().find(a => a.slug === slug);
      if (article) {
        return response(articlePage(article), "text/html; charset=utf-8");
      }
      return response(indexPage(), "text/html; charset=utf-8");
    }

    return response("Not found", "text/plain; charset=utf-8", 404);
  }
};