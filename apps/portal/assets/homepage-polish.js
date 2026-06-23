(function(){
  'use strict';

  var path=(window.location.pathname||'/').replace(/\/+$/,'/')||'/';
  if(path!=='/'&&path!=='/en/')return;
  if(document.documentElement.dataset.gnkHomePolish==='1')return;
  document.documentElement.dataset.gnkHomePolish='1';

  function isEnglish(){return path==='/en/'||document.documentElement.lang==='en';}
  function text(hr,en){return isEnglish()?en:hr;}
  function normalStatus(value){
    var s=String(value||'').toUpperCase();
    return ['LIVE','SNAPSHOT','DELAYED','FALLBACK','OK','ONLINE'].indexOf(s)>=0?s:'UNAVAILABLE';
  }
  function state(status){
    var s=normalStatus(status).toLowerCase();
    if(s==='online')return'ok';
    if(s==='unavailable')return'bad';
    return s;
  }
  function number(){
    for(var i=0;i<arguments.length;i++){
      var n=Number(arguments[i]);
      if(isFinite(n))return n;
    }
    return null;
  }
  function fmtDate(value){
    var d=new Date(value||'');
    if(isNaN(d.getTime()))return text('Nema vremenske oznake','No timestamp');
    try{return new Intl.DateTimeFormat(isEnglish()?'en-GB':'hr-HR',{dateStyle:'medium',timeStyle:'short'}).format(d);}catch(e){return d.toISOString();}
  }
  function fmtNumber(value,suffix){
    var n=Number(value);
    if(!isFinite(n))return'—';
    return n.toLocaleString(isEnglish()?'en-GB':'hr-HR',{maximumFractionDigits:2})+(suffix||'');
  }
  function timeoutFetch(url,ms){
    var controller=typeof AbortController!=='undefined'?new AbortController():null;
    var timer=controller?setTimeout(function(){controller.abort();},ms||7000):null;
    return fetch(url,{cache:'no-store',signal:controller?controller.signal:undefined})
      .then(function(response){if(!response.ok)throw new Error('HTTP '+response.status);return response.json();})
      .finally(function(){if(timer)clearTimeout(timer);});
  }

  function setCard(id,status,meta){
    var card=document.getElementById('gnkHomeCard-'+id);
    if(!card)return;
    var badge=card.querySelector('.gnk-home-state');
    var detail=card.querySelector('.gnk-home-overview-card__meta');
    var normalized=normalStatus(status);
    if(badge){badge.dataset.state=state(normalized);badge.textContent=normalized;}
    if(detail&&meta)detail.textContent=meta;
  }

  function updateConsole(status,time){
    var badge=document.getElementById('gnkHomeConsoleStatus');
    var stamp=document.getElementById('gnkHomeConsoleTime');
    var normalized=normalStatus(status);
    if(badge){badge.dataset.state=state(normalized);badge.textContent=normalized;}
    if(stamp)stamp.textContent=time?fmtDate(time):fmtDate(new Date().toISOString());
  }

  function fillNetwork(){
    var network=document.querySelector('.gnk-home-network');
    if(!network||network.children.length)return;
    var fragment=document.createDocumentFragment();
    for(var i=0;i<80;i++){
      var node=document.createElement('span');
      node.setAttribute('aria-hidden','true');
      fragment.appendChild(node);
    }
    network.appendChild(fragment);
  }

  function setupNavigation(){
    var button=document.getElementById('menuToggle');
    var nav=document.getElementById('navLinks');
    if(button&&nav){
      button.addEventListener('click',function(){
        var open=nav.classList.toggle('open');
        button.setAttribute('aria-expanded',open?'true':'false');
      });
      nav.addEventListener('click',function(event){
        if(event.target.closest('a')){
          nav.classList.remove('open');
          button.setAttribute('aria-expanded','false');
        }
      });
      document.addEventListener('click',function(event){
        if(!nav.contains(event.target)&&event.target!==button){
          nav.classList.remove('open');
          button.setAttribute('aria-expanded','false');
        }
      });
    }
    var mobile=document.getElementById('mobileNav');
    if(mobile)mobile.addEventListener('change',function(){if(mobile.value)window.location.assign(mobile.value);});
  }

  function marketAsset(data,key){
    var assets=data&&data.assets||{};
    if(key==='bitcoin')return number(assets.bitcoin&&assets.bitcoin.price_eur,assets.bitcoin&&assets.bitcoin.price,data.btc_eur);
    if(key==='gold')return number(assets.asg_gold_reference&&assets.asg_gold_reference.value_eur,assets.gold&&assets.gold.price_eur,assets.gold&&assets.gold.price_usd,assets.gold&&assets.gold.price,data.asg_gold_eur);
    if(key==='brent')return number(assets.brent&&assets.brent.price_usd,assets.brent&&assets.brent.price,data.brent_usd);
    if(key==='usd-eur')return number(assets.usd_eur&&assets.usd_eur.rate,assets.usd_eur&&assets.usd_eur.price,assets.fx&&assets.fx.usd_eur,data.usd_eur);
    return null;
  }

  function updateMarketPreview(data,status){
    var config={
      bitcoin:{suffix:' EUR'},
      gold:{suffix:' EUR'},
      brent:{suffix:' USD'},
      'usd-eur':{suffix:''}
    };
    Object.keys(config).forEach(function(key){
      var el=document.querySelector('[data-market-value="'+key+'"]');
      if(el)el.textContent=fmtNumber(marketAsset(data,key),config[key].suffix);
    });
    var stamp=document.getElementById('homeMarketStatus');
    if(stamp)stamp.textContent=normalStatus(status)+' · '+text('posljednje uspješno ažuriranje: ','last successful update: ')+fmtDate(data.updatedAt||data.lastUpdated||data.lastSuccessfulAt);
  }

  function loadStatus(){
    return timeoutFetch('/api/backend-status?cb='+Date.now(),6500).then(function(data){
      var status=data.ok===false?'FALLBACK':(data.status||data.overallStatus||'ONLINE');
      setCard('backend',status,fmtDate(data.updatedAt||data.time));
      updateConsole(status,data.updatedAt||data.time);
      return status;
    }).catch(function(){
      setCard('backend','UNAVAILABLE',text('Status nije dostupan','Status unavailable'));
      updateConsole('UNAVAILABLE');
      return'UNAVAILABLE';
    });
  }

  function loadMarket(){
    return timeoutFetch('/api/market?cb='+Date.now(),7500).then(function(data){
      var assets=data.assets||{};
      var bitcoin=assets.bitcoin||{};
      var fx=assets.usd_eur||{};
      var status=data.status||bitcoin.status||fx.status||'SNAPSHOT';
      var bits=[];
      var btc=marketAsset(data,'bitcoin');
      var usdEur=marketAsset(data,'usd-eur');
      if(btc!==null)bits.push('BTC '+fmtNumber(btc,' EUR'));
      if(usdEur!==null)bits.push('USD/EUR '+fmtNumber(usdEur,''));
      setCard('market',status,bits.length?bits.join(' · '):fmtDate(data.updatedAt||data.lastUpdated));
      updateMarketPreview(data,status);
      return status;
    }).catch(function(){
      setCard('market','UNAVAILABLE',text('Podatci nisu dostupni','Data unavailable'));
      var stamp=document.getElementById('homeMarketStatus');
      if(stamp)stamp.textContent='FALLBACK · '+text('tržišni backend nije dostupan','market backend unavailable');
      return'UNAVAILABLE';
    });
  }

  function loadNews(){
    return timeoutFetch('/data/news.json?cb='+Date.now(),7500).then(function(data){
      var count=Array.isArray(data.items)?data.items.length:Number(data.count||0);
      var status=data.status||'SNAPSHOT';
      setCard('news',status,(count?count+' '+text('stavki','items')+' · ':'')+fmtDate(data.updatedAt||data.lastSuccessfulAt));
      return status;
    }).catch(function(){
      setCard('news','UNAVAILABLE',text('Snapshot nije dostupan','Snapshot unavailable'));
      return'UNAVAILABLE';
    });
  }

  function loadContact(){
    return timeoutFetch('/api/contact-submit?cb='+Date.now(),6500).then(function(data){
      var ready=data.ok!==false&&String(data.status||'READY').toUpperCase()==='READY';
      var mail=data.mail||{};
      var status=ready?(mail.binding===false?'DELAYED':'ONLINE'):'FALLBACK';
      var meta=mail.binding===false?text('Forma radi · mail binding nije aktivan','Form ready · mail binding inactive'):text('Forma, evidencija i mail provjera spremni','Form, case tracking and mail check ready');
      setCard('contact',status,meta);
      return status;
    }).catch(function(){
      setCard('contact','UNAVAILABLE',text('Kontakt provjera nije dostupna','Contact check unavailable'));
      return'UNAVAILABLE';
    });
  }

  function refreshAll(){
    return Promise.allSettled([loadStatus(),loadMarket(),loadNews(),loadContact()]);
  }

  function init(){
    document.body.classList.add('gnk-home-polish');
    fillNetwork();
    setupNavigation();
    refreshAll();
    window.setInterval(refreshAll,5*60*1000);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)refreshAll();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
