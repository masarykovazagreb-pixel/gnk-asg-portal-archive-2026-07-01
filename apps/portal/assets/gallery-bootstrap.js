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
    css.href='/assets/the-code-index-slot.css?v=20260627-v4';
    document.head.appendChild(css);

    const section=node('section','section gnk-code-slot');
    section.id='the-code-index';
    section.setAttribute('aria-label','GNK DINAMO Ltd. — The Code and campaign visuals');

    const grid=node('div','gnk-code-slot__grid');
    const visual=node('article','gnk-code-slot__visual');
    visual.setAttribute('aria-label',english?'Rotating campaign visuals':'Izmjena kampanjskih vizuala');
    const slides=node('div','gnk-code-slot__slides');
    const visuals=[
      {
        source:'/assets/the-code-visual-01.b64',
        mime:'image/jpeg',
        alt:english?'GNK ASG global network and advanced sports and governance':'GNK ASG globalna mreža, napredni sport i upravljanje'
      },
      {
        source:'/assets/the-code-visual-02.b64',
        mime:'image/webp',
        alt:english?'GNK DINAMO Ltd. Group New York activation on October 7, 2026':'GNK DINAMO Ltd. Group aktivacija u New Yorku 7. listopada 2026.'
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
    frame.src='/the-code/';
    frame.loading='eager';
    frame.setAttribute('sandbox','allow-scripts');
    frame.setAttribute('allow','autoplay');
    frame.setAttribute('scrolling','no');
    code.appendChild(frame);
    code.appendChild(node('span','gnk-code-slot__badge','Interactive · isolated'));
    grid.appendChild(code);
    section.appendChild(grid);
    main.appendChild(section);
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
