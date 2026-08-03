const COMPANY = {
  name: "GNK ASG d.o.o.",
  address: "Zagrebačka cesta 130, Zagreb, Hrvatska",
  oib: "75227917632",
  mbs: "081512375",
  email: "info@gnk-asg.hr"
};

const LOCATIONS = [
["gnk-dinamo-ltd","GNK DINAMO Ltd.","Boulder","USA","North America","existing",40.015,-105.2705,"Sjedište GNK DINAMO Ltd. Group."],
["gnk-asg-zagreb","GNK ASG d.o.o.","Zagreb","Croatia","Europe","existing",45.815,15.9819,"GNK ASG d.o.o., Zagrebačka cesta 130, Zagreb, Hrvatska."],
["nova-gorica","Slovenia position","Nova Gorica","Slovenia","Europe","existing",45.956,13.648,"Povezana pozicija grupe."],
["budapest","Hungary position","Budapest","Hungary","Europe","existing",47.4979,19.0402,"Povezana pozicija grupe."],
["beograd","Serbia position","Beograd","Serbia","Europe","existing",44.8125,20.4612,"Povezana pozicija grupe."],
["novi-sad","Novi Sad position","Novi Sad","Serbia","Europe","existing",45.2671,19.8335,"Povezana pozicija grupe."],
["nis","Niš position","Niš","Serbia","Europe","existing",43.3209,21.8958,"Povezana pozicija grupe."],
["kragujevac","Kragujevac position","Kragujevac","Serbia","Europe","existing",44.0128,20.9114,"Povezana pozicija grupe."],
["vancouver","Vancouver position","Vancouver","Canada","North America","existing",49.2827,-123.1207,"Povezana pozicija grupe."],
["toronto","Toronto position","Toronto","Canada","North America","existing",43.6532,-79.3832,"Povezana pozicija grupe."],
["mexico-city","Mexico City position","Mexico City","Mexico","North America","existing",19.4326,-99.1332,"Povezana pozicija grupe."],
["panama-city","Panama City position","Panama City","Panama","Central America","existing",8.9824,-79.5199,"Povezana pozicija grupe."],
["bogota","Bogotá position","Bogotá","Colombia","South America","existing",4.711,-74.0721,"Povezana pozicija grupe."],
["lima","Lima position","Lima","Peru","South America","existing",-12.0464,-77.0428,"Povezana pozicija grupe."],
["santiago","Santiago position","Santiago","Chile","South America","existing",-33.4489,-70.6693,"Povezana pozicija grupe."],
["sao-paulo","São Paulo position","São Paulo","Brazil","South America","existing",-23.5505,-46.6333,"Povezana pozicija grupe."],
["buenos-aires","Buenos Aires position","Buenos Aires","Argentina","South America","existing",-34.6037,-58.3816,"Povezana pozicija grupe."],
["dubai","Dubai position","Dubai","United Arab Emirates","Middle East","existing",25.2048,55.2708,"Povezana pozicija grupe."],
["mumbai","Mumbai position","Mumbai","India","Asia","existing",19.076,72.8777,"Povezana pozicija grupe."],
["singapore","Singapore position","Singapore","Singapore","Asia","existing",1.3521,103.8198,"Povezana pozicija grupe."],
["jakarta","Jakarta position","Jakarta","Indonesia","Asia","existing",-6.2088,106.8456,"Povezana pozicija grupe."],
["beijing","Beijing position","Beijing","China","Asia","existing",39.9042,116.4074,"Povezana pozicija grupe."],
["seoul","Seoul position","Seoul","South Korea","Asia","existing",37.5665,126.978,"Povezana pozicija grupe."],
["tokyo","Tokyo position","Tokyo","Japan","Asia","existing",35.6762,139.6503,"Povezana pozicija grupe."],
["kuala-lumpur","Kuala Lumpur position","Kuala Lumpur","Malaysia","Asia","existing",3.139,101.6869,"Povezana pozicija grupe."],
["hong-kong","Hong Kong position","Hong Kong","Hong Kong","Asia","existing",22.3193,114.1694,"Povezana pozicija grupe."],
["casablanca","Casablanca position","Casablanca","Morocco","Africa","existing",33.5731,-7.5898,"Povezana pozicija grupe."],
["lagos","Lagos position","Lagos","Nigeria","Africa","existing",6.5244,3.3792,"Povezana pozicija grupe."],
["nairobi","Nairobi position","Nairobi","Kenya","Africa","existing",-1.2921,36.8219,"Povezana pozicija grupe."],
["johannesburg","Johannesburg position","Johannesburg","South Africa","Africa","existing",-26.2041,28.0473,"Povezana pozicija grupe."],
["cape-town","Cape Town position","Cape Town","South Africa","Africa","existing",-33.9249,18.4241,"Povezana pozicija grupe."],
["sydney","Sydney position","Sydney","Australia","Oceania","existing",-33.8688,151.2093,"Povezana pozicija grupe."],
["auckland","Auckland position","Auckland","New Zealand","Oceania","existing",-36.8509,174.7645,"Povezana pozicija grupe."],
["san-jose","San José planned","San José","Costa Rica","Central America","planned",9.9281,-84.0907,"U osnivanju 2026."],
["quito","Quito planned","Quito","Ecuador","South America","planned",-0.1807,-78.4678,"U osnivanju 2026."],
["montevideo","Montevideo planned","Montevideo","Uruguay","South America","planned",-34.9011,-56.1645,"U osnivanju 2026."],
["doha","Doha planned","Doha","Qatar","Middle East","planned",25.2854,51.531,"U osnivanju 2026."],
["bangkok","Bangkok planned","Bangkok","Thailand","Asia","planned",13.7563,100.5018,"U osnivanju 2026."],
["manila","Manila planned","Manila","Philippines","Asia","planned",14.5995,120.9842,"U osnivanju 2026."],
["ho-chi-minh","Ho Chi Minh planned","Ho Chi Minh","Vietnam","Asia","planned",10.8231,106.6297,"U osnivanju 2026."],
["accra","Accra planned","Accra","Ghana","Africa","planned",5.6037,-0.187,"U osnivanju 2026."],
["kigali","Kigali planned","Kigali","Rwanda","Africa","planned",-1.9441,30.0619,"U osnivanju 2026."],
["port-louis","Port Louis planned","Port Louis","Mauritius","Africa","planned",-20.1609,57.5012,"U osnivanju 2026."],
["dar-es-salaam","Dar es Salaam planned","Dar es Salaam","Tanzania","Africa","planned",-6.7924,39.2083,"U osnivanju 2026."],
["perth","Perth planned","Perth","Australia","Oceania","planned",-31.9523,115.8613,"U osnivanju 2026."]
];

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function locObj(x,i){
  return {
    id:i+1,
    slug:x[0],
    name:x[1],
    city:x[2],
    country:x[3],
    region:x[4],
    type:x[5],
    lat:x[6],
    lon:x[7],
    description:x[8],
    url:"/network-location/"+x[0]
  };
}

function json(data,module){
  return new Response(JSON.stringify(data,null,2),{
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store",
      "x-gnk-asg-urgent-fix":module
    }
  });
}

function html(title,body,module){
  return new Response(`<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | GNK ASG</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>
body{margin:0;background:#050f1c;color:#f7f2e8;font-family:Inter,Segoe UI,Arial,sans-serif}
a{color:inherit;text-decoration:none}
header{display:flex;justify-content:space-between;align-items:center;padding:22px 36px;background:#06111f;border-bottom:1px solid rgba(212,175,55,.35)}
header strong{color:#d4af37;font-family:Georgia,serif;font-size:28px;letter-spacing:3px}
nav{display:flex;gap:16px;font-weight:800}
main{max-width:1600px;margin:0 auto;padding:28px 38px}
h1{font-family:Georgia,serif;font-size:46px;margin:0 0 12px}
h2{font-family:Georgia,serif;color:#d4af37}
p,small{color:#a9b7c7;line-height:1.55}
.btns{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0}
.btn{border:1px solid rgba(212,175,55,.35);border-radius:9px;padding:11px 15px;font-weight:900}
.gold{background:linear-gradient(135deg,#f0c767,#d4af37);color:#06111f;border:0}
.grid{display:grid;grid-template-columns:1.4fr .8fr;gap:16px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.card,.panel,.loc{background:rgba(8,24,39,.93);border:1px solid rgba(212,175,55,.35);border-radius:14px;padding:14px}
.map{height:620px;border:1px solid rgba(212,175,55,.35);border-radius:14px;overflow:hidden;background:#071827}
.loc{display:grid;grid-template-columns:1fr auto;gap:10px;margin-bottom:8px}
.badge{color:#d4af37;border:1px solid rgba(212,175,55,.35);border-radius:99px;padding:4px 8px;font-size:11px;height:max-content}
input,textarea,select{width:100%;margin:6px 0 10px;background:#071827;color:#f7f2e8;border:1px solid rgba(212,175,55,.35);border-radius:8px;padding:11px}
textarea{min-height:140px}
pre{white-space:pre-wrap;background:#071827;border:1px solid rgba(212,175,55,.35);border-radius:10px;padding:12px}
@media(max-width:900px){.grid{grid-template-columns:1fr}nav{display:none}.map{height:480px}}
</style><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script></head><body><header><a href="/"><strong>GNK ASG</strong></a><nav><a href="/">Početna</a><a href="/network-map">Karta</a><a href="/locations/existing">33</a><a href="/locations/planned">12</a><a href="/contact">Kontakt</a></nav></header><main>${body}</main></body></html>`,{
    headers:{
      "content-type":"text/html; charset=utf-8",
      "cache-control":"no-store, max-age=0",
      "x-gnk-asg-urgent-fix":module
    }
  });
}

function mapPage(){
  const locs = JSON.stringify(LOCATIONS.map(locObj));
  const list = LOCATIONS.map(x=>`<a class="loc" href="/network-location/${x[0]}"><span><b>${esc(x[1])}</b><small>${esc(x[2])}, ${esc(x[3])} • ${esc(x[4])}<br>${esc(x[8])}</small></span><em class="badge">${x[5]==="planned"?"U osnivanju":"Postojeće"}</em></a>`).join("");
  return html("Karta globalne mreže",`<h1>Karta globalne mreže</h1><p>33 postojeće lokacije i 12 lokacija u osnivanju. Klik na marker ili popis otvara posebnu stranicu lokacije.</p><div class="btns"><a class="btn gold" href="/locations/existing">33 postojeće lokacije</a><a class="btn" href="/locations/planned">12 u osnivanju</a><a class="btn" href="/data/network-map.json">JSON</a><a class="btn" onclick="window.print()">Ispiši / PDF</a></div><section class="grid"><div class="map" id="map"></div><div>${list}</div></section><script>
const locs=${locs};
const map=L.map('map',{worldCopyJump:true}).setView([20,10],2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);
const existingIcon=L.divIcon({className:'',html:'<div style="width:18px;height:18px;border-radius:50%;background:#d4af37;border:3px solid #fff;box-shadow:0 0 14px rgba(212,175,55,.75)"></div>',iconSize:[18,18],iconAnchor:[9,9]});
const plannedIcon=L.divIcon({className:'',html:'<div style="width:18px;height:18px;border-radius:50%;background:#06111f;border:3px solid #d4af37;box-shadow:0 0 14px rgba(212,175,55,.75)"></div>',iconSize:[18,18],iconAnchor:[9,9]});
for(const x of locs){
  const marker=L.marker([x.lat,x.lon],{icon:x.type==='planned'?plannedIcon:existingIcon}).addTo(map);
  marker.bindPopup('<b>'+x.name+'</b><br>'+x.city+', '+x.country+'<br>'+x.region+'<br><b>'+((x.type==='planned')?'U osnivanju 2026':'Postojeće')+'</b><br><br><a style="color:#d4af37;font-weight:900" href="'+x.url+'">Otvori lokaciju →</a>');
}
</script>`,"network-map");
}

function locationsPage(type){
  const list = LOCATIONS.filter(x=>x[5]===type);
  const title = type==="planned" ? "12 lokacija u osnivanju" : "33 postojeće lokacije";
  return html(title,`<h1>${title}</h1><p>Klik na grad otvara posebnu lokacijsku stranicu.</p><div class="btns"><a class="btn gold" href="/network-map">Karta</a><a class="btn" href="/locations/existing">33 postojeće</a><a class="btn" href="/locations/planned">12 u osnivanju</a></div><section>${list.map(x=>`<a class="loc" href="/network-location/${x[0]}"><span><b>${esc(x[1])}</b><small>${esc(x[2])}, ${esc(x[3])} • ${esc(x[4])}<br>${esc(x[8])}</small></span><em class="badge">${x[5]==="planned"?"U osnivanju":"Postojeće"}</em></a>`).join("")}</section>`,"locations-"+type);
}

function locationPage(slug){
  const x = LOCATIONS.find(v=>v[0]===slug);
  if(!x) return html("Lokacija nije pronađena",`<h1>Lokacija nije pronađena</h1><a class="btn gold" href="/network-map">Natrag na kartu</a>`,"location-404");
  const meta = JSON.stringify(locObj(x,LOCATIONS.indexOf(x)),null,2);
  return html(x[1],`<h1>${esc(x[1])}</h1><p>${esc(x[2])}, ${esc(x[3])} • ${esc(x[4])}</p><div class="btns"><a class="btn gold" href="/network-map">Natrag na kartu</a><a class="btn" href="/contact?subject=${encodeURIComponent("Upit za lokaciju "+x[2])}">Pošalji upit</a><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/${encodeURIComponent(x[2]+", "+x[3])}">Otvori online kartu</a></div><section class="grid"><div class="panel"><h2>${x[5]==="planned"?"U osnivanju 2026":"Postojeća firma/pozicija"}</h2><p>${esc(x[8])}</p><p>Latitude: ${x[6]}<br>Longitude: ${x[7]}</p></div><div class="panel"><h2>Meta lokacija</h2><pre>${esc(meta)}</pre></div></section>`,"location-detail");
}

function contactPage(){
  return html("Kontakt",`<h1>Kontakt forma</h1><section class="grid"><form class="panel" method="post" action="/api/contact-submit"><h2>Pošalji poruku</h2><input name="name" placeholder="Ime i prezime" required><input name="email" placeholder="E-mail" required><input name="phone" placeholder="Telefon"><select name="topic"><option>Opći upit</option><option>Network map</option><option>Objave</option><option>Vijesti</option><option>Market</option><option>Dokumenti</option></select><input name="subject" placeholder="Predmet"><textarea name="message" placeholder="Poruka" required></textarea><button class="btn gold" type="submit">Pošalji</button></form><div class="panel"><h2>Podaci</h2><p>${COMPANY.name}</p><p>${COMPANY.address}</p><p>OIB: ${COMPANY.oib} | MBS: ${COMPANY.mbs}</p><p>${COMPANY.email}</p></div></section>`,"contact");
}

async function contactSubmit(request,env){
  let data = {};
  try {
    const ct = request.headers.get("content-type") || "";
    if(ct.includes("application/json")) {
      data = await request.json();
    } else {
      const fd = await request.formData();
      for(const [k,v] of fd.entries()) data[k] = String(v);
    }
  } catch(e) {}

  const id = "contact-" + Date.now();
  const item = { ok:true, id, receivedAt:new Date().toISOString(), to:COMPANY.email, data };
  let stored = false;
  let storage = null;

  try {
    if(env.GNK_ASG_KV) {
      await env.GNK_ASG_KV.put(id,JSON.stringify(item),{expirationTtl:7776000});
      stored = true;
      storage = "GNK_ASG_KV";
    } else if(env.GNK_ASG_CONFIG_KV) {
      await env.GNK_ASG_CONFIG_KV.put(id,JSON.stringify(item),{expirationTtl:7776000});
      stored = true;
      storage = "GNK_ASG_CONFIG_KV";
    } else if(env.PORTAL_KV) {
      await env.PORTAL_KV.put(id,JSON.stringify(item),{expirationTtl:7776000});
      stored = true;
      storage = "PORTAL_KV";
    }
  } catch(e) {}

  return json({ ...item, stored, storage, mail:{ attempted:false, sent:false, reason:"Mail slanje ostaje za sutrašnje spajanje Cloudflare mail bindinga. Forma više ne vraća not_found." } },"contact-submit");
}

function updateStatus(){
  return {
    ok:true,
    urgentFix:true,
    updatedAt:new Date().toISOString(),
    fixedTonight:[
      "address-replaced-in-public-assets",
      "network-map-route",
      "locations-existing-route",
      "locations-planned-route",
      "network-location-detail-route",
      "contact-route",
      "api-contact-submit-no-not-found",
      "data-network-map-json",
      "data-update-status-json"
    ],
    tomorrow:[
      "connect-real-news-refresh",
      "connect-real-market-refresh",
      "connect-cloudflare-mail-binding",
      "connect-admin-operator-buttons",
      "connect-old-frontend-widgets-to-data-json"
    ]
  };
}

export default {
  async fetch(request,env,ctx) {
    const url = new URL(request.url);
    const p = url.pathname.replace(/\/+$/,"") || "/";

    if(p==="/network-map") return mapPage();
    if(p==="/locations/existing") return locationsPage("existing");
    if(p==="/locations/planned") return locationsPage("planned");
    if(p.startsWith("/network-location/")) return locationPage(p.split("/").pop());
    if(p==="/contact") return contactPage();
    if(p==="/api/contact-submit") return contactSubmit(request,env);
    if(p==="/data/network-map.json") return json({ok:true,total:45,existing:33,planned:12,locations:LOCATIONS.map(locObj)},"network-map");
    if(p==="/data/meta-locations.json") return json({ok:true,locations:LOCATIONS.map(locObj)},"meta-locations");
    if(p==="/data/update_status.json") return json(updateStatus(),"update-status");
    if(p==="/backend-status" || p==="/operator/backend-status") return json(updateStatus(),"backend-status");

    if(env.ASSETS && typeof env.ASSETS.fetch === "function") {
      const assetResponse = await env.ASSETS.fetch(request);
      if(assetResponse && assetResponse.status !== 404) return assetResponse;
    }

    return new Response(`<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stranica nije pronađena | GNK ASG</title><meta name="robots" content="noindex,follow"><style>body{margin:0;background:#050505;color:#f6f2e8;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:20px}h1{font-size:clamp(2.5rem,8vw,5rem);margin:0 0 10px;color:#d7b55b}p{color:#aaa59b;font-size:1.05rem;max-width:480px;margin:0 auto 26px}a.btn{display:inline-block;padding:12px 26px;border-radius:10px;background:linear-gradient(135deg,#f2d27d,#d7b55b);color:#171207;font-weight:800;text-decoration:none;margin:0 6px}a.btn2{display:inline-block;padding:12px 26px;border-radius:10px;border:1px solid #3b321c;color:#f6f2e8;text-decoration:none;margin:0 6px}</style></head><body><div><h1>404</h1><p>Stranica koju tražite ne postoji ili je premještena. Provjerite adresu ili se vratite na početnu stranicu.</p><a class="btn" href="/">Početna stranica</a><a class="btn2" href="/objave/">Objave</a></div></body></html>`,{
      status:404,
      headers:{
        "content-type":"text/html; charset=utf-8",
        "cache-control":"no-store",
        "x-gnk-asg-urgent-fix":"fallback-404"
      }
    });
  }
};
