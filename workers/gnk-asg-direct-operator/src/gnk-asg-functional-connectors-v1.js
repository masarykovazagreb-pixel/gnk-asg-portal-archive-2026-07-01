export const GNK_ASG_EMAIL_SIGNATURES_V1 = {
  version: "email-signatures-v2-ascii-safe-html-entities",
  updatedAt: "2026-06-16",
  signatures: [
    {
      id: "nermin-sefic-gnk-asg",
      title: "Nermin Sefic / GNK ASG d.o.o.",
      html: "<strong>Nermin Sefi&#263;</strong><br>Direktor / UBO<br><strong>GNK ASG d.o.o.</strong><br>Zagreba&#269;ka cesta 130, Zagreb<br>OIB: 75227917632<br><a href='https://gnk-asg.hr'>www.gnk-asg.hr</a><br><span style='color:#777'>Ova poruka mo&#382;e sadr&#382;avati povjerljive informacije namijenjene isklju&#269;ivo primatelju.</span>"
    },
    {
      id: "it-osobni-digitalni-asistent",
      title: "IT - Osobni digitalni asistent",
      html: "<strong>IT &#8211; Osobni digitalni asistent</strong><br>GNK ASG Portal Assistant<br><a href='https://gnk-asg.hr/ask'>Online AI pitanja</a> | <a href='https://gnk-asg.hr/contact?theme=dark'>Kontakt forma</a><br><span style='color:#777'>Automatizirani asistent daje informativne odgovore iz javnih podataka portala. Nije pravni, financijski ni porezni savjet.</span>"
    },
    {
      id: "gnk-dinamo-ltd-group",
      title: "GNK DINAMO Ltd. Group",
      html: "<strong>GNK DINAMO Ltd. Group</strong><br>Boulder, Colorado, USA<br>Entity ID: 20238180649<br>Group overview: <a href='https://gnk-asg.hr/group-financials'>Financial overview</a><br>Media: <a href='https://gnk-asg.hr/media-kit-downloads'>Media Kit Downloads</a>"
    }
  ]
};

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
  });
}

function json(data){
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0"
    }
  });
}

export function gnkAsgEmailSignaturesJsonResponse(){
  return json(GNK_ASG_EMAIL_SIGNATURES_V1);
}

export function gnkAsgEmailSignaturesHtmlResponse(){
  const cards = GNK_ASG_EMAIL_SIGNATURES_V1.signatures.map(function(s){
    return '<article class="card"><div class="kicker">'+esc(s.id)+'</div><h2>'+esc(s.title)+'</h2><div class="sig">'+s.html+'</div><textarea readonly>'+esc(s.html)+'</textarea></article>';
  }).join("");

  const html = '<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GNK ASG Mail potpisi</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>body{margin:0;background:#05070d;color:#f8f7f1;font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:1100px;margin:0 auto;padding:28px}.hero,.card{background:linear-gradient(145deg,#101a2d,#07101d);border:1px solid rgba(245,215,118,.25);border-radius:24px;padding:22px;margin-bottom:16px}.kicker{color:#f5d776;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:900}h1{font-size:42px;margin:10px 0}.sig{background:#fff;color:#111;border-radius:14px;padding:16px;line-height:1.5}textarea{width:100%;min-height:140px;margin-top:12px;border-radius:14px;padding:12px;background:#080d18;color:#f5d776;border:1px solid rgba(245,215,118,.25)}a{color:#f5d776}.nav{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.nav a{border:1px solid rgba(245,215,118,.3);border-radius:999px;padding:9px 12px;text-decoration:none}</style></head><body><main class="wrap"><section class="hero"><div class="kicker">GNK ASG Mail</div><h1>Mail potpisi za pregled i kopiranje</h1><p>Ovo ne šalje mail. Ovo su gotovi HTML potpisi za ručno kopiranje u e-mail klijent ili kasniju MailOps integraciju.</p><div class="nav"><a href="/data/email-signatures.json">JSON</a><a href="/contact?theme=dark">Kontakt</a><a href="/ask">Online AI pitanja</a><a href="/homepage-profile-preview">Preview</a></div></section>'+cards+'</main><!-- GNK_ASG_EMAIL_SIGNATURES_V2_ASCII_SAFE --></body></html>';

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-gnk-asg-email-signatures": "v2-ascii-safe"
    }
  });
}

export function gnkAsgAskPageResponse(){
  const html = '<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GNK ASG AI pitanja</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>body{margin:0;background:radial-gradient(circle at 20% 0,#182a49,#05070d 48%,#020308);color:#f8f7f1;font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:1100px;margin:0 auto;padding:28px}.hero,.chat{background:linear-gradient(145deg,#101a2d,#07101d);border:1px solid rgba(245,215,118,.25);border-radius:24px;padding:22px;margin-bottom:16px}.kicker{color:#f5d776;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:900}h1{font-size:42px;margin:10px 0}.nav{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.nav a{border:1px solid rgba(245,215,118,.3);border-radius:999px;padding:9px 12px;color:#f5d776;text-decoration:none}.row{display:flex;gap:10px}input{flex:1;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:#080d18;color:#fff;padding:14px}button{border:0;border-radius:16px;background:#f5d776;color:#07101d;font-weight:900;padding:0 18px;cursor:pointer}.answer{margin-top:16px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.045);padding:16px;line-height:1.55}.muted{color:#aeb8cc}</style></head><body><main class="wrap"><section class="hero"><div class="kicker">GNK ASG Public AI</div><h1>Online pitanja o portalu</h1><p class="muted">Besplatni javni AI pomoćnik odgovara iz javnih podataka portala. Nema admin ovlasti i ne daje pravni, financijski ni porezni savjet.</p><div class="nav"><a href="/homepage-profile-preview">Prva stranica</a><a href="/business-news">Vijesti</a><a href="/articles">Objave</a><a href="/markets">Markets</a><a href="/media-kit-downloads">Dokumenti</a><a href="/email-signatures">Mail potpisi</a><a href="/contact?theme=dark">Kontakt</a></div></section><section class="chat"><div class="row"><input id="q" placeholder="Postavi pitanje: grupa, financije, lokacije, vijesti, objave, dokumenti, kontakt..."><button id="ask">Pitaj</button></div><div id="a" class="answer">Primjeri: Što je GNK ASG? Gdje su lokacije? Gdje su vijesti? Kako poslati upit?</div></section></main><script>function reply(q){q=(q||"").toLowerCase();if(q.includes("financ"))return "Financijski prikaz je odvojen: GNK ASG d.o.o. samostalni pokazatelji i GNK DINAMO Ltd. Group overview. Otvori /group-financials ili /data/homepage-profile.json.";if(q.includes("lokac")||q.includes("grad")||q.includes("karta"))return "Lokacije i plan 2026. prikazani su na /homepage-profile-preview. Data model je /data/homepage-profile.json.";if(q.includes("vijest")||q.includes("news"))return "Vijesti su na /business-news, a JSON je /data/news.json. Logika izvora i frekvencije je na /operations-logic.";if(q.includes("objav")||q.includes("article"))return "Naše objave su na /articles, a JSON je /data/articles.json. Razlikuju se od vanjskih poslovnih vijesti.";if(q.includes("kontakt")||q.includes("upit"))return "Kontakt forma je /contact?theme=dark. Nakon slanja dobiva se broj predmeta contact-...";if(q.includes("mail")||q.includes("potpis"))return "Mail potpisi su na /email-signatures. Outbound mail slanje nije isto što i prikaz potpisa.";if(q.includes("admin")||q.includes("token"))return "Admin token radi preko operator.gnk-asg.hr i Bearer/X-Operator-Token headera, ne kao običan javni login.";return "Mogu odgovoriti o GNK ASG profilu, GNK DINAMO Ltd. Group, financijama, lokacijama, vijestima, objavama, dokumentima, kontaktu i statusu portala. Koristi javne linkove: /homepage-profile-preview, /operations-logic, /business-news, /articles, /markets, /media-kit-downloads."}document.getElementById("ask").onclick=function(){document.getElementById("a").textContent=reply(document.getElementById("q").value)};document.getElementById("q").addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("ask").click()});</script><!-- GNK_ASG_PUBLIC_ASK_V1 --></body></html>';

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-gnk-asg-public-ai": "ask-v1"
    }
  });
}

export function gnkAsgMarketsPageResponse(){
  const html = '<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GNK ASG Markets</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>body{margin:0;background:#05070d;color:#f8f7f1;font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:1100px;margin:0 auto;padding:28px}.hero,.card{background:linear-gradient(145deg,#101a2d,#07101d);border:1px solid rgba(245,215,118,.25);border-radius:24px;padding:22px;margin-bottom:16px}.kicker{color:#f5d776;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:900}a{color:#f5d776}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.pre{white-space:pre-wrap;background:#080d18;border-radius:14px;padding:14px;color:#c8d0df}@media(max-width:800px){.grid{grid-template-columns:1fr}}</style></head><body><main class="wrap"><section class="hero"><div class="kicker">GNK ASG Market Hub</div><h1>Market i digital assets status</h1><p>Podaci su informativni, mogu kasniti i nisu financijski savjet. Status mora biti LIVE, DELAYED, SNAPSHOT ili FALLBACK.</p><p><a href="/data/market.json">Market JSON</a> | <a href="/data/digital-assets.json">Digital Assets JSON</a> | <a href="/operations-logic">Operations Logic</a></p></section><section class="grid"><article class="card"><h2>Market JSON</h2><div id="m" class="pre">Učitavanje...</div></article><article class="card"><h2>Digital Assets JSON</h2><div id="d" class="pre">Učitavanje...</div></article></section></main><script>fetch("/data/market.json").then(r=>r.json()).then(j=>m.textContent=JSON.stringify(j,null,2)).catch(e=>m.textContent="FALLBACK: market endpoint nije dostupan");fetch("/data/digital-assets.json").then(r=>r.json()).then(j=>d.textContent=JSON.stringify(j,null,2)).catch(e=>d.textContent="FALLBACK: digital assets endpoint nije dostupan");</script><!-- GNK_ASG_MARKETS_PAGE_V1 --></body></html>';

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-gnk-asg-markets": "page-v1"
    }
  });
}

export function gnkAsgOperatorSimpleStatusResponse(kind){
  return json({
    ok: true,
    kind,
    at: new Date().toISOString(),
    status: kind === "mail" ? "QUEUE_READY_OUTBOUND_NOT_CONFIRMED" : "SCAFFOLD_READY",
    note: kind === "mail" ? "Mail potpisi su dostupni na /email-signatures. Outbound slanje nije potvrđeno ovim endpointom." : "Javni hub i JSON endpoint postoje ili su predviđeni. Stvarni vanjski izvori/API trebaju finalno spajanje.",
    publicLinks: {
      ask: "/ask",
      ai: "/ai",
      emailSignatures: "/email-signatures",
      businessNews: "/business-news",
      newsJson: "/data/news.json",
      articles: "/articles",
      articlesJson: "/data/articles.json",
      markets: "/markets",
      marketJson: "/data/market.json",
      digitalAssetsJson: "/data/digital-assets.json",
      operations: "/operations-logic"
    }
  });
}
