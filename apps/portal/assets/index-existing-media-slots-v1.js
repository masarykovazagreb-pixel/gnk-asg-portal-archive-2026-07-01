(() => {
  'use strict';
  if (window.__GNK_EXISTING_MEDIA_V1__) return;
  window.__GNK_EXISTING_MEDIA_V1__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  if (route !== '/' && route !== '/en') return;
  const english = route === '/en';

  const make = (tag,className,text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  };

  async function setEncodedImage(image,placeholder,url) {
    try {
      const response = await fetch(url,{cache:'force-cache'});
      if (!response.ok) throw new Error('image');
      const value = (await response.text()).replace(/\s+/g,'');
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let i=0;i<binary.length;i+=1) bytes[i] = binary.charCodeAt(i);
      const objectUrl = URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
      image.onload = () => { placeholder.remove(); URL.revokeObjectURL(objectUrl); };
      image.onerror = () => { image.remove(); URL.revokeObjectURL(objectUrl); };
      image.src = objectUrl;
    } catch (_) {
      image.remove();
    }
  }

  function addVisuals(card) {
    if (card.querySelector('#gnk-existing-visual-stage')) return;
    const stage = make('div');
    stage.id = 'gnk-existing-visual-stage';
    stage.dataset.gnkExistingField = 'visuals';
    stage.setAttribute('aria-label',english ? 'Rotating campaign visuals' : 'Izmjena kampanjskih vizuala');
    const slides = make('div','gnk-existing-slides');
    const items = [
      ['/assets/the-code-visual-01.b64?v=20260627-existing-v1',english ? 'GNK ASG global network' : 'GNK ASG globalna mreža'],
      ['/assets/the-code-visual-02.b64?v=20260627-existing-v1',english ? 'GNK DINAMO Ltd. New York activation' : 'GNK DINAMO Ltd. aktivacija u New Yorku']
    ];
    items.forEach((item,index) => {
      const figure = make('figure','gnk-existing-slide');
      const placeholder = make('div','gnk-existing-media-placeholder',english ? 'Loading visual…' : 'Učitavanje vizuala…');
      const image = make('img');
      image.alt = item[1];
      image.loading = index ? 'lazy' : 'eager';
      image.decoding = 'async';
      figure.append(placeholder,image);
      slides.appendChild(figure);
      setEncodedImage(image,placeholder,item[0]);
    });
    stage.appendChild(slides);
    card.appendChild(stage);
  }

  function addCode(card) {
    if (card.querySelector('#gnk-existing-code-stage')) return;
    const stage = make('div');
    stage.id = 'gnk-existing-code-stage';
    stage.dataset.gnkExistingField = 'the-code';
    const shell = make('div','gnk-existing-code-shell');
    const frame = make('iframe');
    frame.title = 'THE CODE — GNK DINAMO Ltd.';
    frame.src = '/the-code/?v=20260627-existing-v1';
    frame.loading = 'eager';
    frame.allow = 'autoplay';
    frame.scrolling = 'no';
    shell.append(frame,make('span','gnk-existing-code-badge','THE CODE · HTML'));
    stage.appendChild(shell);
    card.appendChild(stage);
  }

  function topAfter(host,selector,fallback) {
    const anchor = host.querySelector(selector);
    if (!anchor) return fallback;
    return Math.ceil(anchor.getBoundingClientRect().bottom - host.getBoundingClientRect().top + 14);
  }

  function resize() {
    const section = document.getElementById('mreza-grupe');
    const map = section?.querySelector('.map-card');
    const locations = section?.querySelector('.locations');
    if (!map || !locations) return;
    map.style.setProperty('--gnk-existing-visual-top',`${topAfter(map,'.gnk-network-insight',510)}px`);
    locations.style.setProperty('--gnk-existing-code-top',`${topAfter(locations,'#locationList',240)}px`);
    const stage = locations.querySelector('#gnk-existing-code-stage');
    const shell = stage?.querySelector('.gnk-existing-code-shell');
    if (!stage || !shell) return;
    const maxW = Math.max(220,stage.clientWidth - 20);
    const maxH = Math.max(390,stage.clientHeight - 20);
    const width = Math.min(maxW,maxH * 9 / 16,420);
    const height = Math.min(maxH,width * 16 / 9);
    shell.style.width = `${Math.floor(width)}px`;
    shell.style.height = `${Math.floor(height)}px`;
  }

  function boot() {
    document.querySelectorAll('main > #the-code-index,main > .gnk-code-slot').forEach(el => el.remove());
    const section = document.getElementById('mreza-grupe');
    const map = section?.querySelector('.map-card');
    const locations = section?.querySelector('.locations');
    if (!map || !locations) return;
    addVisuals(map);
    addCode(locations);
    resize();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('load',boot,{once:true});
  window.addEventListener('resize',resize,{passive:true});
  [400,1000,2200].forEach(delay => setTimeout(boot,delay));
})();
