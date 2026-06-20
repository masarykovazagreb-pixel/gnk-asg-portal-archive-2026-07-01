const LOCATIONS = [
  ["GNK DINAMO Ltd.","Boulder","USA","North America","existing",40.015,-105.2705,"Sjedište grupe / Group seat"],
  ["GNK ASG d.o.o.","Zagreb","Croatia","Europe","existing",45.815,15.9819,"GNK ASG d.o.o. / Hrvatska"],
  ["Slovenia position","Nova Gorica","Slovenia","Europe","existing",45.956,13.648,"Povezana pozicija / Connected position"],
  ["Hungary position","Budapest","Hungary","Europe","existing",47.4979,19.0402,"Povezana pozicija / Connected position"],
  ["Serbia position","Beograd","Serbia","Europe","existing",44.8125,20.4612,"Povezana pozicija / Connected position"],
  ["Novi Sad position","Novi Sad","Serbia","Europe","existing",45.2671,19.8335,"Povezana pozicija / Connected position"],
  ["Niš position","Niš","Serbia","Europe","existing",43.3209,21.8958,"Povezana pozicija / Connected position"],
  ["Kragujevac position","Kragujevac","Serbia","Europe","existing",44.0128,20.9114,"Povezana pozicija / Connected position"],
  ["Vancouver position","Vancouver","Canada","North America","existing",49.2827,-123.1207,"Povezana pozicija / Connected position"],
  ["Toronto position","Toronto","Canada","North America","existing",43.6532,-79.3832,"Povezana pozicija / Connected position"],
  ["Mexico City position","Mexico City","Mexico","North America","existing",19.4326,-99.1332,"Povezana pozicija / Connected position"],
  ["Panama City position","Panama City","Panama","Central America","existing",8.9824,-79.5199,"Povezana pozicija / Connected position"],
  ["Bogotá position","Bogotá","Colombia","South America","existing",4.711,-74.0721,"Povezana pozicija / Connected position"],
  ["Lima position","Lima","Peru","South America","existing",-12.0464,-77.0428,"Povezana pozicija / Connected position"],
  ["Santiago position","Santiago","Chile","South America","existing",-33.4489,-70.6693,"Povezana pozicija / Connected position"],
  ["São Paulo position","São Paulo","Brazil","South America","existing",-23.5505,-46.6333,"Povezana pozicija / Connected position"],
  ["Buenos Aires position","Buenos Aires","Argentina","South America","existing",-34.6037,-58.3816,"Povezana pozicija / Connected position"],
  ["Dubai position","Dubai","United Arab Emirates","Middle East","existing",25.2048,55.2708,"Povezana pozicija / Connected position"],
  ["Mumbai position","Mumbai","India","Asia","existing",19.076,72.8777,"Povezana pozicija / Connected position"],
  ["Singapore position","Singapore","Singapore","Asia","existing",1.3521,103.8198,"Povezana pozicija / Connected position"],
  ["Jakarta position","Jakarta","Indonesia","Asia","existing",-6.2088,106.8456,"Povezana pozicija / Connected position"],
  ["Beijing position","Beijing","China","Asia","existing",39.9042,116.4074,"Povezana pozicija / Connected position"],
  ["Seoul position","Seoul","South Korea","Asia","existing",37.5665,126.978,"Povezana pozicija / Connected position"],
  ["Tokyo position","Tokyo","Japan","Asia","existing",35.6762,139.6503,"Povezana pozicija / Connected position"],
  ["Kuala Lumpur position","Kuala Lumpur","Malaysia","Asia","existing",3.139,101.6869,"Povezana pozicija / Connected position"],
  ["Hong Kong position","Hong Kong","Hong Kong","Asia","existing",22.3193,114.1694,"Povezana pozicija / Connected position"],
  ["Casablanca position","Casablanca","Morocco","Africa","existing",33.5731,-7.5898,"Povezana pozicija / Connected position"],
  ["Lagos position","Lagos","Nigeria","Africa","existing",6.5244,3.3792,"Povezana pozicija / Connected position"],
  ["Nairobi position","Nairobi","Kenya","Africa","existing",-1.2921,36.8219,"Povezana pozicija / Connected position"],
  ["Johannesburg position","Johannesburg","South Africa","Africa","existing",-26.2041,28.0473,"Povezana pozicija / Connected position"],
  ["Cape Town position","Cape Town","South Africa","Africa","existing",-33.9249,18.4241,"Povezana pozicija / Connected position"],
  ["Sydney position","Sydney","Australia","Oceania","existing",-33.8688,151.2093,"Povezana pozicija / Connected position"],
  ["Auckland position","Auckland","New Zealand","Oceania","existing",-36.8509,174.7645,"Povezana pozicija / Connected position"],
  ["San José planned","San José","Costa Rica","Central America","planned",9.9281,-84.0907,"U osnivanju / In formation 2026"],
  ["Quito planned","Quito","Ecuador","South America","planned",-0.1807,-78.4678,"U osnivanju / In formation 2026"],
  ["Montevideo planned","Montevideo","Uruguay","South America","planned",-34.9011,-56.1645,"U osnivanju / In formation 2026"],
  ["Doha planned","Doha","Qatar","Middle East","planned",25.2854,51.531,"U osnivanju / In formation 2026"],
  ["Bangkok planned","Bangkok","Thailand","Asia","planned",13.7563,100.5018,"U osnivanju / In formation 2026"],
  ["Manila planned","Manila","Philippines","Asia","planned",14.5995,120.9842,"U osnivanju / In formation 2026"],
  ["Ho Chi Minh planned","Ho Chi Minh","Vietnam","Asia","planned",10.8231,106.6297,"U osnivanju / In formation 2026"],
  ["Accra planned","Accra","Ghana","Africa","planned",5.6037,-0.187,"U osnivanju / In formation 2026"],
  ["Kigali planned","Kigali","Rwanda","Africa","planned",-1.9441,30.0619,"U osnivanju / In formation 2026"],
  ["Port Louis planned","Port Louis","Mauritius","Africa","planned",-20.1609,57.5012,"U osnivanju / In formation 2026"],
  ["Dar es Salaam planned","Dar es Salaam","Tanzania","Africa","planned",-6.7924,39.2083,"U osnivanju / In formation 2026"],
  ["Perth planned","Perth","Australia","Oceania","planned",-31.9523,115.8613,"U osnivanju / In formation 2026"]
];

const GROUP_FINANCIALS = [
  ["Prihodi grupe","Group revenue","4,7046 bn","EUR","FY2025"],
  ["Neto dobit grupe","Group net profit","982,48 mil.","EUR","FY2025"],
  ["Ukupna aktiva grupe","Group total assets","3,4830 bn","EUR","FY2025"],
  ["Kapital i rezerve grupe","Group equity and reserves","3,4140 bn","EUR","FY2025"],
  ["Obveze grupe","Group liabilities","69,04 mil.","EUR","FY2025"],
  ["Equity ratio","Equity ratio","98,02","%","FY2025"]
];

const ASG_FINANCIALS = [
  ["Prihodi GNK ASG d.o.o.","GNK ASG revenue","504,00 mil.","EUR","FY2025"],
  ["Ukupna aktiva GNK ASG","GNK ASG total assets","46,40 mil.","EUR","FY2025"],
  ["Kapital i rezerve GNK ASG","GNK ASG equity and reserves","46,21 mil.","EUR","FY2025"],
  ["Kratkoročne obveze","Short-term liabilities","184,50 tis.","EUR","FY2025"],
  ["Dugoročne obveze","Long-term liabilities","0,00","EUR","FY2025"],
  ["Revizor","Auditor","EKVILIBRIJ d.o.o.","","FY2025"]
];

const DOCS = [
  ["group-financial-profile","GNK DINAMO Ltd. Group - financijski profil FY2025","GNK DINAMO Ltd. Group - FY2025 financial profile","Group PDF","/media-kit-downloads#group-financial-profile"],
  ["group-network-map","GNK DINAMO Ltd. Group - karta 33 + 12 lokacija","GNK DINAMO Ltd. Group - 33 + 12 locations map","Print/PDF","/network-map#print"],
  ["asg-audit","GNK ASG d.o.o. - revizijsko izvješće FY2025","GNK ASG d.o.o. - FY2025 audit report","Audit PDF","/media-kit-downloads#asg-audit"],
  ["asg-financials","GNK ASG d.o.o. - financijski izvještaji FY2025","GNK ASG d.o.o. - FY2025 financial statements","Financial PDF","/group-financials#asg"],
  ["governance","Izjava o korporativnom upravljanju","Corporate governance statement","PDF","/media-kit-downloads#governance"],
  ["policies","Politika privatnosti, uvjeti i pravilnici","Privacy, terms and policies","PDF","/media-kit-downloads#policies"]
];

const NEWS = [
  ["group","GRUPA","GROUP","16.06.2026.","GNK DINAMO Ltd. Group prikazuje grupne financije kao prvi sloj portala","GNK DINAMO Ltd. Group displays group financials as the first portal layer","Na početnoj stranici prvi su prikazani grupni financijski pokazatelji, zatim samostalni podaci GNK ASG d.o.o., dokumenti, karta mreže i javni informacijski moduli.","The homepage presents group financial indicators first, followed by standalone GNK ASG d.o.o. data, documents, network map and public information modules."],
  ["network","MREŽA","NETWORK","16.06.2026.","Aktivna karta povezuje 33 postojeće i 12 pozicija u osnivanju","Active map connects 33 existing and 12 in-formation positions","Svaki grad na karti je klikabilan i vodi na lokacijski zapis, a karta ima poseban gumb za ispis ili spremanje u PDF.","Each city on the map is clickable and links to its location record, with a dedicated print/PDF button."],
  ["asg-audit","REVIZIJA","AUDIT","16.06.2026.","GNK ASG d.o.o. revizijski i financijski dokumenti povezani su u dokumentacijskom centru","GNK ASG d.o.o. audit and financial documents are connected in the document center","Dokumentacijski modul jasno razdvaja grupne PDF dokumente, revizijske dokumente GNK ASG d.o.o. i javne politike.","The document module clearly separates group PDF documents, GNK ASG d.o.o. audit documents and public policies."],
  ["technology","TEHNOLOGIJA","TECHNOLOGY","15.06.2026.","Technology & AI sloj povezuje softver, podatke i sportsku tehnologiju","Technology & AI layer connects software, data and sport technology","Portal koristi jedinstveni dizajn-sustav za technology, AI, digital assets, intelligence, dokumente i kontakt.","The portal uses one unified design system for technology, AI, digital assets, intelligence, documents and contact."],
  ["market","DIGITALNA IMOVINA","DIGITAL ASSETS","15.06.2026.","Digital Exchange Monitor prikazuje tržišne podatke u informativnom režimu","Digital Exchange Monitor displays market data in an informative mode","Tržišni podaci imaju jasan status i napomenu da mogu kasniti te ne predstavljaju financijski savjet.","Market data has a clear status and notice that it may be delayed and does not constitute financial advice."]
];

function esc(v){return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function lang(url){return url.searchParams.get("lang")==="en"?"en":"hr";}
function theme(url){return url.searchParams.get("theme")==="light"?"light":"dark";}
function qs(l,t){const a=[];if(l==="en")a.push("lang=en");if(t==="light")a.push("theme=light");return a.length?"?"+a.join("&"):"";}
function lnk(path,l,t){return path+(path.includes("?")?(l==="en"?"&lang=en":"")+(t==="light"?"&theme=light":""):qs(l,t));}
function T(l){return l==="en"?{
  lead:"GNK ASG is the public corporate portal of the GNK DINAMO Ltd. Group structure, presenting group financial data, company profile, network map, documents, technology, digital assets and AI assistant.",
  groupFirst:"Group financial profile first",
  asgSecond:"GNK ASG d.o.o. standalone profile",
  open:"Open",
  print:"Print / Save PDF",
  note:"Data is informative, may be delayed and does not constitute financial, legal or tax advice.",
  existing:"Existing company/position",
  planned:"In formation 2026",
  all:"All locations",
  docs:"Documents and PDF center",
  news:"Business & Technology News",
  network:"Global network map",
  admin:"Admin / Operator"
}:{
  lead:"GNK ASG je javni korporativni portal grupne strukture GNK DINAMO Ltd. Group, s prikazom grupnih financija, profila društva, aktivne karte, dokumenata, tehnologije, digitalne imovine i AI asistenta.",
  groupFirst:"Financijski profil grupe prvi",
  asgSecond:"GNK ASG d.o.o. samostalni profil",
  open:"Otvori",
  print:"Ispiši / Spremi PDF",
  note:"Podaci su informativni, mogu kasniti i nisu financijski, pravni ni porezni savjet.",
  existing:"Postojeća firma/pozicija",
  planned:"U osnivanju 2026",
  all:"Sve lokacije",
  docs:"Dokumenti i PDF centar",
  news:"Business & Technology News",
  network:"Karta globalne mreže",
  admin:"Admin / Operator"
};}

function gnkAsgLogoSvg(){
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0a8"/><stop offset=".35" stop-color="#d4af37"/><stop offset=".72" stop-color="#9b6500"/><stop offset="1" stop-color="#ffd66b"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity=".45"/></filter></defs><rect width="980" height="420" fill="transparent"/><g filter="url(#s)" fill="url(#g)" stroke="#7a4f00" stroke-width="4"><path d="M490 42c-92 0-166 74-166 166s74 166 166 166 166-74 166-166h-54c0 62-50 112-112 112s-112-50-112-112S428 96 490 96c46 0 86 28 103 68h58C632 93 567 42 490 42z"/><path d="M421 247h38V153h-38zM476 247h38V102h-38zM531 247h38V135h-38z"/><path d="M363 289c77 44 184 41 266-36l24 24c-91 92-227 100-323 43z"/></g><text x="490" y="340" text-anchor="middle" font-family="Georgia,serif" font-size="118" letter-spacing="24" fill="url(#g)" stroke="#6d4700" stroke-width="2">GNK</text><text x="490" y="398" text-anchor="middle" font-family="Georgia,serif" font-size="54" letter-spacing="26" fill="url(#g)" stroke="#6d4700" stroke-width="1">ASG</text></svg>`;
}

function dinamoLogoSvg(){
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0a8"/><stop offset=".35" stop-color="#d4af37"/><stop offset=".72" stop-color="#8d5b00"/><stop offset="1" stop-color="#ffd66b"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#000" flood-opacity=".5"/></filter></defs><rect width="1050" height="520" fill="transparent"/><g filter="url(#s)" fill="url(#g)" stroke="#6d4700" stroke-width="4"><path d="M525 40c-98 0-178 80-178 178s80 178 178 178 178-80 178-178h-58c0 66-54 120-120 120s-120-54-120-120 54-120 120-120c49 0 92 30 111 73h61C676 96 607 40 525 40z"/><path d="M452 262h40V162h-40zM511 262h40V108h-40zM570 262h40V142h-40z"/><path d="M387 308c83 48 198 44 286-39l26 26c-98 99-244 108-347 46z"/></g><text x="525" y="410" text-anchor="middle" font-family="Georgia,serif" font-size="126" letter-spacing="26" fill="url(#g)" stroke="#6d4700" stroke-width="2">GNK</text><text x="525" y="485" text-anchor="middle" font-family="Georgia,serif" font-size="44" letter-spacing="18" fill="url(#g)" stroke="#6d4700" stroke-width="1">DINAMO LTD GROUP</text></svg>`;
}

function faviconSvg(){
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0a8"/><stop offset=".45" stop-color="#d4af37"/><stop offset="1" stop-color="#8d5b00"/></linearGradient></defs><rect width="128" height="128" rx="24" fill="#06111f"/><circle cx="64" cy="64" r="50" fill="none" stroke="url(#g)" stroke-width="8"/><path d="M40 82V58h13v24zM58 82V40h13v42zM76 82V51h13v31z" fill="url(#g)"/><path d="M34 88c24 12 58 8 78-16" stroke="url(#g)" stroke-width="8" fill="none" stroke-linecap="round"/></svg>`;
}

function logoResponse(kind){
  const body = kind==="dinamo" ? dinamoLogoSvg() : kind==="favicon" ? faviconSvg() : gnkAsgLogoSvg();
  return new Response(body,{headers:{"content-type":"image/svg+xml; charset=utf-8","cache-control":"public, max-age=86400","x-gnk-asg-brand-asset":kind}});
}

function css(){
return `<style>
:root{--bg:#050f1c;--bg2:#071827;--card:rgba(8,24,39,.88);--text:#f7f2e8;--muted:#a9b7c7;--gold:#d4af37;--gold2:#f0c767;--line:rgba(212,175,55,.35);--good:#2cc56e;--bad:#ff5e57;--shadow:0 22px 60px rgba(0,0,0,.34)}
body.light{--bg:#fbfaf7;--bg2:#fffaf0;--card:rgba(255,255,255,.95);--text:#101a2d;--muted:#5f6b7a;--gold:#c88916;--gold2:#dca84b;--line:rgba(190,139,35,.24);--shadow:0 16px 42px rgba(8,24,39,.10)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 55% 6%,rgba(212,175,55,.12),transparent 36%),linear-gradient(180deg,var(--bg),#030b13);color:var(--text);font-family:Inter,Segoe UI,Arial,sans-serif}body.light{background:radial-gradient(circle at 55% 6%,rgba(212,175,55,.18),transparent 42%),linear-gradient(180deg,#fff,#f8f4eb)}a{color:inherit;text-decoration:none}.top{height:84px;display:flex;align-items:center;justify-content:space-between;padding:0 42px;border-bottom:1px solid var(--line);background:rgba(4,13,24,.86);backdrop-filter:blur(14px);position:sticky;top:0;z-index:50}.light .top{background:rgba(255,255,255,.94)}.brand{display:flex;gap:14px;align-items:center;min-width:330px}.brand img{width:68px;height:54px;object-fit:contain}.brand strong{font-family:Georgia,serif;font-size:29px;letter-spacing:3px;color:var(--gold);display:block}.brand small{display:block;font-size:11px;color:var(--muted)}.nav{display:flex;gap:22px;align-items:center}.nav a{font-size:14px;font-weight:850;position:relative;padding:16px 0}.nav small{display:block;font-size:12px;font-weight:500;color:var(--muted);margin-top:3px}.nav a.active:after,.nav a:hover:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;border-radius:3px;background:var(--gold)}.tools{display:flex;gap:12px;align-items:center;font-weight:900}.tools a.active{color:var(--gold)}.theme{border:1px solid var(--line);border-radius:999px;padding:8px 10px;color:var(--gold);font-size:12px}.wrap{max-width:1840px;margin:0 auto;padding:24px 42px 0}.hero{min-height:330px;display:grid;grid-template-columns:.95fr 1.15fr .95fr;gap:24px;align-items:center;position:relative}.label{color:var(--gold);font-weight:900;letter-spacing:.5px}h1{font-family:Georgia,serif;font-size:56px;line-height:1.05;margin:12px 0 14px}h1 span{display:block;color:var(--gold)}p{color:var(--muted);line-height:1.55}.btns{display:flex;gap:14px;margin-top:20px;flex-wrap:wrap}.btn,.click{transition:.18s transform,.18s border-color,.18s box-shadow,.18s background}.btn{display:inline-flex;gap:12px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:12px 18px;font-weight:900;font-size:13px;background:rgba(255,255,255,.02)}.btn.gold{background:linear-gradient(135deg,var(--gold2),var(--gold));color:#06111f;border-color:transparent}.btn:hover,.click:hover{transform:translateY(-2px);box-shadow:var(--shadow);border-color:var(--gold)}.map-bg{position:absolute;inset:0 280px 0 330px;opacity:.95;pointer-events:none}.map-bg svg{width:100%;height:100%}.map-bg circle{fill:var(--gold)}.map-bg path{stroke:var(--gold);stroke-width:.55;fill:none;opacity:.55}.logo-hero{z-index:2;text-align:center}.logo-hero img{max-width:340px;width:100%;filter:drop-shadow(0 18px 35px rgba(0,0,0,.35))}.stat-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.stat,.card,.panel{background:var(--card);border:1px solid var(--line);border-radius:15px;box-shadow:var(--shadow)}.stat{padding:15px;min-height:116px}.stat small{display:block;color:var(--muted)}.stat strong{display:block;font-size:26px;font-family:Georgia,serif;margin:8px 0;color:var(--gold)}.grid2{display:grid;grid-template-columns:1.32fr .88fr;gap:14px;margin-top:16px}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:14px}.panel{padding:18px;position:relative;overflow:hidden}.panel h2{font-family:Georgia,serif;font-size:22px;margin:0 0 14px;color:var(--gold)}.panel h3{margin:0 0 10px}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.metric{border:1px solid var(--line);border-radius:10px;padding:15px;background:rgba(255,255,255,.035);min-height:116px}.light .metric,.light .tile,.light .doc,.light .news,.light .loc{background:#fff}.metric small{color:var(--muted);display:block}.metric strong{display:block;font-size:25px;font-family:Georgia,serif;margin:9px 0 3px}.metric span{color:var(--muted)}.disclosure{border-left:4px solid var(--gold);padding:12px 16px;background:rgba(212,175,55,.08);border-radius:8px}.tile-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.tile{border:1px solid var(--line);border-radius:10px;padding:13px;text-align:center;background:rgba(255,255,255,.035);min-height:116px}.tile i{width:48px;height:48px;border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;color:var(--gold);font-style:normal;font-size:24px;margin:0 auto 8px}.tile b{display:block;font-size:12px}.tile small{display:block;color:var(--muted);font-size:11px;margin-top:5px}.docs{display:grid;gap:9px}.doc{display:grid;grid-template-columns:34px 1fr 82px;gap:12px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:12px;background:rgba(255,255,255,.035)}.doc i{width:30px;height:30px;border:1px solid var(--line);border-radius:8px;display:grid;place-items:center;color:var(--gold);font-style:normal}.doc b{font-size:13px}.doc small{display:block;color:var(--muted);margin-top:4px}.doc em{font-style:normal;color:var(--gold);font-weight:900}.news-row{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.news{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:rgba(255,255,255,.035);min-height:210px}.thumb{height:78px;background:radial-gradient(circle at 30% 30%,rgba(240,199,103,.48),transparent 35%),linear-gradient(135deg,#0e3152,#06111f);border-bottom:1px solid var(--line)}.news span{display:flex;justify-content:space-between;padding:8px 10px;font-size:10px;color:var(--gold);font-weight:900}.news h3{font-size:14px;line-height:1.35;margin:0;padding:0 10px 8px}.news p{font-size:12px;padding:0 10px;margin:0}.news em{float:right;padding:8px 12px 12px;color:var(--gold);font-style:normal}.network-page{display:grid;grid-template-columns:1.65fr .85fr;gap:16px;margin-top:16px}.world{height:680px;border:1px solid var(--line);border-radius:16px;background:radial-gradient(circle at 50% 50%,rgba(212,175,55,.18),transparent 46%),var(--card);position:relative;overflow:hidden}.world svg{width:100%;height:100%}.world .dot{cursor:pointer}.world .dot circle{fill:var(--gold);stroke:#fff;stroke-width:1}.world .dot.planned circle{fill:transparent;stroke:var(--gold);stroke-width:2}.world .dot:hover circle{r:8}.world .dot text{font-size:10px;fill:var(--text);paint-order:stroke;stroke:var(--bg);stroke-width:3}.location-list{display:grid;gap:8px;max-height:680px;overflow:auto}.loc{display:grid;grid-template-columns:1fr auto;gap:8px;border:1px solid var(--line);border-radius:10px;padding:10px;background:rgba(255,255,255,.035)}.loc small{color:var(--muted);display:block}.badge{border:1px solid var(--line);border-radius:999px;padding:4px 8px;color:var(--gold);font-size:11px;height:max-content}.page-title{display:flex;align-items:end;justify-content:space-between;gap:20px;margin:22px 0}.page-title h1{font-size:44px;margin:0}.footer{margin-top:20px;border-top:1px solid var(--line);padding:28px 42px;display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr 1fr;gap:25px;background:rgba(0,0,0,.15)}.light .footer{background:rgba(255,255,255,.55)}.footer h3{font-family:Georgia,serif;color:var(--gold);margin:0 0 10px}.footer a,.footer p{display:block;color:var(--muted);margin:6px 0}.footer img{max-width:160px}.float-ai{position:fixed;right:34px;bottom:32px;width:78px;height:78px;border-radius:50%;background:radial-gradient(circle,var(--gold2),var(--gold));color:#06111f;display:grid;place-items:center;font-weight:900;box-shadow:0 0 35px rgba(212,175,55,.5);z-index:60}.green{position:absolute;right:5px;bottom:8px;width:13px;height:13px;border-radius:50%;background:#27d367;border:2px solid #082033}.print-only{display:none}.admin input,.admin textarea{width:100%;background:rgba(0,0,0,.18);border:1px solid var(--line);border-radius:8px;padding:12px;color:var(--text);font-family:Consolas,monospace}.light .admin input,.light .admin textarea{background:#fff}.admin pre{background:rgba(0,0,0,.25);border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto;min-height:180px}.light .admin pre{background:#fff}
@media(max-width:1200px){.hero,.grid2,.grid3,.network-page,.footer{grid-template-columns:1fr}.metrics,.stat-grid,.tile-grid,.news-row{grid-template-columns:repeat(2,1fr)}.nav{display:none}.map-bg{display:none}}
@media print{.top,.footer,.float-ai,.btns,.tools,.nav{display:none!important}body{background:#fff!important;color:#000!important}.wrap{padding:0!important;max-width:none!important}.panel,.world,.loc,.metric,.stat{box-shadow:none!important;background:#fff!important;color:#000!important;border-color:#999!important}.network-page{display:block!important}.location-list{max-height:none!important;overflow:visible!important}.world{height:560px!important}.print-only{display:block}.page-title h1{font-size:28px}.world .dot text{fill:#000;stroke:#fff}}
</style>`;
}

function header(active,l,t){
  const nav=[
    ["home","Početna","Home","/"],
    ["group","Grupa","Group","/group-financials"],
    ["network","Karta","Network map","/network-map"],
    ["technology","Technology & AI","Technology & AI","/technology-ai"],
    ["markets","Digital Assets","Digital Assets","/markets"],
    ["news","Business News","Business News","/business-news"],
    ["documents","Dokumenti","Documents","/media-kit-downloads"],
    ["admin","Admin","Admin","/admin"]
  ].map(n=>`<a class="${active===n[0]?"active":""}" href="${lnk(n[3],l,t)}">${esc(l==="en"?n[2]:n[1])}<small>${esc(n[2])}</small></a>`).join("");
  return `<header class="top"><a class="brand" href="${lnk("/",l,t)}"><img src="/brand/gnk-asg-logo.svg" alt="GNK ASG"><span><strong>GNK ASG</strong><small>Global Network Kapital • Advanced Sports & Governance</small></span></a><nav class="nav">${nav}</nav><div class="tools"><a class="${l==="hr"?"active":""}" href="?theme=${t}">HR</a><span>|</span><a class="${l==="en"?"active":""}" href="?lang=en${t==="light"?"&theme=light":""}">EN</a><a class="theme" href="?${l==="en"?"lang=en&":""}theme=${t==="light"?"dark":"light"}">${t==="light"?"DARK":"LIGHT"}</a></div></header>`;
}

function footer(l,t){
  return `<footer class="footer"><div><img src="/brand/gnk-asg-logo.svg" alt="GNK ASG"><h3>GNK ASG d.o.o.</h3><p>Zagrebačka cesta 130, Zagreb, Hrvatska</p><p>OIB: 75227917632 | MBS: 081512375</p></div><div><img src="/brand/gnk-dinamo-ltd-logo.svg" alt="GNK DINAMO Ltd. Group"><h3>GNK DINAMO Ltd. Group</h3><p>Boulder, Colorado, USA</p></div><div><h3>${l==="en"?"Quick links":"Brze poveznice"}</h3><a href="${lnk("/group-financials",l,t)}">Grupa</a><a href="${lnk("/network-map",l,t)}">Karta mreže</a><a href="${lnk("/media-kit-downloads",l,t)}">Dokumenti</a></div><div><h3>Kontakt</h3><p>info@gnk-asg.hr</p><p>+385 1 5555 901</p><a href="${lnk("/contact",l,t)}">Kontakt forma</a></div><div><h3>${l==="en"?"Legal":"Pravno"}</h3><a href="/privacy">Politika privatnosti</a><a href="/terms">Uvjeti korištenja</a><a href="/cookies">Cookies</a><p>© 2026 GNK ASG d.o.o.</p></div></footer><a class="float-ai" href="${lnk("/ask",l,t)}">AI<span class="green"></span></a>`;
}

function base(title,body,active,l,t,desc){
  return `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | GNK ASG</title><meta name="description" content="${esc(desc)}"><meta name="robots" content="index,follow"><link rel="canonical" href="https://gnk-asg.hr${active==="home"?"/":"/"+active}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta property="og:title" content="${esc(title)} | GNK ASG"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Organization","name":"GNK ASG d.o.o.","url":"https://gnk-asg.hr","email":"info@gnk-asg.hr","address":"Zagrebačka cesta 130, Zagreb, Hrvatska","parentOrganization":{"@type":"Organization","name":"GNK DINAMO Ltd. Group","address":"Boulder, Colorado, USA"}})}</script>${css()}</head><body class="${t}">${header(active,l,t)}<main class="wrap">${body}</main>${footer(l,t)}</body></html>`;
}

function mapBg(){
  const dots=Array.from({length:90}).map((_,i)=>`<circle cx="${70+(i*97)%780}" cy="${32+(i*53)%290}" r="${i%7===0?3.2:1.5}"/>`).join("");
  const lines=Array.from({length:74}).map((_,i)=>{const x1=70+(i*71)%780;const y1=45+(i*41)%270;const x2=70+((i+9)*71)%780;const y2=45+((i+5)*41)%270;return `<path d="M${x1} ${y1} C${(x1+x2)/2} ${y1-55}, ${(x1+x2)/2} ${y2+55}, ${x2} ${y2}"/>`;}).join("");
  return `<div class="map-bg"><svg viewBox="0 0 900 360" preserveAspectRatio="none">${dots}${lines}</svg></div>`;
}

function metricGrid(items,l,t){
  return `<div class="metrics">${items.map(x=>`<a class="metric click" href="${lnk("/group-financials",l,t)}"><small>${esc(l==="en"?x[1]:x[0])}</small><strong>${esc(x[2])}</strong><span>${esc(x[3])}</span><small>${esc(x[4])}</small></a>`).join("")}</div>`;
}

function docs(l,t){
  return `<div class="docs">${DOCS.map(d=>`<a class="doc click" href="${lnk(d[4],l,t)}"><i>PDF</i><b>${esc(l==="en"?d[2]:d[1])}<small>${esc(d[3])}</small></b><em>↓</em></a>`).join("")}</div>`;
}

function news(l,t){
  return `<div class="news-row">${NEWS.map(n=>`<a class="news click" href="${lnk("/business-news#"+n[0],l,t)}"><div class="thumb"></div><span><b>${esc(l==="en"?n[2]:n[1])}</b><time>${esc(n[3])}</time></span><h3>${esc(l==="en"?n[5]:n[4])}</h3><p>${esc(l==="en"?n[7]:n[6])}</p><em>→</em></a>`).join("")}</div>`;
}

function home(l,t){
  const tr=T(l);
  const body=`<section class="hero"><div><div class="label">GNK DINAMO Ltd. Group</div><h1>Group value first.<span>Technology, finance and sport.</span></h1><p>${esc(tr.lead)}</p><div class="btns"><a class="btn gold click" href="${lnk("/group-financials",l,t)}">${esc(tr.groupFirst)} →</a><a class="btn click" href="${lnk("/network-map",l,t)}">${esc(tr.network)} →</a><a class="btn click" href="${lnk("/media-kit-downloads",l,t)}">${esc(tr.docs)} →</a></div></div>${mapBg()}<div class="logo-hero"><img src="/brand/gnk-dinamo-ltd-logo.svg" alt="GNK DINAMO Ltd. Group"></div><div class="logo-hero"><img src="/brand/gnk-asg-logo.svg" alt="GNK ASG"></div></section><section class="panel"><h2>${esc(tr.groupFirst)}</h2>${metricGrid(GROUP_FINANCIALS,l,t)}<p class="disclosure">GNK DINAMO Ltd. Group FY2025: management-certified / internally group-reviewed public disclosure layer. Group figures are shown first as the primary corporate layer.</p></section><section class="grid2"><div class="panel"><h2>${esc(tr.asgSecond)}</h2>${metricGrid(ASG_FINANCIALS,l,t)}<p class="disclosure">GNK ASG d.o.o. FY2025: revizijski i financijski sloj društva; revizor EKVILIBRIJ d.o.o.; dugoročne obveze 0,00 EUR.</p></div><div class="panel"><h2>${esc(tr.docs)}</h2>${docs(l,t)}<div class="btns"><a class="btn gold click" href="${lnk("/media-kit-downloads",l,t)}">${esc(tr.open)} PDF centar →</a></div></div></section><section class="grid3"><div class="panel"><h2>${esc(tr.network)}</h2><div class="stat-grid"><a class="stat click" href="${lnk("/network-map",l,t)}"><small>Existing</small><strong>33</strong><span>${esc(tr.existing)}</span></a><a class="stat click" href="${lnk("/network-map",l,t)}"><small>Planned</small><strong>12</strong><span>${esc(tr.planned)}</span></a><a class="stat click" href="${lnk("/network-map",l,t)}"><small>Total</small><strong>45</strong><span>${esc(tr.all)}</span></a><a class="stat click" href="${lnk("/network-map",l,t)}"><small>Continents</small><strong>6</strong><span>Global</span></a><a class="stat click" href="${lnk("/network-map",l,t)}"><small>Countries</small><strong>39</strong><span>Markets</span></a><a class="stat click" href="${lnk("/network-map",l,t)}"><small>Print</small><strong>PDF</strong><span>${esc(tr.print)}</span></a></div></div><div class="panel"><h2>Technology & AI</h2><div class="tile-grid">${["AI","Software","FinTech","Sports Tech","Cybersecurity","Innovation"].map(x=>`<a class="tile click" href="${lnk("/technology-ai",l,t)}"><i>◎</i><b>${x}</b><small>${esc(tr.open)}</small></a>`).join("")}</div></div><div class="panel"><h2>Digital Exchange Monitor</h2><div class="tile-grid">${["BTC","ETH","SOL","XRP","FX","Gold"].map(x=>`<a class="tile click" href="${lnk("/markets",l,t)}"><i>${x[0]}</i><b>${x}</b><small>SNAPSHOT</small></a>`).join("")}</div></div></section><section class="panel"><h2>${esc(tr.news)}</h2>${news(l,t)}</section>`;
  return base("GNK ASG Corporate Portal",body,"home",l,t,tr.lead);
}

function groupPage(l,t){
  const tr=T(l);
  return base("Group financials",`<div class="page-title"><div><div class="label">GNK DINAMO Ltd. Group</div><h1>${esc(tr.groupFirst)}</h1></div><div class="btns"><a class="btn gold click" onclick="window.print()">${esc(tr.print)}</a><a class="btn click" href="${lnk("/media-kit-downloads",l,t)}">PDF dokumenti →</a></div></div><section class="panel"><h2>GNK DINAMO Ltd. Group FY2025</h2>${metricGrid(GROUP_FINANCIALS,l,t)}<p class="disclosure">Prihodi 4,7046 bn EUR; neto dobit 982,48 mil. EUR; ukupna aktiva 3,4830 bn EUR; kapital i rezerve 3,4140 bn EUR; obveze 69,04 mil. EUR; equity ratio 98,02%.</p></section><section id="asg" class="panel"><h2>GNK ASG d.o.o. FY2025</h2>${metricGrid(ASG_FINANCIALS,l,t)}<p class="disclosure">GNK ASG d.o.o. stabilno posluje, ima revizorsko izvješće, povećanu imovinu, kapital i rezerve te nema dugoročnih obveza.</p></section><section class="panel"><h2>${esc(tr.docs)}</h2>${docs(l,t)}</section>`,"group",l,t,"Group financials first, GNK ASG d.o.o. standalone financial and audit profile second.");
}

function networkPage(l,t){
  const tr=T(l);
  const project=(lon,lat)=>[(lon+180)/360*100,(90-lat)/180*100];

  const dots=LOCATIONS.map((x,i)=>{
    const p=project(x[6],x[5]);
    const cls=x[4]==="planned"?"planned":"existing";
    return `<a class="dot ${cls}" href="#loc-${i}" data-name="${esc(x[0])}" data-city="${esc(x[1])}" data-country="${esc(x[2])}" data-type="${esc(x[4])}" data-desc="${esc(x[7])}">
      <circle cx="${p[0]}" cy="${p[1]}" r="${x[4]==="planned"?3.3:4.2}"/>
      <text x="${p[0]+1.2}" y="${p[1]-1.2}">${esc(x[1])}</text>
      <title>${esc(x[0])} - ${esc(x[1])}, ${esc(x[2])} - ${esc(x[7])}</title>
    </a>`;
  }).join("");

  const list=LOCATIONS.map((x,i)=>`<a id="loc-${i}" class="loc click" href="https://www.google.com/search?q=${encodeURIComponent(x[1]+', '+x[2])}" target="_blank" rel="noopener">
    <span><b>${esc(x[0])}</b><small>${esc(x[1])}, ${esc(x[2])} • ${esc(x[3])} • ${esc(x[7])}</small></span>
    <em class="badge">${x[4]==="planned"?esc(tr.planned):esc(tr.existing)}</em>
  </a>`).join("");

  const body=`<div class="page-title" id="print">
    <div>
      <div class="label">GNK DINAMO Ltd. Group</div>
      <h1>${esc(tr.network)}</h1>
      <p>33 postojeće firme/pozicije + 12 u osnivanju = 45 označenih i klikabilnih lokacija.</p>
    </div>
    <div class="btns">
      <a class="btn gold click" onclick="window.print()">${esc(tr.print)}</a>
      <a class="btn click" href="${lnk("/data/network-map.json",l,t)}">JSON →</a>
    </div>
  </div>

  <section class="network-page">
    <div class="world">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <radialGradient id="mapG" cx="50%" cy="50%" r="75%">
            <stop offset="0" stop-color="#d4af37" stop-opacity=".20"/>
            <stop offset="1" stop-color="#d4af37" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#mapG)"/>
        <path d="M4 52 C20 20 35 22 48 42 S74 70 96 30 M10 67 C30 50 50 55 72 72 S95 83 99 50 M24 28 C36 24 47 29 55 36 M58 29 C69 20 82 20 94 31 M13 40 C21 37 31 39 43 46 M62 55 C75 48 86 49 97 58" stroke="var(--line)" fill="none" stroke-width=".35"/>
        ${dots}
      </svg>
      <div class="map-panel">
        <div>
          <b id="mapTitle">GNK DINAMO Ltd. Group — 45 lokacija</b>
          <div id="mapText">Klikni oznaku na karti ili lokaciju s desne strane. Nazivi se prikazuju po odabiru, bez preklapanja.</div>
        </div>
        <div class="map-legend"><span>● 33 postojeće</span><span>○ 12 u osnivanju</span><span>PDF / print aktivan</span></div>
      </div>
    </div>
    <div class="location-list">${list}</div>
  </section>

  <p class="print-only">GNK DINAMO Ltd. Group / GNK ASG d.o.o. - karta mreže: 33 postojeće firme/pozicije i 12 pozicija u osnivanju.</p>

  <script>
    document.querySelectorAll('.dot').forEach(function(d){
      d.addEventListener('mouseenter', function(){
        document.getElementById('mapTitle').textContent = d.dataset.name + ' — ' + d.dataset.city + ', ' + d.dataset.country;
        document.getElementById('mapText').textContent = d.dataset.desc + ' / ' + (d.dataset.type === 'planned' ? 'U osnivanju 2026' : 'Postojeća pozicija');
      });
      d.addEventListener('click', function(){
        document.getElementById('mapTitle').textContent = d.dataset.name + ' — ' + d.dataset.city + ', ' + d.dataset.country;
        document.getElementById('mapText').textContent = d.dataset.desc + ' / ' + (d.dataset.type === 'planned' ? 'U osnivanju 2026' : 'Postojeća pozicija');
      });
    });
  </script>`;

  return base("Network map 33 + 12",body,"network",l,t,"Clickable and printable global network map with 33 existing companies/positions and 12 in formation.");
}

function documentsPage(l,t){
  const tr=T(l);
  return base("Documents and PDF center",`<div class="page-title"><div><div class="label">GNK ASG / GNK DINAMO Ltd. Group</div><h1>${esc(tr.docs)}</h1></div><div class="btns"><a class="btn gold click" onclick="window.print()">${esc(tr.print)}</a></div></div><section class="grid2"><div class="panel"><h2>GNK DINAMO Ltd. Group PDF dokumenti</h2>${docs(l,t)}</div><div class="panel"><h2>Logotipovi</h2><img src="/brand/gnk-dinamo-ltd-logo.svg" style="max-width:360px;width:100%" alt="GNK DINAMO Ltd. Group"><img src="/brand/gnk-asg-logo.svg" style="max-width:300px;width:100%" alt="GNK ASG"></div></section><section class="panel"><h2>GNK ASG d.o.o. revizijski sloj</h2><p>Revizor: EKVILIBRIJ d.o.o. Dokumenti: revizijsko izvješće FY2025, financijski izvještaji FY2025, godišnje izvješće i javne politike.</p></section>`,"documents",l,t,"PDF document center for group documents, GNK ASG audit report, financial statements and public policies.");
}

function newsPage(l,t){
  const tr=T(l);
  return base("Business news",`<div class="page-title"><div><div class="label">GNK ASG</div><h1>${esc(tr.news)}</h1></div></div><section class="panel">${news(l,t)}</section>${NEWS.map(n=>`<article id="${n[0]}" class="panel"><h2>${esc(l==="en"?n[5]:n[4])}</h2><p>${esc(n[3])} • ${esc(l==="en"?n[2]:n[1])}</p><p>${esc(l==="en"?n[7]:n[6])}</p></article>`).join("")}`,"news",l,t,"Business, technology, group, audit, network and document updates.");
}

function simplePage(key,l,t){
  const titles={technology:"Technology & AI",markets:"Digital Assets",intelligence:"Intelligence Desk",contact:"Kontakt",ask:"GNK ASG AI Assistant",admin:"Admin / Operator"};
  if(key==="admin") return adminPage(l,t);
  const tr=T(l);
  return base(titles[key]||"GNK ASG",`<div class="page-title"><div><div class="label">GNK ASG</div><h1>${esc(titles[key]||"GNK ASG")}</h1></div><div class="btns"><a class="btn gold click" href="${lnk("/network-map",l,t)}">${esc(tr.network)} →</a><a class="btn click" href="${lnk("/media-kit-downloads",l,t)}">PDF →</a></div></div><section class="grid3"><div class="panel"><h2>GNK DINAMO Ltd. Group</h2>${metricGrid(GROUP_FINANCIALS.slice(0,3),l,t)}</div><div class="panel"><h2>GNK ASG d.o.o.</h2>${metricGrid(ASG_FINANCIALS.slice(0,3),l,t)}</div><div class="panel"><h2>${esc(tr.network)}</h2><p>33 + 12 klikabilnih lokacija, ispis / PDF i JSON endpoint.</p><a class="btn gold click" href="${lnk("/network-map",l,t)}">${esc(tr.open)} →</a></div></section><section class="panel"><h2>${esc(tr.news)}</h2>${news(l,t)}</section>` ,key,l,t,titles[key]||"GNK ASG page");
}

function adminPage(l,t){
  return base("Admin / Operator",`<section class="panel admin"><h1>Admin / Operator</h1><p>Token se šalje isključivo kao x-operator-token preko /admin-proxy na operator.gnk-asg.hr.</p><input id="tok" type="password" placeholder="Operator token"><div class="btns"><button class="btn gold" onclick="saveToken()" type="button">Spremi token</button><button class="btn" onclick="runAll()" type="button">Testiraj admin</button><button class="btn" onclick="clearToken()" type="button">Obriši token</button></div><pre id="out">Čeka test...</pre></section><script>const out=document.getElementById('out');const inp=document.getElementById('tok');inp.value=localStorage.getItem('GNK_ASG_OPERATOR_TOKEN')||'';function saveToken(){localStorage.setItem('GNK_ASG_OPERATOR_TOKEN',inp.value.trim());out.textContent='Token spremljen lokalno.'}function clearToken(){localStorage.removeItem('GNK_ASG_OPERATOR_TOKEN');inp.value='';out.textContent='Token obrisan.'}async function call(path){const token=(inp.value||localStorage.getItem('GNK_ASG_OPERATOR_TOKEN')||'').trim();out.textContent='Testiram '+path+' ...';try{const r=await fetch('/admin-proxy?path='+encodeURIComponent(path),{headers:{'x-operator-token':token,'cache-control':'no-cache'}});const text=await r.text();out.textContent='STATUS '+r.status+'\\n\\n'+text;}catch(e){out.textContent='ERROR\\n'+e.message}}async function runAll(){for(const p of ['/operator/status','/operator/system-health','/operator/contact-inbox','/operator/logs','/operator/','/operator/news-status','/operator/market-status','/operator/articles-status','/operator/seo/status']){await call(p);if(!out.textContent.startsWith('STATUS 200'))return;}out.textContent='Svi admin endpointi rade kroz x-operator-token proxy.'}</script>`,"admin",l,t,"Protected admin and operator token test panel.");
}

function dataJson(obj){return new Response(JSON.stringify(obj,null,2),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});}
function robots(){return new Response("User-agent: *\nAllow: /\nSitemap: https://gnk-asg.hr/sitemap.xml\n",{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public, max-age=3600"}});}
function sitemap(){const urls=["/","/group-financials","/network-map","/technology-ai","/markets","/digital-assets","/business-news","/articles","/intelligence-desk","/media-kit-downloads","/documents","/contact","/ask","/admin","/data/network-map.json","/data/group-financials.json","/data/gnk-asg-financials.json","/data/news.json"];const now=new Date().toISOString().slice(0,10);const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>'  <url><loc>https://gnk-asg.hr'+u+'</loc><lastmod>'+now+'</lastmod><changefreq>daily</changefreq><priority>'+(u==="/"?"1.0":"0.8")+'</priority></url>').join('\n')+'\n</urlset>';return new Response(xml,{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public, max-age=3600"}});}

export function gnkAsgAllPagesDesignResponse(request){
  const url=new URL(request.url);
  const l=lang(url);
  const t=theme(url);
  const p=url.pathname.replace(/\/+$/,"")||"/";
  if(p==="/favicon.svg") return logoResponse("favicon");
  if(p==="/brand/gnk-asg-logo.svg") return logoResponse("asg");
  if(p==="/brand/gnk-dinamo-ltd-logo.svg") return logoResponse("dinamo");
  if(p==="/robots.txt") return robots();
  if(p==="/sitemap.xml") return sitemap();
  if(p==="/data/network-map.json") return dataJson({ok:true,total:45,existing:33,planned:12,locations:LOCATIONS.map((x,i)=>({id:i+1,name:x[0],city:x[1],country:x[2],region:x[3],type:x[4],lat:x[5],lon:x[6],description:x[7]}))});
  if(p==="/data/group-financials.json") return dataJson({ok:true,fy:"2025",disclosure:"management-certified / internally group-reviewed",items:GROUP_FINANCIALS});
  if(p==="/data/gnk-asg-financials.json") return dataJson({ok:true,fy:"2025",auditor:"EKVILIBRIJ d.o.o.",items:ASG_FINANCIALS});
  if(p==="/data/news.json" || p==="/data/business-news.json") return dataJson({ok:true,items:NEWS});
  if(p==="/data/market.json" || p==="/data/digital-assets.json") return dataJson({ok:true,status:"SNAPSHOT",disclaimer:T(l).note,assets:["BTC","ETH","SOL","XRP","FX","Gold"]});
  if(p==="/" || p==="/final-index-preview" || p==="/homepage-profile-preview" || p==="/homepage-profile-preview-v2") return new Response(home(l,t),{headers:htmlHeaders("home-group-first-v2")});
  if(p==="/group-financials") return new Response(groupPage(l,t),{headers:htmlHeaders("group-financials-v2")});
  if(p==="/network-map") return new Response(networkPage(l,t),{headers:htmlHeaders("network-map-33-12-print-v2")});
  if(p==="/media-kit-downloads" || p==="/documents") return new Response(documentsPage(l,t),{headers:htmlHeaders("documents-pdf-v2")});
  if(p==="/business-news" || p==="/articles") return new Response(newsPage(l,t),{headers:htmlHeaders("news-filled-v2")});
  if(p==="/technology-ai") return new Response(simplePage("technology",l,t),{headers:htmlHeaders("technology-v2")});
  if(p==="/markets" || p==="/digital-assets") return new Response(simplePage("markets",l,t),{headers:htmlHeaders("markets-v2")});
  if(p==="/intelligence-desk") return new Response(simplePage("intelligence",l,t),{headers:htmlHeaders("intelligence-v2")});
  if(p==="/contact") return new Response(simplePage("contact",l,t),{headers:htmlHeaders("contact-v2")});
  if(p==="/ask" || p==="/ai" || p==="/ai-public") return new Response(simplePage("ask",l,t),{headers:htmlHeaders("ask-v2")});
  if(p==="/admin" || p==="/operator-admin") return new Response(adminPage(l,t),{headers:htmlHeaders("admin-proxy-v2")});
  return null;
}

function htmlHeaders(module){return {"content-type":"text/html; charset=utf-8","cache-control":"no-store, max-age=0","x-gnk-asg-design-system":module};}
