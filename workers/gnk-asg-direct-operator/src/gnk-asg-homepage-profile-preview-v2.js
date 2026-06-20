import { GNK_ASG_HOMEPAGE_PROFILE_V1 } from "./gnk-asg-homepage-profile-v1.js";

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
  });
}

function compactEur(n){
  n = Number(n);
  if(!isFinite(n)) return "";
  if(n >= 1000000000) return (n/1000000000).toLocaleString("hr-HR",{maximumFractionDigits:4}) + " mlrd. EUR";
  if(n >= 1000000) return (n/1000000).toLocaleString("hr-HR",{maximumFractionDigits:2}) + " mil. EUR";
  if(n >= 1000) return (n/1000).toLocaleString("hr-HR",{maximumFractionDigits:2}) + " tis. EUR";
  return n.toLocaleString("hr-HR",{maximumFractionDigits:2}) + " EUR";
}

function mapPoint(p){
  const x = ((Number(p.lng)+180)/360*1000).toFixed(1);
  const y = ((90-Number(p.lat))/180*500).toFixed(1);
  return {x,y};
}

function worldMap(d){
  const existing = d.map.existingLocations;
  const planned = d.map.plannedLocations2026;
  const all = existing.concat(planned);
  const parent = existing.find(x => x.city === "Boulder") || existing[0];
  const regionalNames = new Set(["Zagreb","Dubai","Singapore","Sao Paulo","Toronto","Johannesburg","Sydney"]);
  const p0 = mapPoint(parent);

  const hubLinks = existing.filter(x => regionalNames.has(x.city)).map(function(p){
    const q = mapPoint(p);
    return '<path class="net-line hub" d="M'+p0.x+' '+p0.y+' Q '+((Number(p0.x)+Number(q.x))/2)+' '+(Math.min(Number(p0.y),Number(q.y))-45)+' '+q.x+' '+q.y+'"/>';
  }).join("");

  const regionalLinks = all.filter(x => x.city !== parent.city && !regionalNames.has(x.city)).map(function(p,i){
    const hubs = existing.filter(x => regionalNames.has(x.city));
    const h = hubs[i % hubs.length] || parent;
    const a = mapPoint(h);
    const b = mapPoint(p);
    return '<path class="net-line '+esc(p.type)+'" d="M'+a.x+' '+a.y+' Q '+((Number(a.x)+Number(b.x))/2)+' '+(Math.min(Number(a.y),Number(b.y))-20)+' '+b.x+' '+b.y+'"/>';
  }).join("");

  const dots = all.map(function(p){
    const q = mapPoint(p);
    const cls = p.type === "parent" ? "parent" : p.type === "planned2026" ? "planned" : regionalNames.has(p.city) ? "hubdot" : "existing";
    const r = p.type === "parent" ? 8 : regionalNames.has(p.city) ? 6 : p.type === "planned2026" ? 4 : 4.8;
    return '<g class="city '+cls+'"><circle cx="'+q.x+'" cy="'+q.y+'" r="'+r+'"><title>'+esc(p.city+", "+p.country)+'</title></circle><text x="'+(Number(q.x)+7)+'" y="'+(Number(q.y)-7)+'">'+esc(p.city)+'</text></g>';
  }).join("");

  return '<div class="map-shell"><svg class="world" viewBox="0 0 1000 500" role="img" aria-label="GNK ASG global network map">'+
    '<defs><radialGradient id="ocean" cx="45%" cy="25%" r="80%"><stop offset="0%" stop-color="#182a49"/><stop offset="52%" stop-color="#07101f"/><stop offset="100%" stop-color="#02040a"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'+
    '<rect width="1000" height="500" rx="28" fill="url(#ocean)"/>'+
    '<path class="continent" d="M112 118 C178 80 290 82 365 140 C430 190 392 260 300 270 C198 282 105 230 78 162 C67 134 80 124 112 118Z"/>'+
    '<path class="continent" d="M420 82 C520 42 665 75 712 160 C752 233 672 304 548 275 C452 252 382 175 420 82Z"/>'+
    '<path class="continent" d="M665 124 C763 82 900 118 940 204 C972 272 902 332 792 308 C700 288 630 203 665 124Z"/>'+
    '<path class="continent" d="M448 306 C545 282 650 310 690 382 C724 443 628 472 532 438 C452 410 402 345 448 306Z"/>'+
    '<path class="continent" d="M742 350 C812 322 902 342 930 398 C954 450 890 475 820 458 C760 444 712 390 742 350Z"/>'+
    hubLinks+regionalLinks+dots+
    '</svg><div class="map-legend"><span><i class="p"></i>Parent</span><span><i class="h"></i>Regional hub</span><span><i class="e"></i>Existing</span><span><i class="pl"></i>Planned 2026</span></div></div>';
}

function chips(items){
  return items.map(function(x){
    return '<span class="chip"><b>'+esc(x.city)+'</b><small>'+esc(x.country)+'</small></span>';
  }).join("");
}

function docCards(d){
  return d.documentsRequired.map(function(name){
    const slug = name.toLowerCase().replaceAll(" ","-").replaceAll(".","").replaceAll("/","-");
    let href = "/media-kit-downloads";
    if(slug.includes("media-kit")) href="/download/gnk-asg-media-kit.pdf";
    if(slug.includes("company-profile")) href="/download/gnk-asg-company-profile.pdf";
    if(slug.includes("letterhead")) href="/download/gnk-asg-letterhead.docx";
    if(slug.includes("presentation")) href="/download/gnk-asg-presentation-template.pptx";
    if(slug.includes("audit")) href="/download/gnk-asg-doo-audit-report-status.pdf";
    if(slug.includes("good-standing")) href="/download/gnk-dinamo-ltd-good-standing.pdf";
    if(slug.includes("group-financial-report")) href="/download/gnk-dinamo-ltd-group-financial-report.pdf";
    if(slug.includes("factsheet")) href="/download/gnk-asg-group-financial-factsheet.pdf";
    if(slug.includes("overview")) href="/download/gnk-asg-group-financial-overview.pdf";
    const type = href.endsWith(".pdf") ? "PDF" : href.endsWith(".docx") ? "DOCX" : href.endsWith(".pptx") ? "PPTX" : "LINK";
    return '<a class="doc-card" href="'+href+'"><span>'+esc(type)+'</span><b>'+esc(name)+'</b><small>Status: javni download / provjera kroz Document Center</small></a>';
  }).join("");
}

function html(){
  const d = GNK_ASG_HOMEPAGE_PROFILE_V1;
  const c = d.company;
  const cf = d.companyFinancialsFY2025;
  const g = d.group;
  const gf = d.groupFinancialsFY2025;
  const r = d.networkReach;

  return '<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GNK ASG Preview V2</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#05070d"><style>'+
  ':root{--bg:#05070d;--card:#0d1422;--gold:#f5d776;--txt:#f8f7f1;--muted:#aeb8cc;--line:rgba(245,215,118,.22);--green:#33d17a;--blue:#76b7ff;--red:#ff6961}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% -10%,#20375f 0,#05070d 42%,#020308 100%);color:var(--txt);font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:1380px;margin:0 auto;padding:26px}.topbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}.brand{display:flex;align-items:center;gap:12px}.brand img{width:48px;height:48px;border-radius:15px;box-shadow:0 12px 32px rgba(0,0,0,.38)}.brand b{display:block}.brand small{color:var(--muted)}.lang{display:flex;gap:8px}.lang button{cursor:pointer;border:1px solid rgba(245,215,118,.32);background:rgba(255,255,255,.045);color:#fff;border-radius:999px;padding:9px 14px;font-weight:900}.lang button.active{background:var(--gold);color:#07101f}.en{display:none}body[data-lang="en"] .hr{display:none}body[data-lang="en"] .en{display:inline}.hero{display:grid;grid-template-columns:.92fr 1.08fr;gap:18px}.card{background:linear-gradient(145deg,rgba(16,26,45,.96),rgba(6,11,21,.96));border:1px solid var(--line);border-radius:26px;padding:22px;box-shadow:0 22px 70px rgba(0,0,0,.32)}.kicker{color:var(--gold);letter-spacing:.14em;text-transform:uppercase;font-size:12px;font-weight:900}.title{font-size:47px;line-height:1.02;margin:12px 0}.title span span{color:var(--gold)}.lead{color:var(--muted);line-height:1.58;font-size:16px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}.stat{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);border-radius:17px;padding:13px}.stat small{display:block;color:var(--muted);font-size:12px}.stat b{display:block;font-size:21px;margin-top:4px}.section{margin-top:18px}.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px}.map-shell{position:relative}.world{width:100%;height:auto;display:block}.continent{fill:#111f38;stroke:rgba(245,215,118,.16);stroke-width:1}.net-line{fill:none;stroke:rgba(245,215,118,.22);stroke-width:.85}.net-line.hub{stroke:rgba(245,215,118,.58);stroke-width:1.5;filter:url(#glow)}.net-line.planned2026{stroke:rgba(118,183,255,.45);stroke-dasharray:5 6}.city circle{stroke:#fff;stroke-width:1.3;filter:url(#glow)}.city.parent circle{fill:var(--gold)}.city.hubdot circle{fill:#ffdf7f}.city.existing circle{fill:var(--green)}.city.planned circle{fill:var(--blue)}.city text{font-size:9px;fill:#e9eefb;opacity:.72}.map-legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;color:var(--muted);font-size:13px}.map-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}.p{background:var(--gold)}.h{background:#ffdf7f}.e{background:var(--green)}.pl{background:var(--blue)}.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{display:inline-flex;gap:7px;align-items:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);border-radius:999px;padding:8px 10px}.chip small{color:var(--muted)}.list{display:grid;gap:8px}.list div{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(255,255,255,.07);padding:8px 0}.list span{color:var(--muted)}.doc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.doc-card{display:block;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);border-radius:16px;padding:14px;color:#fff;text-decoration:none}.doc-card span{display:inline-block;color:#07101f;background:var(--gold);border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900}.doc-card b{display:block;margin-top:9px}.doc-card small{display:block;color:var(--muted);margin-top:8px}.ai-toggle{display:none}.badge{position:fixed;right:22px;bottom:22px;width:78px;height:78px;border-radius:25px;border:2px solid var(--gold);background:linear-gradient(145deg,#0b1220,#1a2a46);display:grid;place-items:center;box-shadow:0 18px 50px rgba(0,0,0,.42);font-weight:900;color:#fff;cursor:pointer;z-index:40}.badge small{display:block;font-size:10px;color:var(--gold)}.ai-panel{position:fixed;right:22px;bottom:114px;width:min(410px,calc(100vw - 44px));max-height:72vh;overflow:auto;border-radius:24px;border:1px solid rgba(245,215,118,.32);background:linear-gradient(145deg,#0b1220,#111c31);box-shadow:0 24px 80px rgba(0,0,0,.55);padding:18px;z-index:39;transform:translateY(12px);opacity:0;pointer-events:none;transition:.18s ease}.ai-toggle:checked~.ai-panel{transform:translateY(0);opacity:1;pointer-events:auto}.ai-panel h3{margin:5px 0 8px;color:var(--gold)}.ai-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ai-actions a{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);border-radius:13px;padding:10px;color:#fff;text-decoration:none;font-size:13px}.status-row{display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.07);padding:7px 0;color:var(--muted)}.status-row b{color:var(--green)}@media(max-width:1000px){.hero,.two,.three{grid-template-columns:1fr}.grid,.grid2,.doc-grid{grid-template-columns:1fr 1fr}.title{font-size:35px}}@media(max-width:640px){.grid,.grid2,.doc-grid{grid-template-columns:1fr}.city text{display:none}}'+
  '.mainnav{display:flex;flex-wrap:wrap;gap:9px;margin:0 0 18px}.mainnav a{border:1px solid rgba(245,215,118,.3);background:rgba(255,255,255,.045);border-radius:999px;padding:9px 12px;color:#f5d776;text-decoration:none;font-size:13px;font-weight:800}</style></head><body data-lang="hr"><div class="wrap"><div class="topbar"><div class="brand"><img src="/favicon.svg" alt="GNK ASG"><div><b>GNK ASG</b><small><span class="hr">Korporativni portal</span><span class="en">Corporate portal</span></small></div></div><div class="lang"><button class="active" data-lang-btn="hr">HR</button><button data-lang-btn="en">ENG</button></div></div>'+
  '<nav class="mainnav"><a href="/homepage-profile-preview">Grupa</a><a href="/group-financials">Financije</a><a href="/homepage-profile-preview#locations">Lokacije</a><a href="/business-news">Vijesti</a><a href="/articles">Objave</a><a href="/ask">AI pitanja</a><a href="/markets">Markets</a><a href="/media-kit-downloads">Dokumenti</a><a href="/email-signatures">Mail potpisi</a><a href="/contact?theme=dark">Kontakt</a><a href="/admin?theme=dark">Admin</a></nav><!-- GNK_ASG_PREVIEW_V2_MAIN_MENU_V1 --><section class="hero"><article class="card"><div class="kicker">GNK ASG / GNK DINAMO Ltd.</div><h1 class="title"><span class="hr">Globalna grupa, <span>sportsko-tehnološka mreža</span> i financijski profil</span><span class="en">Global group, <span>sports-technology network</span> and financial profile</span></h1><p class="lead">'+esc(g.positioning)+'</p><div class="grid"><div class="stat"><small>Postojeće pozicije</small><b>'+g.existingPositions+'</b></div><div class="stat"><small>Plan 2026.</small><b>+'+g.plannedExpansion2026+'</b></div><div class="stat"><small>Nakon širenja</small><b>'+g.totalAfterExpansion+'</b></div><div class="stat"><small>Kontinenti</small><b>'+r.current.continents+'</b></div></div><p class="lead">Doseg nakon širenja: '+r.afterExpansion2026.uniqueCities+' gradova, '+r.afterExpansion2026.countriesOrMarkets+' tržišta, približno '+(r.afterExpansion2026.marketPopulationReachApprox/1000000000).toLocaleString("hr-HR",{maximumFractionDigits:2})+' mlrd. stanovnika tržišta.</p></article><article class="card">'+worldMap(d)+'</article></section>'+
  '<section class="two section"><article class="card"><div class="kicker">GNK ASG d.o.o.</div><h2>Profil društva</h2><div class="list"><div><span>Naziv</span><b>'+esc(c.legalName)+'</b></div><div><span>Sjedište</span><b>'+esc(c.registeredSeat)+'</b></div><div><span>OIB</span><b>'+esc(c.oib)+'</b></div><div><span>MBS</span><b>'+esc(c.mbs)+'</b></div><div><span>Direktor / UBO</span><b>'+esc(c.director)+'</b></div><div><span>Revizor</span><b>'+esc(c.auditor)+'</b></div></div></article><article class="card"><div class="kicker">GNK ASG d.o.o. FY2025</div><h2>Samostalni financijski pokazatelji</h2><div class="grid2"><div class="stat"><small>Prihodi</small><b>'+compactEur(cf.salesRevenueEUR)+'</b></div><div class="stat"><small>Aktiva</small><b>'+compactEur(cf.totalAssetsEUR)+'</b></div><div class="stat"><small>Kapital i rezerve</small><b>'+compactEur(cf.equityAndReservesEUR)+'</b></div><div class="stat"><small>Dugoročne obveze</small><b>'+compactEur(cf.longTermLiabilitiesEUR)+'</b></div><div class="stat"><small>Dobit godine</small><b>'+compactEur(cf.profitForYearEUR)+'</b></div><div class="stat"><small>Softver</small><b>'+compactEur(cf.intangibleAssetsSoftwareEUR)+'</b></div></div></article></section>'+
  '<section class="two section"><article class="card"><div class="kicker">GNK DINAMO Ltd. Group</div><h2>Group Overview FY2025</h2><div class="grid2"><div class="stat"><small>Prihodi grupe</small><b>'+compactEur(gf.revenueEUR)+'</b></div><div class="stat"><small>Neto dobit</small><b>'+compactEur(gf.netProfitEUR)+'</b></div><div class="stat"><small>Ukupna aktiva</small><b>'+compactEur(gf.totalAssetsEUR)+'</b></div><div class="stat"><small>Kapital i rezerve</small><b>'+compactEur(gf.equityAndReservesEUR)+'</b></div><div class="stat"><small>Obveze</small><b>'+compactEur(gf.liabilitiesEUR)+'</b></div><div class="stat"><small>Udio kapitala</small><b>'+gf.equityRatioPercent+'%</b></div></div><p class="lead">'+esc(gf.disclosure)+'</p></article><article class="card" id="locations"><div class="kicker">Cities</div><h2>Postojeći i planirani gradovi</h2><p class="lead">Postojeće lokacije</p><div class="chips">'+chips(d.map.existingLocations)+'</div><p class="lead">Planirano za 2026.</p><div class="chips">'+chips(d.map.plannedLocations2026)+'</div></article></section>'+
  '<section class="three section"><article class="card"><div class="kicker">News / Market</div><h2>Logika vijesti i tržišta</h2><p class="lead">Vijesti: '+esc(d.newsLogic.externalNews.targetTimesCroatia.join(" i "))+' po hrvatskom vremenu. Market status: LIVE / DELAYED / SNAPSHOT / FALLBACK.</p><p class="lead"><a style="color:#f5d776" href="/operations-logic">Otvori operativnu logiku portala</a> | <a style="color:#f5d776" href="/data/portal-operations-logic.json">JSON operations logic</a></p></article><article class="card"><div class="kicker">Contact + AI</div><h2>Kontakt i AI potvrda</h2><p class="lead">'+esc(d.contactAndAi.userMessageAfterSubmit)+'</p><p class="lead"><a style="color:#f5d776" href="/contact?theme=dark">Otvori kontakt formu</a></p></article><article class="card"><div class="kicker">Admin / Status</div><h2>Operator status</h2><p class="lead">Admin/operator endpointi su zaštićeni tokenom. Javni AI badge nema administratorske ovlasti.</p><p class="lead"><a style="color:#f5d776" href="/admin?theme=dark">Admin ulaz</a></p></article></section>'+
  '<section class="card section"><div class="kicker">Document Center</div><h2>Javni PDF i poslovni dokumenti</h2><div class="doc-grid">'+docCards(d)+'</div></section>'+
  '<section class="card section"><div class="kicker">Disclosure</div><p class="lead">'+esc(cf.disclosure)+' '+esc(gf.disclosure)+'</p></section>'+
  '</div><input id="ai-open" class="ai-toggle" type="checkbox"><label for="ai-open" class="badge">AI<small>LIVE</small></label><aside class="ai-panel"><div class="kicker">GNK ASG AI Assistant</div><h3>Portal status i brze funkcije</h3><p class="lead">Javni statusni panel. Nema admin ovlasti.</p><div class="status-row"><span>Homepage profile</span><b>ACTIVE</b></div><div class="status-row"><span>Kontakt forma</span><b>ACTIVE</b></div><div class="status-row"><span>Inbox</span><b>KV READY</b></div><div class="status-row"><span>News/Market</span><b>SCHEMA</b></div><div class="ai-actions"><a href="/data/homepage-profile.json">Homepage JSON</a><a href="/operations-logic">Operations</a><a href="/media-kit-downloads">PDF dokumenti</a><a href="/contact?theme=dark">Kontakt</a><a href="/group-financials">Financije</a><a href="/admin?theme=dark">Admin ulaz</a></div></aside><script>document.querySelectorAll("[data-lang-btn]").forEach(function(b){b.addEventListener("click",function(){document.body.setAttribute("data-lang",b.getAttribute("data-lang-btn"));document.querySelectorAll("[data-lang-btn]").forEach(function(x){x.classList.remove("active")});b.classList.add("active")})});</script><!-- GNK_ASG_HOMEPAGE_PREVIEW_V2 --></body></html>';
}

export function gnkAsgHomepageProfilePreviewV2Response(){
  return new Response(html(), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-gnk-asg-homepage-preview": "v2"
    }
  });
}
