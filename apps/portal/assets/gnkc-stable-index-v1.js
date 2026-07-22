(()=>{
  const MARKET_URL='/data/market-pulse.json';
  const TARGET_WEIGHTS={USDC:.5,USDT:.3,DAI:.2};
  const clean=n=>Number.isFinite(Number(n))?Number(n):null;
  const round=(n,d=6)=>Number(Number(n).toFixed(d));

  function buildIndex(data){
    const coins=Array.isArray(data?.crypto?.topCoins)?data.crypto.topCoins:[];
    const bySymbol=new Map(coins.map(c=>[String(c.symbol||'').toUpperCase(),c]));
    const available=Object.entries(TARGET_WEIGHTS)
      .map(([symbol,weight])=>({symbol,weight,coin:bySymbol.get(symbol)}))
      .filter(x=>clean(x.coin?.price)!==null&&clean(x.coin?.price)>0);
    const weightSum=available.reduce((sum,x)=>sum+x.weight,0);
    if(!weightSum)throw new Error('stablecoin_reference_unavailable');
    const components=available.map(x=>({
      symbol:x.symbol,
      configuredWeight:x.weight,
      effectiveWeight:x.weight/weightSum,
      priceUsd:clean(x.coin.price),
      changePct24h:clean(x.coin.changePct24h)||0,
      changePct7d:clean(x.coin.changePct7d)||0
    }));
    const priceUsd=components.reduce((sum,x)=>sum+x.priceUsd*x.effectiveWeight,0);
    const changePct24h=components.reduce((sum,x)=>sum+x.changePct24h*x.effectiveWeight,0);
    const changePct7d=components.reduce((sum,x)=>sum+x.changePct7d*x.effectiveWeight,0);
    const eurUsd=(Array.isArray(data?.currencies)?data.currencies:[]).find(x=>x.symbol==='EURUSD=X');
    const eurUsdPrice=clean(eurUsd?.price);
    return {
      version:'GNKC_STABLE_INDEX_V1',
      generatedAt:data?.generatedAt||new Date().toISOString(),
      simulation:true,
      baseUsd:1,
      priceUsd:round(priceUsd),
      priceEur:eurUsdPrice?round(priceUsd/eurUsdPrice):null,
      deviationPct:round((priceUsd-1)*100,4),
      changePct24h:round(changePct24h,4),
      changePct7d:round(changePct7d,4),
      components,
      missing:Object.keys(TARGET_WEIGHTS).filter(symbol=>!bySymbol.has(symbol)),
      source:MARKET_URL
    };
  }

  async function load(){
    const response=await fetch(MARKET_URL,{cache:'no-store'});
    if(!response.ok)throw new Error(`market-pulse:${response.status}`);
    return buildIndex(await response.json());
  }

  window.GNKCStableIndex={load,buildIndex,MARKET_URL,TARGET_WEIGHTS};
})();
