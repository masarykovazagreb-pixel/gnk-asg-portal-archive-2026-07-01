(() => {
  'use strict';
  if (window.__GNK_ASG_GALLERY_BOOTSTRAP__) return;
  window.__GNK_ASG_GALLERY_BOOTSTRAP__ = true;
  const route = location.pathname.replace(/\/+$/, '') || '/';

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
      image.addEventListener('load',()=>{
        placeholder?.remove();
        URL.revokeObjectURL(objectUrl);
      },{once:true});
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
    const daysField=field('days');
    const hoursField=field('hours');
    const minutesField=field('minutes');
    const secondsField=field('seconds');
    const nyClock=root.querySelector('[data-ny-clock]');
    const nyDate=root.querySelector('[data-ny-date]');
    const status=root.querySelector('[data-activation-status]');
    const pad=value=>String(Math.max(0,Math.floor(value))).padStart(2,'0');

    const update=()=>{
      const remaining=Math.max(0,target-Date.now());
      const days=Math.floor(remaining/86400000);
      const hours=Math.floor((remaining%86400000)/3600000);
      const minutes=Math.floor((remaining%3600000)/60000);
      const seconds=Math.floor((remaining%60000)/1000);
      if(daysField)daysField.textContent=String(days).padStart(2,'0');
      if(hoursField)hoursField.textContent=pad(hours);
      if(minutesField)minutesField.textContent=pad(minutes);
      if(secondsField)secondsField.textContent=pad(seconds);
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

    window.GNK_ASG_VISUAL_APPROVAL={
      version:'2026-06-27-v1',
      required:true,
      productionRule:'No image or URL background may render on the homepage without data-visual-approved="true".',
      slots:[
        {id:'HOME-HERO-01',selector:'.hero-visual',position:'Hero, right side on desktop; below copy on mobile',desktop:'3200x2200',mobile:'2160x2700',status:'pending'},
        {id:'HOME-FEATURED-02',selector:'.featured',position:'Featured Intelligence, large left card background',desktop:'3000x1800',mobile:'2160x1800',status:'pending'},
        {id:'HOME-NETWORK-03',selector:'.world-map',position:'Group Network, map card visual',desktop:'2400x1600',mobile:'1800x1600',status:'pending'},
        {id:'HOME-INNOVATION-04',selector:'.live-card:first-child',position:'Portal Live, AI/innovation card',desktop:'2200x1800',mobile:'1800x1800',status:'pending'}
      ]
    };

    const isApproved=node=>node?.dataset?.visualApproved==='true'||Boolean(node?.closest?.('[data-visual-approved="true"]'));

    const guardVisuals=root=>{
      root.querySelectorAll?.('img').forEach(image=>{
        if(isApproved(image))return;
        image.hidden=true;
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
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
      document.querySelectorAll('.brand-head,.top-nav').forEach(node=>{
        node.removeAttribute('aria-hidden');
        node.style.removeProperty('display');
        node.hidden=false;
      });
    };

    const ensureCodeNavLink=()=>{
      const nav=document.querySelector('.top-nav');
      if(!nav||nav.querySelector('a[href="/the-code/"]'))return;
      const link=document.createElement('a');
      link.href='/the-code/';
      link.textContent='◈ THE CODE';
      const contact=[...nav.querySelectorAll('a')].find(item=>item.getAttribute('href')==='/contact/');
      contact?nav.insertBefore(link,contact):nav.appendChild(link);
    };

    const curateRenderedNews=()=>{
      const list=document.getElementById('latestNews');
      if(!list)return;
      const links=[...list.querySelectorAll('.news-item')];
      links.forEach(link=>{
        const signature=`${link.querySelector('strong')?.textContent||''} ${link.querySelector('small')?.textContent||''}`;
        link.hidden=blockedNews.test(signature);
      });
      const visible=links.filter(link=>!link.hidden).slice(0,5);
      links.forEach(link=>{if(!visible.includes(link))link.hidden=true;});
    };

    const chooseCuratedItem=items=>items.find(item=>{
      const signature=`${item.title||item.titleHr||item.titleEn||''} ${item.summary||item.description||''} ${item.category||''} ${item.group||''}`;
      return !blockedNews.test(signature)&&((item.source||'').toUpperCase()==='GNK ASG'||allowedCategory.test(signature));
    });

    const refreshCuratedFeatured=async()=>{
      try{
        const response=await fetch(`/data/news.json?approval=${Date.now()}`,{cache:'no-store'});
        if(!response.ok)return;
        const payload=await response.json();
        const items=Array.isArray(payload)?payload:(payload.items||[]);
        const item=chooseCuratedItem(items);
        if(!item)return;
        const title=english?(item.titleEn||item.title||item.titleHr):(item.titleHr||item.title||item.titleEn);
        const summary=english?(item.summaryEn||item.summary||item.description||item.excerpt):(item.summaryHr||item.summary||item.description||item.excerpt);
        const titleNode=document.getElementById('featuredTitle');
        const summaryNode=document.getElementById('featuredSummary');
        const linkNode=document.getElementById('featuredLink');
        if(titleNode&&title)titleNode.textContent=title;
        if(summaryNode)summaryNode.textContent=summary||'';
        if(linkNode&&item.url)linkNode.href=item.url;
      }catch(_){ }
    };

    const enforce=()=>{
      cleanDuplicateChrome();
      ensureCodeNavLink();
      guardVisuals(document);
      curateRenderedNews();
    };

    const start=()=>{
      enforce();
      refreshCuratedFeatured();
      const observer=new MutationObserver(records=>{
        records.forEach(record=>{
          if(record.type==='attributes'&&record.target?.nodeType===1)guardVisuals(record.target.parentElement||document);
          record.addedNodes.forEach(node=>{if(node.nodeType===1)guardVisuals(node);});
        });
        cleanDuplicateChrome();
        ensureCodeNavLink();
        curateRenderedNews();
      });
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
        const script=document.createElement('script');
        script.src='/assets/gallery-engine.js?v=20260626-v2';
        script.onload=resolve;
        script.onerror=reject;
        document.head.appendChild(script);
      }).catch(() => {});
    }
    if (window.GNK_ASG_GALLERY && !/\/visual-index\/?$/.test(location.pathname)) {
      window.GNK_ASG_GALLERY.apply(document).catch(() => {});
    }
  };
  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',run,{once:true}) : run();
})();
