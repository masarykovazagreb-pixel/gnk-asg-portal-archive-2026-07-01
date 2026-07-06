(() => {
  'use strict';
  if (window.__GNK_ASG_GALLERY_BOOTSTRAP__) return;
  window.__GNK_ASG_GALLERY_BOOTSTRAP__ = true;
  const route = location.pathname.replace(/\/+$/, '') || '/';
  const PNG_ASG='/assets/brand/media-kit/GNK_ASG_logo_gold_transparent.png';
  const PNG_DINAMO='/assets/brand/media-kit/GNK_DINAMO_Ltd_logo_gold_transparent.png';

  const loadEncodedImage = async (image,placeholder,source,mime) => {
    try {
      const response=await fetch(source,{cache:'force-cache'});
      if(!response.ok)throw new Error(`HTTP_${response.status}`);
      const encoded=(await response.text()).replace(/\s+/g,'');
      if(!encoded || !/^[A-Za-z0-9+/=]+$/.test(encoded))throw new Error('INVALID_BASE64');
      const binary=atob(encoded);
      const bytes=new Uint8Array(binary.length);
      for(let index=0;index<binary.length;index+=1)bytes[index]=binary.charCodeAt(index);
      const objectUrl=URL.createObjectURL(new Blob([bytes],{type:mime}));
      image.addEventListener('load',()=>{placeholder?.remove();URL.revokeObjectURL(objectUrl);},{once:true});
      image.addEventListener('error',()=>URL.revokeObjectURL(objectUrl),{once:true});
      image.src=objectUrl;
    } catch (_) {
      if(placeholder)placeholder.textContent=document.documentElement.lang==='en'?'Visual currently unavailable':'Vizual trenutačno nije dostupan';
    }
  };

  const initActivation = root => {
    if(!root || root.dataset.runtimeReady==='1')return;
    root.dataset.runtimeReady='1';
    root.querySelectorAll('img[data-encoded-source]').forEach(image=>{
      const slide=image.closest('.gnk-activation__slide');
      loadEncodedImage(image,slide?.querySelector('.gnk-activation__placeholder'),image.dataset.encodedSource,'image/webp');
    });
    const target=new Date('2026-10-07T11:30:00-04:00').getTime();
    const english=document.documentElement.lang==='en';
    const field=name=>root.querySelector(`[data-countdown="${name}"]`);
    const daysField=field('days'),hoursField=field('hours'),minutesField=field('minutes'),secondsField=field('seconds');
    const nyClock=root.querySelector('[data-ny-clock]'),nyDate=root.querySelector('[data-ny-date]'),status=root.querySelector('[data-activation-status]');
    const pad=value=>String(Math.max(0,Math.floor(value))).padStart(2,'0');
    const update=()=>{
      const remaining=Math.max(0,target-Date.now());
      if(daysField)daysField.textContent=String(Math.floor(remaining/86400000)).padStart(2,'0');
      if(hoursField)hoursField.textContent=pad((remaining%86400000)/3600000);
      if(minutesField)minutesField.textContent=pad((remaining%3600000)/60000);
      if(secondsField)secondsField.textContent=pad((remaining%60000)/1000);
      try{
        const now=new Date();
        if(nyClock)nyClock.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
        if(nyDate)nyDate.textContent=new Intl.DateTimeFormat(english?'en-US':'hr-HR',{timeZone:'America/New_York',weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(now);
      }catch(_){ }
      if(remaining===0&&status)status.textContent=english?'THE CODE IS ACTIVE · NEW YORK':'THE CODE JE AKTIVIRAN · NEW YORK';
    };
    update();
    const timer=setInterval(update,1000);
    window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  };

  const installIndexPolicy = () => {
    const english=document.documentElement.lang==='en';
    const blockedNews=/\b(prime day|deal|discount|ninja|slushi|creami|crispi|cafe luxe|football|soccer|nogomet|utakmic|reprezentacij|ghana|hrvatima|transfer|stadion|maksimir)\b/i;
    const allowedCategory=/\b(corporate|business|finance|financial|economy|economic|markets?|technology|tech|artificial intelligence|\bai\b|innovation|automation|governance|industry|industrijska|digitalizacija|investicij)\b/i;

    window.GNK_ASG_VISUAL_APPROVAL={version:'2026-07-06-png-index-v1',required:true,productionRule:'Index uses approved PNG media-kit images for visible public logos and THE CODE show.'};

    const isApproved=node=>node?.dataset?.visualApproved==='true'||Boolean(node?.closest?.('[data-visual-approved="true"]'));
    const replaceSvgLogos=()=>{
      document.querySelectorAll('img[src$=".svg"]').forEach(img=>{
        const signature=`${img.getAttribute('src')||''} ${img.getAttribute('alt')||''}`.toLowerCase();
        img.dataset.visualApproved='true';
        img.src=signature.includes('dinamo')?PNG_DINAMO:PNG_ASG;
      });
    };
    const guardVisuals=root=>{
      root.querySelectorAll?.('img').forEach(image=>{
        if(isApproved(image))return;
        image.hidden=true;image.removeAttribute('srcset');image.removeAttribute('sizes');
      });
      root.querySelectorAll?.('[style*="background"]').forEach(node=>{
        const inline=node.style?.backgroundImage||'';
        if(!/url\s*\(/i.test(inline)||isApproved(node))return;
        node.style.removeProperty('background-image');
      });
    };
    const cleanDuplicateChrome=()=>{
      document.body?.classList.add('gnk-iq200-home');
      document.querySelectorAll('#gnk-asg-premium-header,.gnk-v13-header').forEach(node=>node.remove());
      document.querySelectorAll('.brand-head,.top-nav').forEach(node=>{node.removeAttribute('aria-hidden');node.style.removeProperty('display');node.hidden=false;});
    };
    const ensureCodeNavLink=()=>{
      const nav=document.querySelector('.top-nav, header .nav, nav[aria-label="Glavna navigacija"]');
      if(!nav||nav.querySelector('a[href="/the-code/"]'))return;
      const link=document.createElement('a');
      link.href='/the-code/';link.textContent='◈ THE CODE';
      const media=[...nav.querySelectorAll('a')].find(item=>/^\/media-application\/?/.test(item.getAttribute('href')||''));
      media?nav.insertBefore(link,media):nav.appendChild(link);
    };
    const installCodeShow=()=>{
      if(document.getElementById('gnk-index-code-show'))return;
      const hero=document.querySelector('#the-code.hero')||document.querySelector('main .hero')||document.querySelector('main');
      if(!hero)return;
      const style=document.createElement('style');
      style.id='gnk-index-code-show-style';
      style.textContent='.gnk-code-show{padding:22px 0 30px}.gnk-code-panel{border:1px solid rgba(243,204,98,.32);border-radius:28px;background:radial-gradient(circle at 50% 0,rgba(243,204,98,.16),rgba(5,8,14,.96) 54%);box-shadow:0 28px 80px rgba(0,0,0,.42);overflow:hidden}.gnk-code-head{display:flex;align-items:end;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.10)}.gnk-code-head h2{margin:.1rem 0 0;font:700 clamp(28px,4vw,48px)/.96 Georgia,serif}.gnk-code-head p{margin:0;color:#aeb8c8;max-width:680px;line-height:1.5}.gnk-code-stage{position:relative;min-height:360px;background:#030508}.gnk-code-slide{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:center;padding:26px;opacity:0;pointer-events:none;transform:translateY(12px);transition:opacity .55s ease,transform .55s ease}.gnk-code-slide.is-active{opacity:1;pointer-events:auto;transform:none}.gnk-code-copy small{display:block;color:#f3cc62;text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:900;margin-bottom:9px}.gnk-code-copy h3{font:700 clamp(30px,5vw,64px)/.9 Georgia,serif;margin:0;color:#fff}.gnk-code-copy p{color:#c9d2df;line-height:1.55;font-size:16px}.gnk-code-visual{border:1px solid rgba(243,204,98,.22);border-radius:22px;background:#04070d;min-height:245px;display:grid;place-items:center;text-align:center;padding:18px}.gnk-code-visual.light{background:#fff}.gnk-code-visual img{width:min(250px,78%);height:auto;filter:drop-shadow(0 28px 55px rgba(0,0,0,.55))}.gnk-code-big{font:700 clamp(34px,5vw,66px)/.92 Georgia,serif;color:#f3cc62;letter-spacing:.05em}.gnk-code-metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;width:100%}.gnk-code-metric{border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:13px;background:rgba(255,255,255,.045);text-align:left}.gnk-code-metric b{display:block;color:#ffe8a0;font-size:24px}.gnk-code-metric span{color:#aeb8c8;font-size:12px}.gnk-code-count{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:100%}.gnk-code-count div{border:1px solid rgba(243,204,98,.28);border-radius:15px;padding:13px 8px;background:rgba(243,204,98,.065)}.gnk-code-count b{display:block;color:#fff;font-size:32px}.gnk-code-count span{display:block;color:#aeb8c8;font-size:10px;text-transform:uppercase;letter-spacing:.12em}.gnk-code-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:16px 22px;border-top:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.18)}.gnk-code-button{border:1px solid rgba(255,255,255,.14);border-radius:999px;background:#080d16;color:#fff;padding:11px 15px;text-decoration:none;font-size:12px;font-weight:950;cursor:pointer}.gnk-code-button.gold{background:linear-gradient(135deg,#c99d35,#ffe08a);color:#06101f;border-color:#f3cc62}.gnk-code-status{margin-left:auto;color:#aeb8c8;font-size:12px}.gnk-code-progress{height:2px;background:rgba(255,255,255,.08)}.gnk-code-progress i{display:block;height:100%;width:0;background:#f3cc62;transition:width .2s linear}@media(max-width:860px){.gnk-code-head{display:block}.gnk-code-slide{grid-template-columns:1fr;min-height:520px}.gnk-code-stage{min-height:520px}.gnk-code-status{width:100%;margin-left:0}}@media(max-width:560px){.gnk-code-show{padding:16px 0 24px}.gnk-code-slide{padding:18px;min-height:560px}.gnk-code-stage{min-height:560px}.gnk-code-metrics,.gnk-code-count{grid-template-columns:1fr 1fr}.gnk-code-head{padding:18px}.gnk-code-controls{padding:14px 18px}}';
      document.head.appendChild(style);
      const section=document.createElement('section');
      section.id='gnk-index-code-show';section.className='wrap gnk-code-show';section.dataset.visualApproved='true';
      section.innerHTML=`<div class="gnk-code-panel"><div class="gnk-code-head"><div><p class="eyebrow">THE CODE front-page show</p><h2>THE CODE se vrti na naslovnici.</h2></div><p>HTML prezentacija je ugrađena u index. Puni link ostaje <a href="/the-code/">/the-code/</a>, a media prijava ostaje <a href="/media-application/?lang=en">/media-application/</a>.</p></div><div class="gnk-code-stage" aria-live="polite"><article class="gnk-code-slide is-active" data-code-slide><div class="gnk-code-copy"><small>Slide 1 · Origin</small><h3>Boulder → Zagreb → New York.</h3><p>THE CODE počinje kao arhitektura grupe i vodi prema New York aktivaciji.</p></div><div class="gnk-code-visual"><img data-visual-approved="true" src="${PNG_DINAMO}" alt="GNK DINAMO Ltd. Group logo"></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 2 · System</small><h3>Jedan kod. Više kompanija.</h3><p>Program povezuje akvizicijski proces, media workflow, financijske dokaze i operativne module.</p></div><div class="gnk-code-visual light"><img data-visual-approved="true" src="${PNG_ASG}" alt="GNK ASG d.o.o. logo"></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 3 · Evidence</small><h3>Brojke su vezane uz PDF dokaze.</h3><p>GNK ASG d.o.o. i GNK DINAMO Ltd. Group prikazani su odvojeno, s PDF poveznicama.</p></div><div class="gnk-code-visual"><div class="gnk-code-metrics"><div class="gnk-code-metric"><b>€504.0M</b><span>GNK ASG revenue 2025</span></div><div class="gnk-code-metric"><b>€4.70B</b><span>Group revenue 2025</span></div><div class="gnk-code-metric"><b>€982.5M</b><span>Group net profit</span></div><div class="gnk-code-metric"><b>PDF</b><span>evidence centre</span></div></div></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 4 · Network</small><h3>45 entiteta. 5 kontinenata.</h3><p>Javni prikaz razlikuje stvarno, planirano i u tijeku.</p></div><div class="gnk-code-visual"><div class="gnk-code-big">45 · 5<br>EARTH</div></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Slide 5 · Media</small><h3>Redakcije ostaju na istom linku.</h3><p>Media application je stabilan ulaz za prijavu i akreditaciju.</p></div><div class="gnk-code-visual light"><img data-visual-approved="true" src="${PNG_DINAMO}" alt="GNK DINAMO Ltd. Group logo"></div></article><article class="gnk-code-slide" data-code-slide><div class="gnk-code-copy"><small>Final slide · Countdown</small><h3>Staje na odbrojavanju.</h3><p>Nakon rotacije show ostaje na zadnjoj THE CODE countdown stranici.</p></div><div class="gnk-code-visual"><div class="gnk-code-count"><div><b data-code-count="days">--</b><span>days</span></div><div><b data-code-count="hours">--</b><span>hours</span></div><div><b data-code-count="minutes">--</b><span>min</span></div><div><b data-code-count="seconds">--</b><span>sec</span></div></div></div></article></div><div class="gnk-code-progress"><i data-code-progress></i></div><div class="gnk-code-controls"><button class="gnk-code-button gold" type="button" data-code-play>▶ Pokreni THE CODE show</button><a class="gnk-code-button" href="/the-code/">Otvori puni THE CODE</a><a class="gnk-code-button" href="/media-application/?lang=en">Register newsroom</a><a class="gnk-code-button" href="/api/media-registration/memorandum.pdf">PDF memorandum</a><span class="gnk-code-status" data-code-status>Ready · HTML show</span></div></div>`;
      hero.after(section);
      const slides=[...section.querySelectorAll('[data-code-slide]')],play=section.querySelector('[data-code-play]'),status=section.querySelector('[data-code-status]'),bar=section.querySelector('[data-code-progress]');
      const durations=[3600,3900,4200,3900,3900,999999];let i=0,timer=null,progressTimer=null;
      const setSlide=next=>{slides.forEach((slide,pos)=>slide.classList.toggle('is-active',pos===next));i=next;if(status)status.textContent=next===slides.length-1?'Countdown active · final slide':`Slide ${next+1} / ${slides.length}`;};
      const tickCountdown=()=>{const diff=Math.max(0,new Date('2026-10-07T11:30:00-04:00')-new Date());const put=(name,val)=>{const el=section.querySelector(`[data-code-count="${name}"]`);if(el)el.textContent=String(Math.floor(val)).padStart(2,'0')};put('days',diff/86400000);put('hours',(diff%86400000)/3600000);put('minutes',(diff%3600000)/60000);put('seconds',(diff%60000)/1000);};
      const animate=duration=>{clearInterval(progressTimer);let elapsed=0;if(bar)bar.style.width='0%';progressTimer=setInterval(()=>{elapsed+=100;if(bar)bar.style.width=Math.min(100,elapsed/duration*100)+'%';if(elapsed>=duration)clearInterval(progressTimer);},100);};
      const finish=()=>{clearTimeout(timer);clearInterval(progressTimer);setSlide(slides.length-1);tickCountdown();setInterval(tickCountdown,1000);if(bar)bar.style.width='100%';if(play){play.disabled=false;play.textContent='↺ Ponovi THE CODE show';}};
      const next=()=>{if(i>=slides.length-2){finish();return;}setSlide(i+1);animate(durations[i]);timer=setTimeout(next,durations[i]);};
      const start=()=>{clearTimeout(timer);clearInterval(progressTimer);setSlide(0);if(play){play.disabled=true;play.textContent='▶ THE CODE se vrti';}animate(durations[0]);timer=setTimeout(next,durations[0]);};
      play?.addEventListener('click',start);tickCountdown();
    };

    const curateRenderedNews=()=>{
      const list=document.getElementById('latestNews');if(!list)return;
      const links=[...list.querySelectorAll('.news-item')];
      links.forEach(link=>{const signature=`${link.querySelector('strong')?.textContent||''} ${link.querySelector('small')?.textContent||''}`;link.hidden=blockedNews.test(signature);});
      const visible=links.filter(link=>!link.hidden).slice(0,5);links.forEach(link=>{if(!visible.includes(link))link.hidden=true;});
    };
    const chooseCuratedItem=items=>items.find(item=>{const signature=`${item.title||item.titleHr||item.titleEn||''} ${item.summary||item.description||''} ${item.category||''} ${item.group||''}`;return !blockedNews.test(signature)&&((item.source||'').toUpperCase()==='GNK ASG'||allowedCategory.test(signature));});
    const refreshCuratedFeatured=async()=>{
      try{
        const response=await fetch(`/data/news.json?approval=${Date.now()}`,{cache:'no-store'});if(!response.ok)return;
        const payload=await response.json();const items=Array.isArray(payload)?payload:(payload.items||[]);const item=chooseCuratedItem(items);if(!item)return;
        const title=english?(item.titleEn||item.title||item.titleHr):(item.titleHr||item.title||item.titleEn);
        const summary=english?(item.summaryEn||item.summary||item.description||item.excerpt):(item.summaryHr||item.summary||item.description||item.excerpt);
        const titleNode=document.getElementById('featuredTitle'),summaryNode=document.getElementById('featuredSummary'),linkNode=document.getElementById('featuredLink');
        if(titleNode&&title)titleNode.textContent=title;if(summaryNode)summaryNode.textContent=summary||'';if(linkNode&&item.url)linkNode.href=item.url;
      }catch(_){ }
    };
    const enforce=()=>{cleanDuplicateChrome();replaceSvgLogos();ensureCodeNavLink();installCodeShow();guardVisuals(document);curateRenderedNews();};
    const start=()=>{
      enforce();refreshCuratedFeatured();
      const observer=new MutationObserver(records=>{records.forEach(record=>{if(record.type==='attributes'&&record.target?.nodeType===1)guardVisuals(record.target.parentElement||document);record.addedNodes.forEach(node=>{if(node.nodeType===1)guardVisuals(node);});});cleanDuplicateChrome();replaceSvgLogos();ensureCodeNavLink();installCodeShow();curateRenderedNews();});
      observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','src','srcset']});
      [250,900,1800].forEach(delay=>setTimeout(()=>{enforce();refreshCuratedFeatured();},delay));
      window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
    };
    document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
  };

  if(route==='/' || route==='/en'){
    installIndexPolicy();
    const start=()=>initActivation(document.querySelector('[data-gnk-activation]'));
    document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
    return;
  }

  const run = async () => {
    if (!window.GNK_ASG_GALLERY) {
      await new Promise((resolve,reject) => {
        const script=document.createElement('script');script.src='/assets/gallery-engine.js?v=20260626-v2';script.onload=resolve;script.onerror=reject;document.head.appendChild(script);
      }).catch(() => {});
    }
    if (window.GNK_ASG_GALLERY && !/\/visual-index\/?$/.test(location.pathname)) window.GNK_ASG_GALLERY.apply(document).catch(() => {});
  };
  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',run,{once:true}) : run();
})();
