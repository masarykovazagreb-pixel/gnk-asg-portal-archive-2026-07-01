(function(){
  'use strict';

  var path=(window.location.pathname||'/').replace(/\/+$/,'/')||'/';
  var isHome=path==='/'||path==='/en/';
  if(!isHome||document.documentElement.dataset.gnkHomePolish==='1')return;
  document.documentElement.dataset.gnkHomePolish='1';

  function isEnglish(){return path==='/en/'||document.documentElement.lang==='en';}
  function text(hr,en){return isEnglish()?en:hr;}
  function esc(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}
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
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .finally(function(){if(timer)clearTimeout(timer);});
  }

  function networkNodes(){
    var html='';
    for(var i=0;i<48;i++)html+='<span aria-hidden="true"></span>';
    return html;
  }

  function hero(){
    var existing=document.getElementById('gnkHomeHero');
    if(existing)return existing;
    var main=document.querySelector('main')||document.body;
    var section=document.createElement('section');
    section.id='gnkHomeHero';
    section.className='gnk-home-hero';
    section.innerHTML=''
      +'<div class="gnk-home-hero__inner">'
      +'<div>'
      +'<p class="gnk-home-hero__eyebrow">'+esc(text('Globalna mreža · Sport · Tehnologija · Financije','Global network · Sport · Technology · Finance'))+'</p>'
      +'<h1>'+esc(text('Korporativna inteligencija za povezani poslovni svijet','Corporate intelligence for a connected business world'))+'</h1>'
      +'<p class="gnk-home-hero__lead">'+esc(text('GNK ASG povezuje poslovne informacije, tržišne podatke, digitalnu infrastrukturu, dokumente i javni AI sloj u jedinstvenom korporativnom portalu.','GNK ASG connects business intelligence, market data, digital infrastructure, documents and a public AI layer in one corporate portal.'))+'</p>'
      +'<div class="gnk-home-hero__actions">'
      +'<a class="gnk-home-button" href="#o-nama">'+esc(text('Korporativni profil','Corporate profile'))+'</a>'
      +'<a class="gnk-home-button gnk-home-button--ghost" href="'+(isEnglish()?'/publications/':'/objave/')+'">'+esc(text('Objave','Publications'))+'</a>'
      +'<a class="gnk-home-button gnk-home-button--ghost" href="'+(isEnglish()?'/markets/':'/trzista/')+'">'+esc(text('Tržišta','Markets'))+'</a>'
      +'</div></div>'
      +'<aside class="gnk-home-console" aria-label="'+esc(text('Status digitalne infrastrukture','Digital infrastructure status'))+'">'
      +'<div class="gnk-home-console__head"><strong>'+esc(text('Digitalna infrastruktura','Digital infrastructure'))+'</strong><span id="gnkHomeConsoleStatus" class="gnk-home-console__status">'+esc(text('Provjera','Checking'))+'</span></div>'
      +'<div class="gnk-home-network">'+networkNodes()+'</div>'
      +'<div class="gnk-home-console__foot"><span>GNK ASG Network</span><span id="gnkHomeConsoleTime">—</span></div>'
      +'</aside></div>';
    main.insertBefore(section,main.firstChild);
    return section;
  }

  function overview(){
    var existing=document.getElementById('gnkHomeOverview');
    if(existing)return existing;
    var heroEl=hero();
    var section=document.createElement('section');
    section.id='gnkHomeOverview';
    section.className='gnk-home-overview';
    section.setAttribute('aria-label',text('Operativni pregled portala','Portal operational overview'));
    section.innerHTML='<div class="gnk-home-overview__grid">'
      +card('backend','01',text('Status sustava','System status'),text('Provjera javnih podataka i dostupnosti servisa.','Public data and service availability check.'),'/status/')
      +card('market','02',text('Tržišta','Markets'),text('Bitcoin, zlato, Brent i USD/EUR uz transparentan status.','Bitcoin, gold, Brent and USD/EUR with transparent status.'),isEnglish()?'/markets/':'/trzista/')
      +card('news','03',text('Vijesti','News'),text('Posljednji valjani spremljeni pregled javnih izvora.','Latest valid stored overview from public sources.'),isEnglish()?'/news/':'/vijesti/')
      +card('contact','04',text('Kontakt','Contact'),text('Odabir odjela, evidencijski broj i kontrolirana komunikacija.','Department selection, case reference and controlled communication.'),isEnglish()?'/en/contact/':'/contact/')
      +'</div>';
    heroEl.insertAdjacentElement('afterend',section);
    return section;
  }

  function card(id,icon,title,description,href){
    return '<a class="gnk-home-overview-card" id="gnkHomeCard-'+id+'" href="'+esc(href)+'">'
      +'<div class="gnk-home-overview-card__top"><span class="gnk-home-overview-card__icon">'+esc(icon)+'</span><span class="gnk-home-state" data-state="checking">'+esc(text('Provjera','Checking'))+'</span></div>'
      +'<h3>'+esc(title)+'</h3><p>'+esc(description)+'</p><div class="gnk-home-overview-card__meta">'+esc(text('Otvori modul →','Open module →'))+'</div></a>';
  }

  function setCard(id,status,meta){
    var cardEl=document.getElementById('gnkHomeCard-'+id);
    if(!cardEl)return;
    var badge=cardEl.querySelector('.gnk-home-state');
    var metaEl=cardEl.querySelector('.gnk-home-overview-card__meta');
    var normalized=normalStatus(status);
    badge.dataset.state=state(normalized);
    badge.textContent=normalized;
    if(meta)metaEl.textContent=meta;
  }

  function updateConsole(status,time){
    var el=document.getElementById('gnkHomeConsoleStatus');
    var timeEl=document.getElementById('gnkHomeConsoleTime');
    var normalized=normalStatus(status);
    if(el){el.dataset.state=state(normalized);el.textContent=normalized;}
    if(timeEl)timeEl.textContent=time?fmtDate(time):fmtDate(new Date().toISOString());
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
      if(isFinite(Number(bitcoin.price_eur)))bits.push('BTC '+fmtNumber(bitcoin.price_eur,' EUR'));
      if(isFinite(Number(fx.rate)))bits.push('USD/EUR '+fmtNumber(fx.rate,''));
      setCard('market',status,bits.length?bits.join(' · '):fmtDate(data.updatedAt));
      return status;
    }).catch(function(){setCard('market','UNAVAILABLE',text('Podaci nisu dostupni','Data unavailable'));return'UNAVAILABLE';});
  }

  function loadNews(){
    return timeoutFetch('/data/news.json?cb='+Date.now(),7500).then(function(data){
      var count=Array.isArray(data.items)?data.items.length:Number(data.count||0);
      var status=data.status||'SNAPSHOT';
      setCard('news',status,(count?count+' '+text('stavki','items')+' · ':'')+fmtDate(data.updatedAt||data.lastSuccessfulAt));
      return status;
    }).catch(function(){setCard('news','UNAVAILABLE',text('Snapshot nije dostupan','Snapshot unavailable'));return'UNAVAILABLE';});
  }

  function loadContact(){
    return timeoutFetch('/api/contact-submit?cb='+Date.now(),6500).then(function(data){
      var ready=data.ok!==false&&String(data.status||'READY').toUpperCase()==='READY';
      var mail=data.mail||{};
      var status=ready?(mail.binding===false?'DELAYED':'ONLINE'):'FALLBACK';
      var meta=mail.binding===false?text('Forma radi · mail binding nije aktivan','Form ready · mail binding inactive'):text('Forma i evidencija spremni','Form and case tracking ready');
      setCard('contact',status,meta);
      return status;
    }).catch(function(){setCard('contact','UNAVAILABLE',text('Kontakt provjera nije dostupna','Contact check unavailable'));return'UNAVAILABLE';});
  }

  function cleanEmptyBlocks(){
    Array.prototype.forEach.call(document.querySelectorAll('main section,main article,.card,.group-card,.doc'),function(el){
      if(el.id==='gnkHomeHero'||el.id==='gnkHomeOverview'||el.closest('#gnkHomeHero')||el.closest('#gnkHomeOverview'))return;
      var textValue=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
      var functional=el.querySelector('img,svg,canvas,video,form,input,select,textarea,button,a[href],iframe');
      if(textValue.length<3&&!functional)el.classList.add('gnk-home-empty-cleaned');
    });
  }

  function removeDuplicateHomeLayers(){
    var heroList=document.querySelectorAll('#gnkHomeHero');
    for(var i=1;i<heroList.length;i++)heroList[i].remove();
    var overviewList=document.querySelectorAll('#gnkHomeOverview');
    for(var j=1;j<overviewList.length;j++)overviewList[j].remove();
  }

  function init(){
    document.body.classList.add('gnk-home-polish');
    hero();
    overview();
    cleanEmptyBlocks();
    removeDuplicateHomeLayers();
    Promise.allSettled([loadStatus(),loadMarket(),loadNews(),loadContact()]);
    setInterval(function(){Promise.allSettled([loadStatus(),loadMarket(),loadNews(),loadContact()]);},5*60*1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
