import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('apps/portal/data/market-pulse.json');

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; GNK-ASG-Market-Pulse/1.0)' };

const INDICES = [
  // Amerika
  { symbol: '^GSPC', label: 'S&P 500', country: 'SAD', region: 'Amerika' },
  { symbol: '^DJI', label: 'Dow Jones 30', country: 'SAD', region: 'Amerika' },
  { symbol: '^IXIC', label: 'Nasdaq Composite', country: 'SAD', region: 'Amerika' },
  { symbol: '^RUT', label: 'Russell 2000', country: 'SAD', region: 'Amerika' },
  { symbol: '^VIX', label: 'VIX (volatilnost)', country: 'SAD', region: 'Amerika' },
  { symbol: '^BVSP', label: 'Bovespa', country: 'Brazil', region: 'Amerika' },
  { symbol: '^MXX', label: 'IPC Meksiko', country: 'Meksiko', region: 'Amerika' },
  { symbol: '^GSPTSE', label: 'TSX Kanada', country: 'Kanada', region: 'Amerika' },
  // Europa
  { symbol: '^FTSE', label: 'FTSE 100', country: 'Ujedinjeno Kraljevstvo', region: 'Europa' },
  { symbol: '^GDAXI', label: 'DAX 40', country: 'Njemačka', region: 'Europa' },
  { symbol: '^FCHI', label: 'CAC 40', country: 'Francuska', region: 'Europa' },
  { symbol: '^STOXX50E', label: 'Euro Stoxx 50', country: 'Eurozona', region: 'Europa' },
  { symbol: '^IBEX', label: 'IBEX 35', country: 'Španjolska', region: 'Europa' },
  { symbol: 'FTSEMIB.MI', label: 'FTSE MIB', country: 'Italija', region: 'Europa' },
  { symbol: '^SSMI', label: 'SMI', country: 'Švicarska', region: 'Europa' },
  { symbol: '^AEX', label: 'AEX 25', country: 'Nizozemska', region: 'Europa' },
  // Azija i Pacifik
  { symbol: '^N225', label: 'Nikkei 225', country: 'Japan', region: 'Azija i Pacifik' },
  { symbol: '^HSI', label: 'Hang Seng', country: 'Hong Kong', region: 'Azija i Pacifik' },
  { symbol: '000001.SS', label: 'SSE Composite (Šangaj)', country: 'Kina', region: 'Azija i Pacifik' },
  { symbol: '^KS11', label: 'KOSPI', country: 'Južna Koreja', region: 'Azija i Pacifik' },
  { symbol: '^BSESN', label: 'BSE Sensex', country: 'Indija', region: 'Azija i Pacifik' },
  { symbol: '^AXJO', label: 'ASX 200', country: 'Australija', region: 'Azija i Pacifik' },
];

const COMMODITIES = [
  { symbol: 'GC=F', label: 'Zlato (futures)', unit: 'USD', exchange: 'COMEX', category: 'metali' },
  { symbol: 'SI=F', label: 'Srebro (futures)', unit: 'USD', exchange: 'COMEX', category: 'metali' },
  { symbol: 'PA=F', label: 'Paladij', unit: 'USD', exchange: 'NYMEX', category: 'metali' },
  { symbol: 'CL=F', label: 'Nafta WTI', unit: 'USD', exchange: 'NYMEX', category: 'energija' },
  { symbol: 'BZ=F', label: 'Nafta Brent', unit: 'USD', exchange: 'ICE', category: 'energija' },
  { symbol: 'HG=F', label: 'Bakar', unit: 'USD', exchange: 'COMEX', category: 'metali' },
  { symbol: 'PL=F', label: 'Platina', unit: 'USD', exchange: 'NYMEX', category: 'metali' },
  { symbol: 'NG=F', label: 'Prirodni plin', unit: 'USD', exchange: 'NYMEX', category: 'energija' },
  { symbol: 'ZC=F', label: 'Kukuruz', unit: 'USX', exchange: 'CBOT', category: 'hrana' },
  { symbol: 'ZW=F', label: 'Pšenica', unit: 'USX', exchange: 'CBOT', category: 'hrana' },
  { symbol: 'ZO=F', label: 'Zob', unit: 'USX', exchange: 'CBOT', category: 'hrana' },
  { symbol: 'ZR=F', label: 'Riža', unit: 'USD', exchange: 'CBOT', category: 'hrana' },
  { symbol: 'ZS=F', label: 'Soja', unit: 'USX', exchange: 'CBOT', category: 'hrana' },
  { symbol: 'ZM=F', label: 'Sojina sačma', unit: 'USD', exchange: 'CBOT', category: 'hrana' },
  { symbol: 'ZL=F', label: 'Sojino ulje', unit: 'USX', exchange: 'CBOT', category: 'hrana' },
  { symbol: 'KC=F', label: 'Kava', unit: 'USX', exchange: 'ICE', category: 'hrana' },
  { symbol: 'CC=F', label: 'Kakao', unit: 'USD', exchange: 'ICE', category: 'hrana' },
  { symbol: 'CT=F', label: 'Pamuk', unit: 'USX', exchange: 'ICE', category: 'hrana' },
  { symbol: 'SB=F', label: 'Šećer', unit: 'USX', exchange: 'ICE', category: 'hrana' },
  { symbol: 'OJ=F', label: 'Naranča (sok)', unit: 'USX', exchange: 'ICE', category: 'hrana' },
  { symbol: 'LE=F', label: 'Govedina (live cattle)', unit: 'USX', exchange: 'CME', category: 'hrana' },
  { symbol: 'GF=F', label: 'Junad za tov', unit: 'USX', exchange: 'CME', category: 'hrana' },
  { symbol: 'HE=F', label: 'Svinjetina', unit: 'USX', exchange: 'CME', category: 'hrana' },
  { symbol: 'DC=F', label: 'Mlijeko', unit: 'USD', exchange: 'CME', category: 'hrana' },
  { symbol: 'LBR=F', label: 'Građevinsko drvo', unit: 'USD', exchange: 'CME', category: 'materijali' },
];

const CURRENCIES = [
  { symbol: 'EURUSD=X', label: 'Euro / američki dolar', country: 'Globalno' },
  { symbol: 'GBPUSD=X', label: 'Britanska funta / dolar', country: 'Globalno' },
  { symbol: 'USDJPY=X', label: 'Dolar / japanski jen', country: 'Japan' },
  { symbol: 'AUDUSD=X', label: 'Australski dolar / USD', country: 'Australija' },
  { symbol: 'NZDUSD=X', label: 'Novozelandski dolar / USD', country: 'Novi Zeland' },
  { symbol: 'USDCAD=X', label: 'Dolar / kanadski dolar', country: 'Kanada' },
  { symbol: 'USDCHF=X', label: 'Dolar / švicarski franak', country: 'Globalno' },
  { symbol: 'USDCNY=X', label: 'Dolar / kineski juan', country: 'Kina' },
  { symbol: 'USDKRW=X', label: 'Dolar / južnokorejski won', country: 'Južna Koreja' },
  { symbol: 'USDBRL=X', label: 'Dolar / brazilski real', country: 'Brazil' },
  { symbol: 'USDMXN=X', label: 'Dolar / meksički pezo', country: 'Meksiko' },
  { symbol: 'USDHUF=X', label: 'Dolar / mađarska forinta', country: 'Mađarska' },
  { symbol: 'USDNOK=X', label: 'Dolar / norveška kruna', country: 'Norveška' },
  { symbol: 'USDPLN=X', label: 'Dolar / poljska zlota', country: 'Poljska' },
  { symbol: 'USDSEK=X', label: 'Dolar / švedska kruna', country: 'Švedska' },
  { symbol: 'USDTRY=X', label: 'Dolar / turska lira', country: 'Turska' },
  { symbol: 'EURGBP=X', label: 'Euro / britanska funta', country: 'Europa' },
  { symbol: 'EURJPY=X', label: 'Euro / japanski jen', country: 'Globalno' },
  { symbol: 'EURCHF=X', label: 'Euro / švicarski franak', country: 'Europa' },
];

const STOCKS = [
  { symbol: 'BABA', label: 'Alibaba', country: 'Kina' },
  { symbol: 'GOOGL', label: 'Alphabet (Google)', country: 'SAD' },
  { symbol: 'AMZN', label: 'Amazon', country: 'SAD' },
  { symbol: 'AMD', label: 'AMD', country: 'SAD' },
  { symbol: 'AAPL', label: 'Apple', country: 'SAD' },
  { symbol: 'ASML', label: 'ASML', country: 'Nizozemska' },
  { symbol: 'AVGO', label: 'Broadcom', country: 'SAD' },
  { symbol: 'LLY', label: 'Eli Lilly', country: 'SAD' },
  { symbol: 'XOM', label: 'Exxon Mobil', country: 'SAD' },
  { symbol: 'HD', label: 'Home Depot', country: 'SAD' },
  { symbol: 'JPM', label: 'JPMorgan Chase', country: 'SAD' },
  { symbol: 'MC.PA', label: 'LVMH', country: 'Francuska' },
  { symbol: 'MA', label: 'Mastercard', country: 'SAD' },
  { symbol: 'META', label: 'Meta Platforms', country: 'SAD' },
  { symbol: 'MSFT', label: 'Microsoft', country: 'SAD' },
  { symbol: 'NFLX', label: 'Netflix', country: 'SAD' },
  { symbol: 'NVO', label: 'Novo Nordisk', country: 'Danska' },
  { symbol: 'NVDA', label: 'Nvidia', country: 'SAD' },
  { symbol: 'SAP', label: 'SAP', country: 'Njemačka' },
  { symbol: 'TSLA', label: 'Tesla', country: 'SAD' },
  { symbol: 'TM', label: 'Toyota', country: 'Japan' },
  { symbol: 'TSM', label: 'TSMC', country: 'Tajvan' },
  { symbol: 'V', label: 'Visa', country: 'SAD' },
  { symbol: 'WMT', label: 'Walmart', country: 'SAD' },
];

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { headers: UA, signal: controller.signal, ...opts });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchYahooQuote(symbol, label, extra = {}) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=7d&interval=1d`;
    const data = await fetchJson(url);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('no result');
    const meta = result.meta || {};
    const closes = (result.indicators?.quote?.[0]?.close || []).filter((v) => v != null);
    const price = meta.regularMarketPrice ?? closes[closes.length - 1];
    const prevClose = meta.chartPreviousClose ?? closes[closes.length - 2] ?? price;
    const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
    const sparkline = closes.map((v) => Number(v));
    return { symbol, label, ...extra, price: Number(price), changePct: Number(changePct.toFixed(2)), sparkline, ok: true };
  } catch (error) {
    return { symbol, label, ...extra, ok: false, error: String(error?.message || error) };
  }
}

async function fetchEcbRates() {
  try {
    const data = await fetchJson('https://api.frankfurter.app/latest?from=EUR');
    const rates = data?.rates || {};
    if (!Object.keys(rates).length) throw new Error('no rates');
    return { ok: true, base: 'EUR', date: data.date, rates };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

async function fetchCryptoGlobal() {
  try {
    const data = await fetchJson('https://api.coingecko.com/api/v3/global');
    const d = data?.data;
    if (!d) throw new Error('no data');
    return {
      ok: true,
      totalMarketCapUsd: d.total_market_cap?.usd || null,
      marketCapChangePct24h: d.market_cap_change_percentage_24h_usd != null
        ? Number(d.market_cap_change_percentage_24h_usd.toFixed(2)) : null,
      btcDominancePct: d.market_cap_percentage?.btc != null ? Number(d.market_cap_percentage.btc.toFixed(1)) : null,
      ethDominancePct: d.market_cap_percentage?.eth != null ? Number(d.market_cap_percentage.eth.toFixed(1)) : null,
      activeCryptocurrencies: d.active_cryptocurrencies || null,
    };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

async function fetchFearGreed() {
  try {
    const data = await fetchJson('https://api.alternative.me/fng/?limit=30');
    const items = data?.data || [];
    if (!items.length) throw new Error('no data');
    const latest = items[0];
    const history = items.slice().reverse().map((item) => ({
      value: Number(item.value),
      classification: item.value_classification,
      date: new Date(Number(item.timestamp) * 1000).toISOString().slice(0, 10),
    }));
    return { ok: true, value: Number(latest.value), classification: latest.value_classification, history };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

async function fetchTopCoins() {
  try {
    const data = await fetchJson(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&price_change_percentage=24h,7d&sparkline=true'
    );
    if (!Array.isArray(data)) throw new Error('unexpected shape');
    const coins = data.map((c) => ({
      id: c.id,
      symbol: (c.symbol || '').toUpperCase(),
      name: c.name,
      price: c.current_price,
      changePct24h: c.price_change_percentage_24h_in_currency != null
        ? Number(c.price_change_percentage_24h_in_currency.toFixed(2)) : null,
      changePct7d: c.price_change_percentage_7d_in_currency != null
        ? Number(c.price_change_percentage_7d_in_currency.toFixed(2)) : null,
      marketCap: c.market_cap,
      image: c.image || null,
      sparkline: (c.sparkline_in_7d?.price || []).filter((_, i) => i % 6 === 0),
    }));
    const ranked = coins.filter((c) => c.changePct24h != null).slice().sort((a, b) => b.changePct24h - a.changePct24h);
    const gainers = ranked.slice(0, 5);
    const losers = ranked.slice(-5).reverse();
    return { coins, gainers, losers };
  } catch (error) {
    return { coins: [], gainers: [], losers: [] };
  }
}

async function main() {
  const [indices, commodities, currencies, stocks, cryptoGlobal, fearGreed, topCoinsResult, ecbRates] = await Promise.all([
    Promise.all(INDICES.map((i) => fetchYahooQuote(i.symbol, i.label, { country: i.country, region: i.region }))),
    Promise.all(COMMODITIES.map((c) => fetchYahooQuote(c.symbol, c.label, { unit: c.unit, exchange: c.exchange, category: c.category }))),
    Promise.all(CURRENCIES.map((c) => fetchYahooQuote(c.symbol, c.label, { country: c.country }))),
    Promise.all(STOCKS.map((s) => fetchYahooQuote(s.symbol, s.label, { country: s.country }))),
    fetchCryptoGlobal(),
    fetchFearGreed(),
    fetchTopCoins(),
    fetchEcbRates(),
  ]);

  const allQuotes = [...indices, ...commodities, ...currencies, ...stocks];
  const okCount = allQuotes.filter((q) => q.ok).length;
  const instrumentsTotal = allQuotes.length + (topCoinsResult.coins?.length || 0);
  const instrumentsOk = okCount + (topCoinsResult.coins?.length || 0);

  const report = {
    version: 'GNK_ASG_MARKET_PULSE_V3_20260722',
    generatedAt: new Date().toISOString(),
    sources: ['Yahoo Finance', 'CoinGecko', 'Alternative.me Fear & Greed Index', 'Frankfurter (ECB)'],
    instrumentsOk,
    instrumentsTotal,
    indices,
    commodities,
    stocks,
    currencies,
    ecbRates,
    crypto: {
      global: cryptoGlobal,
      fearGreed,
      topCoins: topCoinsResult.coins,
      gainers: topCoinsResult.gainers,
      losers: topCoinsResult.losers,
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, instrumentsOk, instrumentsTotal, topCoins: topCoinsResult.coins.length }, null, 2));
}

await main();
