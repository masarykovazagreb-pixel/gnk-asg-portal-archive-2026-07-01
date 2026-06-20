const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "https://gnk-asg.hr",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-operator-token"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: JSON_HEADERS
  });
}

function suppliedToken(request) {
  const bearer = request.headers.get("authorization") || "";
  return (
    request.headers.get("x-operator-token") ||
    bearer.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

function authorized(request, env) {
  const expected = String(env.OPERATOR_TOKEN || "");
  const supplied = String(suppliedToken(request) || "");
  return Boolean(expected && supplied && expected === supplied);
}

function slugify(value) {
  return String(value || "objava")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "objava";
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(value) {
  return (stripHtml(value).match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || []).length;
}

function sanitizeHtml(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<(iframe|object|embed|form|input|button|textarea|select)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(iframe|object|embed|form|input|button|textarea|select)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
}

function imageAllowed(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (
        url.hostname === "gnk-asg.hr" ||
        url.hostname === "www.gnk-asg.hr" ||
        url.hostname === "news.gnk-asg.hr"
      )
    );
  } catch {
    return false;
  }
}

async function list(env, key) {
  const raw = await env.GNK_ASG_KV.get(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function putList(env, key, items, maximum = 500) {
  await env.GNK_ASG_KV.put(
    key,
    JSON.stringify(items.slice(0, maximum), null, 2)
  );
}

function normalize(payload) {
  const now = new Date().toISOString();
  const title = String(payload.title || "").trim();
  const slug = slugify(payload.slug || title);
  const bodyHtml = sanitizeHtml(payload.bodyHtml || payload.body || "");

  return {
    id: `article-${slug}`,
    type: "article",
    status: "published",
    approvedForPublic: true,
    lang: String(payload.lang || "hr").toLowerCase(),
    title,
    slug,
    summary: String(payload.summary || payload.description || "").trim(),
    body: bodyHtml,
    bodyHtml,
    category: String(payload.category || "Objave").trim(),
    author: String(payload.author || "Nermin Sefic").trim(),
    image: String(payload.image || payload.imageUrl || "").trim(),
    imageAlt: String(payload.imageAlt || payload.image_alt || title).trim(),
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    keywords: Array.isArray(payload.keywords) ? payload.keywords : [],
    seo: payload.seo && typeof payload.seo === "object" ? payload.seo : {},
    wordCount: wordCount(bodyHtml),
    publicUrl: `https://publish.gnk-asg.hr/api/publications?slug=${encodeURIComponent(slug)}`,
    canonical: `https://publish.gnk-asg.hr/api/publications?slug=${encodeURIComponent(slug)}`,
    publishedAt: String(payload.publishedAt || now),
    createdAt: String(payload.createdAt || now),
    updatedAt: now
  };
}

function validate(item) {
  const errors = [];

  if (item.title.length < 10 || item.title.length > 180) {
    errors.push("title_length_10_180");
  }

  if (item.summary.length < 60 || item.summary.length > 600) {
    errors.push("summary_length_60_600");
  }

  if (item.wordCount < 500) {
    errors.push("minimum_500_words");
  }

  if (!["hr", "en"].includes(item.lang)) {
    errors.push("lang_must_be_hr_or_en");
  }

  if (!imageAllowed(item.image)) {
    errors.push("image_must_use_gnk_asg_https_domain");
  }

  return errors;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function articleHtml(item) {
  const title = escapeHtml(item.title);
  const summary = escapeHtml(item.summary);
  const body = sanitizeHtml(item.bodyHtml || item.body || "");
  const image = item.image
    ? `<figure><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || item.title)}" width="1280" height="720"><figcaption>${escapeHtml(item.imageAlt || item.title)}</figcaption></figure>`
    : "";

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.summary,
    datePublished: item.publishedAt,
    dateModified: item.updatedAt,
    inLanguage: item.lang === "en" ? "en-US" : "hr-HR",
    mainEntityOfPage: item.canonical,
    author: {
      "@type": "Person",
      name: item.author || "Nermin Sefic"
    },
    publisher: {
      "@type": "Organization",
      name: "GNK ASG d.o.o.",
      url: "https://gnk-asg.hr/"
    },
    image: item.image ? [item.image] : []
  }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="${escapeHtml(item.lang || "hr")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | GNK ASG</title>
<meta name="description" content="${summary}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${escapeHtml(item.canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${summary}">
<meta property="og:url" content="${escapeHtml(item.canonical)}">
${item.image ? `<meta property="og:image" content="${escapeHtml(item.image)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${schema}</script>
<style>
body{margin:0;background:#07162d;color:#eef4fb;font-family:Arial,Helvetica,sans-serif;line-height:1.72}
a{color:#f2cc5c}.wrap{max-width:940px;margin:42px auto;padding:0 22px}
article{background:#0d2340;border:1px solid rgba(212,175,55,.34);border-radius:26px;overflow:hidden}
header,.content{padding:34px 40px}h1{font-family:Georgia,serif;font-weight:500;font-size:clamp(2rem,5vw,3.2rem);line-height:1.15}
.meta{color:#d4af37;font-weight:700}figure{margin:0}figure img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
figcaption{padding:10px 20px;background:#081a31;color:#b9c8da}.content h2{font-family:Georgia,serif;color:#fff}
</style>
</head>
<body><main class="wrap"><article>
<header><div class="meta">${escapeHtml(item.category)} - ${escapeHtml(item.author)} - ${escapeHtml(item.publishedAt)}</div><h1>${title}</h1><p>${summary}</p></header>
${image}<div class="content">${body}<p><a href="https://gnk-asg.hr/objave/">Povratak na Objave</a></p></div>
</article></main></body></html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: JSON_HEADERS
      });
    }

    if (request.method === "GET" && path === "/api/publications/status") {
      if (!authorized(request, env)) {
        return json({ ok: false, error: "unauthorized" }, 401);
      }

      return json({
        ok: true,
        service: "GNK ASG Dedicated Publish Operator",
        version: "1.0.0",
        hasKV: Boolean(env.GNK_ASG_KV),
        hasOperatorToken: Boolean(env.OPERATOR_TOKEN),
        endpoints: {
          publish: "/api/publications/publish",
          publications: "/api/publications"
        },
        generatedAt: new Date().toISOString()
      });
    }

    if (request.method === "POST" && path === "/api/publications/publish") {
      if (!authorized(request, env)) {
        return json({ ok: false, error: "unauthorized" }, 401);
      }

      let payload;

      try {
        payload = await request.json();
      } catch {
        return json({ ok: false, error: "invalid_json" }, 400);
      }

      const item = normalize(payload);
      const errors = validate(item);

      if (errors.length) {
        return json({
          ok: false,
          error: "validation_failed",
          validation: errors,
          wordCount: item.wordCount
        }, 400);
      }

      if (payload.dryRun === true) {
        return json({
          ok: true,
          dryRun: true,
          validationPassed: true,
          item
        });
      }

      const approved = await list(env, "publish:approved");
      const duplicate = approved.find((entry) =>
        entry && String(entry.slug || "") === item.slug
      );

      if (duplicate && payload.allowUpdate !== true) {
        return json({
          ok: false,
          error: "slug_already_exists",
          slug: item.slug,
          publicUrl: duplicate.publicUrl || item.publicUrl
        }, 409);
      }

      const next = [
        item,
        ...approved.filter((entry) =>
          entry && String(entry.slug || "") !== item.slug
        )
      ];

      await putList(env, "publish:approved", next, 500);
      await putList(env, "data:articles:items", next, 500);
      await env.GNK_ASG_KV.put(
        `article:${item.slug}`,
        JSON.stringify(item, null, 2)
      );
      await env.GNK_ASG_KV.put(
        "publish:last",
        JSON.stringify(item, null, 2)
      );

      return json({
        ok: true,
        published: true,
        updated: Boolean(duplicate),
        item,
        total: next.length
      });
    }

    if (request.method === "GET" && path === "/api/publications") {
      const items = await list(env, "publish:approved");
      const requestedSlug = String(
        url.searchParams.get("slug") || ""
      ).trim();

      if (requestedSlug) {
        const item = items.find((entry) =>
          entry &&
          String(entry.slug || "").trim() === requestedSlug
        ) || null;

        if (!item) {
          return json({
            ok: false,
            error: "not_found",
            slug: requestedSlug
          }, 404);
        }

        const accept = request.headers.get("accept") || "";

        if (accept.includes("text/html")) {
          return new Response(articleHtml(item), {
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "public, max-age=60, s-maxage=300"
            }
          });
        }

        return json({
          ok: true,
          source: "GNK_ASG_KV",
          item
        });
      }

      return json({
        ok: true,
        source: "GNK_ASG_KV",
        generatedAt: new Date().toISOString(),
        items
      });
    }

    if (request.method === "GET" && path.startsWith("/api/publications/")) {
      const slug = path.replace(/^\/api\/publications\//, "");
      let item = null;
      const raw = await env.GNK_ASG_KV.get(`article:${slug}`);

      if (raw) {
        try {
          item = JSON.parse(raw);
        } catch {
          item = null;
        }
      }

      if (!item) {
        const approved = await list(env, "publish:approved");
        item = approved.find((entry) =>
          entry && String(entry.slug || "") === slug
        ) || null;
      }

      if (!item) {
        return json({ ok: false, error: "not_found" }, 404);
      }

      const accept = request.headers.get("accept") || "";

      if (accept.includes("application/json")) {
        return json({ ok: true, item });
      }

      return new Response(articleHtml(item), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=60, s-maxage=300"
        }
      });
    }

    return json({
      ok: false,
      error: "not_found",
      path
    }, 404);
  }
};