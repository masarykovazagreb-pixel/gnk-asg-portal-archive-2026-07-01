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

const TIMEZONE = "Europe/Zagreb";
const NEWS_HOURS = new Set([9, 16]);
const NEWS_MAX_SNAPSHOT_AGE_MINUTES = 1110;
const MARKET_TTL_MINUTES = 15;
const VALID_STATUS = new Set(["LIVE", "DELAYED", "SNAPSHOT", "FALLBACK", "PENDING"]);

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
    await store.put(key, JSON.stringify(value, null, 2), { expirationTtl: 60 * 60 * 24 * 30 });
    return true;
  }catch(e){
    return false;
  }
}

function finite(value){
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function ageMinutes(obj){
  if(!obj || !obj.updatedAt) return 999999;
  const time = Date.parse(obj.updatedAt);
  if(!Number.isFinite(time)) return 999999;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
}

function safeStatus(value, fallback = "SNAPSHOT"){
  const status = String(value || fallback).toUpperCase();
  return VALID_STATUS.has(status) ? status : fallback;
}

function isoDate(value){
  const time = Date.parse(String(value || ""));
  return Number.isFinite(time) ? new Date(time).toISOString() : nowIso();
}

function zagrebClock(date = new Date()){
  try{
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date).reduce((result, item) => {
      if(item.type !== "literal") result[item.type] = item.value;
      return result;
    }, {});
    const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
    return {
      date: dateKey,
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second),
      label: `${dateKey}T${parts.hour}:${parts.minute}:${parts.second}`,
      timezone: TIMEZONE
    };
  }catch(e){
    const value = date.toISOString();
    return {
      date: value.slice(0, 10),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      label: value,
      timezone: "UTC"
    };
  }
}

function decodeXml(value){
  return String(value || "")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(xml, tag){
  const expression = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = String(xml || "").match(expression);
  return match ? decodeXml(match[1]) : "";
}

function itemsFromRss(xml, feed){
  const raw = String(xml || "");
  const blocks = raw.match(/<item[\s\S]*?<\/item>/gi) || raw.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 10).map((block, index) => {
    const title = pick(block, "title");
    const link = pick(block, "link") || ((block.match(/<link[^>]+href=["']([^"']+)["']/i) || [])[1] || "");
    const description = pick(block, "description") || pick(block, "summary") || pick(block, "content");
    const published = pick(block, "pubDate") || pick(block, "updated") || pick(block, "published") || "";
    const publishedAt = isoDate(published);
    return {
      id: `${feed.source}-${index}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90),
      title,
      summary: description.slice(0, 360),
      url: link,
      source: feed.source,
      category: feed.category,
      publishedAt,
      published_at: publishedAt
    };
  }).filter(item => item.title && item.url);
}

function normalizeManualNews(item){
  const url = String(item && (item.sourceUrl || item.url) || "").trim();
  if(!item || !item.title || !url) return null;
  const publishedAt = isoDate(item.publishedAt || item.createdAt || item.updatedAt);
  return {
    id: String(item.id || `manual-${publishedAt}-${item.title}`).slice(0, 120),
    title: String(item.title).trim(),
    summary: String(item.summary || item.excerpt || item.body || "").replace(/\s+/g, " ").trim().slice(0, 360),
    url,
    source: String(item.source || "GNK ASG").trim(),
    category: String(item.category || "GNK ASG").trim(),
    publishedAt,
    published_at: publishedAt
  };
}

async function refreshNews(env){
  const previous = await kvGet(env, "data:news.json");
  const collected = [];
  const errors = [];

  const manualRaw = await kvGet(env, "data:news:items");
  if(Array.isArray(manualRaw)){
    for(const row of manualRaw){
      const normalized = normalizeManualNews(row);
      if(normalized) collected.push(normalized);
    }
  }

  for(const feed of NEWS_FEEDS){
    try{
      const response = await fetch(feed.url, {
        headers: {
          "user-agent": "GNK-ASG-News-Refresh/2.0",
          "accept": "application/rss+xml, application/xml, text/xml, */*"
        }
      });
      const text = await response.text();
      if(!response.ok) errors.push({ source: feed.source, status: response.status });
      collected.push(...itemsFromRss(text, feed));
    }catch(e){
      errors.push({ source: feed.source, error: String(e && e.message || e) });
    }
  }

  const seen = new Set();
  let items = collected.filter(item => {
    const key = item.url || item.title;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 60);

  let status = items.length ? "SNAPSHOT" : "FALLBACK";
  let lastSuccessfulAt = items.length ? nowIso() : (previous && (previous.lastSuccessfulAt || previous.updatedAt)) || null;

  if(!items.length && previous && Array.isArray(previous.items) && previous.items.length){
    items = previous.items;
    status = "DELAYED";
  }

  if(!items.length){
    const fallbackTime = nowIso();
    items = [
      { id:"fallback-financials", title:"GNK ASG financijski profil", summary:"Javni financijski profil društva i poveznice prema objavljenim korporativnim informacijama.", url:"/financije/", source:"GNK ASG", category:"Corporate", publishedAt:fallbackTime, published_at:fallbackTime },
      { id:"fallback-network", title:"Mreža društava i projekata", summary:"Javni pregled poslovnog okvira, povezanih društava i digitalnih operativnih modula.", url:"/mreza/", source:"GNK ASG", category:"Network", publishedAt:fallbackTime, published_at:fallbackTime },
      { id:"fallback-markets", title:"Tržišta i referentna imovina", summary:"Bitcoin, USD/EUR i dostupni tržišni snapshotovi uz transparentne statuse podataka.", url:"/trzista/", source:"GNK ASG", category:"Markets", publishedAt:fallbackTime, published_at:fallbackTime }
    ];
  }

  const updatedAt = nowIso();
  const data = {
    ok: true,
    type: "news",
    source: "GNK_ASG_REFRESH_BACKEND_V2",
    status,
    updatedAt,
    lastSuccessfulAt,
    timezone: TIMEZONE,
    schedule: ["09:00", "16:00"],
    ttlMinutes: NEWS_MAX_SNAPSHOT_AGE_MINUTES,
    count: items.length,
    sources: NEWS_FEEDS.map(feed => feed.source),
    errors,
    items
  };

  const stored = await kvPut(env, "data:news.json", data);
  await updateStatus(env, {
    news: {
      status: data.status,
      updatedAt: data.updatedAt,
      lastSuccessfulAt: data.lastSuccessfulAt,
      count: data.count,
      schedule: data.schedule,
      timezone: data.timezone,
      stored
    }
  });
  return { ...data, stored };
}

async function fetchJson(url){
  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": "GNK-ASG-Market-Refresh/2.0"
    }
  });
  const text = await response.text();
  if(!response.ok) throw new Error(`HTTP ${response.status} ${text.slice(0, 160)}`);
  return JSON.parse(text);
}

function previousCrypto(previous, id){
  return previous && Array.isArray(previous.crypto) ? previous.crypto.find(item => item && item.id === id) || null : null;
}

async function refreshMarket(env){
  const previous = await kvGet(env, "data:market.json");
  const ids = CRYPTO.map(item => item.id).join(",");
  const errors = [];
  let crypto = [];
  let fx = null;
  let btcChart = null;

  try{
    const prices = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur,usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`);
    crypto = CRYPTO.map(item => {
      const price = prices[item.id] || {};
      const prior = previousCrypto(previous, item.id);
      const priceEur = finite(price.eur) ?? finite(prior && prior.priceEur);
      const priceUsd = finite(price.usd) ?? finite(prior && prior.priceUsd);
      const live = finite(price.eur) !== null || finite(price.usd) !== null;
      return {
        slug: item.slug,
        id: item.id,
        symbol: item.symbol,
        name: item.name,
        priceEur,
        priceUsd,
        change24hEur: finite(price.eur_24h_change) ?? finite(prior && prior.change24hEur),
        marketCapEur: finite(price.eur_market_cap) ?? finite(prior && prior.marketCapEur),
        volume24hEur: finite(price.eur_24h_vol) ?? finite(prior && prior.volume24hEur),
        status: live ? "LIVE" : (priceEur !== null || priceUsd !== null ? "DELAYED" : "FALLBACK"),
        source: "CoinGecko",
        url: `/coin/${item.slug}`
      };
    });
  }catch(e){
    errors.push({ module:"crypto-prices", error:String(e && e.message || e) });
    crypto = CRYPTO.map(item => {
      const prior = previousCrypto(previous, item.id);
      const priceEur = finite(prior && prior.priceEur);
      const priceUsd = finite(prior && prior.priceUsd);
      return {
        slug:item.slug,
        id:item.id,
        symbol:item.symbol,
        name:item.name,
        priceEur,
        priceUsd,
        change24hEur:finite(prior && prior.change24hEur),
        marketCapEur:finite(prior && prior.marketCapEur),
        volume24hEur:finite(prior && prior.volume24hEur),
        status:priceEur !== null || priceUsd !== null ? "DELAYED" : "FALLBACK",
        source:"stored snapshot",
        url:`/coin/${item.slug}`
      };
    });
  }

  try{
    const chart = await fetchJson("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=7&interval=daily");
    btcChart = {
      ok: true,
      status: "LIVE",
      updatedAt: nowIso(),
      currency: "EUR",
      days: 7,
      source: "CoinGecko",
      prices: (chart.prices || []).map(point => ({ time: new Date(point[0]).toISOString(), value: finite(point[1]) })).filter(point => point.value !== null)
    };
  }catch(e){
    errors.push({ module:"btc-chart", error:String(e && e.message || e) });
    const priorPrices = previous && Array.isArray(previous.history)
      ? previous.history.map(item => ({ time:item.time, value:finite(item.btc_eur) })).filter(item => item.value !== null)
      : [];
    btcChart = {
      ok: true,
      status: priorPrices.length ? "DELAYED" : "FALLBACK",
      updatedAt: nowIso(),
      currency: "EUR",
      days: 7,
      source: priorPrices.length ? "stored snapshot" : "unavailable",
      prices: priorPrices
    };
  }

  try{
    const data = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=EUR");
    const value = finite(data && data.rates && data.rates.EUR);
    fx = {
      pair: "USD/EUR",
      value,
      date: data.date || null,
      status: value !== null ? "LIVE" : "FALLBACK",
      source: "Frankfurter"
    };
  }catch(e){
    errors.push({ module:"fx", error:String(e && e.message || e) });
    const priorValue = finite(previous && previous.assets && previous.assets.usd_eur && previous.assets.usd_eur.rate);
    fx = {
      pair:"USD/EUR",
      value:priorValue,
      date:previous && previous.fx && previous.fx.date || null,
      status:priorValue !== null ? "DELAYED" : "FALLBACK",
      source:priorValue !== null ? "stored snapshot" : "unavailable"
    };
  }

  const bitcoin = crypto.find(item => item.id === "bitcoin") || {};
  const previousAssets = previous && previous.assets || {};
  const goldEur = finite(previousAssets.gold && previousAssets.gold.price_eur) ?? finite(previousAssets.asg_gold_reference && previousAssets.asg_gold_reference.value_eur);
  const goldUsd = finite(previousAssets.gold && previousAssets.gold.price_usd);
  const brentUsd = finite(previousAssets.brent && previousAssets.brent.price_usd);
  const goldStatus = goldEur !== null || goldUsd !== null ? "SNAPSHOT" : "FALLBACK";
  const brentStatus = brentUsd !== null ? "SNAPSHOT" : "FALLBACK";
  const bitcoinStatus = safeStatus(bitcoin.status, "FALLBACK");
  const fxStatus = safeStatus(fx.status, "FALLBACK");

  let status = "FALLBACK";
  if(bitcoinStatus === "LIVE" && fxStatus === "LIVE") status = "SNAPSHOT";
  else if(finite(bitcoin.priceEur) !== null || finite(fx.value) !== null) status = "DELAYED";

  const assets = {
    bitcoin: {
      price_eur: finite(bitcoin.priceEur),
      price_usd: finite(bitcoin.priceUsd),
      change_24h_eur: finite(bitcoin.change24hEur),
      status: bitcoinStatus,
      source: bitcoin.source || "CoinGecko"
    },
    gold: {
      price_eur: goldEur,
      price_usd: goldUsd,
      status: goldStatus,
      source: goldStatus === "SNAPSHOT" ? "stored snapshot" : "not configured"
    },
    asg_gold_reference: {
      value_eur: goldEur,
      status: goldStatus,
      source: goldStatus === "SNAPSHOT" ? "stored snapshot" : "not configured"
    },
    brent: {
      price_usd: brentUsd,
      status: brentStatus,
      source: brentStatus === "SNAPSHOT" ? "stored snapshot" : "not configured"
    },
    usd_eur: {
      rate: finite(fx.value),
      status: fxStatus,
      source: fx.source
    }
  };

  const history = (btcChart.prices || []).map(point => ({
    time: point.time,
    btc_eur: point.value,
    asg_gold_eur: goldEur,
    brent_usd: brentUsd
  })).slice(-96);

  const updatedAt = nowIso();
  const successful = bitcoinStatus === "LIVE" || fxStatus === "LIVE";
  const market = {
    ok: true,
    type: "market",
    source: "GNK_ASG_REFRESH_BACKEND_V2",
    status,
    updatedAt,
    lastSuccessfulAt: successful ? updatedAt : (previous && (previous.lastSuccessfulAt || previous.updatedAt)) || null,
    ttlMinutes: MARKET_TTL_MINUTES,
    timezone: TIMEZONE,
    disclaimer: "Podaci su informativni, mogu kasniti i nisu financijski savjet.",
    cards: [
      { label:"Bitcoin", value:assets.bitcoin.price_eur, suffix:" EUR", note:`${assets.bitcoin.status} · ${assets.bitcoin.source}` },
      { label:"Zlato", value:assets.gold.price_eur ?? assets.gold.price_usd, suffix:assets.gold.price_eur !== null ? " EUR" : " USD", note:`${assets.gold.status} · ${assets.gold.source}` },
      { label:"Brent nafta", value:assets.brent.price_usd, suffix:" USD", note:`${assets.brent.status} · ${assets.brent.source}` },
      { label:"USD/EUR", value:assets.usd_eur.rate, suffix:"", note:`${assets.usd_eur.status} · ${assets.usd_eur.source}` }
    ],
    assets,
    crypto,
    fx,
    commodities: [
      { symbol:"GOLD", name:"Zlato", priceEur:goldEur, priceUsd:goldUsd, status:goldStatus },
      { symbol:"BRENT", name:"Brent nafta", priceUsd:brentUsd, status:brentStatus }
    ],
    history,
    errors
  };

  const fastStatus = {
    ok: true,
    status: market.status,
    updatedAt: market.updatedAt,
    lastSuccessfulAt: market.lastSuccessfulAt,
    modules: {
      bitcoin: assets.bitcoin.status,
      btcChart: btcChart.status,
      fx: assets.usd_eur.status,
      gold: assets.gold.status,
      brent: assets.brent.status
    }
  };

  const storedMarket = await kvPut(env, "data:market.json", market);
  const storedDigital = await kvPut(env, "data:digital-assets.json", market);
  const storedChart = await kvPut(env, "data:btc_chart.json", btcChart);
  const storedFast = await kvPut(env, "data:fast_market_status.json", fastStatus);

  await updateStatus(env, {
    market: { status:market.status, updatedAt:market.updatedAt, lastSuccessfulAt:market.lastSuccessfulAt, stored:storedMarket, cryptoCount:crypto.length },
    btcChart: { status:btcChart.status, updatedAt:btcChart.updatedAt, stored:storedChart },
    fastMarketStatus: { status:fastStatus.status, updatedAt:fastStatus.updatedAt, stored:storedFast }
  });

  return {
    market,
    btcChart,
    fastStatus,
    stored: { market:storedMarket, digital:storedDigital, btcChart:storedChart, fastStatus:storedFast }
  };
}

async function getNews(env){
  const cached = await kvGet(env, "data:news.json");
  if(cached){
    const age = ageMinutes(cached);
    const status = cached.status === "FALLBACK"
      ? "FALLBACK"
      : age > NEWS_MAX_SNAPSHOT_AGE_MINUTES ? "DELAYED" : "SNAPSHOT";
    return { ...cached, status, cache:"HIT", ageMinutes:age };
  }
  const fresh = await refreshNews(env);
  return { ...fresh, cache:"BOOTSTRAP_REFRESH" };
}

async function getMarket(env){
  const cached = await kvGet(env, "data:market.json");
  if(cached && ageMinutes(cached) <= MARKET_TTL_MINUTES){
    return { ...cached, cache:"HIT", ageMinutes:ageMinutes(cached) };
  }
  const fresh = await refreshMarket(env);
  return { ...fresh.market, cache:"REFRESHED", stored:fresh.stored };
}

async function getBtcChart(env){
  const cached = await kvGet(env, "data:btc_chart.json");
  if(cached && ageMinutes(cached) <= MARKET_TTL_MINUTES){
    return { ...cached, cache:"HIT", ageMinutes:ageMinutes(cached) };
  }
  const fresh = await refreshMarket(env);
  return { ...fresh.btcChart, cache:"REFRESHED", stored:fresh.stored.btcChart };
}

async function getFastMarketStatus(env){
  const cached = await kvGet(env, "data:fast_market_status.json");
  if(cached && ageMinutes(cached) <= MARKET_TTL_MINUTES){
    return { ...cached, cache:"HIT", ageMinutes:ageMinutes(cached) };
  }
  const fresh = await refreshMarket(env);
  return { ...fresh.fastStatus, cache:"REFRESHED", stored:fresh.stored.fastStatus };
}

async function updateStatus(env, patch){
  const current = await kvGet(env, "data:update_status.json") || { ok:true, updatedAt:nowIso(), modules:{} };
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
      news: { status:"PENDING", schedule:["09:00","16:00"], timezone:TIMEZONE },
      market: { status:"PENDING", cadenceMinutes:MARKET_TTL_MINUTES },
      btcChart: { status:"PENDING", cadenceMinutes:MARKET_TTL_MINUTES },
      fastMarketStatus: { status:"PENDING", cadenceMinutes:MARKET_TTL_MINUTES }
    }
  };
}

function operatorOk(request, env){
  const token = request.headers.get("x-operator-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = env.OPERATOR_TOKEN || env.ADMIN_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || env.GNK_ASG_ADMIN_TOKEN || "";
  return Boolean(expected && token && token === expected);
}

async function handleRefreshRoute(request, env, ctx){
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if(path === "/data/news.json" || path === "/data/business-news.json") return j(await getNews(env), "news");
  if(path === "/data/market.json" || path === "/data/digital-assets.json") return j(await getMarket(env), "market");
  if(path === "/data/btc_chart.json" || path === "/data/btc-chart.json") return j(await getBtcChart(env), "btc-chart");
  if(path === "/data/fast_market_status.json") return j(await getFastMarketStatus(env), "fast-market-status");
  if(path === "/data/update_status.json" || path === "/backend-status" || path === "/operator/backend-status") return j(await getUpdateStatus(env), "update-status");

  if(path === "/operator/refresh-news"){
    if(!operatorOk(request, env)) return j({ ok:false, error:"unauthorized" }, "operator", 401);
    return j(await refreshNews(env), "operator-refresh-news");
  }
  if(path === "/operator/refresh-market"){
    if(!operatorOk(request, env)) return j({ ok:false, error:"unauthorized" }, "operator", 401);
    return j(await refreshMarket(env), "operator-refresh-market");
  }
  if(path === "/operator/refresh-all"){
    if(!operatorOk(request, env)) return j({ ok:false, error:"unauthorized" }, "operator", 401);
    const news = await refreshNews(env);
    const market = await refreshMarket(env);
    const status = await getUpdateStatus(env);
    return j({ ok:true, updatedAt:nowIso(), news, market, status }, "operator-refresh-all");
  }
  if(path === "/operator/refresh-status"){
    if(!operatorOk(request, env)) return j({ ok:false, error:"unauthorized" }, "operator", 401);
    return j(await getUpdateStatus(env), "operator-refresh-status");
  }
  if(path === "/operator/refresh-help"){
    return j({
      ok:true,
      timezone:TIMEZONE,
      newsSchedule:["09:00","16:00"],
      marketCadenceMinutes:MARKET_TTL_MINUTES,
      routes:[
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
      note:"Operator rute zahtijevaju konfigurirani operator token."
    }, "operator-refresh-help");
  }
  return null;
}

async function runScheduledRefresh(env, ctx){
  const clock = zagrebClock();
  const result = {
    ok:true,
    updatedAt:nowIso(),
    timezone:clock.timezone,
    localTime:clock.label,
    market:null,
    news:null
  };

  try{
    result.market = await refreshMarket(env);
  }catch(e){
    result.ok = false;
    result.market = { ok:false, status:"FALLBACK", error:String(e && e.message || e) };
  }

  const dueNews = NEWS_HOURS.has(clock.hour) && clock.minute < 15;
  if(dueNews){
    const slot = `${clock.date}T${String(clock.hour).padStart(2, "0")}:00`;
    const previousSlot = await kvGet(env, "schedule:news:last-slot");
    if(previousSlot && previousSlot.slot === slot){
      result.news = { ok:true, skipped:true, reason:"already_completed", slot };
    }else{
      try{
        result.news = await refreshNews(env);
        await kvPut(env, "schedule:news:last-slot", { slot, completedAt:nowIso(), timezone:clock.timezone });
      }catch(e){
        result.ok = false;
        result.news = { ok:false, status:"FALLBACK", error:String(e && e.message || e), slot };
      }
    }
  }else{
    result.news = {
      ok:true,
      skipped:true,
      reason:"outside_news_schedule",
      nextSchedule:["09:00","16:00"],
      timezone:clock.timezone
    };
  }

  await updateStatus(env, {
    scheduled: {
      status:result.ok ? "OK" : "PARTIAL",
      updatedAt:nowIso(),
      localTime:clock.label,
      timezone:clock.timezone,
      marketCadenceMinutes:MARKET_TTL_MINUTES,
      newsSchedule:["09:00","16:00"],
      newsAction:result.news && result.news.skipped ? result.news.reason : "refreshed"
    }
  });

  return result;
}

export { handleRefreshRoute, runScheduledRefresh };
