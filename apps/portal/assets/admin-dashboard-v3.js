(()=>{
  'use strict';
  if(window.__GNK_ASG_ADMIN_DASHBOARD_V3__)return;
  window.__GNK_ASG_ADMIN_DASHBOARD_V3__=true;

  const $=id=>document.getElementById(id);
  const safe=value=>String(value??'').trim();

  function installBrand(){
    const mark=document.querySelector('.brand-mark');
    if(!mark||mark.querySelector('img'))return;
    mark.textContent='';
    const image=document.createElement('img');
    image.src='/assets/brand/media-kit/GNK_ASG_logo_gold_transparent.png';
    image.alt='GNK ASG d.o.o. logo';
    image.width=52;image.height=52;image.decoding='async';
    mark.appendChild(image);
  }

  function installHeroActions(){
    const actions=document.querySelector('.hero-actions');
    if(!actions||actions.querySelector('.gnk-v3-mobile-link'))return;
    const mobile=document.createElement('a');
    mobile.className='gnk-v3-mobile-link';
    mobile.href='/app/?mode=admin';
    mobile.textContent='Otvori Mobile Admin';
    actions.appendChild(mobile);
  }

  function releaseCard(label,value,detail,state='ok'){
    const card=document.createElement('article');
    card.className='gnk-v3-release-card';card.dataset.state=state;
    const small=document.createElement('small');small.textContent=label;
    const strong=document.createElement('strong');strong.textContent=value;
    const span=document.createElement('span');span.textContent=detail;
    card.append(small,strong,span);
    return card;
  }

  async function readJson(path){
    const url=new URL(path,location.origin);url.searchParams.set('cb',Date.now());
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function loadReleaseStrip(){
    const statusGrid=$('statusGrid');
    if(!statusGrid||document.querySelector('.gnk-v3-release-strip'))return;
    const strip=document.createElement('section');strip.className='gnk-v3-release-strip';strip.setAttribute('aria-label','Aktivni produkcijski slojevi');
    strip.append(
      releaseCard('Produkcijski release','Provjera…','Učitavanje aktivnog Workera','warn'),
      releaseCard('Vijesti','Provjera…','Raspored i automatizacija','warn'),
      releaseCard('Mail servis','Provjera…','Sigurno slanje i PDF privici','warn'),
      releaseCard('Mobilna aplikacija','Provjera…','Standard i Admin način','warn')
    );
    statusGrid.insertAdjacentElement('afterend',strip);

    const results=await Promise.allSettled([
      readJson('/data/deployment-status.json'),
      readJson('/data/news-automation-status.json'),
      readJson('/api/mail-center/send-readiness'),
      readJson('/app.webmanifest')
    ]);
    const cards=[...strip.children];

    if(results[0].status==='fulfilled'){
      const data=results[0].value;
      cards[0].replaceWith(releaseCard(
        'Produkcijski release',
        safe(data.publicRelease||data.version||'Aktivan'),
        safe(data.entryPoint||data.deployedEntryPoint||'Cloudflare Worker'),
        'ok'
      ));
    }else cards[0].replaceWith(releaseCard('Produkcijski release','Nedostupno','Status endpoint nije odgovorio','warn'));

    if(results[1].status==='fulfilled'){
      const data=results[1].value;
      const schedule=Array.isArray(data.newsSchedule)?data.newsSchedule.join(' · '):'3× dnevno';
      cards[1].replaceWith(releaseCard('Vijesti',`${data.newsRefreshesPerDay||3}× dnevno`,`${schedule} · Europe/Zagreb`,'ok'));
    }else cards[1].replaceWith(releaseCard('Vijesti','Provjera potrebna','Raspored nije trenutno dostupan','warn'));

    if(results[2].status==='fulfilled'){
      const data=results[2].value;
      const ready=data.live&&data.emailBindingConfigured;
      cards[2].replaceWith(releaseCard('Mail servis',ready?'Spreman':'Ograničen',`${data.profiles?.length||0} profila · PDF privici ${data.limits?.attachments||0}`,ready?'ok':'warn'));
    }else cards[2].replaceWith(releaseCard('Mail servis','Prijava potrebna','Status je dostupan unutar sigurne sesije','warn'));

    if(results[3].status==='fulfilled'){
      const data=results[3].value;
      cards[3].replaceWith(releaseCard('Mobilna aplikacija','Standard + Admin',safe(data.short_name||data.name||'GNK ASG Mobile'),'ok'));
    }else cards[3].replaceWith(releaseCard('Mobilna aplikacija','Nedostupno','Manifest nije učitan','warn'));
  }

  function improveCopy(){
    const title=$('dashboardTitle');
    if(title)title.textContent='Jedinstveni upravljački centar za portal, dokumente, komunikaciju i automatizaciju';
    const paragraph=document.querySelector('.dashboard-hero .hero-copy>p:not(.eyebrow)');
    if(paragraph)paragraph.textContent='Sigurni operativni sloj objedinjuje sustave bez duplih izbornika. Javni portal, administracija, PDF dokumenti, mediji i urednički procesi ostaju jasno odvojeni.';
  }

  function boot(){
    document.body.classList.add('gnk-admin-v3');
    installBrand();installHeroActions();improveCopy();loadReleaseStrip();
    const observer=new MutationObserver(()=>{installBrand();installHeroActions()});
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),8000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
