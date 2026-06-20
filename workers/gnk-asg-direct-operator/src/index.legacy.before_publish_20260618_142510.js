const GNK_ASG_FINAL_SEO_ACTIVE_PATCH_V3 = true;
const GNK_ASG_FINAL_SEO_BASE_V3 = "https://gnk-asg.hr";

function __gnkAsgFinalSeoEscV3(s){
  return String(s || "").replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
  });
}

function __gnkAsgFinalSeoNowV3(){
  return new Date().toISOString();
}

function __gnkAsgFinalSeoYmdV3(){
  return new Date().toISOString().slice(0,10);
}

function __gnkAsgFinalSeoSlugV3(s){
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/đ/g,"d")
    .replace(/Đ/g,"d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

function __gnkAsgFinalSeoArticlesV3(){
  const d = __gnkAsgFinalSeoYmdV3();

  const rows = [
    {
      slot:"08:00",
      focus:"GNK ASG",
      entity:"GNK ASG d.o.o.",
      title:`GNK ASG dnevni poslovni pregled: AI, digitalna imovina i javne poslovne informacije ${d}`,
      excerpt:"Jutarnji pregled GNK ASG portala povezuje poslovne informacije, AI asistenta, digitalnu imovinu i javni komunikacijski sloj.",
      body:[
        "GNK ASG d.o.o. kroz javni portal razvija poslovni, tehnološki i informativni sloj koji povezuje financijski profil, AI asistenta, Business Desk, Visual Index i Auto Editor.",
        "Ovaj dnevni pregled strukturira teme koje se odnose na GNK ASG, GNK ASG d.o.o., Nermina Sefića i GNK DINAMO Ltd. u kontekstu javnih poslovnih informacija, digitalne imovine i tehnološke infrastrukture.",
        "Sadržaj je informativan i ne predstavlja pravni, financijski, porezni ili investicijski savjet. Tržišni podaci, ako su prikazani, mogu biti snapshot ili delayed prikaz."
      ]
    },
    {
      slot:"12:00",
      focus:"Nermin Sefić",
      entity:"Nermin Sefić",
      title:`Nermin Sefić i GNK ASG Intelligence Desk: podnevni tehnološki i poslovni sažetak ${d}`,
      excerpt:"Podnevni sažetak jača entitetski okvir Nermina Sefića, GNK ASG Intelligence Deska i javnog poslovnog sadržaja portala.",
      body:[
        "Nermin Sefić u javnom komunikacijskom okviru portala GNK ASG povezuje se s poslovnim, tehnološkim i dokumentacijskim slojem portala.",
        "GNK ASG Intelligence Desk služi kao organizirani prostor za objave, poslovne informacije, AI teme, digitalnu imovinu, javne dokumente i poveznice prema GNK ASG d.o.o. i GNK DINAMO Ltd.",
        "Ovaj tekst pomaže tražilicama i korisnicima da razumiju entitetsku povezanost pojmova Nermin Sefić, GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., AI asistent i Auto Editor."
      ]
    },
    {
      slot:"17:00",
      focus:"GNK DINAMO Ltd.",
      entity:"GNK DINAMO Ltd.",
      title:`GNK DINAMO Ltd. i GNK ASG: međunarodni poslovni kontekst, sport, tehnologija i governance ${d}`,
      excerpt:"Popodnevni pregled povezuje GNK DINAMO Ltd. i GNK ASG kroz međunarodni poslovni, sportski, tehnološki i korporativni kontekst.",
      body:[
        "GNK DINAMO Ltd. u javnoj komunikaciji portala GNK ASG predstavlja međunarodni poslovni i korporativni kontekst povezan sa sportom, tehnologijom, financijama i governance okvirom.",
        "GNK ASG d.o.o., GNK DINAMO Ltd. i Nermin Sefić u sadržajnoj strukturi portala povezani su kroz SEO hubove, Auto Editor objave, Business Desk, Visual Index i AI Gateway.",
        "Ovaj sadržaj služi kao javni informativni pregled i ne predstavlja službeni registar, pravno mišljenje ili financijski savjet."
      ]
    }
  ];

  return rows.map(function(a,i){
    const slug = `${d}-${__gnkAsgFinalSeoSlugV3(a.focus)}-${i + 1}`;
    return {
      id: slug,
      slug: slug,
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
      updatedAt: __gnkAsgFinalSeoNowV3(),
      canonical: `${GNK_ASG_FINAL_SEO_BASE_V3}/auto-editor/${slug}/`,
      url: `${GNK_ASG_FINAL_SEO_BASE_V3}/auto-editor/${slug}/`,
      tags: ["GNK ASG","GNK ASG d.o.o.","GNK DINAMO Ltd.","Nermin Sefić","Nermin Sefic","AI","digitalna imovina","poslovne informacije"],
      wordCountApprox: a.body.join(" ").split(/\s+/).length
    };
  });
}

function __gnkAsgFinalSeoFeedV3(){
  return JSON.stringify({
    updatedAt: __gnkAsgFinalSeoNowV3(),
    schedule: "08:00, 12:00, 17:00 Europe/Zagreb",
    overview: `${GNK_ASG_FINAL_SEO_BASE_V3}/auto-editor/`,
    sitemap: `${GNK_ASG_FINAL_SEO_BASE_V3}/auto-editor/sitemap.xml`,
    articles: __gnkAsgFinalSeoArticlesV3()
  }, null, 2);
}

function __gnkAsgFinalSeoSitemapV3(){
  const urls = [
    `${GNK_ASG_FINAL_SEO_BASE_V3}/auto-editor/`,
    `${GNK_ASG_FINAL_SEO_BASE_V3}/seo/nermin-sefic/`,
    `${GNK_ASG_FINAL_SEO_BASE_V3}/seo/gnk-asg/`,
    `${GNK_ASG_FINAL_SEO_BASE_V3}/seo/gnk-dinamo-ltd/`
  ].concat(__gnkAsgFinalSeoArticlesV3().map(function(a){ return a.url; }));

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(function(u){ return `<url><loc>${__gnkAsgFinalSeoEscV3(u)}</loc><lastmod>${__gnkAsgFinalSeoYmdV3()}</lastmod><changefreq>daily</changefreq><priority>0.80</priority></url>`; }).join("\n")}
</urlset>`;
}

function __gnkAsgFinalSeoPageV3(cfg){
  const jsonLd = {
    "@context":"https://schema.org",
    "@type":cfg.type,
    "name":cfg.name,
    "url":cfg.canonical,
    "description":cfg.description,
    "mainEntityOfPage":cfg.canonical,
    "isPartOf":{
      "@type":"WebSite",
      "name":"GNK ASG",
      "url":GNK_ASG_FINAL_SEO_BASE_V3
    }
  };

  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${__gnkAsgFinalSeoEscV3(cfg.title)}</title>
<meta name="description" content="${__gnkAsgFinalSeoEscV3(cfg.description)}">
<meta name="keywords" content="Nermin Sefić, Nermin Sefic, GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., AI asistent, Auto Editor, Business Desk, Visual Index, digitalna imovina, poslovne informacije">
<meta name="author" content="GNK ASG">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${__gnkAsgFinalSeoEscV3(cfg.canonical)}">
<meta property="og:title" content="${__gnkAsgFinalSeoEscV3(cfg.title)}">
<meta property="og:description" content="${__gnkAsgFinalSeoEscV3(cfg.description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${__gnkAsgFinalSeoEscV3(cfg.canonical)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
:root{--navy:#07162f;--gold:#d4af37;--muted:#697789}
*{box-sizing:border-box}
body{margin:0;background:linear-gradient(180deg,#f8fafc,#eef3fa 45%,#f8fafc);color:var(--navy);font-family:Arial,Helvetica,sans-serif}
.top{background:#07162f;color:#f4d66b;text-align:center;padding:12px 16px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
.wrap{max-width:980px;margin:0 auto;padding:28px 18px 42px}
.card{background:#fff;border:1px solid rgba(212,175,55,.34);border-radius:28px;box-shadow:0 18px 50px rgba(7,22,47,.10);padding:24px}
.eyebrow{color:#8a6a11;font-weight:900;letter-spacing:.16em;text-transform:uppercase;font-size:13px;margin-bottom:12px}
h1{font-family:Georgia,serif;font-size:42px;line-height:1.05;margin:0 0 18px;letter-spacing:-.03em}
p{font-size:17px;line-height:1.65;color:var(--muted)}
.links{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.links a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:10px 14px;border:2px solid rgba(212,175,55,.80);border-radius:999px;color:var(--navy);background:#fff;font-weight:900;text-decoration:none;text-transform:uppercase;font-size:12px}
.links a.primary{background:var(--navy);color:#fff;border-color:var(--gold)}
@media(max-width:520px){h1{font-size:34px}.wrap{padding:20px 14px 34px}.card{padding:20px}}
</style>
</head>
<body>
<div class="top">GNK ASG · SEO Entity Hub</div>
<main class="wrap">
<article class="card">
<div class="eyebrow">GNK ASG Intelligence Desk</div>
<h1>${__gnkAsgFinalSeoEscV3(cfg.h1)}</h1>
${cfg.paragraphs.map(function(p){ return `<p>${__gnkAsgFinalSeoEscV3(p)}</p>`; }).join("")}
<nav class="links">
<a class="primary" href="/">Portal</a>
<a href="/auto-editor/">Auto Editor</a>
<a href="/data/auto-editor.json">JSON feed</a>
<a href="/business-desk/">Business Desk</a>
<a href="/visual-index/">Visual Index</a>
<a href="/mobile-app/">Mobile App</a>
</nav>
</article>
</main>
</body>
</html>`;
}

function __gnkAsgFinalSeoHubV3(kind){
  const pages = {
    "nermin-sefic":{
      title:"Nermin Sefić | GNK ASG Intelligence Desk",
      description:"Nermin Sefić u javnom GNK ASG poslovnom i tehnološkom kontekstu, povezan s GNK ASG d.o.o., GNK DINAMO Ltd., AI objavama, digitalnom imovinom i poslovnim informacijama.",
      h1:"Nermin Sefić · GNK ASG Intelligence Desk",
      type:"Person",
      name:"Nermin Sefić",
      paragraphs:[
        "Nermin Sefić povezuje se s javnim poslovnim i tehnološkim komunikacijskim okvirom portala GNK ASG. Ova stranica služi kao strukturirani SEO hub za sadržaje koji se odnose na GNK ASG d.o.o., GNK DINAMO Ltd., korporativne objave, poslovne vijesti, umjetnu inteligenciju, digitalnu imovinu i javne dokumente.",
        "Svrha ove stranice je učvrstiti entitetsku strukturu portala: Nermin Sefić, GNK ASG, GNK ASG d.o.o., GNK DINAMO Ltd., Auto Editor, Business Desk, Visual Index, AI Gateway i mobilna aplikacija. Stranica organizira javno dostupne poveznice portala i ne zamjenjuje službene registre, pravne dokumente ili financijska izvješća."
      ]
    },
    "gnk-asg":{
      title:"GNK ASG d.o.o. | Poslovni, tehnološki i AI portal",
      description:"GNK ASG d.o.o. kroz javni portal objedinjuje poslovne informacije, financijski profil, AI asistenta, Auto Editor, Business Desk, Visual Index i pravne dokumente.",
      h1:"GNK ASG d.o.o. · poslovni, tehnološki i AI portal",
      type:"Organization",
      name:"GNK ASG d.o.o.",
      paragraphs:[
        "GNK ASG d.o.o. javno se predstavlja kroz korporativni portal s naglaskom na poslovne informacije, financijski profil, AI asistenta, Business Desk, Auto Editor, Visual Index, mobilnu aplikaciju i pravne dokumente.",
        "SEO struktura portala povezuje ključne pojmove GNK ASG, GNK ASG d.o.o., Nermin Sefić, GNK DINAMO Ltd., umjetna inteligencija, digitalna imovina, poslovna dokumentacija i javne poslovne informacije. Ova stranica služi kao središnji organizacijski hub za tražilice i korisnike."
      ]
    },
    "gnk-dinamo-ltd":{
      title:"GNK DINAMO Ltd. | Međunarodni poslovni i korporativni kontekst",
      description:"GNK DINAMO Ltd. u javnoj GNK ASG komunikaciji povezuje se s međunarodnim poslovnim, sportskim, digitalnim i korporativnim kontekstom.",
      h1:"GNK DINAMO Ltd. · međunarodni poslovni kontekst",
      type:"Organization",
      name:"GNK DINAMO Ltd.",
      paragraphs:[
        "GNK DINAMO Ltd. u javnom komunikacijskom okviru portala GNK ASG predstavlja međunarodni poslovni i korporativni kontekst povezan s poslovnim analizama, sportom, tehnologijom, digitalnom imovinom i AI modulima portala.",
        "Ova stranica strukturira poveznice i ključne pojmove radi jasnijeg razumijevanja odnosa između GNK ASG d.o.o., GNK DINAMO Ltd., Nermina Sefića i javnog sadržaja portala."
      ]
    }
  };

  const cfg = pages[kind] || pages["gnk-asg"];
  cfg.canonical = `${GNK_ASG_FINAL_SEO_BASE_V3}/seo/${kind}/`;
  return __gnkAsgFinalSeoPageV3(cfg);
}

function __gnkAsgFinalSeoResponseV3(body,type,status){
  return new Response(body,{
    status:status || 200,
    headers:{
      "content-type":type,
      "cache-control":"no-store, no-cache, must-revalidate",
      "x-gnk-asg-final-active-patch":"v3",
      "x-robots-tag":"index, follow"
    }
  });
}

function __gnkAsgFinalSeoHandleV3(request){
  const url = new URL(request.url);
  const p = url.pathname.replace(/\/+$/,"");

  if(p === "/data/auto-editor.json"){
    return __gnkAsgFinalSeoResponseV3(__gnkAsgFinalSeoFeedV3(),"application/json; charset=utf-8",200);
  }

  if(p === "/auto-editor/sitemap.xml"){
    return __gnkAsgFinalSeoResponseV3(__gnkAsgFinalSeoSitemapV3(),"application/xml; charset=utf-8",200);
  }

  if(p === "/seo/nermin-sefic"){
    return __gnkAsgFinalSeoResponseV3(__gnkAsgFinalSeoHubV3("nermin-sefic"),"text/html; charset=utf-8",200);
  }

  if(p === "/seo/gnk-asg"){
    return __gnkAsgFinalSeoResponseV3(__gnkAsgFinalSeoHubV3("gnk-asg"),"text/html; charset=utf-8",200);
  }

  if(p === "/seo/gnk-dinamo-ltd"){
    return __gnkAsgFinalSeoResponseV3(__gnkAsgFinalSeoHubV3("gnk-dinamo-ltd"),"text/html; charset=utf-8",200);
  }

  return null;
}

function GNK_ASG_OPERATOR_JSON_V1(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  });
}

function GNK_ASG_OPERATOR_TOKEN_OK_V1(request, env) {
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token") || "";
  const supplied = bearer || queryToken;
  const expected = env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || env.ADMIN_TOKEN || env.GNK_ASG_ADMIN_TOKEN || env.PORTAL_OPERATOR_TOKEN || "";
  return Boolean(expected && supplied && supplied === expected);
}

function GNK_ASG_OPERATOR_SAFE_ID_V1(value) {
  return String(value || "item").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "item";
}

async function GNK_ASG_PRIVATE_OPERATOR_DASHBOARD_ROUTES_V1(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (!path.startsWith("/operator/")) {
    return null;
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type, authorization"
      }
    });
  }

  if (!GNK_ASG_OPERATOR_TOKEN_OK_V1(request, env)) {
    return GNK_ASG_OPERATOR_JSON_V1({
      ok: false,
      error: "unauthorized",
      message: "Operator token nije valjan ili nije poslan."
    }, 401);
  }

  if (path === "/operator/dashboard-status") {
    return GNK_ASG_OPERATOR_JSON_V1({
      ok: true,
      module: "private-operator-dashboard-v1",
      updatedAt: new Date().toISOString(),
      kvAvailable: Boolean(env.GNK_ASG_KV),
      d1Available: Boolean(env.GNK_ASG_D1),
      r2Available: Boolean(env.GNK_ASG_MEDIA_ASSETS),
      emailAvailable: Boolean(env.EMAIL),
      contactApi: "/api/contact-submit",
      dashboard: "/operator-dashboard/"
    });
  }

  if (path === "/operator/contact-inbox") {
    const limitRaw = Number(url.searchParams.get("limit") || 25);
    const limit = Math.max(1, Math.min(50, limitRaw));
    const items = [];
    let last = null;
    let listError = null;

    try {
      if (env.GNK_ASG_KV && typeof env.GNK_ASG_KV.get === "function") {
        const lastRaw = await env.GNK_ASG_KV.get("contact:last");
        if (lastRaw) {
          try { last = JSON.parse(lastRaw); } catch (e) { last = lastRaw; }
        }
      }
    } catch (err) {
      listError = String(err && err.message ? err.message : err);
    }

    try {
      if (env.GNK_ASG_KV && typeof env.GNK_ASG_KV.list === "function") {
        const listed = await env.GNK_ASG_KV.list({ prefix: "contact:", limit });
        for (const key of listed.keys || []) {
          if (key.name === "contact:last") continue;
          const raw = await env.GNK_ASG_KV.get(key.name);
          let parsed = raw;
          try { parsed = JSON.parse(raw); } catch (e) {}
          items.push({ key: key.name, value: parsed });
        }
      }
    } catch (err) {
      listError = String(err && err.message ? err.message : err);
    }

    return GNK_ASG_OPERATOR_JSON_V1({
      ok: true,
      source: "GNK_ASG_KV",
      last,
      count: items.length,
      items,
      listError
    });
  }

  if (path === "/operator/text-save") {
    if (request.method !== "POST") {
      return GNK_ASG_OPERATOR_JSON_V1({ ok: false, error: "method_not_allowed" }, 405);
    }

    let payload = {};
    try { payload = await request.json(); } catch (e) {}

    const type = GNK_ASG_OPERATOR_SAFE_ID_V1(payload.type || "note");
    const title = GNK_ASG_OPERATOR_SAFE_ID_V1(payload.title || "untitled");
    const body = String(payload.body || "");
    const key = `operator:text:${type}:${title}`;
    const indexKey = "operator:text:index";

    const record = {
      type,
      title,
      body,
      key,
      updatedAt: new Date().toISOString()
    };

    let saved = false;
    let error = null;

    try {
      if (env.GNK_ASG_KV && typeof env.GNK_ASG_KV.put === "function") {
        await env.GNK_ASG_KV.put(key, JSON.stringify(record, null, 2));

        let index = [];
        const rawIndex = await env.GNK_ASG_KV.get(indexKey);
        if (rawIndex) {
          try { index = JSON.parse(rawIndex); } catch (e) { index = []; }
        }

        index = index.filter(x => x.key !== key);
        index.unshift({ key, type, title, updatedAt: record.updatedAt });
        index = index.slice(0, 200);
        await env.GNK_ASG_KV.put(indexKey, JSON.stringify(index, null, 2));
        saved = true;
      }
    } catch (err) {
      error = String(err && err.message ? err.message : err);
    }

    return GNK_ASG_OPERATOR_JSON_V1({ ok: saved, saved, key, record, error });
  }

  if (path === "/operator/text-load") {
    const type = GNK_ASG_OPERATOR_SAFE_ID_V1(url.searchParams.get("type") || "note");
    const title = GNK_ASG_OPERATOR_SAFE_ID_V1(url.searchParams.get("title") || "untitled");
    const key = `operator:text:${type}:${title}`;

    let record = null;
    let error = null;

    try {
      if (env.GNK_ASG_KV && typeof env.GNK_ASG_KV.get === "function") {
        const raw = await env.GNK_ASG_KV.get(key);
        if (raw) {
          try { record = JSON.parse(raw); } catch (e) { record = { key, body: raw }; }
        }
      }
    } catch (err) {
      error = String(err && err.message ? err.message : err);
    }

    return GNK_ASG_OPERATOR_JSON_V1({
      ok: Boolean(record),
      key,
      record,
      body: record && record.body ? record.body : "",
      error
    });
  }

  if (path === "/operator/text-list") {
    let index = [];
    let error = null;

    try {
      if (env.GNK_ASG_KV && typeof env.GNK_ASG_KV.get === "function") {
        const raw = await env.GNK_ASG_KV.get("operator:text:index");
        if (raw) {
          try { index = JSON.parse(raw); } catch (e) { index = []; }
        }
      }
    } catch (err) {
      error = String(err && err.message ? err.message : err);
    }

    return GNK_ASG_OPERATOR_JSON_V1({
      ok: true,
      count: index.length,
      items: index,
      error
    });
  }

  return GNK_ASG_OPERATOR_JSON_V1({
    ok: false,
    error: "operator_route_not_found",
    path
  }, 404);
}


async function GNK_ASG_CONTACT_DIRECT_HANDLER_V1(request, env) {
  const url = new URL(request.url);

  if (url.pathname !== "/api/contact-submit") {
    return null;
  }

  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      endpoint: "/api/contact-submit",
      status: "READY",
      wrapper: true,
      message: "Kontakt endpoint je aktivan preko top-level wrappera.",
      accepts: "multipart/form-data",
      pdfUpload: true,
      updatedAt: new Date().toISOString()
    }, null, 2), {
      status: 200,
      headers
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({
      ok: false,
      wrapper: true,
      message: "Dopušten je samo POST."
    }, null, 2), {
      status: 405,
      headers
    });
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      wrapper: true,
      message: "Forma nije pravilno poslana kao multipart/form-data."
    }, null, 2), {
      status: 400,
      headers
    });
  }

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const department = String(form.get("department") || "GNK ASG - opći upit").trim();
  const subject = String(form.get("subject") || "").trim();
  const messageText = String(form.get("message") || "").trim();
  const consent = String(form.get("consent") || "").trim();
  const pdf = form.get("pdf");

  if (!name || !email || !subject || !messageText || consent !== "yes") {
    return new Response(JSON.stringify({
      ok: false,
      wrapper: true,
      message: "Nedostaju obvezna polja: ime, e-mail, predmet, poruka ili privola."
    }, null, 2), {
      status: 400,
      headers
    });
  }

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomUUID().slice(0, 8).toUpperCase();
  const caseId = `GNK-ASG-${datePart}-${rand}`;

  let attachmentStatus = "nije priložen";
  let attachmentKey = null;
  let attachmentName = null;
  let attachmentSize = 0;
  let r2Saved = false;
  let r2Error = null;

  if (pdf && typeof pdf === "object" && "arrayBuffer" in pdf && Number(pdf.size || 0) > 0) {
    attachmentName = String(pdf.name || "attachment.pdf");
    attachmentSize = Number(pdf.size || 0);
    const lowerName = attachmentName.toLowerCase();
    const pdfType = String(pdf.type || "").toLowerCase();

    if (!lowerName.endsWith(".pdf") && pdfType !== "application/pdf") {
      return new Response(JSON.stringify({
        ok: false,
        wrapper: true,
        message: "Dopušten je samo PDF dokument."
      }, null, 2), {
        status: 400,
        headers
      });
    }

    if (attachmentSize > 10485760) {
      return new Response(JSON.stringify({
        ok: false,
        wrapper: true,
        message: "PDF dokument je prevelik. Najveća dopuštena veličina je 10 MB."
      }, null, 2), {
        status: 400,
        headers
      });
    }

    const safeName = attachmentName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 140);
    attachmentKey = `contact-pdf/${caseId}/${safeName}`;

    try {
      if (env && env.GNK_ASG_MEDIA_ASSETS && typeof env.GNK_ASG_MEDIA_ASSETS.put === "function") {
        await env.GNK_ASG_MEDIA_ASSETS.put(attachmentKey, await pdf.arrayBuffer(), {
          httpMetadata: { contentType: "application/pdf" },
          customMetadata: {
            caseId,
            originalName: attachmentName,
            uploadedAt: now.toISOString()
          }
        });
        r2Saved = true;
        attachmentStatus = `zaprimljen PDF: ${attachmentName}`;
      } else {
        attachmentStatus = `PDF priložen, ali R2 binding nije dostupan: ${attachmentName}`;
      }
    } catch (err) {
      r2Error = String(err && err.message ? err.message : err);
      attachmentStatus = `PDF priložen, ali R2 spremanje nije uspjelo: ${attachmentName}`;
    }
  }

  const record = {
    caseId,
    receivedAt: now.toISOString(),
    name,
    email,
    phone,
    department,
    subject,
    message: messageText,
    consent: true,
    attachmentStatus,
    attachmentKey,
    attachmentName,
    attachmentSize,
    r2Saved,
    r2Error,
    source: "public-contact-form",
    status: "received"
  };

  let kvSaved = false;
  let d1Saved = false;
  let kvError = null;
  let d1Error = null;

  try {
    if (env && env.GNK_ASG_KV && typeof env.GNK_ASG_KV.put === "function") {
      await env.GNK_ASG_KV.put(`contact:${caseId}`, JSON.stringify(record, null, 2));
      await env.GNK_ASG_KV.put("contact:last", JSON.stringify(record, null, 2));
      kvSaved = true;
    }
  } catch (err) {
    kvError = String(err && err.message ? err.message : err);
  }

  try {
    if (env && env.GNK_ASG_D1 && typeof env.GNK_ASG_D1.prepare === "function") {
      await env.GNK_ASG_D1.prepare(
        "CREATE TABLE IF NOT EXISTS contact_messages (case_id TEXT PRIMARY KEY, received_at TEXT, name TEXT, email TEXT, phone TEXT, department TEXT, subject TEXT, message TEXT, attachment_key TEXT, attachment_name TEXT, status TEXT, raw_json TEXT)"
      ).run();

      await env.GNK_ASG_D1.prepare(
        "INSERT OR REPLACE INTO contact_messages (case_id, received_at, name, email, phone, department, subject, message, attachment_key, attachment_name, status, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(caseId, record.receivedAt, name, email, phone, department, subject, messageText, attachmentKey, attachmentName, "received", JSON.stringify(record, null, 2)).run();

      d1Saved = true;
    }
  } catch (err) {
    d1Error = String(err && err.message ? err.message : err);
  }

  return new Response(JSON.stringify({
    ok: true,
    wrapper: true,
    caseId,
    receivedAt: record.receivedAt,
    name,
    email,
    phone,
    department,
    subject,
    message: "Upit je zaprimljen.",
    attachmentStatus,
    attachmentKey,
    r2Saved,
    kvSaved,
    d1Saved,
    kvError,
    d1Error,
    mailAttempted: false,
    mailSent: false,
    mailStatus: "Kontakt forma sada prvo potvrđuje zaprimanje i spremanje. Mail slanje uključujemo nakon potvrde da ovaj endpoint više ne vraća not_found."
  }, null, 2), {
    status: 200,
    headers
  });
}


async function GNK_ASG_FORCE_CONTACT_ROUTE_TOP(request, env) {
  const url = new URL(request.url);

  if (url.pathname !== "/api/contact-submit") {
    return null;
  }

  const jsonHeaders = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: jsonHeaders });
  }

  if (request.method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      endpoint: "/api/contact-submit",
      status: "READY",
      forcedTopRoute: true,
      method: "POST",
      accepts: "multipart/form-data",
      pdfUpload: true,
      maxPdfBytes: 10485760,
      message: "Kontakt endpoint je aktivan i uhvaćen prije not_found routera.",
      updatedAt: new Date().toISOString()
    }, null, 2), {
      status: 200,
      headers: jsonHeaders
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({
      ok: false,
      forcedTopRoute: true,
      message: "Dopušten je samo POST."
    }, null, 2), {
      status: 405,
      headers: jsonHeaders
    });
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      forcedTopRoute: true,
      message: "Forma nije pravilno poslana kao multipart/form-data."
    }, null, 2), {
      status: 400,
      headers: jsonHeaders
    });
  }

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const department = String(form.get("department") || "GNK ASG - opći upit").trim();
  const subject = String(form.get("subject") || "").trim();
  const messageText = String(form.get("message") || "").trim();
  const consent = String(form.get("consent") || "").trim();
  const pdf = form.get("pdf");

  if (!name || !email || !subject || !messageText || consent !== "yes") {
    return new Response(JSON.stringify({
      ok: false,
      forcedTopRoute: true,
      message: "Nedostaju obvezna polja: ime, e-mail, predmet, poruka ili privola."
    }, null, 2), {
      status: 400,
      headers: jsonHeaders
    });
  }

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomUUID().slice(0, 8).toUpperCase();
  const caseId = `GNK-ASG-${datePart}-${rand}`;

  let attachmentStatus = "nije priložen";
  let attachmentKey = null;
  let attachmentName = null;
  let attachmentSize = 0;
  let r2Saved = false;
  let r2Error = null;

  if (pdf && typeof pdf === "object" && "arrayBuffer" in pdf && Number(pdf.size || 0) > 0) {
    attachmentName = String(pdf.name || "attachment.pdf");
    attachmentSize = Number(pdf.size || 0);
    const pdfType = String(pdf.type || "").toLowerCase();
    const lowerName = attachmentName.toLowerCase();

    if (!lowerName.endsWith(".pdf") && pdfType !== "application/pdf") {
      return new Response(JSON.stringify({
        ok: false,
        forcedTopRoute: true,
        message: "Dopušten je samo PDF dokument."
      }, null, 2), {
        status: 400,
        headers: jsonHeaders
      });
    }

    if (attachmentSize > 10485760) {
      return new Response(JSON.stringify({
        ok: false,
        forcedTopRoute: true,
        message: "PDF dokument je prevelik. Najveća dopuštena veličina je 10 MB."
      }, null, 2), {
        status: 400,
        headers: jsonHeaders
      });
    }

    const safeName = attachmentName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 140);
    attachmentKey = `contact-pdf/${caseId}/${safeName}`;

    try {
      if (env && env.GNK_ASG_MEDIA_ASSETS && typeof env.GNK_ASG_MEDIA_ASSETS.put === "function") {
        await env.GNK_ASG_MEDIA_ASSETS.put(attachmentKey, await pdf.arrayBuffer(), {
          httpMetadata: { contentType: "application/pdf" },
          customMetadata: {
            caseId,
            originalName: attachmentName,
            uploadedAt: now.toISOString()
          }
        });
        r2Saved = true;
        attachmentStatus = `zaprimljen PDF: ${attachmentName}`;
      } else {
        attachmentStatus = `PDF priložen, ali R2 binding nije dostupan: ${attachmentName}`;
      }
    } catch (err) {
      r2Error = String(err && err.message ? err.message : err);
      attachmentStatus = `PDF priložen, ali R2 spremanje nije uspjelo: ${attachmentName}`;
    }
  }

  const record = {
    caseId,
    receivedAt: now.toISOString(),
    name,
    email,
    phone,
    department,
    subject,
    message: messageText,
    consent: true,
    attachmentStatus,
    attachmentKey,
    attachmentName,
    attachmentSize,
    r2Saved,
    r2Error,
    source: "public-contact-form",
    status: "received"
  };

  let kvSaved = false;
  let d1Saved = false;
  let kvError = null;
  let d1Error = null;

  try {
    if (env && env.GNK_ASG_KV && typeof env.GNK_ASG_KV.put === "function") {
      await env.GNK_ASG_KV.put(`contact:${caseId}`, JSON.stringify(record, null, 2));
      await env.GNK_ASG_KV.put("contact:last", JSON.stringify(record, null, 2));
      kvSaved = true;
    }
  } catch (err) {
    kvError = String(err && err.message ? err.message : err);
  }

  try {
    if (env && env.GNK_ASG_D1 && typeof env.GNK_ASG_D1.prepare === "function") {
      await env.GNK_ASG_D1.prepare(
        "CREATE TABLE IF NOT EXISTS contact_messages (case_id TEXT PRIMARY KEY, received_at TEXT, name TEXT, email TEXT, phone TEXT, department TEXT, subject TEXT, message TEXT, attachment_key TEXT, attachment_name TEXT, status TEXT, raw_json TEXT)"
      ).run();

      await env.GNK_ASG_D1.prepare(
        "INSERT OR REPLACE INTO contact_messages (case_id, received_at, name, email, phone, department, subject, message, attachment_key, attachment_name, status, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(caseId, record.receivedAt, name, email, phone, department, subject, messageText, attachmentKey, attachmentName, "received", JSON.stringify(record, null, 2)).run();

      d1Saved = true;
    }
  } catch (err) {
    d1Error = String(err && err.message ? err.message : err);
  }

  return new Response(JSON.stringify({
    ok: true,
    forcedTopRoute: true,
    caseId,
    receivedAt: record.receivedAt,
    name,
    email,
    phone,
    department,
    subject,
    message: "Upit je zaprimljen.",
    attachmentStatus,
    attachmentKey,
    r2Saved,
    kvSaved,
    d1Saved,
    kvError,
    d1Error,
    mailAttempted: false,
    mailSent: false,
    mailStatus: "Mail slanje se uključuje u sljedećem koraku nakon što potvrda i spremanje rade stabilno."
  }, null, 2), {
    status: 200,
    headers: jsonHeaders
  });
}


async function gnkAsgContactSubmitV2(request, env) {
  const url = new URL(request.url);

  if (url.pathname !== "/api/contact-submit") {
    return null;
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "cache-control": "no-store"
      }
    });
  }

  if (request.method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      endpoint: "/api/contact-submit",
      status: "READY",
      method: "POST",
      accepts: "multipart/form-data",
      pdfUpload: true,
      message: "Kontakt endpoint je aktivan."
    }, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({
      ok: false,
      message: "Dopušten je samo POST."
    }, null, 2), {
      status: 405,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      message: "Forma nije pravilno poslana."
    }, null, 2), {
      status: 400,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const department = String(form.get("department") || "GNK ASG - opći upit").trim();
  const subject = String(form.get("subject") || "").trim();
  const message = String(form.get("message") || "").trim();
  const consent = String(form.get("consent") || "").trim();
  const pdf = form.get("pdf");

  if (!name || !email || !subject || !message || consent !== "yes") {
    return new Response(JSON.stringify({
      ok: false,
      message: "Nedostaju obvezna polja: ime, e-mail, predmet, poruka ili privola."
    }, null, 2), {
      status: 400,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomUUID().slice(0, 8).toUpperCase();
  const caseId = `GNK-ASG-${datePart}-${rand}`;

  let attachmentStatus = "nije priložen";
  let attachmentKey = null;
  let attachmentName = null;
  let attachmentSize = 0;

  if (pdf && typeof pdf === "object" && "arrayBuffer" in pdf && Number(pdf.size || 0) > 0) {
    attachmentName = String(pdf.name || "attachment.pdf");
    attachmentSize = Number(pdf.size || 0);
    const lowerName = attachmentName.toLowerCase();

    if (!lowerName.endsWith(".pdf") && String(pdf.type || "") !== "application/pdf") {
      return new Response(JSON.stringify({
        ok: false,
        message: "Dopušten je samo PDF dokument."
      }, null, 2), {
        status: 400,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    if (attachmentSize > 10485760) {
      return new Response(JSON.stringify({
        ok: false,
        message: "PDF dokument je prevelik. Najveća dopuštena veličina je 10 MB."
      }, null, 2), {
        status: 400,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    const safeName = attachmentName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 140);
    attachmentKey = `contact-pdf/${caseId}/${safeName}`;

    try {
      if (env && env.GNK_ASG_MEDIA_ASSETS && typeof env.GNK_ASG_MEDIA_ASSETS.put === "function") {
        await env.GNK_ASG_MEDIA_ASSETS.put(attachmentKey, await pdf.arrayBuffer(), {
          httpMetadata: { contentType: "application/pdf" },
          customMetadata: {
            caseId,
            originalName: attachmentName,
            uploadedAt: now.toISOString()
          }
        });
        attachmentStatus = `zaprimljen PDF: ${attachmentName}`;
      } else {
        attachmentStatus = `PDF priložen, R2 spremanje nije dostupno: ${attachmentName}`;
      }
    } catch (err) {
      attachmentStatus = `PDF priložen, ali spremanje nije uspjelo: ${attachmentName}`;
    }
  }

  const record = {
    caseId,
    receivedAt: now.toISOString(),
    name,
    email,
    phone,
    department,
    subject,
    message,
    consent: true,
    attachmentStatus,
    attachmentKey,
    attachmentName,
    attachmentSize,
    source: "public-contact-form",
    status: "received"
  };

  let kvSaved = false;
  let d1Saved = false;
  let kvError = null;
  let d1Error = null;

  try {
    if (env && env.GNK_ASG_KV && typeof env.GNK_ASG_KV.put === "function") {
      await env.GNK_ASG_KV.put(`contact:${caseId}`, JSON.stringify(record, null, 2));
      await env.GNK_ASG_KV.put("contact:last", JSON.stringify(record, null, 2));
      kvSaved = true;
    }
  } catch (err) {
    kvError = String(err && err.message ? err.message : err);
  }

  try {
    if (env && env.GNK_ASG_D1 && typeof env.GNK_ASG_D1.prepare === "function") {
      await env.GNK_ASG_D1.prepare(
        "CREATE TABLE IF NOT EXISTS contact_messages (case_id TEXT PRIMARY KEY, received_at TEXT, name TEXT, email TEXT, phone TEXT, department TEXT, subject TEXT, message TEXT, attachment_key TEXT, attachment_name TEXT, status TEXT, raw_json TEXT)"
      ).run();

      await env.GNK_ASG_D1.prepare(
        "INSERT OR REPLACE INTO contact_messages (case_id, received_at, name, email, phone, department, subject, message, attachment_key, attachment_name, status, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(caseId, record.receivedAt, name, email, phone, department, subject, message, attachmentKey, attachmentName, "received", JSON.stringify(record, null, 2)).run();

      d1Saved = true;
    }
  } catch (err) {
    d1Error = String(err && err.message ? err.message : err);
  }

  return new Response(JSON.stringify({
    ok: true,
    caseId,
    receivedAt: record.receivedAt,
    name,
    email,
    phone,
    department,
    subject,
    message: "Upit je zaprimljen.",
    attachmentStatus,
    attachmentKey,
    kvSaved,
    d1Saved,
    kvError,
    d1Error,
    mailAttempted: false,
    mailSent: false,
    mailStatus: "Mail slanje nije uključeno u ovom koraku. Prvo potvrđujemo zaprimanje, evidencijski broj, KV/D1 i PDF upload."
  }, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function gnkAsgAutomationRemovedResponse(request) { try { const url = new URL(request.url); const exact = new Set([ "/operator/refresh-news", "/operator/refresh-market", "/operator/refresh-all", "/operator/refresh-status", "/operator/news", "/operator/market", "/operator/auto-editor", "/operator/publishing", "/operator/rebuild-news", "/operator/rebuild-market", "/operator/daily-market-brief", "/news", "/business-news", "/vijesti", "/markets" ]); const prefixes = [ "/data/news", "/data/business-news", "/data/market", "/data/digital-assets", "/data/btc", "/data/fast_market", "/data/macro_market", "/data/daily_market", "/data/stablecoins", "/data/stock_exchanges", "/data/exchange_compare", "/data/publishing", "/data/autonomous", "/data/blocked_news" ]; if (exact.has(url.pathname) || prefixes.some(prefix => url.pathname.startsWith(prefix))) { return new Response(JSON.stringify({ ok: false, disabled: true, status: "DISABLED", module: "news-market-automation", path: url.pathname, message: "Automatske vijesti, market podaci i povezani automatizmi su isključeni. Stabilni frontend ostaje baza za kasnije spajanje novog backenda.", updatedAt: new Date().toISOString() }, null, 2), { status: 410, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store, no-cache, must-revalidate, max-age=0" } }); } } catch (err) {} return null;
} import legacyDefault from "./index.legacy.refresh.20260616_201034.js";
import { handleRefreshRoute, runScheduledRefresh } from "./gnk-asg-refresh-backend-v1.js";

const GNK_ASG_ORIGINAL_DEFAULT_EXPORT = { async fetch(request, env, ctx) {
    const __gnkFinalSeoActivePatchV3 = __gnkAsgFinalSeoHandleV3(request);
    if (__gnkFinalSeoActivePatchV3) return __gnkFinalSeoActivePatchV3;

    const __GNK_ASG_FORCE_CONTACT_ROUTE_TOP = await GNK_ASG_FORCE_CONTACT_ROUTE_TOP(request, env);
    if (__GNK_ASG_FORCE_CONTACT_ROUTE_TOP) return __GNK_ASG_FORCE_CONTACT_ROUTE_TOP;

    const __gnkAsgContactSubmitV2 = await gnkAsgContactSubmitV2(request, env);
    if (__gnkAsgContactSubmitV2) return __gnkAsgContactSubmitV2;

    const __gnkAsgContactModule = await gnkAsgHandleContactModule(request, env);
    if (__gnkAsgContactModule) return __gnkAsgContactModule;
 const __gnkAsgAutomationRemoved = gnkAsgAutomationRemovedResponse(request); if (__gnkAsgAutomationRemoved) return __gnkAsgAutomationRemoved; const refreshResponse = await handleRefreshRoute(request, env, ctx); if (refreshResponse) return refreshResponse; if (legacyDefault && legacyDefault.fetch) { return legacyDefault.fetch(request, env, ctx); } if (env.ASSETS && typeof env.ASSETS.fetch === "function") { return env.ASSETS.fetch(request); } return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } }); }, async scheduled(event, env, ctx) { const refreshPromise = runScheduledRefresh(env, ctx); if (ctx && typeof ctx.waitUntil === "function") { ctx.waitUntil(refreshPromise); } else { await refreshPromise; } if (legacyDefault && legacyDefault.scheduled) { return legacyDefault.scheduled(event, env, ctx); } }
}; 


async function gnkAsgHandleContactModule(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/contact-submit" && request.method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      endpoint: "/api/contact-submit",
      method: "POST",
      accepts: "multipart/form-data",
      pdfUpload: true,
      maxPdfBytes: 10485760
    }, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  if (url.pathname !== "/api/contact-submit" || request.method !== "POST") {
    return null;
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return new Response(JSON.stringify({
      ok: false,
      message: "Forma mora biti poslana kao multipart/form-data."
    }, null, 2), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }

  const form = await request.formData();

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const department = String(form.get("department") || "GNK ASG - opći upit").trim();
  const subject = String(form.get("subject") || "").trim();
  const message = String(form.get("message") || "").trim();
  const consent = String(form.get("consent") || "").trim();
  const pdf = form.get("pdf");

  if (!name || !email || !subject || !message || consent !== "yes") {
    return new Response(JSON.stringify({
      ok: false,
      message: "Nedostaju obvezna polja ili privola."
    }, null, 2), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomUUID().slice(0, 8).toUpperCase();
  const caseId = `GNK-ASG-${datePart}-${rand}`;
  const ip = request.headers.get("cf-connecting-ip") || "";
  const userAgent = request.headers.get("user-agent") || "";

  let attachmentStatus = "nije priložen";
  let attachmentKey = null;
  let attachmentName = null;
  let attachmentSize = 0;

  if (pdf && typeof pdf === "object" && "arrayBuffer" in pdf && pdf.size > 0) {
    attachmentName = String(pdf.name || "attachment.pdf");
    attachmentSize = Number(pdf.size || 0);
    const safeName = attachmentName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 140);

    if (!safeName.toLowerCase().endsWith(".pdf") && pdf.type !== "application/pdf") {
      return new Response(JSON.stringify({
        ok: false,
        message: "Dopušten je samo PDF dokument."
      }, null, 2), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
      });
    }

    if (attachmentSize > 10485760) {
      return new Response(JSON.stringify({
        ok: false,
        message: "PDF dokument je prevelik. Najveća dopuštena veličina je 10 MB."
      }, null, 2), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
      });
    }

    attachmentKey = `contact-pdf/${caseId}/${safeName}`;

    if (env && env.GNK_ASG_MEDIA_ASSETS && typeof env.GNK_ASG_MEDIA_ASSETS.put === "function") {
      await env.GNK_ASG_MEDIA_ASSETS.put(attachmentKey, await pdf.arrayBuffer(), {
        httpMetadata: { contentType: "application/pdf" },
        customMetadata: {
          caseId,
          originalName: attachmentName,
          uploadedAt: now.toISOString()
        }
      });
      attachmentStatus = `zaprimljen PDF: ${attachmentName}`;
    } else {
      attachmentStatus = `PDF priložen, ali R2 spremanje nije dostupno u ovom okruženju: ${attachmentName}`;
    }
  }

  const record = {
    caseId,
    receivedAt: now.toISOString(),
    name,
    email,
    phone,
    department,
    subject,
    message,
    consent: true,
    attachmentStatus,
    attachmentKey,
    attachmentName,
    attachmentSize,
    ip,
    userAgent,
    source: "public-contact-form",
    status: "received"
  };

  const recordJson = JSON.stringify(record, null, 2);

  let kvSaved = false;
  let d1Saved = false;
  let mailAttempted = false;
  let mailSent = false;
  let mailError = null;

  if (env && env.GNK_ASG_KV && typeof env.GNK_ASG_KV.put === "function") {
    await env.GNK_ASG_KV.put(`contact:${caseId}`, recordJson);
    await env.GNK_ASG_KV.put("contact:last", recordJson);
    kvSaved = true;
  }

  if (env && env.GNK_ASG_D1 && typeof env.GNK_ASG_D1.prepare === "function") {
    try {
      await env.GNK_ASG_D1.prepare(
        "CREATE TABLE IF NOT EXISTS contact_messages (case_id TEXT PRIMARY KEY, received_at TEXT, name TEXT, email TEXT, phone TEXT, department TEXT, subject TEXT, message TEXT, attachment_key TEXT, attachment_name TEXT, status TEXT, raw_json TEXT)"
      ).run();

      await env.GNK_ASG_D1.prepare(
        "INSERT OR REPLACE INTO contact_messages (case_id, received_at, name, email, phone, department, subject, message, attachment_key, attachment_name, status, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(caseId, record.receivedAt, name, email, phone, department, subject, message, attachmentKey, attachmentName, "received", recordJson).run();

      d1Saved = true;
    } catch (err) {
      d1Saved = false;
    }
  }

  try {
    if (env && env.EMAIL && typeof EmailMessage !== "undefined") {
      mailAttempted = true;
      const toEmail = env.CONTACT_TO_EMAIL || env.PUBLIC_CONTACT_EMAIL || "info@gnk-asg.hr";
      const fromEmail = env.CONTACT_FROM_EMAIL || "noreply@gnk-asg.hr";
      const rawBody =
`From: GNK ASG Contact <${fromEmail}>
To: ${toEmail}
Reply-To: ${email}
Subject: [${caseId}] ${subject}
Content-Type: text/plain; charset=UTF-8

Zaprimljen je novi upit putem GNK ASG kontakt forme.

Evidencijski broj: ${caseId}
Vrijeme: ${record.receivedAt}
Ime/naziv: ${name}
E-mail: ${email}
Telefon: ${phone}
Primatelj/odjel: ${department}
Predmet: ${subject}
PDF: ${attachmentStatus}

Poruka:
${message}
`;
      const emailMessage = new EmailMessage(fromEmail, toEmail, rawBody);
      await env.EMAIL.send(emailMessage);
      mailSent = true;
    }
  } catch (err) {
    mailError = String(err && err.message ? err.message : err);
  }

  return new Response(JSON.stringify({
    ok: true,
    caseId,
    receivedAt: record.receivedAt,
    name,
    email,
    department,
    subject,
    attachmentStatus,
    kvSaved,
    d1Saved,
    mailAttempted,
    mailSent,
    mailError
  }, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}





const GNK_ASG_ORIGINAL_WORKER_FOR_CONTACT_WRAPPER = GNK_ASG_ORIGINAL_DEFAULT_EXPORT;

export default {
  async fetch(request, env, ctx) {
    const contactResponse = await GNK_ASG_CONTACT_DIRECT_HANDLER_V1(request, env);
    if (contactResponse) return contactResponse;

    if (GNK_ASG_ORIGINAL_WORKER_FOR_CONTACT_WRAPPER && typeof GNK_ASG_ORIGINAL_WORKER_FOR_CONTACT_WRAPPER.fetch === "function") {
      return GNK_ASG_ORIGINAL_WORKER_FOR_CONTACT_WRAPPER.fetch(request, env, ctx);
    }

    return new Response(JSON.stringify({
      ok: false,
      error: "original_worker_fetch_missing"
    }, null, 2), {
      status: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  },

  async scheduled(event, env, ctx) {
    if (GNK_ASG_ORIGINAL_WORKER_FOR_CONTACT_WRAPPER && typeof GNK_ASG_ORIGINAL_WORKER_FOR_CONTACT_WRAPPER.scheduled === "function") {
      return GNK_ASG_ORIGINAL_WORKER_FOR_CONTACT_WRAPPER.scheduled(event, env, ctx);
    }
  },

  async email(message, env, ctx) {
    if (GNK_ASG_ORIGINAL_WORKER_FOR_CONTACT_WRAPPER && typeof GNK_ASG_ORIGINAL_WORKER_FOR_CONTACT_WRAPPER.email === "function") {
      return GNK_ASG_ORIGINAL_WORKER_FOR_CONTACT_WRAPPER.email(message, env, ctx);
    }
  }
};

