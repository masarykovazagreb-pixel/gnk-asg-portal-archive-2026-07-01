const NEWS_FEEDS = [
  { source: "BBC Business", category: "Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { source: "BBC Technology", category: "Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { source: "The Guardian Business", category: "Business", url: "https://www.theguardian.com/uk/business/rss" },
  { source: "The Guardian Technology", category: "Technology", url: "https://www.theguardian.com/uk/technology/rss" }
];

const CRYPTO = [
  { slug: "btc", id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { slug: "eth", id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { slug: "sol", id: "solana", symbol: "SOL", name: "Solana" },
  { slug: "xrp", id: "ripple", symbol: "XRP", name: "XRP" }
];

function nowIso(){
  return new Date().toISOString();
}

function j(data, module, status = 200){
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-gnk-asg-refresh-backend": module
    }
  });
}

function txt(data, status = 200){
  return new Response(data, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, max-age=0"
    }
  });
}

function kv(env){
  if(env.GNK_ASG_KV) return env.GNK_ASG_KV;
  if(env.GNK_ASG_CONFIG_KV) return env.GNK_ASG_CONFIG_KV;
  if(env.PORTAL_KV) return env.PORTAL_KV;
  if(env.CONTENT_KV) return env.CONTENT_KV;
  return null;
}

async function kvGet(env, key){
  const store = kv(env);
  if(!store) return null;
  try{
    const value = await store.get(key);
    if(!value) return null;
    return JSON.parse(value);
  }catch(e){
    return null;
  }
}

async function kvPut(env, key, value){
  const store = kv(env);
  if(!store) return false;
  try{
    await store.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 30 });
    return true;
  }catch(e){
    return false;
  }
}

function ageMinutes(obj){
  if(!obj || !obj.updatedAt) return 999999;
  const t = Date.parse(obj.updatedAt);
  if(!Number.isFinite(t)) return 999999;
  return Math.round((Date.now() - t) / 60000);
}

function decodeXml(s){
  return String(s || "")
    .replace(/<!\[CDATA\[/g,"")
    .replace(/\]\]>/g,"")
    .replace(/&amp;/g,"&")
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/&apos;/g,"'")
    .replace(/&lt;/g,"<")
    .replace(/&gt;/g,">")
    .replace(/<[^>]+>/g,"")
    .replace(/\s+/g," ")
    .trim();
}

function pick(xml, tag){
  const re = new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i");
  const m = xml.match(re);
  return m ? decodeXml(m[1]) : "";
}

function itemsFromRss(xml, feed){
  const raw = String(xml || "");
  const blocks = raw.match(/<item[\s\S]*?<\/item>/gi) || raw.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 8).map((b, i) => {
    const title = pick(b,"title");
    const link = pick(b,"link") || ((b.match(/<link[^>]+href=["']([^"']+)["']/i)||[])[1] || "");
    const description = pick(b,"description") || pick(b,"summary") || pick(b,"content");
    const date = pick(b,"pubDate") || pick(b,"updated") || pick(b,"published") || "";
    return {
      id: (feed.source + "-" + i + "-" + title).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80),
      title,
      summary: description.slice(0, 280),
      url: link,
      source: feed.source,
      category: feed.category,
      publishedAt: date,
      emoji: feed.category === "Technology" ? "💻" : "🏛"
    };
  }).filter(x => x.title && x.url);
}

async function refreshNews(env){
  const all = [];
  const errors = [];

  for(const feed of NEWS_FEEDS){
    try{
      const r = await fetch(feed.url, {
        headers: {
          "user-agent": "GNK-ASG-News-Refresh/1.0",
          "accept": "application/rss+xml, application/xml, text/xml, */*"
        }
      });
      const text = await r.text();
      if(!r.ok) errors.push({ source: feed.source, status: r.status });
      const items = itemsFromRss(text, feed);
      for(const item of items) all.push(item);
    }catch(e){
      errors.push({ source: feed.source, error: String(e && e.message || e) });
    }
  }

  const seen = new Set();
  const items = all.filter(x => {
    const k = x.url || x.title;
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 16);

  const fallback = [
    { id:"fallback-group", title:"GNK DINAMO Ltd. Group - financijski profil FY2025", summary:"Grupni financijski profil prikazuje prihod, dobit, aktivu, kapital i omjer kapitala u javnom informativnom sloju.", url:"/group-financials", source:"GNK ASG", category:"Group", publishedAt:nowIso(), emoji:"🏛" },
    { id:"fallback-network", title:"Aktivna mreža 33 + 12 lokacija", summary:"Karta mreže omogućuje pregled 33 postojeće pozicije i 12 pozicija u osnivanju, s klikabilnim stranicama gradova.", url:"/network-map", source:"GNK ASG", category:"Network", publishedAt:nowIso(), emoji:"🗺" },
    { id:"fallback-market", title:"Digital Exchange Monitor", summary:"Market modul prikazuje BTC, ETH, SOL, XRP, FX i Gold kroz kartice i stranice kretanja cijena.", url:"/markets", source:"GNK ASG", category:"Market", publishedAt:nowIso(), emoji:"₿" }
  ];

  const data = {
    ok: true,
    type: "news",
    status: items.length ? "LIVE" : "FALLBACK",
    updatedAt: nowIso(),
    ttlMinutes: 30,
    count: items.length || fallback.length,
    sources: NEWS_FEEDS.map(x => x.source),
    errors,
    items: items.length ? items : fallback
  };

  const stored = await kvPut(env, "data:news.json", data);
  await updateStatus(env, { news: { status: data.status, updatedAt: data.updatedAt, count: data.count, stored } });

  return { ...data, stored };
}

async function fetchJson(url){
  const r = await fetch(url, { headers: { "accept": "application/json", "user-agent": "GNK-ASG-Market-Refresh/1.0" } });
  const t = await r.text();
  if(!r.ok) throw new Error("HTTP " + r.status + " " + t.slice(0,120));
  return JSON.parse(t);
}

async function refreshMarket(env){
  const ids = CRYPTO.map(x => x.id).join(",");
  const errors = [];
  let crypto = [];
  let fx = null;
  let btcChart = null;

  try{
    const prices = await fetchJson("https://api.coingecko.com/api/v3/simple/price?ids=" + ids + "&vs_currencies=eur,usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true");
    crypto = CRYPTO.map(c => {
      const p = prices[c.id] || {};
      return {
        slug: c.slug,
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        priceEur: p.eur ?? null,
        priceUsd: p.usd ?? null,
        change24hEur: p.eur_24h_change ?? null,
        marketCapEur: p.eur_market_cap ?? null,
        volume24hEur: p.eur_24h_vol ?? null,
        status: p.eur ? "LIVE" : "FALLBACK",
        url: "/coin/" + c.slug
      };
    });
  }catch(e){
    errors.push({ module:"crypto-prices", error:String(e && e.message || e) });
    crypto = CRYPTO.map(c => ({
      slug:c.slug,
      id:c.id,
      symbol:c.symbol,
      name:c.name,
      priceEur:null,
      priceUsd:null,
      change24hEur:null,
      marketCapEur:null,
      volume24hEur:null,
      status:"FALLBACK",
      url:"/coin/" + c.slug
    }));
  }

  try{
    const chart = await fetchJson("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=7&interval=daily");
    btcChart = {
      ok: true,
      status: "LIVE",
      updatedAt: nowIso(),
      currency: "EUR",
      days: 7,
      prices: (chart.prices || []).map(p => ({ time: new Date(p[0]).toISOString(), value: p[1] }))
    };
  }catch(e){
    errors.push({ module:"btc-chart", error:String(e && e.message || e) });
    btcChart = {
      ok: true,
      status: "FALLBACK",
      updatedAt: nowIso(),
      currency: "EUR",
      days: 7,
      prices: [100,101,103,102,105,107,106,109].map((v,i)=>({ time:new Date(Date.now() - (7-i)*86400000).toISOString(), value:v }))
    };
  }

  try{
    const f = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=EUR");
    fx = {
      pair: "USD/EUR",
      value: f.rates && f.rates.EUR ? f.rates.EUR : null,
      date: f.date || null,
      status: f.rates && f.rates.EUR ? "LIVE" : "FALLBACK"
    };
  }catch(e){
    errors.push({ module:"fx", error:String(e && e.message || e) });
    fx = { pair:"USD/EUR", value:null, date:null, status:"FALLBACK" };
  }

  const market = {
    ok: true,
    type: "market",
    status: crypto.some(x => x.status === "LIVE") ? "LIVE" : "FALLBACK",
    updatedAt: nowIso(),
    ttlMinutes: 15,
    disclaimer: "Podaci su informativni, mogu kasniti i nisu financijski savjet.",
    crypto,
    fx,
    commodities: [
      { symbol:"GOLD", name:"Zlato", status:"SNAPSHOT", url:"/coin/gold" },
      { symbol:"BRENT", name:"Brent nafta", status:"SNAPSHOT", url:"/markets#brent" }
    ],
    errors
  };

  const fastStatus = {
    ok: true,
    status: market.status,
    updatedAt: market.updatedAt,
    modules: {
      crypto: crypto.some(x => x.status === "LIVE") ? "LIVE" : "FALLBACK",
      btcChart: btcChart.status,
      fx: fx.status,
      commodities: "SNAPSHOT"
    }
  };

  const storedMarket = await kvPut(env, "data:market.json", market);
  const storedDigital = await kvPut(env, "data:digital-assets.json", market);
  const storedChart = await kvPut(env, "data:btc_chart.json", btcChart);
  const storedFast = await kvPut(env, "data:fast_market_status.json", fastStatus);

  await updateStatus(env, {
    market: { status: market.status, updatedAt: market.updatedAt, stored: storedMarket, cryptoCount: crypto.length },
    btcChart: { status: btcChart.status, updatedAt: btcChart.updatedAt, stored: storedChart },
    fastMarketStatus: { status: fastStatus.status, updatedAt: fastStatus.updatedAt, stored: storedFast }
  });

  return { market, btcChart, fastStatus, stored: { market: storedMarket, digital: storedDigital, btcChart: storedChart, fastStatus: storedFast } };
}

async function getNews(env){
  const cached = await kvGet(env, "data:news.json");
  if(cached && ageMinutes(cached) <= 30) return { ...cached, cache:"HIT", ageMinutes:ageMinutes(cached) };
  const fresh = await refreshNews(env);
  return { ...fresh, cache:"REFRESHED" };
}

async function getMarket(env){
  const cached = await kvGet(env, "data:market.json");
  if(cached && ageMinutes(cached) <= 15) return { ...cached, cache:"HIT", ageMinutes:ageMinutes(cached) };
  const fresh = await refreshMarket(env);
  return { ...fresh.market, cache:"REFRESHED", stored:fresh.stored };
}

async function getBtcChart(env){
  const cached = await kvGet(env, "data:btc_chart.json");
  if(cached && ageMinutes(cached) <= 15) return { ...cached, cache:"HIT", ageMinutes:ageMinutes(cached) };
  const fresh = await refreshMarket(env);
  return { ...fresh.btcChart, cache:"REFRESHED", stored:fresh.stored.btcChart };
}

async function getFastMarketStatus(env){
  const cached = await kvGet(env, "data:fast_market_status.json");
  if(cached && ageMinutes(cached) <= 15) return { ...cached, cache:"HIT", ageMinutes:ageMinutes(cached) };
  const fresh = await refreshMarket(env);
  return { ...fresh.fastStatus, cache:"REFRESHED", stored:fresh.stored.fastStatus };
}

async function updateStatus(env, patch){
  const current = await kvGet(env, "data:update_status.json") || {
    ok: true,
    updatedAt: nowIso(),
    modules: {}
  };

  current.ok = true;
  current.updatedAt = nowIso();
  current.modules = { ...(current.modules || {}), ...(patch || {}) };

  await kvPut(env, "data:update_status.json", current);
  return current;
}

async function getUpdateStatus(env){
  const current = await kvGet(env, "data:update_status.json");
  if(current) return current;

  return {
    ok: true,
    updatedAt: nowIso(),
    modules: {
      news: { status:"PENDING", message:"Još nije pokrenut refresh-news." },
      market: { status:"PENDING", message:"Još nije pokrenut refresh-market." },
      btcChart: { status:"PENDING", message:"Još nije pokrenut refresh-market." },
      fastMarketStatus: { status:"PENDING", message:"Još nije pokrenut refresh-market." }
    }
  };
}

function operatorOk(request, env){
  const token = request.headers.get("x-operator-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i,"") || "";
  const expected = env.OPERATOR_TOKEN || env.ADMIN_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || env.GNK_ASG_ADMIN_TOKEN || "";
  if(expected) return token === expected;
  return token.length >= 30;
}

async function handleRefreshRoute(request, env, ctx){
  const url = new URL(request.url);
  const p = url.pathname.replace(/\/+$/,"") || "/";

  if(p === "/data/news.json" || p === "/data/business-news.json"){
    return j(await getNews(env), "news");
  }

  if(p === "/data/market.json" || p === "/data/digital-assets.json"){
    return j(await getMarket(env), "market");
  }

  if(p === "/data/btc_chart.json" || p === "/data/btc-chart.json"){
    return j(await getBtcChart(env), "btc-chart");
  }

  if(p === "/data/fast_market_status.json"){
    return j(await getFastMarketStatus(env), "fast-market-status");
  }

  if(p === "/data/update_status.json" || p === "/backend-status" || p === "/operator/backend-status"){
    return j(await getUpdateStatus(env), "update-status");
  }

  if(p === "/operator/refresh-news"){
    if(!operatorOk(request, env)) return j({ ok:false, error:"unauthorized" }, "operator", 401);
    return j(await refreshNews(env), "operator-refresh-news");
  }

  if(p === "/operator/refresh-market"){
    if(!operatorOk(request, env)) return j({ ok:false, error:"unauthorized" }, "operator", 401);
    return j(await refreshMarket(env), "operator-refresh-market");
  }

  if(p === "/operator/refresh-all"){
    if(!operatorOk(request, env)) return j({ ok:false, error:"unauthorized" }, "operator", 401);
    const news = await refreshNews(env);
    const market = await refreshMarket(env);
    const status = await getUpdateStatus(env);
    return j({ ok:true, updatedAt:nowIso(), news, market, status }, "operator-refresh-all");
  }

  if(p === "/operator/refresh-status"){
    if(!operatorOk(request, env)) return j({ ok:false, error:"unauthorized" }, "operator", 401);
    return j(await getUpdateStatus(env), "operator-refresh-status");
  }

  if(p === "/operator/refresh-help"){
    return j({
      ok: true,
      routes: [
        "/data/news.json",
        "/data/market.json",
        "/data/digital-assets.json",
        "/data/btc_chart.json",
        "/data/fast_market_status.json",
        "/data/update_status.json",
        "/operator/refresh-news",
        "/operator/refresh-market",
        "/operator/refresh-all",
        "/operator/refresh-status"
      ],
      note: "Operator rute traže x-operator-token."
    }, "operator-refresh-help");
  }

  return null;
}

async function runScheduledRefresh(env, ctx){
  const result = {
    ok: true,
    updatedAt: nowIso(),
    news: null,
    market: null
  };

  try{
    result.market = await refreshMarket(env);
  }catch(e){
    result.market = { ok:false, error:String(e && e.message || e) };
  }

  try{
    result.news = await refreshNews(env);
  }catch(e){
    result.news = { ok:false, error:String(e && e.message || e) };
  }

  await updateStatus(env, { scheduled: { status:"OK", updatedAt:nowIso() } });
  return result;
}

export { handleRefreshRoute, runScheduledRefresh };
