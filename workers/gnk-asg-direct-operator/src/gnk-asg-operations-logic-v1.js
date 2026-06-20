export const GNK_ASG_OPERATIONS_LOGIC_V1 = {
  version: "operations-logic-v1",
  updatedAt: "2026-06-16",
  purpose: "Jedinstveni operativni pregled portala: vijesti, market podaci, nase objave, kontakt forma, AI badge, mail, admin/operator, PDF dokumenti i storage logika.",
  status: {
    homepageProfile: "ACTIVE_DATA_MODEL",
    homepagePreview: "ACTIVE_PREVIEW_NOT_MAIN_HOME",
    contactSubmit: "ACTIVE_OPERATOR_ENDPOINT",
    contactInbox: "ACTIVE_KV_PREFIX_CONTACT",
    adminOperator: "ACTIVE_TOKEN_PROTECTED",
    encoding: "LIVE_BADCOUNT_0",
    financialDisclosure: "PARTIAL_SAFE_DISCLOSURE",
    newsAutomation: "SCAFFOLD_NEEDS_FINAL_SOURCE_WIRING",
    marketAutomation: "SCAFFOLD_NEEDS_FINAL_API_WIRING",
    mailSending: "BINDING_EXISTS_NEEDS_OUTBOUND_TEST",
    pdfDocuments: "PUBLIC_ENDPOINTS_AUDITED_NEEDS_COMPLETENESS_UI"
  },
  publicEndpoints: {
    homepageProfileJson: "/data/homepage-profile.json",
    homepageProfilePreview: "/homepage-profile-preview",
    operationsLogicJson: "/data/portal-operations-logic.json",
    operationsLogicPreview: "/operations-logic",
    contactPage: "/contact",
    contactSubmitRuntime: "https://operator.gnk-asg.hr/api/contact-submit",
    contactInboxOperator: "https://operator.gnk-asg.hr/operator/contact-inbox",
    adminPage: "/admin",
    operatorStatus: "https://operator.gnk-asg.hr/operator/status",
    groupFinancials: "/group-financials",
    groupFinancialsJson: "/data/group-financials.json",
    mediaKitDownloads: "/media-kit-downloads"
  },
  storage: {
    kvPrimary: "GNK_ASG_KV",
    kvConfig: "GNK_ASG_CONFIG_KV",
    d1: "GNK_ASG_D1 / gnk_asg_operator_logs",
    r2: "GNK_ASG_MEDIA_ASSETS / gnk-asg-media-assets",
    emailBinding: "EMAIL",
    contactKeys: {
      writePrefix: "contact-",
      readLogic: "KV list prefix contact-",
      endpoint: "/operator/contact-inbox",
      confirmed: true
    },
    recommendedKeys: {
      newsLatest: "news:latest",
      newsArchiveDaily: "news:archive:YYYY-MM-DD",
      newsStatus: "news:status",
      marketLatest: "market:latest",
      digitalAssetsLatest: "digital-assets:latest",
      marketStatus: "market:status",
      dailyMarketBrief: "daily-market-brief:latest",
      articlesIndex: "articles:index",
      articleSlug: "article:<slug>",
      articleDraft: "article:draft:<id>",
      articlePublished: "article:published:<slug>",
      homepageProfile: "homepage:profile:v1",
      operationsLogic: "portal:operations-logic:v1"
    }
  },
  newsFlow: {
    name: "Vanjske poslovne vijesti",
    currentState: "SCAFFOLD / needs final source wiring",
    sourceTypes: [
      "javni RSS izvori",
      "poslovni/financijski news izvori",
      "tehnoloski izvori",
      "trzisni izvori",
      "rucni operator unos ako automatski izvor padne"
    ],
    targetScheduleCroatia: [
      "09:00",
      "16:00"
    ],
    cronDesign: {
      currentWorkerCrons: [
        "0 7 * * *",
        "0 12 * * *",
        "0 18 * * *",
        "0 */4 * * *"
      ],
      problem: "Cloudflare cron radi po UTC vremenu, a Hrvatska mijenja UTC+1/UTC+2.",
      recommendedFix: "Cron moze ici svaki sat, ali Worker objavljuje samo kada Europe/Zagreb vrijeme odgovara 09:00 ili 16:00.",
      fallback: "Ako izvori ne rade, prikazati zadnji spremljeni snapshot i status FALLBACK."
    },
    storageKeys: [
      "news:latest",
      "news:archive:YYYY-MM-DD",
      "news:status"
    ],
    publicOutput: [
      "/business-news",
      "/data/news.json",
      "homepage samo lagani sazetak i link na Business News"
    ],
    rules: [
      "Ne kopirati cijele clanke iz vanjskih izvora.",
      "Prikazati naslov, kratak sazetak, izvor, datum, link na izvor.",
      "Ako nema slike, kartica mora biti kompaktna, bez praznog velikog prostora.",
      "Index mora ostati brz."
    ]
  },
  marketFlow: {
    name: "Digital Exchange Monitor / market podaci",
    currentState: "SCAFFOLD / needs final API wiring",
    sourceTypes: [
      "market API za BTC/ETH",
      "FX API za USD/EUR",
      "commodities API za zlato i Brent",
      "fallback snapshot u KV"
    ],
    targetRefresh: {
      digitalAssets: "5-15 minuta ako API limiti dopustaju",
      goldBrentFx: "15-60 minuta",
      stablecoinMonitor: "15-30 minuta",
      dailyBrief: "1-3 puta dnevno"
    },
    storageKeys: [
      "market:latest",
      "digital-assets:latest",
      "market:status",
      "daily-market-brief:latest"
    ],
    publicOutput: [
      "/markets",
      "/data/market.json",
      "/data/digital-assets.json",
      "homepage mini status, ne puni veliki modul"
    ],
    statusLabels: [
      "LIVE",
      "DELAYED",
      "SNAPSHOT",
      "FALLBACK"
    ],
    disclaimer: "Podaci su informativni, mogu kasniti i nisu financijski savjet."
  },
  ownPostsFlow: {
    name: "Nase objave / Auto Editor",
    currentState: "Draft/review model recommended before autopublish",
    workflow: [
      "tema ili rucni unos",
      "AI draft",
      "operator review",
      "odobrenje",
      "publish",
      "sitemap update",
      "status/log"
    ],
    storageKeys: [
      "articles:index",
      "article:<slug>",
      "article:draft:<id>",
      "article:published:<slug>"
    ],
    publicOutput: [
      "/articles/<slug>",
      "/data/articles.json",
      "/business-news",
      "/sitemap.xml"
    ],
    rules: [
      "Osjetljive javne objave ne smiju ici bez odobrenja.",
      "Svaki clanak mora imati naslov, uvod/sazetak i puni tekst.",
      "SEO/meta/schema se dodaje uz objavu.",
      "Slika ide iz R2 kataloga ili se kartica prikazuje kompaktno bez slike."
    ]
  },
  contactFlow: {
    currentState: "ACTIVE",
    submitEndpointUsedByHomepage: "https://operator.gnk-asg.hr/api/contact-submit",
    storage: "KV prefix contact-",
    inboxEndpoint: "https://operator.gnk-asg.hr/operator/contact-inbox",
    confirmedBehavior: [
      "POST vraca ok:true",
      "stored:true",
      "vraca id predmeta",
      "operator inbox prikazuje poruke"
    ],
    desiredUx: [
      "Nakon slanja forma desno prikazuje: Hvala, [ime]. Vas upit je zaprimljen.",
      "Prikazati broj predmeta: contact-...",
      "AI badge ponudi sazetak upita, media kit, WhatsApp ili status."
    ]
  },
  aiBadgeFlow: {
    currentState: "NEEDS_UPGRADE",
    publicOnly: true,
    noAdminAuthority: true,
    desiredFunctions: [
      "status portala",
      "objasnjenje GNK ASG d.o.o.",
      "objasnjenje GNK DINAMO Ltd. Group",
      "financijski sazetak i disclosure",
      "linkovi na PDF dokumente",
      "kontakt potvrda i broj predmeta",
      "media kit pomoc",
      "news/market status",
      "fallback odgovori"
    ],
    dataSources: [
      "/data/homepage-profile.json",
      "/data/portal-operations-logic.json",
      "/data/group-financials.json",
      "operator status bez admin tajni"
    ]
  },
  mailFlow: {
    currentState: "EMAIL_BINDING_EXISTS_NEEDS_TEST",
    binding: "EMAIL",
    recommendedModel: [
      "inbound: Cloudflare Email Routing / Email Worker",
      "outbound: Cloudflare Send Email binding ili vanjski provider Resend/Brevo",
      "storage: KV/D1 mail queue",
      "manual approval for sensitive outbound messages"
    ],
    nextTests: [
      "provjeriti /operator/ ili  route",
      "poslati test u interni queue, ne prema trecoj strani",
      "provjeriti SPF/DKIM/DMARC ako ide pravi outbound"
    ],
    safetyRules: [
      "Ne slati trecim osobama bez izricitog odobrenja.",
      "Osjetljive poruke idu u draft/queue."
    ]
  },
  adminOperatorFlow: {
    currentState: "ACTIVE_TOKEN_PROTECTED",
    tokenFile: "operator-token.txt",
    protectedEndpoints: [
      "/operator/status",
      "/operator/system-health",
      "/operator/logs",
      "/operator/contact-inbox",
      "/operator/seo/status"
    ],
    rule: "Admin nije klasicni javni password login; operativni endpointi rade preko Bearer/X-Operator-Token autorizacije."
  },
  documentsFlow: {
    currentState: "PUBLIC_ENDPOINTS_AUDITED",
    requiredDocuments: [
      "/download/gnk-asg-media-kit.pdf",
      "/download/gnk-asg-company-profile.pdf",
      "/download/gnk-asg-letterhead.docx",
      "/download/gnk-asg-presentation-template.pptx",
      "/download/gnk-asg-doo-audit-report-status.pdf",
      "/download/gnk-dinamo-ltd-good-standing.pdf",
      "/download/gnk-dinamo-ltd-group-financial-report.pdf",
      "/download/gnk-asg-group-financial-overview.pdf",
      "/download/gnk-asg-group-financial-factsheet.pdf"
    ],
    nextFix: "Na UI prikazati jasan Document Center: naziv, format, status, velicina, zadnje provjereno, download."
  },
  immediateNextSteps: [
    "Potvrditi /data/portal-operations-logic.json i /operations-logic.",
    "Ugraditi bolji AI badge panel u preview, ne jos na homepage.",
    "U preview dodati Document Center i News/Market logic kartice.",
    "Nakon odobrenja previewa zamijeniti glavnu / stranicu."
  ]
};

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
  });
}

function list(items){
  return "<ul>" + items.map(function(x){return "<li>"+esc(x)+"</li>";}).join("") + "</ul>";
}

function card(title, body){
  return '<section class="card"><h2>'+esc(title)+'</h2>'+body+'</section>';
}

export function gnkAsgOperationsLogicJsonResponse(){
  return new Response(JSON.stringify(GNK_ASG_OPERATIONS_LOGIC_V1, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-gnk-asg-operations-logic": "v1"
    }
  });
}

export function gnkAsgOperationsLogicHtmlResponse(){
  const d = GNK_ASG_OPERATIONS_LOGIC_V1;
  const html = '<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GNK ASG Operations Logic</title><style>'+
  'body{margin:0;background:#05070d;color:#f7f7f2;font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:1180px;margin:0 auto;padding:28px}.hero,.card{background:linear-gradient(145deg,#101a2d,#07101d);border:1px solid rgba(245,215,118,.22);border-radius:24px;padding:22px;margin-bottom:16px}.k{color:#f5d776;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:800}h1{font-size:42px;margin:10px 0}h2{color:#f5d776;margin-top:0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}li{margin:6px 0;color:#c8d0df}.muted{color:#aeb6c8;line-height:1.6}.pill{display:inline-block;border:1px solid rgba(245,215,118,.3);border-radius:999px;padding:7px 10px;margin:4px;color:#f5d776}code{color:#9cdcfe}@media(max-width:800px){.grid{grid-template-columns:1fr}h1{font-size:32px}}'+
  '</style></head><body><main class="wrap"><section class="hero"><div class="k">GNK ASG Portal Logic</div><h1>Operativna logika portala</h1><p class="muted">'+esc(d.purpose)+'</p><p><a class="pill" href="/data/portal-operations-logic.json">JSON endpoint</a><a class="pill" href="/homepage-profile-preview">Homepage preview</a><a class="pill" href="/data/homepage-profile.json">Homepage profile JSON</a></p></section><div class="grid">'+
  card("Status", Object.keys(d.status).map(function(k){return '<p><b>'+esc(k)+':</b> '+esc(d.status[k])+'</p>';}).join(""))+
  card("Vijesti", '<p class="muted">Vrijeme: '+esc(d.newsFlow.targetScheduleCroatia.join(" / "))+'</p>'+list(d.newsFlow.storageKeys)+list(d.newsFlow.publicOutput))+
  card("Market podaci", '<p class="muted">'+esc(d.marketFlow.disclaimer)+'</p>'+list(d.marketFlow.storageKeys)+list(d.marketFlow.statusLabels))+
  card("Naše objave / Auto Editor", list(d.ownPostsFlow.workflow)+list(d.ownPostsFlow.publicOutput))+
  card("Kontakt forma", '<p class="muted">Submit: <code>'+esc(d.contactFlow.submitEndpointUsedByHomepage)+'</code></p><p class="muted">Inbox: <code>'+esc(d.contactFlow.inboxEndpoint)+'</code></p>'+list(d.contactFlow.confirmedBehavior))+
  card("AI badge", list(d.aiBadgeFlow.desiredFunctions)+list(d.aiBadgeFlow.dataSources))+
  card("Mail", '<p class="muted">Stanje: '+esc(d.mailFlow.currentState)+'</p>'+list(d.mailFlow.recommendedModel)+list(d.mailFlow.safetyRules))+
  card("Admin / Operator", '<p class="muted">'+esc(d.adminOperatorFlow.rule)+'</p>'+list(d.adminOperatorFlow.protectedEndpoints))+
  card("Dokumenti / PDF", list(d.documentsFlow.requiredDocuments))+
  card("Sljedeće", list(d.immediateNextSteps))+
  '</div></main></body></html>';
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-gnk-asg-operations-logic": "v1"
    }
  });
}
