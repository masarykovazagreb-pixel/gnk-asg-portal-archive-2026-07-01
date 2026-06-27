(() => {
  'use strict';
  if (window.__GNK_ASG_GALLERY_BOOTSTRAP__) return;
  window.__GNK_ASG_GALLERY_BOOTSTRAP__ = true;
  const route = location.pathname.replace(/\/+$/, '') || '/';

  const node = (tag,className,text) => {
    const item=document.createElement(tag);
    if(className)item.className=className;
    if(text)item.textContent=text;
    return item;
  };

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
        placeholder.remove();
        URL.revokeObjectURL(objectUrl);
      },{once:true});
      image.addEventListener('error',()=>{
        image.remove();
        URL.revokeObjectURL(objectUrl);
      },{once:true});
      image.src=objectUrl;
    } catch (_) {
      image.remove();
    }
  };

  const mountCodeShowcase = () => {
    const main=document.querySelector('main#main,main');
    if(!main || document.querySelector('.gnk-code-slot'))return;
    const english=route==='/en';

    const css=node('link');
    css.rel='stylesheet';
    css.href='/assets/the-code-index-slot.css?v=20260627-v5';
    document.head.appendChild(css);

    const section=node('section','section gnk-code-slot');
    section.id='the-code-index';
    section.setAttribute('aria-label','GNK DINAMO Ltd. — The Code and New York media activation');

    const head=node('div','gnk-code-slot__head');
    const headCopy=node('div');
    headCopy.appendChild(node('span','gnk-code-slot__eyebrow',english?'Media activation · New York · 6–8 October 2026':'Medijska aktivacija · New York · 6.–8. listopada 2026.'));
    headCopy.appendChild(node('h2','',english?'THE CODE — global media and corporate activation':'THE CODE — globalna medijska i korporativna aktivacija'));
    const headText=node('p','',english
      ? 'A three-day, high-level media and corporate programme for invited media houses, guests and panel participants. The exact venue is intentionally not disclosed before final reservation confirmation.'
      : 'Trodnevni medijski i korporativni program za pozvane medijske kuće, uzvanike i paneliste. Točna dvorana ne objavljuje se prije završne potvrde rezervacije.');
    head.appendChild(headCopy);
    head.appendChild(headText);
    section.appendChild(head);

    const grid=node('div','gnk-code-slot__grid');
    const visual=node('article','gnk-code-slot__visual');
    visual.setAttribute('aria-label',english?'Rotating campaign visuals':'Izmjena kampanjskih vizuala');
    const slides=node('div','gnk-code-slot__slides');
    const visuals=[
      {
        source:'/assets/the-code-visual-01.b64?v=20260627-webp1',
        mime:'image/webp',
        alt:english?'GNK ASG global network and advanced sports and governance':'GNK ASG globalna mreža, napredni sport i upravljanje',
        kicker:english?'GLOBAL NETWORK':'GLOBALNA MREŽA',
        caption:english?'Technology, finance, governance and everyday digital infrastructure.':'Tehnologija, financije, upravljanje i digitalna infrastruktura svakodnevice.'
      },
      {
        source:'/assets/the-code-visual-02.b64?v=20260627-webp1',
        mime:'image/webp',
        alt:english?'GNK DINAMO Ltd. Group New York activation on October 7, 2026':'GNK DINAMO Ltd. Group aktivacija u New Yorku 7. listopada 2026.',
        kicker:english?'NEW YORK · 07/10/2026 · 11:30':'NEW YORK · 07.10.2026. · 11:30',
        caption:english?'The code was written at midnight. Activation follows in New York.':'Kod je otkucan u ponoć. Aktivacija slijedi u New Yorku.'
      }
    ];

    visuals.forEach((item,index)=>{
      const figure=node('figure','gnk-code-slot__slide');
      const placeholder=node('div','gnk-code-slot__placeholder');
      placeholder.appendChild(node('span','',english?'Loading campaign visual…':'Učitavanje kampanjskog vizuala…'));
      figure.appendChild(placeholder);

      const image=node('img');
      image.alt=item.alt;
      image.loading=index?'lazy':'eager';
      image.decoding='async';
      figure.appendChild(image);
      figure.appendChild(node('div','gnk-code-slot__shade'));
      const caption=node('figcaption','gnk-code-slot__caption');
      caption.appendChild(node('small','',item.kicker));
      caption.appendChild(node('strong','',item.caption));
      figure.appendChild(caption);
      slides.appendChild(figure);
      loadEncodedImage(image,placeholder,item.source,item.mime);
    });

    visual.appendChild(slides);
    grid.appendChild(visual);

    const code=node('aside','gnk-code-slot__code');
    code.style.aspectRatio='9 / 16';
    code.setAttribute('aria-label','THE CODE interactive presentation');
    const frame=node('iframe');
    frame.title='THE CODE — GNK DINAMO Ltd.';
    frame.src='/the-code/?v=20260627-v1';
    frame.loading='eager';
    frame.setAttribute('sandbox','allow-scripts');
    frame.setAttribute('allow','autoplay');
    frame.setAttribute('scrolling','no');
    code.appendChild(frame);
    code.appendChild(node('span','gnk-code-slot__badge','Interactive · isolated'));
    grid.appendChild(code);
    section.appendChild(grid);

    const media=node('div','gnk-code-slot__media');
    const summary=node('article','gnk-code-slot__panel gnk-code-slot__panel--lead');
    summary.appendChild(node('span','gnk-code-slot__eyebrow',english?'Press invitation framework':'Okvir poziva medijima'));
    summary.appendChild(node('h3','',english?'A global announcement deliberately held at strategic distance':'Globalna najava namjerno zadržana u strateškoj distanci'));
    summary.appendChild(node('p','',english
      ? 'The programme is designed for approximately 150–200 journalists and media houses, with the remaining capacity reserved for invited guests, panelists and corporate participants connected to the acquisition process.'
      : 'Program je oblikovan za približno 150–200 novinara i medijskih kuća, dok je ostatak kapaciteta namijenjen uzvanicima, panelistima i korporativnim sudionicima povezanim s procesom preuzimanja.'));
    summary.appendChild(node('p','',english
      ? 'The message remains intentionally high-level: the emphasis is on consequences, scale and technological reach, not on premature disclosure of the target or transaction mechanics.'
      : 'Poruka se namjerno zadržava na visokoj razini: naglasak je na posljedicama, razmjeru i tehnološkom dosegu, a ne na prijevremenom otkrivanju subjekta ili mehanike transakcije.'));
    media.appendChild(summary);

    const agenda=node('article','gnk-code-slot__panel');
    agenda.appendChild(node('span','gnk-code-slot__eyebrow',english?'Event dynamics':'Dinamika događaja'));
    agenda.appendChild(node('h3','',english?'6–8 October 2026':'6.–8. listopada 2026.'));
    const list=node('ul','gnk-code-slot__timeline');
    [
      english?'6 Oct · arrival, hotel check-in and formal evening dinner.':'6.10. · dolazak, smještaj i svečana večera.',
      english?'7 Oct · 11:00 press opening, 11:30 code activation, two-hour presentation, lunch, afternoon management sessions and evening dinner.':'7.10. · 11:00 press početak, 11:30 aktivacija koda, dvosatna prezentacija, ručak, poslijepodnevni sastanci s menadžmentom i večera.',
      english?'8 Oct · departure day and closing logistics.':'8.10. · lagani odlazak i završna logistika.'
    ].forEach(text=>list.appendChild(node('li','',text)));
    agenda.appendChild(list);
    media.appendChild(agenda);

    const venue=node('article','gnk-code-slot__panel');
    venue.appendChild(node('span','gnk-code-slot__eyebrow',english?'Venue specification':'Specifikacija dvorane'));
    venue.appendChild(node('h3','',english?'New York hall, approx. 1,000 capacity':'New York dvorana, približno 1.000 mjesta'));
    venue.appendChild(node('p','',english
      ? 'The intended format is a premium, technically equipped hall suitable for a plenary stage, media desks, interpretation and broadcast-grade audio/video production.'
      : 'Predviđen je premium format tehnički opremljene dvorane pogodne za plenarnu pozornicu, medijske punktove, prijevod i audio/video produkciju na razini prijenosa.'));
    venue.appendChild(node('p','',english
      ? 'Travel, accommodation and confirmed ticketing logistics are covered by the organizer after verified media registration data.'
      : 'Troškove putovanja, smještaja i potvrđene logistike karata snosi organizator nakon dostave provjerenih registracijskih podataka medijske kuće.'));
    media.appendChild(venue);

    section.appendChild(media);
    main.insertBefore(section,main.firstElementChild ? main.firstElementChild.nextSibling : null);
  };

  if(route==='/' || route==='/en'){
    document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mountCodeShowcase,{once:true}):mountCodeShowcase();
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