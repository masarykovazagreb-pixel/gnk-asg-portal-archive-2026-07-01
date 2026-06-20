const EXISTING_LOCATIONS = [
  ["01","GNK DINAMO Ltd.","Boulder, Colorado, USA","Sjeverna Amerika",22,33],
  ["02","Hrvatska","Hrvatska","Europa",52,38],
  ["03","Slovenija","Slovenija","Europa",53,38],
  ["04","Mađarska","Mađarska","Europa",55,37],
  ["05","Srbija · 1","Srbija","Europa",56,39],
  ["06","Srbija · 2","Srbija","Europa",57,40],
  ["07","Srbija · 3","Srbija","Europa",58,41],
  ["08","Srbija · 4","Srbija","Europa",59,42],
  ["09","Vancouver","Kanada","Sjeverna Amerika",14,28],
  ["10","Toronto","Kanada","Sjeverna Amerika",25,31],
  ["11","Mexico City","Meksiko","Sjeverna Amerika",20,48],
  ["12","Panama City","Panama","Sjeverna Amerika",31,55],
  ["13","Bogotá","Kolumbija","Južna Amerika",36,62],
  ["14","Lima","Peru","Južna Amerika",35,70],
  ["15","Santiago","Čile","Južna Amerika",39,78],
  ["16","São Paulo","Brazil","Južna Amerika",45,72],
  ["17","Buenos Aires","Argentina","Južna Amerika",47,79],
  ["18","Dubai","UAE","Azija",64,49],
  ["19","Mumbai","Indija","Azija",70,53],
  ["20","Singapore","Singapur","Azija",79,62],
  ["21","Jakarta","Indonezija","Azija",79,67],
  ["22","Beijing","Kina","Azija",82,40],
  ["23","Seoul","Južna Koreja","Azija",87,42],
  ["24","Tokyo","Japan","Azija",91,45],
  ["25","Kuala Lumpur","Malezija","Azija",78,61],
  ["26","Hong Kong","Hong Kong","Azija",82,54],
  ["27","Casablanca","Maroko","Afrika",48,48],
  ["28","Lagos","Nigerija","Afrika",51,60],
  ["29","Nairobi","Kenija","Afrika",60,62],
  ["30","Johannesburg","Južna Afrika","Afrika",56,77],
  ["31","Cape Town","Južna Afrika","Afrika",55,82],
  ["32","Sydney","Australija","Oceanija",89,80],
  ["33","Auckland","Novi Zeland","Oceanija",95,82]
];

const PLANNED_LOCATIONS = [
  ["E01","San José","Kostarika","Sjeverna Amerika",27,54],
  ["E02","Quito","Ekvador","Južna Amerika",34,61],
  ["E03","Montevideo","Urugvaj","Južna Amerika",47,80],
  ["E04","Doha","Katar","Azija",63,50],
  ["E05","Bangkok","Tajland","Azija",76,58],
  ["E06","Manila","Filipini","Azija",84,58],
  ["E07","Ho Chi Minh","Vijetnam","Azija",78,60],
  ["E08","Accra","Gana","Afrika",49,58],
  ["E09","Kigali","Ruanda","Afrika",58,64],
  ["E10","Port Louis","Mauricijus","Afrika",64,75],
  ["E11","Dar es Salaam","Tanzanija","Afrika",60,68],
  ["E12","Perth","Australija","Oceanija",83,78]
];

const GROUP_FINANCIALS = {
  revenueGroupEUR: 4704600000,
  netProfitEUR: 982480000,
  totalAssetsEUR: 3483000000,
  equityAndReservesEUR: 3414000000,
  liabilitiesEUR: 69040000,
  equityRatio: "98,02 %",
  existingEntities: 33,
  plannedExpansion2026: 12,
  afterExpansion: 45,
  existingCities: 30,
  existingMarkets: 28,
  existingContinents: 6,
  existingCityPopulation: "317,3 mil.",
  existingMarketPopulation: "4,72 mlrd.",
  expandedCities: 42,
  expandedMarkets: 39,
  expandedContinents: 6,
  expandedCityPopulation: "395,5 mil.",
  expandedMarketPopulation: "5,16 mlrd."
};

const ASG_FINANCIALS = {
  revenueEUR: 504000000,
  totalAssetsEUR: 46400000,
  equityAndReservesEUR: 46210000,
  shortTermLiabilitiesEUR: 184500,
  longTermLiabilitiesEUR: 0,
  profitBeforeTaxEUR: 21584.16,
  netProfitEUR: 16076.47,
  intangibleSoftwareEUR: 30000000
};

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] || c;
  });
}

function eur(n,digits=0){
  return new Intl.NumberFormat("hr-HR",{style:"currency",currency:"EUR",minimumFractionDigits:digits,maximumFractionDigits:digits}).format(n);
}

function eurShort(n){
  if(n >= 1000000000) return new Intl.NumberFormat("hr-HR",{minimumFractionDigits:4,maximumFractionDigits:4}).format(n/1000000000) + " mlrd. EUR";
  if(n >= 1000000) return new Intl.NumberFormat("hr-HR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n/1000000) + " mil. EUR";
  if(n >= 1000) return new Intl.NumberFormat("hr-HR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n/1000) + " tis. EUR";
  return eur(n,2);
}

function allLocations(){
  return EXISTING_LOCATIONS.map(x=>({code:x[0],name:x[1],market:x[2],continent:x[3],x:x[4],y:x[5],type:"existing"}))
    .concat(PLANNED_LOCATIONS.map(x=>({code:x[0],name:x[1],market:x[2],continent:x[3],x:x[4],y:x[5],type:"planned"})));
}

function dataJson(){
  return {
    ok:true,
    updatedAt:new Date().toISOString(),
    groupFinancials:GROUP_FINANCIALS,
    gnkAsgDooFinancials:ASG_FINANCIALS,
    existingLocations:EXISTING_LOCATIONS.map(x=>({code:x[0],name:x[1],market:x[2],continent:x[3],x:x[4],y:x[5]})),
    plannedLocations2026:PLANNED_LOCATIONS.map(x=>({code:x[0],name:x[1],market:x[2],continent:x[3],x:x[4],y:x[5]})),
    notes:{
      employeeCount:"Broj zaposlenih za grupu nije javno objavljen i ne prikazuje se.",
      groupDisclosure:"Grupni podaci prikazuju se kao management-certified / internally group-reviewed pregled za javni korporativni portal.",
      audit:"Revizorski status GNK ASG d.o.o. prikazuje sažetak; originalni potpisani PDF revizorskog izvješća treba učitati kao službeni dokument kada bude dostavljen."
    }
  };
}

function dotSvg(){
  const dots = allLocations().map(function(p){
    const fill = p.type === "planned" ? "#66d980" : "#4ca3ff";
    const stroke = p.type === "planned" ? "#113d2b" : "#0c315b";
    return "<circle cx='"+p.x+"' cy='"+p.y+"' r='1.7' fill='"+fill+"' stroke='"+stroke+"' stroke-width='0.7'><title>"+esc(p.code+" · "+p.name+" · "+p.market)+"</title></circle>";
  }).join("");
  return "<svg class='gnk-map-svg' viewBox='0 0 100 100' role='img' aria-label='GNK DINAMO Ltd. globalna mreža grupe'><defs><radialGradient id='glow' cx='50%' cy='50%' r='65%'><stop offset='0%' stop-color='#1c4167'/><stop offset='100%' stop-color='#06111f'/></radialGradient></defs><rect x='0' y='0' width='100' height='100' rx='7' fill='url(#glow)'/><path d='M12 31 C18 20 32 19 39 30 C34 41 23 45 13 39 Z' fill='#112a44' stroke='#254d78'/><path d='M44 32 C53 21 68 24 71 36 C65 45 54 46 45 40 Z' fill='#112a44' stroke='#254d78'/><path d='M44 47 C54 45 62 53 60 66 C50 69 43 60 44 47 Z' fill='#112a44' stroke='#254d78'/><path d='M67 43 C77 33 91 37 94 49 C86 61 72 57 67 43 Z' fill='#112a44' stroke='#254d78'/><path d='M77 68 C87 65 94 72 91 82 C83 85 75 79 77 68 Z' fill='#112a44' stroke='#254d78'/><path d='M15 30 C35 22 55 26 82 38' stroke='rgba(212,175,55,.35)' stroke-width='.4' fill='none'/><path d='M22 33 C41 55 61 58 89 80' stroke='rgba(212,175,55,.28)' stroke-width='.4' fill='none'/>"+dots+"</svg>";
}

function locationsList(items, title, cls){
  return "<div class='gnk-loc-list "+cls+"'><h3>"+esc(title)+"</h3>"+items.map(function(x){
    return "<div class='gnk-loc-row'><b>"+esc(x[0])+"</b><span><strong>"+esc(x[1])+"</strong><small>"+esc(x[2])+" · "+esc(x[3])+"</small></span></div>";
  }).join("")+"</div>";
}

function indexSections(){
  const gf = GROUP_FINANCIALS;
  const af = ASG_FINANCIALS;
  return "<section id='gnk-index-upgrade-v2' data-gnk-asg='index-upgrade-v2'>"+
  "<style>#gnk-index-upgrade-v2{font-family:Inter,Segoe UI,Arial,sans-serif;color:#f7f0dc;background:#06111f;padding:26px 0;margin:24px -2px 0}#gnk-index-upgrade-v2 *{box-sizing:border-box}.gnk-wrap{max-width:1180px;margin:0 auto;padding:0 18px}.gnk-kicker{letter-spacing:.26em;text-transform:uppercase;color:#d4af37;font-weight:800;font-size:13px}.gnk-title{font-family:Georgia,serif;font-size:clamp(34px,8vw,78px);line-height:.98;margin:10px 0 14px;color:#fff}.gnk-sub{font-size:clamp(18px,4vw,32px);line-height:1.38;color:#afbdd0;margin:0 0 22px}.gnk-card{border:1px solid rgba(212,175,55,.3);border-radius:24px;background:rgba(13,31,52,.92);padding:20px;margin:14px 0}.gnk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.gnk-metric{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.065);border-radius:18px;padding:18px}.gnk-metric small{display:block;letter-spacing:.18em;text-transform:uppercase;color:#b6c1d2;font-weight:800;margin-bottom:10px}.gnk-metric b{font-size:clamp(28px,6vw,44px);color:#f4d260}.gnk-light{background:#f6f8fb;color:#07162b;padding:28px 0}.gnk-light .gnk-title{color:#07162b}.gnk-light .gnk-sub{color:#6b7788}.gnk-light .gnk-card{background:#fff;color:#07162b;border-color:#dfe5ed}.gnk-light .gnk-metric{background:#f2f5f9;border-color:#dde5ee}.gnk-light .gnk-metric b{color:#07162b}.gnk-map-layout{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:16px;align-items:start}.gnk-map-svg{width:100%;min-height:360px;border:1px solid rgba(212,175,55,.3);border-radius:22px;display:block}.gnk-loc-list{max-height:520px;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(8,20,36,.9);padding:12px}.gnk-loc-list h3{margin:6px 6px 12px;color:#f4d260}.gnk-loc-row{display:flex;gap:12px;align-items:center;border:1px solid rgba(80,142,207,.28);border-radius:14px;padding:10px;margin:8px 0;background:rgba(8,25,45,.85)}.gnk-loc-row b{min-width:48px;text-align:center;border-radius:12px;padding:9px 7px;background:#092b51;color:#57adff}.gnk-loc-list.planned .gnk-loc-row b{background:#0c3b32;color:#73e18b}.gnk-loc-row strong{display:block;color:#fff;font-size:17px}.gnk-loc-row small{display:block;color:#9fb1c7}.gnk-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.gnk-actions a{color:#07162b;background:#d4af37;text-decoration:none;border-radius:999px;padding:12px 16px;font-weight:900}.gnk-actions a.secondary{background:transparent;color:#f4d260;border:1px solid rgba(212,175,55,.4)}.gnk-note{border-left:5px solid #d4af37;background:rgba(255,255,255,.06);border-radius:14px;padding:14px 16px;color:#d7e0ec}.gnk-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:860px){.gnk-map-layout,.gnk-two{grid-template-columns:1fr}.gnk-map-svg{min-height:300px}.gnk-loc-list{max-height:430px}}</style>"+
  "<div class='gnk-wrap'><div class='gnk-kicker'>GNK DINAMO Ltd. Group · consolidated view</div><h2 class='gnk-title'>Grupni financijski i tržišni pregled</h2><p class='gnk-sub'>Prikaz 33 postojeća društva / pozicije, 12 planiranih pozicija za 2026. i konsolidiranih pokazatelja FY 2025.</p><div class='gnk-grid'>"+
  "<div class='gnk-metric'><small>Prihodi grupe FY 2025</small><b>"+eurShort(gf.revenueGroupEUR)+"</b></div>"+
  "<div class='gnk-metric'><small>Neto dobit</small><b>"+eurShort(gf.netProfitEUR)+"</b></div>"+
  "<div class='gnk-metric'><small>Ukupna aktiva</small><b>"+eurShort(gf.totalAssetsEUR)+"</b></div>"+
  "<div class='gnk-metric'><small>Kapital i rezerve</small><b>"+eurShort(gf.equityAndReservesEUR)+"</b></div>"+
  "<div class='gnk-metric'><small>Obveze</small><b>"+eurShort(gf.liabilitiesEUR)+"</b></div>"+
  "<div class='gnk-metric'><small>Udio kapitala</small><b>"+gf.equityRatio+"</b></div></div>"+
  "<div class='gnk-card'><div class='gnk-grid'><div class='gnk-metric'><small>Postojeća društva</small><b>33</b></div><div class='gnk-metric'><small>Planirano 2026.</small><b>+12</b></div><div class='gnk-metric'><small>Nakon ekspanzije</small><b>45</b></div><div class='gnk-metric'><small>Tržišta nakon širenja</small><b>39</b></div></div></div>"+
  "<p class='gnk-note'>Grupni podaci prikazuju se kao management-certified i internally group-reviewed pregled za javni korporativni portal. Broj zaposlenih za grupu nije javno objavljen.</p>"+
  "<div class='gnk-actions'><a href='/group-financials'>Financije grupe</a><a href='/download/gnk-asg-group-financial-overview.pdf'>PDF grupe</a><a href='/download/gnk-asg-group-financial-factsheet.pdf'>Factsheet PDF</a><a class='secondary' href='/data/group-network.json'>Network JSON</a></div></div>"+
  "<div class='gnk-wrap'><div class='gnk-card'><div class='gnk-kicker'>GNK DINAMO Ltd. Group · global network</div><h2 class='gnk-title' style='font-size:clamp(32px,7vw,62px)'>Interaktivna globalna mreža grupe</h2><p class='gnk-sub'>Plave točke označavaju 33 postojeće pozicije, zelene 12 planiranih pozicija za 2026.</p><div class='gnk-map-layout'><div>"+dotSvg()+"<div class='gnk-grid' style='margin-top:14px'><div class='gnk-metric'><small>Jedinstveni gradovi</small><b>30 → 42</b></div><div class='gnk-metric'><small>Države / tržišta</small><b>28 → 39</b></div><div class='gnk-metric'><small>Kontinenti</small><b>6</b></div><div class='gnk-metric'><small>Doseg tržišta</small><b>4,72 → 5,16 mlrd.</b></div></div></div><div>"+locationsList(EXISTING_LOCATIONS,'01–33 · postojeća društva / pozicije','existing')+locationsList(PLANNED_LOCATIONS,'E01–E12 · planirana ekspanzija 2026.','planned')+"</div></div></div></div>"+
  "<section class='gnk-light'><div class='gnk-wrap'><div class='gnk-kicker'>GNK ASG d.o.o. · samostalni financijski profil</div><h2 class='gnk-title'>Financijski profil GNK ASG d.o.o.</h2><p class='gnk-sub'>Samostalni financijski podaci društva prema godišnjim financijskim izvještajima za 2025. i revizorskom statusu.</p><div class='gnk-grid'>"+
  "<div class='gnk-metric'><small>Ukupni prihodi</small><b>"+eurShort(af.revenueEUR)+"</b></div>"+
  "<div class='gnk-metric'><small>Ukupna aktiva</small><b>"+eurShort(af.totalAssetsEUR)+"</b></div>"+
  "<div class='gnk-metric'><small>Kapital i rezerve</small><b>"+eurShort(af.equityAndReservesEUR)+"</b></div>"+
  "<div class='gnk-metric'><small>Kratkoročne obveze</small><b>"+eurShort(af.shortTermLiabilitiesEUR)+"</b></div>"+
  "<div class='gnk-metric'><small>Dobit prije oporezivanja</small><b>"+eur(af.profitBeforeTaxEUR,2)+"</b></div>"+
  "<div class='gnk-metric'><small>Dobit godine</small><b>"+eur(af.netProfitEUR,2)+"</b></div>"+
  "<div class='gnk-metric'><small>Nematerijalna imovina / softver</small><b>"+eur(af.intangibleSoftwareEUR,2)+"</b></div>"+
  "<div class='gnk-metric'><small>Dugoročne obveze</small><b>"+eur(af.longTermLiabilitiesEUR,2)+"</b></div></div>"+
  "<div class='gnk-card'><h3>Revizija i financijska osnova</h3><p>Neovisni revizor EKVILIBRIJ d.o.o. izrazio je mišljenje da godišnji financijski izvještaji GNK ASG d.o.o. za 2025. istinito i fer prezentiraju financijski položaj, financijsku uspješnost i novčane tokove društva u skladu sa Zakonom o računovodstvu i Hrvatskim standardima financijskog izvještavanja.</p><div class='gnk-actions'><a href='/download/gnk-asg-doo-audit-report-status.pdf'>Revizorski status PDF</a><a class='secondary' href='/data/group-financials.json'>Financijski JSON</a></div></div></div></section></section>";
}

function groupFinancialsHtml(){
  return "<!doctype html><html lang='hr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>GNK ASG financije grupe i globalna mreža</title><link rel='canonical' href='https://gnk-asg.hr/group-financials'><meta name='description' content='Grupne financije, GNK ASG d.o.o. financijski profil i globalna mreža 33 + 12 pozicija.'></head><body style='margin:0;background:#06111f;color:#f7f0dc'>" + indexSections() + "</body></html>";
}

function pdf(title, lines){
  const clean = function(v){return String(v ?? "").replace(/[()\\\\]/g," ").replace(/[^\x20-\x7E]/g," ");};
  const text = [title].concat(lines).map(clean);
  let stream = "BT /F1 12 Tf 50 790 Td ";
  for(let i=0;i<text.length;i++){stream += "(" + text[i] + ") Tj T* ";}
  stream += "ET";
  const objects = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
  objects.push("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj");
  objects.push("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
  objects.push("5 0 obj << /Length " + stream.length + " >> stream\\n" + stream + "\\nendstream endobj");
  let out = "%PDF-1.4\\n";
  const offsets = [0];
  for(const obj of objects){offsets.push(out.length);out += obj + "\\n";}
  const xref = out.length;
  out += "xref\\n0 " + (objects.length + 1) + "\\n0000000000 65535 f \\n";
  for(let i=1;i<offsets.length;i++){out += String(offsets[i]).padStart(10,"0") + " 00000 n \\n";}
  out += "trailer << /Size " + (objects.length + 1) + " /Root 1 0 R >>\\nstartxref\\n" + xref + "\\n%%EOF";
  return out;
}

function pdfResponse(title, lines, filename){
  return new Response(pdf(title,lines),{headers:{"content-type":"application/pdf","content-disposition":"inline; filename="+filename,"x-gnk-asg-index-upgrade":"v2"}});
}

export function gnkIndexUpgradeV2Handle(request){
  const url = new URL(request.url);
  if(request.method !== "GET" && request.method !== "HEAD") return null;

  if(url.pathname === "/data/group-network.json"){
    return new Response(JSON.stringify({ok:true,updatedAt:new Date().toISOString(),existingCount:33,plannedCount:12,afterExpansion:45,existingLocations:EXISTING_LOCATIONS,plannedLocations2026:PLANNED_LOCATIONS},null,2),{headers:{"content-type":"application/json; charset=utf-8","x-gnk-asg-index-upgrade":"v2"}});
  }

  if(url.pathname === "/data/group-financials.json"){
    return new Response(JSON.stringify(dataJson(),null,2),{headers:{"content-type":"application/json; charset=utf-8","x-gnk-asg-index-upgrade":"v2"}});
  }

  if(url.pathname === "/group-financials" || url.pathname === "/group-network"){
    return new Response(groupFinancialsHtml(),{headers:{"content-type":"text/html; charset=utf-8","x-gnk-asg-index-upgrade":"v2"}});
  }

  if(url.pathname === "/download/gnk-asg-group-financial-overview.pdf"){
    return pdfResponse("GNK ASG GROUP FINANCIAL OVERVIEW",[
      "Group revenue FY2025: EUR 4.7046 billion",
      "Net profit: EUR 982.48 million",
      "Total assets: EUR 3.4830 billion",
      "Equity and reserves: EUR 3.4140 billion",
      "Liabilities: EUR 69.04 million",
      "Equity ratio: 98.02 percent",
      "Existing positions: 33",
      "Planned 2026 positions: 12",
      "After expansion: 45"
    ],"gnk-asg-group-financial-overview.pdf");
  }

  if(url.pathname === "/download/gnk-asg-group-financial-factsheet.pdf"){
    return pdfResponse("GNK ASG GROUP FINANCIAL FACTSHEET",[
      "33 existing positions and 12 planned positions for 2026",
      "Existing network: 30 unique cities, 28 markets, 6 continents",
      "After expansion: 42 unique cities, 39 markets, 6 continents",
      "Market population reach: 4.72 billion to 5.16 billion",
      "No group employee count is published"
    ],"gnk-asg-group-financial-factsheet.pdf");
  }

  if(url.pathname === "/download/gnk-asg-doo-audit-report-status.pdf"){
    return pdfResponse("GNK ASG D.O.O. AUDIT STATUS SUMMARY",[
      "Auditor: EKVILIBRIJ d.o.o.",
      "GNK ASG d.o.o. revenue: EUR 504.00 million",
      "Total assets: EUR 46.40 million",
      "Equity and reserves: EUR 46.21 million",
      "Short-term liabilities: EUR 184.50 thousand",
      "Long-term liabilities: EUR 0.00",
      "Intangible/software assets: EUR 30.00 million",
      "This is a status summary, not a substitute for the original signed audit report"
    ],"gnk-asg-doo-audit-report-status.pdf");
  }

  return null;
}

export async function gnkIndexUpgradeV2Apply(response, request){
  const url = new URL(request.url);
  const type = response.headers.get("content-type") || "";

  if(url.pathname === "/sitemap.xml" && type.toLowerCase().includes("xml")){
    let xml = await response.text();
    const add = [
      "https://gnk-asg.hr/group-financials",
      "https://gnk-asg.hr/group-network",
      "https://gnk-asg.hr/data/group-network.json",
      "https://gnk-asg.hr/data/group-financials.json",
      "https://gnk-asg.hr/download/gnk-asg-group-financial-overview.pdf",
      "https://gnk-asg.hr/download/gnk-asg-group-financial-factsheet.pdf",
      "https://gnk-asg.hr/download/gnk-asg-doo-audit-report-status.pdf"
    ].filter(function(loc){return !xml.includes(loc);}).map(function(loc){return "<url><loc>"+loc+"</loc><changefreq>monthly</changefreq><priority>0.80</priority></url>";}).join("");
    if(add) xml = xml.replace(/<\\/urlset>/i,add+"</urlset>");
    const headers = new Headers(response.headers);
    headers.set("content-type","application/xml; charset=utf-8");
    headers.set("x-gnk-asg-index-upgrade-sitemap","v2");
    return new Response(xml,{status:response.status,statusText:response.statusText,headers});
  }

  if((url.pathname === "/" || url.pathname === "") && type.toLowerCase().includes("text/html")){
    let html = await response.text();
    if(!html.includes("data-gnk-asg='index-upgrade-v2'")){
      if(html.toLowerCase().includes("<main")){
        html = html.replace(/(<main[^>]*>)/i,"$1"+indexSections());
      }else if(html.toLowerCase().includes("</body>")){
        html = html.replace(/<\\/body>/i,indexSections()+"</body>");
      }else{
        html += indexSections();
      }
    }
    const headers = new Headers(response.headers);
    headers.set("content-type","text/html; charset=utf-8");
    headers.set("x-gnk-asg-index-upgrade","v2");
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }

  return response;
}